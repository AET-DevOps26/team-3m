package de.devops26.kontor.news.aggregation;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;
import java.util.UUID;

public record AggregationRun(
        UUID id,
        AggregationTrigger triggeredBy,
        AggregationStatus status,
        OffsetDateTime startedAt,
        @Schema(nullable = true) OffsetDateTime finishedAt,
        int itemsSeen,
        int itemsPublished,
        @Schema(nullable = true) String error) {}
