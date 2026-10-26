package com.uarq.opd.service;

import com.uarq.opd.model.QueueToken;
import com.uarq.opd.model.TokenStatus;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * PERT waiting-time engine.
 *
 * Each token has three consultation-duration estimates (best, likely, worst).
 * Expected time per token = (best + 4 * likely + worst) / 6.
 * A patient's expected wait is the sum of the expected times of everyone ahead.
 * The durations are illustrative values, not clinically validated predictions.
 */
@Service
public class WaitTimeService {

    // Widening factors used when staff mark a delay or an emergency (illustrative).
    static final double DELAY_EXPECTED = 1.4;
    static final double DELAY_WORST = 1.5;
    static final double EMERGENCY_EXPECTED = 1.6;
    static final double EMERGENCY_WORST = 1.9;

    /** Result sent to the patient page. All durations are in minutes. */
    public record WaitEstimate(Long tokenId, String status, String scenario,
                               Long currentlyServingTokenId, int peopleAhead,
                               int inProgressMinutes, List<Integer> aheadExpectedMinutes,
                               int bestMinutes, int expectedMinutes, int worstMinutes) {}

    /** PERT expected duration: (O + 4M + P) / 6. */
    public static double pert(int best, int likely, int worst) {
        return (best + 4.0 * likely + worst) / 6.0;
    }

    public static int pertRounded(int best, int likely, int worst) {
        return (int) Math.round(pert(best, likely, worst));
    }

    /** Illustrative default durations {best, likely, worst} for a department. */
    public static int[] defaultDurations(String department) {
        if (department == null) return new int[]{5, 10, 20};
        return switch (department.trim().toLowerCase()) {
            case "general medicine" -> new int[]{4, 8, 15};
            case "pediatrics" -> new int[]{5, 10, 18};
            case "orthopedics" -> new int[]{6, 12, 25};
            case "ent" -> new int[]{4, 8, 14};
            case "dermatology" -> new int[]{3, 6, 12};
            default -> new int[]{5, 10, 20};
        };
    }

    /** Lower rank = served earlier. */
    private static int rank(QueueToken t) {
        return switch (t.getStatus()) {
            case TokenStatus.IN_CONSULTATION -> 0;
            case TokenStatus.CALLED -> 1;
            case TokenStatus.EMERGENCY -> 2;
            default -> 3;
        };
    }

    /**
     * @param mine         the token the patient is tracking
     * @param activeTokens every token that is not COMPLETED (including mine)
     */
    public WaitEstimate estimate(QueueToken mine, List<QueueToken> activeTokens) {
        if (TokenStatus.COMPLETED.equals(mine.getStatus())) {
            return new WaitEstimate(mine.getId(), mine.getStatus(), "completed", null,
                    0, 0, List.of(), 0, 0, 0);
        }

        List<QueueToken> ordered = new ArrayList<>(activeTokens);
        ordered.sort(Comparator.comparingInt(WaitTimeService::rank)
                .thenComparing(QueueToken::getCreatedAt)
                .thenComparing(QueueToken::getId));

        int myIndex = ordered.size();
        for (int i = 0; i < ordered.size(); i++) {
            if (ordered.get(i).getId().equals(mine.getId())) { myIndex = i; break; }
        }
        List<QueueToken> before = ordered.subList(0, myIndex);

        boolean myTurn = TokenStatus.CALLED.equals(mine.getStatus())
                || TokenStatus.IN_CONSULTATION.equals(mine.getStatus())
                || before.isEmpty();
        if (myTurn) {
            Long serving = (TokenStatus.CALLED.equals(mine.getStatus())
                    || TokenStatus.IN_CONSULTATION.equals(mine.getStatus())) ? mine.getId() : null;
            return new WaitEstimate(mine.getId(), mine.getStatus(), "your_turn", serving,
                    0, 0, List.of(), 0, 0, 0);
        }

        QueueToken inProgress = before.stream()
                .filter(t -> TokenStatus.IN_CONSULTATION.equals(t.getStatus()))
                .findFirst().orElse(null);
        List<QueueToken> waiting = before.stream().filter(t -> t != inProgress).toList();

        boolean emergency = before.stream().anyMatch(t -> TokenStatus.EMERGENCY.equals(t.getStatus()));
        boolean delay = before.stream().anyMatch(t -> TokenStatus.DELAYED.equals(t.getStatus()));
        double expFactor = emergency ? EMERGENCY_EXPECTED : delay ? DELAY_EXPECTED : 1.0;
        double worstFactor = emergency ? EMERGENCY_WORST : delay ? DELAY_WORST : 1.0;

        int inProgressMinutes = inProgress == null ? 0
                : (int) Math.round(expectedOf(inProgress) * expFactor);
        List<Integer> aheadMinutes = waiting.stream()
                .map(t -> (int) Math.round(expectedOf(t) * expFactor)).toList();

        int best = before.stream().mapToInt(QueueToken::getBestMinutes).sum();
        int expected = inProgressMinutes + aheadMinutes.stream().mapToInt(Integer::intValue).sum();
        int worst = (int) Math.round(before.stream().mapToInt(QueueToken::getWorstMinutes).sum() * worstFactor);
        best = Math.min(best, expected);
        worst = Math.max(worst, expected);

        String scenario = emergency ? "emergency" : delay ? "delay"
                : waiting.size() <= 1 ? "near_turn" : "normal";

        Long serving = inProgress != null ? inProgress.getId()
                : before.stream().filter(t -> TokenStatus.CALLED.equals(t.getStatus()))
                        .map(QueueToken::getId).findFirst().orElse(null);

        return new WaitEstimate(mine.getId(), mine.getStatus(), scenario, serving,
                waiting.size(), inProgressMinutes, aheadMinutes, best, expected, worst);
    }

    private static double expectedOf(QueueToken t) {
        return pert(t.getBestMinutes(), t.getLikelyMinutes(), t.getWorstMinutes());
    }
}
