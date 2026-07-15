package de.devops26.kontor.news.aggregation;

import java.util.Locale;

public enum AggregationStatus {
    RUNNING,
    SUCCEEDED,
    FAILED;

    public String dbValue() {
        return name().toLowerCase(Locale.ROOT);
    }

    public static AggregationStatus fromDbValue(String value) {
        return valueOf(value.toUpperCase(Locale.ROOT));
    }
}
