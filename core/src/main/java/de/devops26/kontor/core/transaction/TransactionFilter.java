package de.devops26.kontor.core.transaction;

import java.time.LocalDate;

public record TransactionFilter(String search, String category, String type, LocalDate dateFrom, LocalDate dateTo) {}
