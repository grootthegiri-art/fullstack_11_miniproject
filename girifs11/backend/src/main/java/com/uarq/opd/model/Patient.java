package com.uarq.opd.model;

import jakarta.persistence.*;

@Entity
@Table(name = "patients")
public class Patient {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String name;
    private String phone;

    public Patient() {}
    public Patient(String name, String phone) {
        this.name = name;
        this.phone = phone;
    }
    public Long getId() { return id; }
    public String getName() { return name; }
    public String getPhone() { return phone; }
    public void setId(Long id) { this.id = id; }
    public void setName(String name) { this.name = name; }
    public void setPhone(String phone) { this.phone = phone; }
}
