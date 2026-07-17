package de.devops26.kontor.core.marketdata;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import de.devops26.kontor.core.marketdata.TwelveDataClient.QuotePayload;
import de.devops26.kontor.core.marketdata.TwelveDataClient.SearchMatch;
import de.devops26.kontor.core.marketdata.TwelveDataClient.SearchPayload;
import de.devops26.kontor.core.marketdata.TwelveDataClient.TimeSeriesMeta;
import de.devops26.kontor.core.marketdata.TwelveDataClient.TimeSeriesPayload;
import de.devops26.kontor.core.marketdata.TwelveDataClient.TimeSeriesValue;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class MarketDataServiceTest {

    @Mock
    private TwelveDataClient client;

    private MarketDataService service;

    @BeforeEach
    void setUp() {
        service = new MarketDataService(client);
    }

    @Test
    @DisplayName("search with blank query returns empty result without calling upstream")
    void search_blankQuery_returnsEmptyWithoutUpstreamCall() {
        var result = service.search("   ");

        assertThat(result.matches()).isEmpty();
        verifyNoInteractions(client);
    }

    @Test
    @DisplayName("search trims the query and maps matches")
    void search_validQuery_mapsMatches() {
        when(client.search("apple"))
                .thenReturn(new SearchPayload(
                        List.of(new SearchMatch(
                                "AAPL", "Apple Inc.", "NASDAQ", "Common Stock", "USD", "United States")),
                        "ok",
                        null,
                        null));

        var result = service.search("  apple  ");

        assertThat(result.matches()).hasSize(1);
        var match = result.matches().getFirst();
        assertThat(match.symbol()).isEqualTo("AAPL");
        assertThat(match.name()).isEqualTo("Apple Inc.");
        assertThat(match.exchange()).isEqualTo("NASDAQ");
        assertThat(match.type()).isEqualTo("Common Stock");
        assertThat(match.currency()).isEqualTo("USD");
    }

    @Test
    @DisplayName("search drops matches without a symbol")
    void search_matchWithoutSymbol_isDropped() {
        when(client.search("apple"))
                .thenReturn(new SearchPayload(
                        List.of(
                                new SearchMatch(null, "Ghost", "X", "EQUITY", "USD", "United States"),
                                new SearchMatch(" ", "Blank", "X", "EQUITY", "USD", "United States"),
                                new SearchMatch(
                                        "AAPL", "Apple Inc.", "NASDAQ", "Common Stock", "USD", "United States")),
                        "ok",
                        null,
                        null));

        var result = service.search("apple");

        assertThat(result.matches()).hasSize(1);
        assertThat(result.matches().getFirst().symbol()).isEqualTo("AAPL");
    }

    @Test
    @DisplayName("getQuote maps payload fields onto the result")
    void getQuote_validPayload_mapsFields() {
        when(client.quote("AAPL"))
                .thenReturn(new QuotePayload(
                        "AAPL",
                        "Apple Inc.",
                        "USD",
                        new BigDecimal("308.235"),
                        new BigDecimal("13.855"),
                        new BigDecimal("4.7065"),
                        "ok",
                        null,
                        null));

        var result = service.getQuote("AAPL");

        assertThat(result.symbol()).isEqualTo("AAPL");
        assertThat(result.name()).isEqualTo("Apple Inc.");
        assertThat(result.currency()).isEqualTo("USD");
        assertThat(result.price()).isEqualByComparingTo(new BigDecimal("308.235"));
        assertThat(result.change()).isEqualByComparingTo(new BigDecimal("13.855"));
        assertThat(result.changePercent()).isEqualByComparingTo(new BigDecimal("4.7065"));
    }

    @Test
    @DisplayName("getQuote without a price raises MarketDataUnavailableException")
    void getQuote_missingClose_throwsUnavailable() {
        when(client.quote("AAPL"))
                .thenReturn(new QuotePayload("AAPL", "Apple Inc.", "USD", null, null, null, "ok", null, null));

        assertThatThrownBy(() -> service.getQuote("AAPL")).isInstanceOf(MarketDataUnavailableException.class);
    }

    @Test
    @DisplayName("getHistory sorts points ascending and drops null closes")
    void getHistory_unorderedValuesWithNulls_sortsAndFilters() {
        when(client.timeSeries("AAPL", MarketRange.ONE_MONTH))
                .thenReturn(new TimeSeriesPayload(
                        new TimeSeriesMeta("AAPL", "USD"),
                        List.of(
                                new TimeSeriesValue("2026-07-02", new BigDecimal("308.235")),
                                new TimeSeriesValue("2026-07-01", new BigDecimal("294.38")),
                                new TimeSeriesValue("2026-06-30", null),
                                new TimeSeriesValue("2026-06-29", new BigDecimal("287.11"))),
                        "ok",
                        null,
                        null));

        var result = service.getHistory("AAPL", MarketRange.ONE_MONTH);

        assertThat(result.symbol()).isEqualTo("AAPL");
        assertThat(result.currency()).isEqualTo("USD");
        assertThat(result.range()).isEqualTo("1M");
        assertThat(result.series()).hasSize(3);
        assertThat(result.series().stream()
                        .map(InstrumentHistoryResult.PricePoint::timestamp)
                        .toList())
                .isSorted();
        assertThat(result.series().getFirst().close()).isEqualByComparingTo(new BigDecimal("287.11"));
    }

    @Test
    @DisplayName("getHistory parses intraday and daily datetimes as UTC")
    void getHistory_mixedDatetimeFormats_parsesUtcTimestamps() {
        when(client.timeSeries("AAPL", MarketRange.ONE_DAY))
                .thenReturn(new TimeSeriesPayload(
                        new TimeSeriesMeta("AAPL", "USD"),
                        List.of(
                                new TimeSeriesValue("2026-07-02 19:55:00", new BigDecimal("308.235")),
                                new TimeSeriesValue("2026-07-01", new BigDecimal("294.38"))),
                        "ok",
                        null,
                        null));

        var result = service.getHistory("AAPL", MarketRange.ONE_DAY);

        assertThat(result.series().getFirst().timestamp())
                .isEqualTo(OffsetDateTime.of(2026, 7, 1, 0, 0, 0, 0, ZoneOffset.UTC));
        assertThat(result.series().getLast().timestamp())
                .isEqualTo(OffsetDateTime.of(2026, 7, 2, 19, 55, 0, 0, ZoneOffset.UTC));
    }

    @Test
    @DisplayName("getHistory with unparsable datetime raises MarketDataUnavailableException")
    void getHistory_invalidDatetime_throwsUnavailable() {
        when(client.timeSeries("AAPL", MarketRange.ONE_MONTH))
                .thenReturn(new TimeSeriesPayload(
                        new TimeSeriesMeta("AAPL", "USD"),
                        List.of(new TimeSeriesValue("02.07.2026", new BigDecimal("308.235"))),
                        "ok",
                        null,
                        null));

        assertThatThrownBy(() -> service.getHistory("AAPL", MarketRange.ONE_MONTH))
                .isInstanceOf(MarketDataUnavailableException.class);
    }

    @Test
    @DisplayName("getHistory falls back to the requested symbol when meta is missing")
    void getHistory_missingMeta_fallsBackToRequestedSymbol() {
        when(client.timeSeries("AAPL", MarketRange.ONE_MONTH))
                .thenReturn(new TimeSeriesPayload(null, List.of(), "ok", null, null));

        var result = service.getHistory("AAPL", MarketRange.ONE_MONTH);

        assertThat(result.symbol()).isEqualTo("AAPL");
        assertThat(result.currency()).isNull();
        assertThat(result.series()).isEmpty();
    }

    @Test
    @DisplayName("getQuote resolves an ISIN to a ticker via search before quoting")
    void getQuote_isinSymbol_resolvesToTicker() {
        when(client.search("US0378331005"))
                .thenReturn(new SearchPayload(
                        List.of(new SearchMatch(
                                "AAPL", "Apple Inc.", "NASDAQ", "Common Stock", "USD", "United States")),
                        "ok",
                        null,
                        null));
        when(client.quote("AAPL"))
                .thenReturn(new QuotePayload(
                        "AAPL",
                        "Apple Inc.",
                        "USD",
                        new BigDecimal("308.235"),
                        new BigDecimal("13.855"),
                        new BigDecimal("4.7065"),
                        "ok",
                        null,
                        null));

        var result = service.getQuote("US0378331005");

        assertThat(result.symbol()).isEqualTo("AAPL");
        verify(client).quote("AAPL");
    }

    @Test
    @DisplayName("getHistory resolves an ISIN to a ticker via search before fetching the series")
    void getHistory_isinSymbol_resolvesToTicker() {
        when(client.search("IE00B5BMR087"))
                .thenReturn(new SearchPayload(
                        List.of(new SearchMatch(
                                "CSPX", "iShares Core S&P 500 UCITS ETF", "LSE", "ETF", "USD", "United Kingdom")),
                        "ok",
                        null,
                        null));
        when(client.timeSeries("CSPX", MarketRange.ONE_MONTH))
                .thenReturn(new TimeSeriesPayload(
                        new TimeSeriesMeta("CSPX", "USD"),
                        List.of(new TimeSeriesValue("2026-07-01", new BigDecimal("560.10"))),
                        "ok",
                        null,
                        null));

        var result = service.getHistory("IE00B5BMR087", MarketRange.ONE_MONTH);

        assertThat(result.symbol()).isEqualTo("CSPX");
        verify(client).timeSeries("CSPX", MarketRange.ONE_MONTH);
    }

    @Test
    @DisplayName("ISIN resolution prefers a US listing over a non-US first match")
    void getQuote_isinWithNonUsFirstMatch_prefersUsListing() {
        when(client.search("IE00B5BMR087"))
                .thenReturn(new SearchPayload(
                        List.of(
                                new SearchMatch(
                                        "IS.FF702", "iShares Core S&P 500 UCITS ETF", "TASE", "ETF", "ILA", "Israel"),
                                new SearchMatch(
                                        "CSTNL",
                                        "iShares Core S&P 500 UCITS ETF",
                                        "OTC",
                                        "ETF",
                                        "USD",
                                        "United States")),
                        "ok",
                        null,
                        null));
        when(client.quote("CSTNL"))
                .thenReturn(new QuotePayload(
                        "CSTNL",
                        "iShares Core S&P 500 UCITS ETF",
                        "USD",
                        new BigDecimal("812.56"),
                        null,
                        null,
                        "ok",
                        null,
                        null));

        var result = service.getQuote("IE00B5BMR087");

        assertThat(result.symbol()).isEqualTo("CSTNL");
        verify(client).quote("CSTNL");
        verify(client, never()).quote("IS.FF702");
    }

    @Test
    @DisplayName("an ISIN with no search matches raises UnknownSymbolException without quoting")
    void getQuote_isinWithoutMatch_throwsUnknownSymbol() {
        when(client.search("US0378331005")).thenReturn(new SearchPayload(List.of(), "ok", null, null));

        assertThatThrownBy(() -> service.getQuote("US0378331005"))
                .isInstanceOf(UnknownSymbolException.class)
                .hasMessageContaining("US0378331005");
        verify(client, never()).quote(anyString());
    }

    @Test
    @DisplayName("ISIN resolution is cached across calls")
    void resolveSymbol_repeatedIsin_searchesOnce() {
        when(client.search("US0378331005"))
                .thenReturn(new SearchPayload(
                        List.of(new SearchMatch(
                                "AAPL", "Apple Inc.", "NASDAQ", "Common Stock", "USD", "United States")),
                        "ok",
                        null,
                        null));
        when(client.quote("AAPL"))
                .thenReturn(new QuotePayload(
                        "AAPL", "Apple Inc.", "USD", new BigDecimal("308.235"), null, null, "ok", null, null));

        service.getQuote("US0378331005");
        service.getQuote("US0378331005");

        verify(client, times(1)).search("US0378331005");
        verify(client, times(2)).quote("AAPL");
    }

    @Test
    @DisplayName("a plain ticker is quoted directly without a search call")
    void getQuote_tickerSymbol_skipsResolution() {
        when(client.quote("AAPL"))
                .thenReturn(new QuotePayload(
                        "AAPL", "Apple Inc.", "USD", new BigDecimal("308.235"), null, null, "ok", null, null));

        service.getQuote("AAPL");

        verify(client, never()).search(anyString());
    }
}
