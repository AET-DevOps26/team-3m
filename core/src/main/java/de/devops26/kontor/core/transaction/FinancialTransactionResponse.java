package de.devops26.kontor.core.transaction;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record FinancialTransactionResponse(
        UUID id,
        OffsetDateTime datetime,
        LocalDate date,
        String accountType,
        String category,
        String type,
        String assetClass,
        String name,
        String symbol,
        BigDecimal shares,
        BigDecimal price,
        BigDecimal amount,
        BigDecimal fee,
        BigDecimal tax,
        String currency,
        BigDecimal originalAmount,
        String originalCurrency,
        BigDecimal fxRate,
        String description,
        UUID externalTransactionId,
        String counterpartyName,
        String counterpartyIban,
        String paymentReference,
        String mccCode) {}
