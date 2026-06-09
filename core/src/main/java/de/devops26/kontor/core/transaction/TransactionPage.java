package de.devops26.kontor.core.transaction;

import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.media.Schema.RequiredMode;
import java.util.List;

/**
 * A page of financial transactions. {@code nextCursor} is {@code null} when there are no more
 * pages.
 */
public record TransactionPage(
        @Schema(requiredMode = RequiredMode.REQUIRED) List<FinancialTransactionResponse> items,

        @Schema(anyOf = {TransactionCursor.class, Void.class})
        TransactionCursor nextCursor) {}
