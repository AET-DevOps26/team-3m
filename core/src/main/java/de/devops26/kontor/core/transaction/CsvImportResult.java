package de.devops26.kontor.core.transaction;

import io.swagger.v3.oas.annotations.media.Schema;

public record CsvImportResult(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int importedCount,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String message) {}
