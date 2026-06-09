package de.devops26.kontor.core.transaction;

import de.devops26.kontor.core.web.ApiResponse;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/**
 * Concrete OpenAPI response envelope for listing transactions.
 *
 * <p>Springdoc 3.0.3 erases {@code ApiResponse<TransactionPage>} to a generic schema once
 * controller responses are declared explicitly, so this record keeps the generated client contract
 * specific without changing the runtime envelope.
 */
public record ListTransactionsApiResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) boolean success,
        TransactionPage data,
        @Schema(nullable = true) String error,
        @Schema(nullable = true) List<?> details) {

    public static ListTransactionsApiResponse from(ApiResponse<TransactionPage> source) {
        return new ListTransactionsApiResponse(source.success(), source.data(), source.error(), source.details());
    }
}
