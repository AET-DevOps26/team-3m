package de.devops26.kontor.core.transaction;

import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.media.Schema.RequiredMode;
import java.time.OffsetDateTime;
import java.util.UUID;

/** Keyset-pagination cursor: the datetime and id of the last row on the previous page. */
public record TransactionCursor(
        @Schema(requiredMode = RequiredMode.REQUIRED) OffsetDateTime afterDatetime,
        @Schema(requiredMode = RequiredMode.REQUIRED) UUID afterId) {}
