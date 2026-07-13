package de.devops26.kontor.news.aggregation;

import java.util.Locale;

public enum AggregationTrigger {
    SCHEDULED,
    MANUAL;

    public String dbValue() {
        return name().toLowerCase(Locale.ROOT);
    }

    public static AggregationTrigger fromDbValue(String value) {
        return valueOf(value.toUpperCase(Locale.ROOT));
    }
}
