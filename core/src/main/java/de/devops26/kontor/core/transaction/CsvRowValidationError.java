package de.devops26.kontor.core.transaction;

public record CsvRowValidationError(int row, String field, String message) {}
