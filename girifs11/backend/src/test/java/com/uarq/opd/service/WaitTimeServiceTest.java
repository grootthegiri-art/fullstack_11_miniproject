package com.uarq.opd.service;

import com.uarq.opd.model.QueueToken;
import com.uarq.opd.model.TokenStatus;
import com.uarq.opd.service.WaitTimeService.WaitEstimate;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class WaitTimeServiceTest {
    private final WaitTimeService service = new WaitTimeService();
    private final LocalDateTime base = LocalDateTime.of(2026, 10, 26, 9, 0, 0);

    private QueueToken token(long id, String status, int best, int likely, int worst) {
        QueueToken t = new QueueToken();
        t.setId(id);
        t.setStatus(status);
        t.setBestMinutes(best);
        t.setLikelyMinutes(likely);
        t.setWorstMinutes(worst);
        t.setCreatedAt(base.plusMinutes(id)); // later id = created later
        return t;
    }

    @Test
    void pertFormulaMatchesReportExample() {
        assertEquals(10.8333, WaitTimeService.pert(5, 10, 20), 0.001);
        assertEquals(11, WaitTimeService.pertRounded(5, 10, 20));
    }

    @Test
    void waitIsSumOfPeopleAhead() {
        QueueToken a = token(1, TokenStatus.IN_CONSULTATION, 5, 10, 20); // PERT 11
        QueueToken b = token(2, TokenStatus.WAITING, 4, 6, 8);           // PERT 6
        QueueToken me = token(3, TokenStatus.WAITING, 5, 10, 20);
        WaitEstimate e = service.estimate(me, List.of(a, b, me));
        assertEquals("near_turn", e.scenario());
        assertEquals(1, e.peopleAhead());
        assertEquals(11, e.inProgressMinutes());
        assertEquals(List.of(6), e.aheadExpectedMinutes());
        assertEquals(17, e.expectedMinutes());
        assertEquals(9, e.bestMinutes());
        assertEquals(28, e.worstMinutes());
        assertEquals(Long.valueOf(1L), e.currentlyServingTokenId());
    }

    @Test
    void firstInLineIsYourTurn() {
        QueueToken me = token(1, TokenStatus.WAITING, 5, 10, 20);
        WaitEstimate e = service.estimate(me, List.of(me));
        assertEquals("your_turn", e.scenario());
        assertEquals(0, e.expectedMinutes());
    }

    @Test
    void completedTokenHasNoWait() {
        QueueToken me = token(1, TokenStatus.COMPLETED, 5, 10, 20);
        WaitEstimate e = service.estimate(me, List.of());
        assertEquals("completed", e.scenario());
        assertNull(e.currentlyServingTokenId());
    }

    @Test
    void emergencyAheadWidensEstimateAndJumpsQueue() {
        QueueToken w1 = token(1, TokenStatus.WAITING, 5, 10, 20);
        QueueToken w2 = token(2, TokenStatus.WAITING, 5, 10, 20);
        QueueToken me = token(3, TokenStatus.WAITING, 5, 10, 20);
        QueueToken emergency = token(4, TokenStatus.EMERGENCY, 5, 10, 20); // created last, served early
        WaitEstimate e = service.estimate(me, List.of(w1, w2, me, emergency));
        assertEquals("emergency", e.scenario());
        assertEquals(3, e.peopleAhead());
        // each of 3 people: round(10.83 * 1.6) = 17  -> 51 minutes
        assertEquals(51, e.expectedMinutes());
    }

    @Test
    void delayedTokenAheadMarksDelay() {
        QueueToken d = token(1, TokenStatus.DELAYED, 5, 10, 20);
        QueueToken w = token(2, TokenStatus.WAITING, 5, 10, 20);
        QueueToken me = token(3, TokenStatus.WAITING, 5, 10, 20);
        WaitEstimate e = service.estimate(me, List.of(d, w, me));
        assertEquals("delay", e.scenario());
    }
}
