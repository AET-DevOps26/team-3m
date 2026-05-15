package de.devops26.kontor.core.transaction;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVRecord;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FinancialTransactionService {

    private final FinancialTransactionRepository repository;

    public FinancialTransactionService(FinancialTransactionRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public CsvImportResult importCsv(InputStream input) throws IOException {
        var format = CSVFormat.DEFAULT
                .builder()
                .setHeader()
                .setSkipHeaderRecord(true)
                .setTrim(true)
                .get();

        List<TransactionCsvRow> rows = new ArrayList<>();
        List<CsvRowValidationError> errors = new ArrayList<>();

        try (var reader = new InputStreamReader(input, StandardCharsets.UTF_8);
                var parser = format.parse(reader)) {
            int rowNumber = 1;
            for (CSVRecord record : parser) {
                rowNumber++;
                var rowErrors = new ArrayList<CsvRowValidationError>();
                var row = parseRow(record, rowNumber, rowErrors);
                if (rowErrors.isEmpty()) {
                    rows.add(row);
                } else {
                    errors.addAll(rowErrors);
                }
            }
        }

        if (!errors.isEmpty()) {
            throw new CsvParsingException(errors);
        }

        if (rows.isEmpty()) {
            return new CsvImportResult(0, "CSV file contained no data rows");
        }

        int count = repository.upsertAll(rows);
        return new CsvImportResult(count, "Successfully imported " + count + " transaction(s)");
    }

    private TransactionCsvRow parseRow(CSVRecord record, int rowNumber, List<CsvRowValidationError> errors) {
        var datetime = parseRequired(record, "datetime", rowNumber, errors, this::parseOffsetDateTime);
        var date = parseRequired(record, "date", rowNumber, errors, LocalDate::parse);
        var accountType = requireNonBlank(record, "account_type", rowNumber, errors);
        var category = requireNonBlank(record, "category", rowNumber, errors);
        var type = requireNonBlank(record, "type", rowNumber, errors);
        var assetClass = blankToNull(record, "asset_class");
        var name = blankToNull(record, "name");
        var symbol = blankToNull(record, "symbol");
        var shares = parseOptional(record, "shares", rowNumber, errors, BigDecimal::new);
        var price = parseOptional(record, "price", rowNumber, errors, BigDecimal::new);
        var amount = parseRequired(record, "amount", rowNumber, errors, BigDecimal::new);
        var fee = parseOptional(record, "fee", rowNumber, errors, BigDecimal::new);
        var tax = parseOptional(record, "tax", rowNumber, errors, BigDecimal::new);
        var currency = requireNonBlank(record, "currency", rowNumber, errors);
        var originalAmount = parseOptional(record, "original_amount", rowNumber, errors, BigDecimal::new);
        var originalCurrency = blankToNull(record, "original_currency");
        var fxRate = parseOptional(record, "fx_rate", rowNumber, errors, BigDecimal::new);
        var description = blankToNull(record, "description");
        var transactionId = parseRequired(record, "transaction_id", rowNumber, errors, UUID::fromString);
        var counterpartyName = blankToNull(record, "counterparty_name");
        var counterpartyIban = blankToNull(record, "counterparty_iban");
        var paymentReference = blankToNull(record, "payment_reference");
        var mccCode = blankToNull(record, "mcc_code");

        return new TransactionCsvRow(
                datetime,
                date,
                accountType,
                category,
                type,
                assetClass,
                name,
                symbol,
                shares,
                price,
                amount,
                fee,
                tax,
                currency,
                originalAmount,
                originalCurrency,
                fxRate,
                description,
                transactionId,
                counterpartyName,
                counterpartyIban,
                paymentReference,
                mccCode);
    }

    private OffsetDateTime parseOffsetDateTime(String value) {
        return OffsetDateTime.parse(value);
    }

    private <T> T parseRequired(
            CSVRecord record, String field, int rowNumber, List<CsvRowValidationError> errors, Parser<T> parser) {
        var value = blankToNull(record, field);
        if (value == null) {
            errors.add(new CsvRowValidationError(rowNumber, field, "required field is missing"));
            return null;
        }
        try {
            return parser.parse(value);
        } catch (RuntimeException e) {
            errors.add(new CsvRowValidationError(rowNumber, field, "invalid value '" + value + "': " + e.getMessage()));
            return null;
        }
    }

    private String requireNonBlank(CSVRecord record, String field, int rowNumber, List<CsvRowValidationError> errors) {
        var value = blankToNull(record, field);
        if (value == null) {
            errors.add(new CsvRowValidationError(rowNumber, field, "required field is missing"));
        }
        return value;
    }

    private <T> T parseOptional(
            CSVRecord record, String field, int rowNumber, List<CsvRowValidationError> errors, Parser<T> parser) {
        var value = blankToNull(record, field);
        if (value == null) {
            return null;
        }
        try {
            return parser.parse(value);
        } catch (RuntimeException e) {
            errors.add(new CsvRowValidationError(rowNumber, field, "invalid value '" + value + "': " + e.getMessage()));
            return null;
        }
    }

    private String blankToNull(CSVRecord record, String field) {
        if (!record.isMapped(field)) {
            return null;
        }
        var value = record.get(field);
        if (value == null || value.isBlank()) {
            return null;
        }
        return value;
    }

    @FunctionalInterface
    private interface Parser<T> {
        T parse(String value) throws DateTimeParseException, NumberFormatException, IllegalArgumentException;
    }
}
