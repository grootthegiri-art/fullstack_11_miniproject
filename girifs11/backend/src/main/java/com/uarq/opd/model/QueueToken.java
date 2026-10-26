package com.uarq.opd.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "queue_tokens")
public class QueueToken {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String department;
    private String status = "WAITING";
    private int bestMinutes = 5;
    private int likelyMinutes = 10;
    private int worstMinutes = 20;
    private LocalDateTime createdAt = LocalDateTime.now();

    @ManyToOne(optional = false)
    @JoinColumn(name = "patient_id")
    private Patient patient;

    public QueueToken() {}
    public Long getId() { return id; }
    public String getDepartment() { return department; }
    public String getStatus() { return status; }
    public int getBestMinutes() { return bestMinutes; }
    public int getLikelyMinutes() { return likelyMinutes; }
    public int getWorstMinutes() { return worstMinutes; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public Patient getPatient() { return patient; }
    public void setId(Long id) { this.id = id; }
    public void setDepartment(String department) { this.department = department; }
    public void setStatus(String status) { this.status = status; }
    public void setBestMinutes(int value) { this.bestMinutes = value; }
    public void setLikelyMinutes(int value) { this.likelyMinutes = value; }
    public void setWorstMinutes(int value) { this.worstMinutes = value; }
    public void setCreatedAt(LocalDateTime value) { this.createdAt = value; }
    public void setPatient(Patient patient) { this.patient = patient; }
    @Transient
    public int getExpectedMinutes() {
        return com.uarq.opd.service.WaitTimeService.pertRounded(bestMinutes, likelyMinutes, worstMinutes);
    }
}
