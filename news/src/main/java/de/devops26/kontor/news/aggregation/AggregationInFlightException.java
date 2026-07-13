package de.devops26.kontor.news.aggregation;

import java.util.UUID;

public class AggregationInFlightException extends RuntimeException {

    private final UUID runId;

    public AggregationInFlightException(UUID runId) {
        super("An aggregation run is already in flight" + (runId != null ? ": id=" + runId : ""));
        this.runId = runId;
    }

    public UUID runId() {
        return runId;
    }
}
