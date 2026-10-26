package com.uarq.opd.model;

import java.util.List;

/** Allowed values for QueueToken.status (stored as plain text in MySQL). */
public final class TokenStatus {
    public static final String WAITING = "WAITING";
    public static final String CALLED = "CALLED";
    public static final String IN_CONSULTATION = "IN_CONSULTATION";
    public static final String DELAYED = "DELAYED";
    public static final String EMERGENCY = "EMERGENCY";
    public static final String COMPLETED = "COMPLETED";

    public static final List<String> ALL =
            List.of(WAITING, CALLED, IN_CONSULTATION, DELAYED, EMERGENCY, COMPLETED);

    private TokenStatus() {}
}
