package com.uarq.opd.repository;

import com.uarq.opd.model.QueueToken;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface QueueTokenRepository extends JpaRepository<QueueToken, Long> {
    /** Creation order; id breaks ties because MySQL TIMESTAMP only stores whole seconds. */
    List<QueueToken> findAllByOrderByCreatedAtAscIdAsc();

    /** Every token whose status is not the given one (used with COMPLETED to get the active queue). */
    List<QueueToken> findByStatusNotOrderByCreatedAtAscIdAsc(String status);
}
