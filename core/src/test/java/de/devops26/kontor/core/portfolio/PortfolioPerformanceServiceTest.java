package de.devops26.kontor.core.portfolio;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PortfolioPerformanceServiceTest {

    @Mock
    private PortfolioRepository repository;

    private PortfolioPerformanceService service;

    @BeforeEach
    void setUp() {
        service = new PortfolioPerformanceService(repository);
    }

    @Test
    @DisplayName("getPerformance with no transactions returns empty snapshots")
    void getPerformance_noTransactions_returnsEmpty() {
        when(repository.findTransactionsForPerformance(any())).thenReturn(List.of());
        when(repository.findPrimaryCurrency(any())).thenReturn("EUR");

        var result = service.getPerformance(UUID.randomUUID());

        assertThat(result.snapshots()).isEmpty();
        assertThat(result.currency()).isEqualTo("EUR");
    }

    @Test
    @DisplayName("getPerformance cash deposit creates a snapshot with that value")
    void getPerformance_cashDeposit_recordsValue() {
        var tx = cashTx("2026-04-01", "3200");
        when(repository.findTransactionsForPerformance(any())).thenReturn(List.of(tx));
        when(repository.findPrimaryCurrency(any())).thenReturn("EUR");

        var result = service.getPerformance(UUID.randomUUID());

        assertThat(result.snapshots()).hasSize(1);
        assertThat(result.snapshots().getFirst().value()).isEqualByComparingTo("3200");
    }

    @Test
    @DisplayName("getPerformance buy keeps total value flat (cash out = holdings in)")
    void getPerformance_buyTransaction_totalUnchanged() {
        var deposit = cashTx("2026-04-01", "3200");
        var buy = tradeTx("2026-04-03", "BUY", "AAPL", "5", "192.34", "-961.70");
        when(repository.findTransactionsForPerformance(any())).thenReturn(List.of(deposit, buy));
        when(repository.findPrimaryCurrency(any())).thenReturn("EUR");

        var result = service.getPerformance(UUID.randomUUID());

        assertThat(result.snapshots()).hasSize(2);
        assertThat(result.snapshots().get(0).value()).isEqualByComparingTo("3200");
        // cash=2238.30, AAPL=5×192.34=961.70, total=3200
        assertThat(result.snapshots().get(1).value()).isEqualByComparingTo("3200");
    }

    @Test
    @DisplayName("getPerformance cash outflow reduces total value")
    void getPerformance_cashOutflow_reducesTotal() {
        var deposit = cashTx("2026-04-01", "3200");
        var outflow = cashTx("2026-04-08", "-500");
        when(repository.findTransactionsForPerformance(any())).thenReturn(List.of(deposit, outflow));
        when(repository.findPrimaryCurrency(any())).thenReturn("EUR");

        var result = service.getPerformance(UUID.randomUUID());

        assertThat(result.snapshots()).hasSize(2);
        assertThat(result.snapshots().get(1).value()).isEqualByComparingTo("2700");
    }

    @Test
    @DisplayName("getPerformance multiple transactions same day produce single snapshot")
    void getPerformance_sameDay_singleSnapshot() {
        var tx1 = cashTx("2026-04-01", "1000");
        var tx2 = cashTx("2026-04-01", "500");
        when(repository.findTransactionsForPerformance(any())).thenReturn(List.of(tx1, tx2));
        when(repository.findPrimaryCurrency(any())).thenReturn("EUR");

        var result = service.getPerformance(UUID.randomUUID());

        assertThat(result.snapshots()).hasSize(1);
        assertThat(result.snapshots().getFirst().value()).isEqualByComparingTo("1500");
    }

    @Test
    @DisplayName("getPerformance sell at higher price increases total value")
    void getPerformance_sellAtGain_increasesTotal() {
        var deposit = cashTx("2026-04-01", "1000");
        var buy = tradeTx("2026-04-02", "BUY", "AAPL", "5", "100", "-500");
        var sell = tradeTx("2026-04-03", "SELL", "AAPL", "5", "120", "600");
        when(repository.findTransactionsForPerformance(any())).thenReturn(List.of(deposit, buy, sell));
        when(repository.findPrimaryCurrency(any())).thenReturn("EUR");

        var result = service.getPerformance(UUID.randomUUID());

        assertThat(result.snapshots()).hasSize(3);
        assertThat(result.snapshots().get(0).value()).isEqualByComparingTo("1000");
        assertThat(result.snapshots().get(1).value()).isEqualByComparingTo("1000");
        // cash=1100, AAPL=0 shares → total=1100
        assertThat(result.snapshots().get(2).value()).isEqualByComparingTo("1100");
    }

    @Test
    @DisplayName("getPerformance snapshots are returned in chronological order")
    void getPerformance_returnsChronologicalOrder() {
        var tx1 = cashTx("2026-04-01", "1000");
        var tx2 = cashTx("2026-04-05", "200");
        var tx3 = cashTx("2026-04-10", "-100");
        when(repository.findTransactionsForPerformance(any())).thenReturn(List.of(tx1, tx2, tx3));
        when(repository.findPrimaryCurrency(any())).thenReturn("EUR");

        var result = service.getPerformance(UUID.randomUUID());

        assertThat(result.snapshots()).hasSize(3);
        assertThat(result.snapshots().get(0).date()).isEqualTo(LocalDate.of(2026, 4, 1));
        assertThat(result.snapshots().get(1).date()).isEqualTo(LocalDate.of(2026, 4, 5));
        assertThat(result.snapshots().get(2).date()).isEqualTo(LocalDate.of(2026, 4, 10));
    }

    // --- helpers ---

    private static TransactionRow cashTx(String date, String amount) {
        return new TransactionRow(LocalDate.parse(date), "CUSTOMER_INBOUND", null, null, null, new BigDecimal(amount));
    }

    private static TransactionRow tradeTx(
            String date, String type, String symbol, String shares, String price, String amount) {
        return new TransactionRow(
                LocalDate.parse(date),
                type,
                symbol,
                new BigDecimal(shares),
                new BigDecimal(price),
                new BigDecimal(amount));
    }
}
