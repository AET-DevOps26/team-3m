package de.devops26.kontor.core.portfolio;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneOffset;
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

    // Fixed "today" used across all tests so results are deterministic.
    private static final LocalDate TODAY = LocalDate.of(2026, 4, 10);

    @BeforeEach
    void setUp() {
        service = new PortfolioPerformanceService(repository);
    }

    @Test
    @DisplayName("no transactions returns empty snapshots")
    void buildSnapshots_empty_returnsEmpty() {
        var result = service.buildSnapshots(List.of(), TODAY);

        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("cash deposit fills every day forward to today with the same value")
    void buildSnapshots_singleDeposit_fillsToToday() {
        // Deposit on Apr 1, today is Apr 3 → transaction snapshot + 2 carry-forward days = 3
        var result = service.buildSnapshots(List.of(cashTx("2026-04-01", "3200")), LocalDate.of(2026, 4, 3));

        assertThat(result).hasSize(3);
        assertThat(result.getFirst().datetime().toLocalDate()).isEqualTo(LocalDate.of(2026, 4, 1));
        assertThat(result.getFirst().value()).isEqualByComparingTo("3200");
        assertThat(result.getFirst().cashValue()).isEqualByComparingTo("3200");
        assertThat(result.getFirst().investmentValue()).isEqualByComparingTo("0");
        assertThat(result.getLast().datetime().toLocalDate()).isEqualTo(LocalDate.of(2026, 4, 3));
        assertThat(result.getLast().value()).isEqualByComparingTo("3200");
    }

    @Test
    @DisplayName("buy keeps total flat; fill days between deposit and buy carry the deposit value")
    void buildSnapshots_buy_keepsTotalFlat() {
        // Deposit Apr 1, BUY Apr 3, today Apr 3 → deposit + carry-forward Apr 2 + buy = 3
        var deposit = cashTx("2026-04-01", "3200");
        var buy = tradeTx("2026-04-03", "BUY", "AAPL", "5", "192.34", "-961.70");
        var result = service.buildSnapshots(List.of(deposit, buy), LocalDate.of(2026, 4, 3));

        assertThat(result).hasSize(3);
        assertThat(result.get(0).value()).isEqualByComparingTo("3200"); // after deposit
        assertThat(result.get(0).cashValue()).isEqualByComparingTo("3200");
        assertThat(result.get(0).investmentValue()).isEqualByComparingTo("0");
        assertThat(result.get(1).value()).isEqualByComparingTo("3200"); // carry-forward Apr 2
        assertThat(result.get(2).value()).isEqualByComparingTo("3200"); // after BUY (cash out = holdings in)
        assertThat(result.get(2).cashValue()).isEqualByComparingTo("2238.30");
        assertThat(result.get(2).investmentValue()).isEqualByComparingTo("961.70");
    }

    @Test
    @DisplayName("cash outflow reduces value; remaining days carry the reduced value forward")
    void buildSnapshots_outflow_reducesAndFills() {
        var deposit = cashTx("2026-04-01", "3200");
        var outflow = cashTx("2026-04-03", "-500");
        var result = service.buildSnapshots(List.of(deposit, outflow), LocalDate.of(2026, 4, 5));

        // Apr 1(3200), Apr 2(3200 carry-forward), Apr 3(2700), Apr 4(2700 carry-forward), Apr 5(2700)
        assertThat(result).hasSize(5);
        assertThat(result.get(0).value()).isEqualByComparingTo("3200");
        assertThat(result.get(1).value()).isEqualByComparingTo("3200");
        assertThat(result.get(2).value()).isEqualByComparingTo("2700");
        assertThat(result.get(3).value()).isEqualByComparingTo("2700");
        assertThat(result.get(4).value()).isEqualByComparingTo("2700");
    }

    @Test
    @DisplayName("multiple transactions on the same date each get their own snapshot")
    void buildSnapshots_sameDay_emitsOneSnapshotPerTransaction() {
        var tx1 = cashTx("2026-04-01", "1000");
        var tx2 = cashTx("2026-04-01", "500");
        var result = service.buildSnapshots(List.of(tx1, tx2), LocalDate.of(2026, 4, 1));

        assertThat(result).hasSize(2);
        assertThat(result.get(0).value()).isEqualByComparingTo("1000");
        assertThat(result.get(1).value()).isEqualByComparingTo("1500");
    }

    @Test
    @DisplayName("sell at gain increases total; filled days after the sell carry the new value")
    void buildSnapshots_sellAtGain_increasesAndFills() {
        var deposit = cashTx("2026-04-01", "1000");
        var buy = tradeTx("2026-04-02", "BUY", "AAPL", "5", "100", "-500");
        var sell = tradeTx("2026-04-03", "SELL", "AAPL", "5", "120", "600");
        var result = service.buildSnapshots(List.of(deposit, buy, sell), LocalDate.of(2026, 4, 5));

        // Apr 1(1000), Apr 2(1000 buy flat), Apr 3(1100 gain), Apr 4(carry-forward), Apr 5(carry-forward)
        assertThat(result).hasSize(5);
        assertThat(result.get(0).value()).isEqualByComparingTo("1000");
        assertThat(result.get(1).value()).isEqualByComparingTo("1000");
        assertThat(result.get(2).value()).isEqualByComparingTo("1100");
        assertThat(result.get(3).value()).isEqualByComparingTo("1100");
        assertThat(result.get(4).value()).isEqualByComparingTo("1100");
    }

    @Test
    @DisplayName("selling more shares than held caps investment at zero instead of going negative")
    void buildSnapshots_sellExceedsHoldings_capsAtZero() {
        var deposit = cashTx("2026-04-01", "1000");
        var buy = tradeTx("2026-04-02", "BUY", "AAPL", "8", "100", "-800");
        var sell = tradeTx("2026-04-03", "SELL", "AAPL", "220", "120", "26400");
        var result = service.buildSnapshots(List.of(deposit, buy, sell), LocalDate.of(2026, 4, 3));

        var last = result.getLast();
        assertThat(last.investmentValue()).isEqualByComparingTo("0");
        assertThat(last.cashValue()).isEqualByComparingTo("26600"); // 1000 - 800 + 26400
    }

    @Test
    @DisplayName("snapshots are in chronological order with no gaps")
    void buildSnapshots_chronologicalAndContiguous() {
        var tx1 = cashTx("2026-04-01", "1000");
        var tx2 = cashTx("2026-04-05", "200");
        var result = service.buildSnapshots(List.of(tx1, tx2), LocalDate.of(2026, 4, 7));

        // Apr 1 through Apr 7 = 7 consecutive days (all at midnight UTC via helpers/carry-forward)
        assertThat(result).hasSize(7);
        for (int i = 0; i < result.size() - 1; i++) {
            assertThat(result.get(i).datetime().plusDays(1))
                    .isEqualTo(result.get(i + 1).datetime());
        }
    }

    @Test
    @DisplayName("getPerformance returns currency and non-empty snapshots after a deposit")
    void getPerformance_delegatesToRepository() {
        when(repository.findTransactionsForPerformance(any())).thenReturn(List.of(cashTx("2026-04-01", "3200")));
        when(repository.findPrimaryCurrency(any())).thenReturn("EUR");

        var result = service.getPerformance(UUID.randomUUID());

        assertThat(result.currency()).isEqualTo("EUR");
        assertThat(result.snapshots()).isNotEmpty();
        assertThat(result.snapshots().getFirst().value()).isEqualByComparingTo("3200");
    }

    // --- helpers ---

    private static TransactionRow cashTx(String date, String amount) {
        var localDate = LocalDate.parse(date);
        return new TransactionRow(
                localDate.atStartOfDay().atOffset(ZoneOffset.UTC),
                localDate,
                "CUSTOMER_INBOUND",
                null,
                null,
                null,
                new BigDecimal(amount));
    }

    private static TransactionRow tradeTx(
            String date, String type, String symbol, String shares, String price, String amount) {
        var localDate = LocalDate.parse(date);
        return new TransactionRow(
                localDate.atStartOfDay().atOffset(ZoneOffset.UTC),
                localDate,
                type,
                symbol,
                new BigDecimal(shares),
                new BigDecimal(price),
                new BigDecimal(amount));
    }
}
