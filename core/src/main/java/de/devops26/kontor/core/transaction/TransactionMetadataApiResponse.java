package de.devops26.kontor.core.transaction;

import de.devops26.kontor.core.web.ApiResponse;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

public record TransactionMetadataApiResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) boolean success,
        TransactionMetadata data,
        @Schema(nullable = true) String error,
        @Schema(nullable = true) List<?> details) {

    public static TransactionMetadataApiResponse from(ApiResponse<TransactionMetadata> source) {
        return new TransactionMetadataApiResponse(source.success(), source.data(), source.error(), source.details());
    }
}
