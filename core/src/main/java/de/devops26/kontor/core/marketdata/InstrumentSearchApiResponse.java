package de.devops26.kontor.core.marketdata;

import de.devops26.kontor.core.web.ApiResponse;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/**
 * Concrete OpenAPI response envelope for instrument search.
 *
 * <p>Springdoc 3.0.3 erases {@code ApiResponse<InstrumentSearchResult>} to a generic
 * schema once controller responses are declared explicitly, so this record keeps
 * the generated client contract specific without changing the runtime envelope.
 */
public record InstrumentSearchApiResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) boolean success,
        InstrumentSearchResult data,
        @Schema(nullable = true) String error,
        @Schema(nullable = true) List<?> details) {

    public static InstrumentSearchApiResponse from(ApiResponse<InstrumentSearchResult> source) {
        return new InstrumentSearchApiResponse(source.success(), source.data(), source.error(), source.details());
    }
}
