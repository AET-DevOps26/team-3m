package de.devops26.kontor.core.marketdata;

import de.devops26.kontor.core.web.ApiResponse;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/**
 * Concrete OpenAPI response envelope for instrument quotes.
 *
 * <p>Springdoc 3.0.3 erases {@code ApiResponse<InstrumentQuoteResult>} to a generic
 * schema once controller responses are declared explicitly, so this record keeps
 * the generated client contract specific without changing the runtime envelope.
 */
public record InstrumentQuoteApiResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) boolean success,
        @Schema(nullable = true) InstrumentQuoteResult data,
        @Schema(nullable = true) String error,
        @Schema(nullable = true) List<?> details) {

    public static InstrumentQuoteApiResponse from(ApiResponse<InstrumentQuoteResult> source) {
        return new InstrumentQuoteApiResponse(source.success(), source.data(), source.error(), source.details());
    }
}
