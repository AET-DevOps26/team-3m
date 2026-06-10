package de.devops26.kontor.core.portfolio;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

record TransactionRow(
        OffsetDateTime datetime,
        LocalDate date,
        String type,
        String symbol,
        BigDecimal shares,
        BigDecimal price,
        BigDecimal amount) {}
