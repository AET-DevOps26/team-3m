package de.devops26.kontor.core.transaction;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
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
    private static final int MAX_PRECISION_AMOUNT = 18;
    private static final int MAX_SCALE_AMOUNT = 6;
    private static final int MAX_PRECISION_SHARES = 20;
    private static final int MAX_SCALE_SHARES = 10;

    private static final int MAX_ECHOED_VALUE_LENGTH = 32;
    private static final int MAX_ROWS = 50_000;
    private static final int MAX_ERRORS = 50;

    // We might want to later ignore when a user sends headers
    // that are not in this set (but warn the user that the header was ignored and not stored)
    private static final Set<String> ALLOWED_HEADERS = Set.of(
            "datetime",
            "date",
            "account_type",
            "category",
            "type",
            "asset_class",
            "name",
            "symbol",
            "shares",
            "price",
            "amount",
            "fee",
            "tax",
            "currency",
            "original_amount",
            "original_currency",
            "fx_rate",
            "description",
            "transaction_id",
            "counterparty_name",
            "counterparty_iban",
            "payment_reference",
            "mcc_code");

    private static final Set<String> REQUIRED_HEADERS =
            Set.of("datetime", "date", "account_type", "category", "type", "amount", "currency", "transaction_id");

    private final FinancialTransactionRepository repository;

    public FinancialTransactionService(FinancialTransactionRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<FinancialTransactionResponse> listTransactions(UUID userId) {
        return repository.findAll(userId);
    }

    @Transactional
    public CsvImportResult importCsv(InputStream input, UUID userId) throws IOException {
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
            validateHeaders(parser.getHeaderNames());
            int rowNumber = 1;
            for (CSVRecord record : parser) {
                rowNumber++;
                if (rows.size() >= MAX_ROWS) {
                    throw new CsvParsingException(
                            "CSV exceeds the maximum supported row count of " + MAX_ROWS, List.of());
                }
                var rowErrors = new ArrayList<CsvRowValidationError>();
                var row = parseRow(record, rowNumber, rowErrors);
                if (rowErrors.isEmpty() && row != null) {
                    rows.add(row);
                } else {
                    errors.addAll(rowErrors);
                    if (errors.size() >= MAX_ERRORS) {
                        throw new CsvParsingException(
                                "Too many validation errors (stopped after " + MAX_ERRORS + ")", errors);
                    }
                }
            }
        }

        if (!errors.isEmpty()) {
            throw new CsvParsingException(errors);
        }

        if (rows.isEmpty()) {
            throw new CsvParsingException("CSV file contained no data rows", List.of());
        }

        int count = repository.upsertAll(rows, userId);
        return new CsvImportResult(count, "Successfully imported " + count + " transaction(s)");
    }

    private static void validateHeaders(List<String> headerNames) {
        var missing = new LinkedHashSet<>(REQUIRED_HEADERS);
        missing.removeAll(headerNames);
        if (!missing.isEmpty()) {
            throw new CsvParsingException(
                    "CSV is missing required header(s): " + String.join(", ", missing), List.of());
        }
        var unknown = new LinkedHashSet<String>();
        for (var name : headerNames) {
            if (name == null || name.isBlank()) {
                throw new CsvParsingException("CSV contains a blank header column", List.of());
            }
            if (!ALLOWED_HEADERS.contains(name)) {
                unknown.add(name);
            }
        }
        if (!unknown.isEmpty()) {
            throw new CsvParsingException("CSV contains unknown header(s): " + String.join(", ", unknown), List.of());
        }
    }

    private TransactionCsvRow parseRow(CSVRecord record, int rowNumber, List<CsvRowValidationError> errors) {
        var datetime =
                parseRequired(record, "datetime", rowNumber, errors, FinancialTransactionService::parseOffsetDateTime);
        var date = parseRequired(record, "date", rowNumber, errors, FinancialTransactionService::parseLocalDate);
        var accountType = requireNonBlank(record, "account_type", MAX_LEN_ACCOUNT_TYPE, rowNumber, errors);
        var category = requireNonBlank(record, "category", MAX_LEN_CATEGORY, rowNumber, errors);
        var type = requireNonBlank(record, "type", MAX_LEN_TYPE, rowNumber, errors);
        var assetClass = optionalString(record, "asset_class", MAX_LEN_ASSET_CLASS, rowNumber, errors);
        var name = optionalString(record, "name", MAX_LEN_NAME, rowNumber, errors);
        var symbol = optionalString(record, "symbol", MAX_LEN_SYMBOL, rowNumber, errors);
        var shares = parseOptional(
                record,
                "shares",
                rowNumber,
                errors,
                value -> parseAmount(value, MAX_PRECISION_SHARES, MAX_SCALE_SHARES));
        var price = parseOptional(
                record,
                "price",
                rowNumber,
                errors,
                value -> parseAmount(value, MAX_PRECISION_AMOUNT, MAX_SCALE_AMOUNT));
        var amount = parseRequired(
                record,
                "amount",
                rowNumber,
                errors,
                value -> parseAmount(value, MAX_PRECISION_AMOUNT, MAX_SCALE_AMOUNT));
        var fee = parseOptional(
                record, "fee", rowNumber, errors, value -> parseAmount(value, MAX_PRECISION_AMOUNT, MAX_SCALE_AMOUNT));
        var tax = parseOptional(
                record, "tax", rowNumber, errors, value -> parseAmount(value, MAX_PRECISION_AMOUNT, MAX_SCALE_AMOUNT));
        var currency = requireNonBlank(record, "currency", MAX_LEN_CURRENCY, rowNumber, errors);
        var originalAmount = parseOptional(
                record,
                "original_amount",
                rowNumber,
                errors,
                value -> parseAmount(value, MAX_PRECISION_AMOUNT, MAX_SCALE_AMOUNT));
        var originalCurrency = optionalString(record, "original_currency", MAX_LEN_CURRENCY, rowNumber, errors);
        var fxRate = parseOptional(
                record,
                "fx_rate",
                rowNumber,
                errors,
                value -> parseAmount(value, MAX_PRECISION_AMOUNT, MAX_SCALE_AMOUNT));
        var description = blankToNull(record, "description");
        var transactionId = parseRequired(record, "transaction_id", rowNumber, errors, UUID::fromString);
        var counterpartyName = optionalString(record, "counterparty_name", MAX_LEN_NAME, rowNumber, errors);
        var counterpartyIban = optionalString(record, "counterparty_iban", MAX_LEN_IBAN, rowNumber, errors);
        var paymentReference =
                optionalString(record, "payment_reference", MAX_LEN_PAYMENT_REFERENCE, rowNumber, errors);
        var mccCode = optionalString(record, "mcc_code", MAX_LEN_MCC_CODE, rowNumber, errors);

        if (!errors.isEmpty()) {
            return null;
        }

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

    private static OffsetDateTime parseOffsetDateTime(String value) {
        return OffsetDateTime.parse(value, DateTimeFormatter.ISO_OFFSET_DATE_TIME);
    }

    private static LocalDate parseLocalDate(String value) {
        return LocalDate.parse(value, DateTimeFormatter.ISO_LOCAL_DATE);
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
            errors.add(invalidValueError(rowNumber, field, value));
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

    private BigDecimal parseAmount(String value, int maxPrecision, int maxScale) {
        var amount = new BigDecimal(value);
        if (amount.scale() > maxScale) {
            throw new IllegalArgumentException("more than " + maxScale + " fractional digits");
        }
        int maxIntegerDigits = maxPrecision - maxScale;
        int integerDigits = Math.max(amount.precision() - amount.scale(), 0);
        if (integerDigits > maxIntegerDigits) {
            throw new IllegalArgumentException("integer part exceeds " + maxIntegerDigits + " digits");
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
            errors.add(invalidValueError(rowNumber, field, value));
            return null;
        }
    }

    private static CsvRowValidationError invalidValueError(int rowNumber, String field, String value) {
        var truncated =
                value.length() > MAX_ECHOED_VALUE_LENGTH ? value.substring(0, MAX_ECHOED_VALUE_LENGTH) + "..." : value;
        return new CsvRowValidationError(rowNumber, field, "invalid value: '" + truncated + "'");
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
