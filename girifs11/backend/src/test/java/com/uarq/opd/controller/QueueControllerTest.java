package com.uarq.opd.controller;

import com.uarq.opd.config.SecurityConfig;
import com.uarq.opd.model.Patient;
import com.uarq.opd.model.QueueToken;
import com.uarq.opd.repository.ConsultationRepository;
import com.uarq.opd.repository.PatientRepository;
import com.uarq.opd.repository.QueueTokenRepository;
import com.uarq.opd.service.WaitTimeService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(QueueController.class)
@Import({SecurityConfig.class, WaitTimeService.class})
class QueueControllerTest {
    @Autowired MockMvc mvc;
    @MockitoBean PatientRepository patients;
    @MockitoBean QueueTokenRepository tokens;
    @MockitoBean ConsultationRepository consultations;

    private QueueToken sampleToken(String status) {
        QueueToken t = new QueueToken();
        t.setId(7L);
        t.setDepartment("ENT");
        t.setStatus(status);
        t.setPatient(new Patient("Asha", "9876543210"));
        return t;
    }

    @Test
    void validTokenIsCreatedAndHidesPersonalData() throws Exception {
        when(patients.save(any(Patient.class))).thenAnswer(i -> i.getArgument(0));
        when(tokens.save(any(QueueToken.class))).thenAnswer(i -> {
            QueueToken t = i.getArgument(0);
            t.setId(1L);
            return t;
        });
        mvc.perform(post("/api/tokens").contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Asha\",\"phone\":\"9876543210\",\"department\":\"ENT\"}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.patientLabel").value("A****"))
            .andExpect(jsonPath("$.phone").doesNotExist())
            .andExpect(jsonPath("$.patientName").doesNotExist());
    }

    @Test
    void missingNameIsRejected() throws Exception {
        mvc.perform(post("/api/tokens").contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"  \",\"department\":\"ENT\"}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void missingDepartmentIsRejected() throws Exception {
        mvc.perform(post("/api/tokens").contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Asha\"}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void invalidPhoneIsRejected() throws Exception {
        mvc.perform(post("/api/tokens").contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Asha\",\"phone\":\"abc\",\"department\":\"ENT\"}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void invalidStatusIsRejected() throws Exception {
        when(tokens.findById(7L)).thenReturn(Optional.of(sampleToken("WAITING")));
        mvc.perform(put("/api/staff/tokens/7/status").with(httpBasic("staff", "staff123"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"UNKNOWN\"}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void staffCanUpdateStatus() throws Exception {
        QueueToken t = sampleToken("WAITING");
        when(tokens.findById(7L)).thenReturn(Optional.of(t));
        when(tokens.save(any(QueueToken.class))).thenAnswer(i -> i.getArgument(0));
        mvc.perform(put("/api/staff/tokens/7/status").with(httpBasic("staff", "staff123"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"CALLED\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("CALLED"));
    }

    @Test
    void completedTokenCannotBeChanged() throws Exception {
        when(tokens.findById(7L)).thenReturn(Optional.of(sampleToken("COMPLETED")));
        mvc.perform(put("/api/staff/tokens/7/status").with(httpBasic("staff", "staff123"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"WAITING\"}"))
            .andExpect(status().isConflict());
    }

    @Test
    void doctorCannotUseStaffEndpoint() throws Exception {
        mvc.perform(put("/api/staff/tokens/7/status").with(httpBasic("doctor", "doctor123"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"CALLED\"}"))
            .andExpect(status().isForbidden());
    }

    @Test
    void anonymousCannotUseStaffEndpoint() throws Exception {
        mvc.perform(get("/api/staff/queue")).andExpect(status().isUnauthorized());
    }

    @Test
    void unknownTokenReturns404() throws Exception {
        when(tokens.findById(99L)).thenReturn(Optional.empty());
        mvc.perform(get("/api/tokens/99")).andExpect(status().isNotFound());
    }

    @Test
    void doctorCompletionRecordsConsultation() throws Exception {
        when(tokens.findById(7L)).thenReturn(Optional.of(sampleToken("IN_CONSULTATION")));
        when(tokens.save(any(QueueToken.class))).thenAnswer(i -> i.getArgument(0));
        when(consultations.existsByTokenId(7L)).thenReturn(false);
        mvc.perform(post("/api/doctor/tokens/7/complete").with(httpBasic("doctor", "doctor123"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"doctorName\":\"Dr. Kumar\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("COMPLETED"));
        verify(consultations).save(any());
    }
}
