package com.uarq.opd.controller;

import com.uarq.opd.model.Consultation;
import com.uarq.opd.model.Patient;
import com.uarq.opd.model.QueueToken;
import com.uarq.opd.model.TokenStatus;
import com.uarq.opd.repository.ConsultationRepository;
import com.uarq.opd.repository.PatientRepository;
import com.uarq.opd.repository.QueueTokenRepository;
import com.uarq.opd.service.WaitTimeService;
import com.uarq.opd.service.WaitTimeService.WaitEstimate;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api")
public class QueueController {
    private static final Pattern PHONE = Pattern.compile("^[0-9+()\\- ]{7,20}$");

    private final PatientRepository patients;
    private final QueueTokenRepository tokens;
    private final ConsultationRepository consultations;
    private final WaitTimeService waitTime;

    public QueueController(PatientRepository patients, QueueTokenRepository tokens,
                           ConsultationRepository consultations, WaitTimeService waitTime) {
        this.patients = patients;
        this.tokens = tokens;
        this.consultations = consultations;
        this.waitTime = waitTime;
    }

    // ---------- Public endpoints (no patient name or phone is returned) ----------

    @GetMapping("/queue")
    public List<TokenView> queue() {
        return tokens.findAllByOrderByCreatedAtAscIdAsc().stream().map(TokenView::of).toList();
    }

    @GetMapping("/tokens/{id}")
    public TokenView token(@PathVariable Long id) {
        return TokenView.of(find(id));
    }

    @GetMapping("/tokens/{id}/wait")
    public WaitEstimate waitEstimate(@PathVariable Long id) {
        QueueToken mine = find(id);
        return waitTime.estimate(mine,
                tokens.findByStatusNotOrderByCreatedAtAscIdAsc(TokenStatus.COMPLETED));
    }

    @PostMapping("/tokens")
    @ResponseStatus(HttpStatus.CREATED)
    public TokenView create(@RequestBody NewTokenRequest request) {
        String name = request.name() == null ? "" : request.name().trim();
        String department = request.department() == null ? "" : request.department().trim();
        String phone = request.phone() == null ? "" : request.phone().trim();
        if (name.isEmpty() || department.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Name and department are required");
        }
        if (name.length() > 100 || department.length() > 80) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Name (max 100) or department (max 80) is too long");
        }
        if (!phone.isEmpty() && !PHONE.matcher(phone).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phone number is not valid");
        }
        Patient patient = patients.save(new Patient(name, phone.isEmpty() ? null : phone));
        QueueToken token = new QueueToken();
        token.setPatient(patient);
        token.setDepartment(department);
        int[] d = WaitTimeService.defaultDurations(department);
        token.setBestMinutes(d[0]);
        token.setLikelyMinutes(d[1]);
        token.setWorstMinutes(d[2]);
        return TokenView.of(tokens.save(token));
    }

    // ---------- STAFF role ----------

    @GetMapping("/staff/queue")
    public List<StaffTokenView> staffQueue() {
        return tokens.findAllByOrderByCreatedAtAscIdAsc().stream()
                .map(t -> StaffTokenView.of(t, true)).toList();
    }

    @PutMapping("/staff/tokens/{id}/status")
    public TokenView updateStatus(@PathVariable Long id, @RequestBody StatusRequest request) {
        QueueToken token = find(id);
        if (request.status() == null || !TokenStatus.ALL.contains(request.status())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid status");
        }
        if (TokenStatus.COMPLETED.equals(token.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "A completed token cannot be changed");
        }
        token.setStatus(request.status());
        return TokenView.of(tokens.save(token));
    }

    // ---------- DOCTOR role ----------

    @GetMapping("/doctor/queue")
    public List<StaffTokenView> doctorQueue() {
        // Doctors see the patient name but not the phone number.
        return tokens.findByStatusNotOrderByCreatedAtAscIdAsc(TokenStatus.COMPLETED).stream()
                .map(t -> StaffTokenView.of(t, false)).toList();
    }

    @PostMapping("/doctor/tokens/{id}/complete")
    @Transactional
    public TokenView complete(@PathVariable Long id, @RequestBody DoctorRequest request) {
        QueueToken token = find(id);
        token.setStatus(TokenStatus.COMPLETED);
        QueueToken saved = tokens.save(token);
        if (!consultations.existsByTokenId(id)) {
            String doctor = request.doctorName() == null || request.doctorName().isBlank()
                    ? "Doctor" : request.doctorName().trim();
            consultations.save(new Consultation(id, doctor.length() > 100 ? doctor.substring(0, 100) : doctor));
        }
        return TokenView.of(saved);
    }

    private QueueToken find(Long id) {
        return tokens.findById(id).orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Token not found"));
    }

    // ---------- Request / response shapes ----------

    public record NewTokenRequest(String name, String phone, String department) {}
    public record StatusRequest(String status) {}
    public record DoctorRequest(String doctorName) {}

    /** Public view: only a masked initial, never the full name or phone. */
    public record TokenView(Long id, String patientLabel, String department, String status,
                            int bestMinutes, int likelyMinutes, int worstMinutes,
                            int expectedMinutes, LocalDateTime createdAt) {
        static TokenView of(QueueToken t) {
            String name = t.getPatient() == null || t.getPatient().getName() == null
                    ? "" : t.getPatient().getName();
            String label = name.isEmpty() ? "Patient" : name.substring(0, 1).toUpperCase() + "****";
            return new TokenView(t.getId(), label, t.getDepartment(), t.getStatus(),
                    t.getBestMinutes(), t.getLikelyMinutes(), t.getWorstMinutes(),
                    t.getExpectedMinutes(), t.getCreatedAt());
        }
    }

    /** Authenticated view for staff (name + phone) and doctors (name only). */
    public record StaffTokenView(Long id, String patientName, String phone, String department,
                                 String status, int expectedMinutes, LocalDateTime createdAt) {
        static StaffTokenView of(QueueToken t, boolean includePhone) {
            Patient p = t.getPatient();
            return new StaffTokenView(t.getId(), p == null ? "" : p.getName(),
                    includePhone && p != null ? p.getPhone() : null,
                    t.getDepartment(), t.getStatus(), t.getExpectedMinutes(), t.getCreatedAt());
        }
    }
}
