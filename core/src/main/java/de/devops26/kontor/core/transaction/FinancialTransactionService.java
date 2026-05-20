package de.devops26.kontor.core.transaction;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVRecord;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FinancialTransactionService {

    private static final int MAX_LEN_ACCOUNT_TYPE = 50;
    private static final int MAX_LEN_CATEGORY = 50;
    private static final int MAX_LEN_TYPE = 50;
    private static final int MAX_LEN_ASSET_CLASS = 50;
    private static final int MAX_LEN_NAME = 255;
    private static final int MAX_LEN_SYMBOL = 50;
    private static final int MAX_LEN_CURRENCY = 3;
    private static final int MAX_LEN_IBAN = 34;
    private static final int MAX_LEN_PAYMENT_REFERENCE = 255;
    private static final int MAX_LEN_MCC_CODE = 4;
    private static final int MAX_SCALE_AMOUNT = 6;
    private static final int MAX_SCALE_SHARES = 10;

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
            throw new CsvParsingException("CSV file contained no data rows", List.of());
        }

        int count = repository.upsertAll(rows);
        return new CsvImportResult(count, "Successfully imported " + count + " transaction(s)");
    }

    private TransactionCsvRow parseRow(CSVRecord record, int rowNumber, List<CsvRowValidationError> errors) {
        var datetime = parseRequired(record, "datetime", rowNumber, errors, this::parseOffsetDateTime);
        var date = parseRequired(record, "date", rowNumber, errors, LocalDate::parse);
        var accountType = requireNonBlank(record, "account_type", MAX_LEN_ACCOUNT_TYPE, rowNumber, errors);
        var category = requireNonBlank(record, "category", MAX_LEN_CATEGORY, rowNumber, errors);
        var type = requireNonBlank(record, "type", MAX_LEN_TYPE, rowNumber, errors);
        var assetClass = optionalString(record, "asset_class", MAX_LEN_ASSET_CLASS, rowNumber, errors);
        var name = optionalString(record, "name", MAX_LEN_NAME, rowNumber, errors);
        var symbol = optionalString(record, "symbol", MAX_LEN_SYMBOL, rowNumber, errors);
        var shares = parseOptional(record, "shares", rowNumber, errors, value -> parseAmount(value, MAX_SCALE_SHARES));
        var price = parseOptional(record, "price", rowNumber, errors, value -> parseAmount(value, MAX_SCALE_AMOUNT));
        var amount = parseRequired(record, "amount", rowNumber, errors, value -> parseAmount(value, MAX_SCALE_AMOUNT));
        var fee = parseOptional(record, "fee", rowNumber, errors, value -> parseAmount(value, MAX_SCALE_AMOUNT));
        var tax = parseOptional(record, "tax", rowNumber, errors, value -> parseAmount(value, MAX_SCALE_AMOUNT));
        var currency = requireNonBlank(record, "currency", MAX_LEN_CURRENCY, rowNumber, errors);
        var originalAmount = parseOptional(
                record, "original_amount", rowNumber, errors, value -> parseAmount(value, MAX_SCALE_AMOUNT));
        var originalCurrency = optionalString(record, "original_currency", MAX_LEN_CURRENCY, rowNumber, errors);
        var fxRate = parseOptional(record, "fx_rate", rowNumber, errors, value -> parseAmount(value, MAX_SCALE_AMOUNT));
        var description = blankToNull(record, "description");
        var transactionId = parseRequired(record, "transaction_id", rowNumber, errors, UUID::fromString);
        var counterpartyName = optionalString(record, "counterparty_name", MAX_LEN_NAME, rowNumber, errors);
        var counterpartyIban = optionalString(record, "counterparty_iban", MAX_LEN_IBAN, rowNumber, errors);
        var paymentReference =
                optionalString(record, "payment_reference", MAX_LEN_PAYMENT_REFERENCE, rowNumber, errors);
        var mccCode = optionalString(record, "mcc_code", MAX_LEN_MCC_CODE, rowNumber, errors);

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

    private String requireNonBlank(
            CSVRecord record, String field, int maxLength, int rowNumber, List<CsvRowValidationError> errors) {
        var value = blankToNull(record, field);
        if (value == null) {
            errors.add(new CsvRowValidationError(rowNumber, field, "required field is missing"));
            return null;
        }
        if (value.length() > maxLength) {
            errors.add(new CsvRowValidationError(
                    rowNumber, field, "value exceeds maximum length of " + maxLength + " characters"));
            return null;
        }
        return value;
    }

    private String optionalString(
            CSVRecord record, String field, int maxLength, int rowNumber, List<CsvRowValidationError> errors) {
        var value = blankToNull(record, field);
        if (value == null) {
            return null;
        }
        if (value.length() > maxLength) {
            errors.add(new CsvRowValidationError(
                    rowNumber, field, "value exceeds maximum length of " + maxLength + " characters"));
            return null;
        }
        return value;
    }

    private BigDecimal parseAmount(String value, int maxScale) {
        var amount = new BigDecimal(value);
        if (amount.scale() > maxScale) {
            throw new IllegalArgumentException("more than " + maxScale + " fractional digits");
        }
        return amount;
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
        if (!record.isMapped(field) || !record.isSet(field)) {
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
        T parse(String value);
    }
}
