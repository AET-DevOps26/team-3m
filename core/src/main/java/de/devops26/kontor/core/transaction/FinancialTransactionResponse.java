package de.devops26.kontor.core.transaction;

import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.media.Schema.RequiredMode;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record FinancialTransactionResponse(
        @Schema(requiredMode = RequiredMode.REQUIRED) UUID id,
        @Schema(requiredMode = RequiredMode.REQUIRED) OffsetDateTime datetime,
        @Schema(requiredMode = RequiredMode.REQUIRED) LocalDate date,
        @Schema(requiredMode = RequiredMode.REQUIRED) String accountType,
        @Schema(requiredMode = RequiredMode.REQUIRED) String category,
        @Schema(requiredMode = RequiredMode.REQUIRED) String type,
        @Schema(nullable = true) String assetClass,
        @Schema(nullable = true) String name,
        @Schema(nullable = true) String symbol,
        @Schema(nullable = true) BigDecimal shares,
        @Schema(nullable = true) BigDecimal price,
        @Schema(requiredMode = RequiredMode.REQUIRED) BigDecimal amount,
        @Schema(nullable = true) BigDecimal fee,
        @Schema(nullable = true) BigDecimal tax,
        @Schema(requiredMode = RequiredMode.REQUIRED) String currency,
        @Schema(nullable = true) BigDecimal originalAmount,
        @Schema(nullable = true) String originalCurrency,
        @Schema(nullable = true) BigDecimal fxRate,
        @Schema(nullable = true) String description,
        @Schema(nullable = true) UUID externalTransactionId,
        @Schema(nullable = true) String counterpartyName,
        @Schema(nullable = true) String counterpartyIban,
        @Schema(nullable = true) String paymentReference,
        @Schema(nullable = true) String mccCode) {}
