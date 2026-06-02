package de.devops26.kontor.core.portfolio;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PortfolioServiceTest {

    @Mock
    private PortfolioRepository repository;

    private PortfolioService service;

    private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");

    @BeforeEach
    void setUp() {
        service = new PortfolioService(repository);
    }

    @Test
    @DisplayName("getOverview returns overview with holdings and cash balance")
    void getOverview_withHoldingsAndCash_returnsCorrectTotals() {
        var holding = new PortfolioHolding(
                "US0378331005",
                "Apple",
                "STOCK",
                "EUR",
                new BigDecimal("3"),
                new BigDecimal("200"),
                new BigDecimal("600"));
        when(repository.findHoldings(USER_ID)).thenReturn(List.of(holding));
        when(repository.findCashBalance(USER_ID)).thenReturn(new BigDecimal("723.76"));
        when(repository.findPrimaryCurrency(USER_ID)).thenReturn("EUR");

        var overview = service.getOverview(USER_ID);

        assertThat(overview.holdings()).hasSize(1);
        assertThat(overview.holdings().get(0).symbol()).isEqualTo("US0378331005");
        assertThat(overview.cashBalance()).isEqualByComparingTo("723.76");
        assertThat(overview.currency()).isEqualTo("EUR");
        assertThat(overview.totalValue()).isEqualByComparingTo("1323.76");
    }

    @Test
    @DisplayName("getOverview with no transactions returns zero totals")
    void getOverview_noTransactions_returnsZeroTotals() {
        when(repository.findHoldings(USER_ID)).thenReturn(List.of());
        when(repository.findCashBalance(USER_ID)).thenReturn(BigDecimal.ZERO);
        when(repository.findPrimaryCurrency(USER_ID)).thenReturn("EUR");

        var overview = service.getOverview(USER_ID);

        assertThat(overview.holdings()).isEmpty();
        assertThat(overview.cashBalance()).isEqualByComparingTo("0");
        assertThat(overview.totalValue()).isEqualByComparingTo("0");
    }

    @Test
    @DisplayName("getOverview totalValue sums all holdings and cash")
    void getOverview_multipleHoldings_sumsTotalCorrectly() {
        var holding1 = new PortfolioHolding(
                "US0378331005",
                "Apple",
                "STOCK",
                "EUR",
                new BigDecimal("3"),
                new BigDecimal("200"),
                new BigDecimal("600"));
        var holding2 = new PortfolioHolding(
                "IE00B4L5Y983",
                "Core MSCI World",
                "FUND",
                "EUR",
                new BigDecimal("12"),
                new BigDecimal("90"),
                new BigDecimal("1080"));
        when(repository.findHoldings(USER_ID)).thenReturn(List.of(holding1, holding2));
        when(repository.findCashBalance(USER_ID)).thenReturn(new BigDecimal("320"));
        when(repository.findPrimaryCurrency(USER_ID)).thenReturn("EUR");

        var overview = service.getOverview(USER_ID);

        assertThat(overview.totalValue()).isEqualByComparingTo("2000");
    }

    @Test
    @DisplayName("getOverview holdings list is immutable")
    void getOverview_returnsImmutableHoldingsList() {
        when(repository.findHoldings(USER_ID)).thenReturn(List.of());
        when(repository.findCashBalance(USER_ID)).thenReturn(BigDecimal.ZERO);
        when(repository.findPrimaryCurrency(USER_ID)).thenReturn("EUR");

        var overview = service.getOverview(USER_ID);

        assertThat(overview.holdings()).isUnmodifiable();
    }
}
