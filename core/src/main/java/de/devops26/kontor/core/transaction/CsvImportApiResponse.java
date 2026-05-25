package de.devops26.kontor.core.transaction;

import de.devops26.kontor.core.web.ApiResponse;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

public record CsvImportApiResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) boolean success,
        CsvImportResult data,
        String error,
        List<?> details) {

    public static CsvImportApiResponse from(ApiResponse<CsvImportResult> source) {
        return new CsvImportApiResponse(source.success(), source.data(), source.error(), source.details());
    }
}
