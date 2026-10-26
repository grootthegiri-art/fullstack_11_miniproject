package com.uarq.opd.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "consultations")
public class Consultation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long tokenId;
    private String doctorName;
    private LocalDateTime completedAt;

    public Consultation() {}
    public Consultation(Long tokenId, String doctorName) {
        this.tokenId = tokenId;
        this.doctorName = doctorName;
        this.completedAt = LocalDateTime.now();
    }
    public Long getId() { return id; }
    public Long getTokenId() { return tokenId; }
    public String getDoctorName() { return doctorName; }
    public LocalDateTime getCompletedAt() { return completedAt; }
}
