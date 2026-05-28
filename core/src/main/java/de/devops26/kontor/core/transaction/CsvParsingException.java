package de.devops26.kontor.core.transaction;

import java.util.List;

public class CsvParsingException extends RuntimeException {

    private final List<CsvRowValidationError> errors;

    public CsvParsingException(List<CsvRowValidationError> errors) {
        super("CSV validation failed with " + errors.size() + " error(s)");
        this.errors = List.copyOf(errors);
    }

    public CsvParsingException(String message, List<CsvRowValidationError> errors) {
        super(message);
        this.errors = List.copyOf(errors);
    }

    public List<CsvRowValidationError> errors() {
        return errors;
    }
}
