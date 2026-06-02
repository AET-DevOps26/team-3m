package de.devops26.kontor.core.portfolio;

import java.math.BigDecimal;
import java.time.LocalDate;

record TransactionRow(
        LocalDate date, String type, String symbol, BigDecimal shares, BigDecimal price, BigDecimal amount) {}
