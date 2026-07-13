package de.devops26.kontor.core.marketdata;

import de.devops26.kontor.core.web.ApiResponse;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/**
 * Concrete OpenAPI response envelope for instrument price history.
 *
 * <p>Springdoc 3.0.3 erases {@code ApiResponse<InstrumentHistoryResult>} to a generic
 * schema once controller responses are declared explicitly, so this record keeps
 * the generated client contract specific without changing the runtime envelope.
 */
public record InstrumentHistoryApiResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) boolean success,
        InstrumentHistoryResult data,
        @Schema(nullable = true) String error,
        @Schema(nullable = true) List<?> details) {

    public static InstrumentHistoryApiResponse from(ApiResponse<InstrumentHistoryResult> source) {
        return new InstrumentHistoryApiResponse(source.success(), source.data(), source.error(), source.details());
    }
}
