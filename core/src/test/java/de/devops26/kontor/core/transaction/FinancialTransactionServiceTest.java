package de.devops26.kontor.core.transaction;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class FinancialTransactionServiceTest {

    @Mock
    private FinancialTransactionRepository repository;

    @Captor
    private ArgumentCaptor<java.util.List<TransactionCsvRow>> rowsCaptor;

    private FinancialTransactionService service;

    @BeforeEach
    void setUp() {
        service = new FinancialTransactionService(repository);
    }

    @Test
    @DisplayName("importCsv parses valid CSV and delegates to repository")
    void importCsv_validCsv_parsesAndDelegates() throws IOException {
        when(repository.upsertAll(anyList())).thenReturn(1);

        var csv = csvWithRow("\"2026-04-01T09:30:00.000000Z\",\"2026-04-01\",\"DEFAULT\",\"CASH\","
                + "\"CUSTOMER_INBOUND\",\"\",\"Jane Doe\",\"\",\"\",\"\","
                + "\"3200.000000\",\"\",\"\",\"EUR\",\"\",\"\",\"\","
                + "\"Monthly salary\",\"a1b2c3d4-e5f6-7890-abcd-ef1234567890\","
                + "\"Jane Doe\",\"DE89370400440532013000\",\"\",\"\"");

        var result = service.importCsv(toStream(csv));

        assertThat(result.importedCount()).isEqualTo(1);
        verify(repository).upsertAll(rowsCaptor.capture());
        var rows = rowsCaptor.getValue();
        assertThat(rows).hasSize(1);

        var row = rows.getFirst();
        assertThat(row.datetime()).isEqualTo(OffsetDateTime.parse("2026-04-01T09:30:00.000000Z"));
        assertThat(row.date()).isEqualTo(LocalDate.of(2026, 4, 1));
        assertThat(row.accountType()).isEqualTo("DEFAULT");
        assertThat(row.category()).isEqualTo("CASH");
        assertThat(row.type()).isEqualTo("CUSTOMER_INBOUND");
        assertThat(row.assetClass()).isNull();
        assertThat(row.amount()).isEqualByComparingTo(new BigDecimal("3200.000000"));
        assertThat(row.currency()).isEqualTo("EUR");
        assertThat(row.transactionId()).isEqualTo(UUID.fromString("a1b2c3d4-e5f6-7890-abcd-ef1234567890"));
        assertThat(row.counterpartyName()).isEqualTo("Jane Doe");
        assertThat(row.counterpartyIban()).isEqualTo("DE89370400440532013000");
        assertThat(row.fee()).isNull();
        assertThat(row.tax()).isNull();
    }

    @Test
    @DisplayName("importCsv throws CsvParsingException when required field is missing")
    void importCsv_missingRequiredField_throws() {
        var csv = csvWithRow("\"2026-04-01T09:30:00.000000Z\",\"2026-04-01\",\"DEFAULT\",\"CASH\","
                + "\"CUSTOMER_INBOUND\",\"\",\"Jane Doe\",\"\",\"\",\"\","
                + "\"\",\"\",\"\",\"EUR\",\"\",\"\",\"\","
                + "\"Missing amount\",\"a1b2c3d4-e5f6-7890-abcd-ef1234567890\","
                + "\"Jane Doe\",\"DE89370400440532013000\",\"\",\"\"");

        assertThatThrownBy(() -> service.importCsv(toStream(csv)))
                .isInstanceOf(CsvParsingException.class)
                .satisfies(ex -> {
                    var errors = ((CsvParsingException) ex).errors();
                    assertThat(errors).hasSize(1);
                    assertThat(errors.getFirst().field()).isEqualTo("amount");
                    assertThat(errors.getFirst().row()).isEqualTo(2);
                });
    }

    @Test
    @DisplayName("importCsv throws CsvParsingException when UUID is invalid")
    void importCsv_invalidUuid_throws() {
        var csv = csvWithRow("\"2026-04-01T09:30:00.000000Z\",\"2026-04-01\",\"DEFAULT\",\"CASH\","
                + "\"CUSTOMER_INBOUND\",\"\",\"Jane Doe\",\"\",\"\",\"\","
                + "\"3200.000000\",\"\",\"\",\"EUR\",\"\",\"\",\"\","
                + "\"Bad UUID\",\"not-a-valid-uuid\","
                + "\"Jane Doe\",\"DE89370400440532013000\",\"\",\"\"");

        assertThatThrownBy(() -> service.importCsv(toStream(csv)))
                .isInstanceOf(CsvParsingException.class)
                .satisfies(ex -> {
                    var errors = ((CsvParsingException) ex).errors();
                    assertThat(errors).hasSize(1);
                    assertThat(errors.getFirst().field()).isEqualTo("transaction_id");
                });
    }

    @Test
    @DisplayName("importCsv throws CsvParsingException when CSV has no data rows")
    void importCsv_emptyCsv_throws() {
        var csv = HEADER + "\n";

        assertThatThrownBy(() -> service.importCsv(toStream(csv)))
                .isInstanceOf(CsvParsingException.class)
                .hasMessageContaining("no data rows");
    }

    @Test
    @DisplayName("importCsv maps optional fields to null when blank")
    void importCsv_blankOptionalFields_mappedToNull() throws IOException {
        when(repository.upsertAll(anyList())).thenReturn(1);

        var csv = csvWithRow("\"2026-04-03T14:22:33.412Z\",\"2026-04-03\",\"DEFAULT\",\"TRADING\","
                + "\"BUY\",\"STOCK\",\"Apple\",\"US0378331005\","
                + "\"5.0000000000\",\"192.340000\",\"-961.70\",\"-1.00\",\"\","
                + "\"EUR\",\"\",\"\",\"\",\"\","
                + "\"b2c3d4e5-f6a7-8901-bcde-f12345678901\",\"\",\"\",\"\",\"\"");

        service.importCsv(toStream(csv));

        verify(repository).upsertAll(rowsCaptor.capture());
        var row = rowsCaptor.getValue().getFirst();
        assertThat(row.shares()).isEqualByComparingTo(new BigDecimal("5.0000000000"));
        assertThat(row.price()).isEqualByComparingTo(new BigDecimal("192.340000"));
        assertThat(row.fee()).isEqualByComparingTo(new BigDecimal("-1.00"));
        assertThat(row.tax()).isNull();
        assertThat(row.originalAmount()).isNull();
        assertThat(row.originalCurrency()).isNull();
        assertThat(row.fxRate()).isNull();
        assertThat(row.counterpartyName()).isNull();
        assertThat(row.counterpartyIban()).isNull();
    }

    @Test
    @DisplayName("importCsv throws when CSV contains unknown headers")
    void importCsv_unknownHeaders_throws() {
        var csv = "datetime,date,account_type,category,type,amount,currency,transaction_id,unknown_column\n";

        assertThatThrownBy(() -> service.importCsv(toStream(csv)))
                .isInstanceOf(CsvParsingException.class)
                .hasMessageContaining("unknown header");
    }

    @Test
    @DisplayName("importCsv throws when CSV is missing required headers")
    void importCsv_missingRequiredHeaders_throws() {
        var csv = "datetime,date,account_type,category,type,currency,transaction_id\n";

        assertThatThrownBy(() -> service.importCsv(toStream(csv)))
                .isInstanceOf(CsvParsingException.class)
                .hasMessageContaining("missing required header");
    }

    @Test
    @DisplayName("importCsv stops collecting errors after MAX_ERRORS is reached")
    void importCsv_tooManyErrors_throwsAtLimit() {
        var sb = new StringBuilder(HEADER).append("\n");
        for (int i = 0; i < 51; i++) {
            sb.append("\"2026-04-01T09:30:00Z\",\"2026-04-01\",\"DEFAULT\",\"CASH\","
                            + "\"BUY\",\"\",\"\",\"\",\"\",\"\","
                            + "\"\",\"\",\"\",\"EUR\",\"\",\"\",\"\","
                            + "\"\",\"00000000-0000-0000-0000-")
                    .append(String.format("%012d", i))
                    .append("\",\"\",\"\",\"\",\"\"\n");
        }

        assertThatThrownBy(() -> service.importCsv(toStream(sb.toString())))
                .isInstanceOf(CsvParsingException.class)
                .hasMessageContaining("Too many validation errors");
    }

    @Test
    @DisplayName("importCsv throws when CSV exceeds MAX_ROWS")
    void importCsv_exceedsMaxRows_throws() {
        var sb = new StringBuilder(HEADER).append("\n");
        for (int i = 0; i <= 50_000; i++) {
            sb.append("\"2026-04-01T09:30:00Z\",\"2026-04-01\",\"DEFAULT\",\"CASH\","
                            + "\"BUY\",\"\",\"\",\"\",\"\",\"\","
                            + "\"1.00\",\"\",\"\",\"EUR\",\"\",\"\",\"\","
                            + "\"\",\"00000000-0000-0000-0000-")
                    .append(String.format("%012d", i))
                    .append("\",\"\",\"\",\"\",\"\"\n");
        }

        assertThatThrownBy(() -> service.importCsv(toStream(sb.toString())))
                .isInstanceOf(CsvParsingException.class)
                .hasMessageContaining("maximum supported row count");
    }

    private static final String HEADER = "\"datetime\",\"date\",\"account_type\",\"category\",\"type\","
            + "\"asset_class\",\"name\",\"symbol\",\"shares\",\"price\","
            + "\"amount\",\"fee\",\"tax\",\"currency\",\"original_amount\","
            + "\"original_currency\",\"fx_rate\",\"description\",\"transaction_id\","
            + "\"counterparty_name\",\"counterparty_iban\",\"payment_reference\","
            + "\"mcc_code\"";

    private static String csvWithRow(String row) {
        return HEADER + "\n" + row + "\n";
    }

    private static ByteArrayInputStream toStream(String csv) {
        return new ByteArrayInputStream(csv.getBytes(StandardCharsets.UTF_8));
    }
}
