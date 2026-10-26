package com.uarq.opd.repository;

import com.uarq.opd.model.Consultation;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ConsultationRepository extends JpaRepository<Consultation, Long> {
    boolean existsByTokenId(Long tokenId);
}
