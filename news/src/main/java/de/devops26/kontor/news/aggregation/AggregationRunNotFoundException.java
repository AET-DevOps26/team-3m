package de.devops26.kontor.news.aggregation;

import java.util.UUID;

public class AggregationRunNotFoundException extends RuntimeException {

    public AggregationRunNotFoundException(UUID id) {
        super("Aggregation run not found: id=" + id);
    }
}
