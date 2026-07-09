package de.devops26.kontor.core.marketdata;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import de.devops26.kontor.core.marketdata.TwelveDataClient.QuotePayload;
import de.devops26.kontor.core.marketdata.TwelveDataClient.SearchMatch;
import de.devops26.kontor.core.marketdata.TwelveDataClient.SearchPayload;
import de.devops26.kontor.core.marketdata.TwelveDataClient.TimeSeriesMeta;
import de.devops26.kontor.core.marketdata.TwelveDataClient.TimeSeriesPayload;
import de.devops26.kontor.core.marketdata.TwelveDataClient.TimeSeriesValue;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = "spring.datasource.url=jdbc:tc:postgresql:18-trixie:///marketdata")
@AutoConfigureMockMvc
@ActiveProfiles("test")
class MarketDataIntegrationTest {

    private static final String USER_SUB = "auth-provider|alice-marketdata";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private TwelveDataClient twelveDataClient;

    @Test
    @DisplayName("GET /search without bearer token returns 401")
    void search_withoutToken_returns401() throws Exception {
        mockMvc.perform(get("/api/v1/market-data/search").param("q", "apple")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /search returns matching instruments in the envelope")
    void search_validQuery_returnsMatches() throws Exception {
        when(twelveDataClient.search("apple"))
                .thenReturn(new SearchPayload(
                        List.of(new SearchMatch("AAPL", "Apple Inc.", "NASDAQ", "Common Stock", "USD")),
                        "ok",
                        null,
                        null));

        mockMvc.perform(get("/api/v1/market-data/search").param("q", "apple").with(userJwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.matches[0].symbol").value("AAPL"))
                .andExpect(jsonPath("$.data.matches[0].name").value("Apple Inc."))
                .andExpect(jsonPath("$.data.matches[0].exchange").value("NASDAQ"));
    }

    @Test
    @DisplayName("GET /quotes/{symbol} returns the current quote")
    void getQuote_validSymbol_returnsQuote() throws Exception {
        when(twelveDataClient.quote("AAPL"))
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

        mockMvc.perform(get("/api/v1/market-data/quotes/AAPL").with(userJwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.symbol").value("AAPL"))
                .andExpect(jsonPath("$.data.price").value(308.235))
                .andExpect(jsonPath("$.data.changePercent").value(4.7065));
    }

    @Test
    @DisplayName("GET /quotes/{symbol}/history returns the price series")
    void getQuoteHistory_validSymbol_returnsSeries() throws Exception {
        when(twelveDataClient.timeSeries("AAPL", MarketRange.ONE_MONTH))
                .thenReturn(new TimeSeriesPayload(
                        new TimeSeriesMeta("AAPL", "USD"),
                        List.of(
                                new TimeSeriesValue("2026-07-02", new BigDecimal("308.235")),
                                new TimeSeriesValue("2026-07-01", new BigDecimal("294.38"))),
                        "ok",
                        null,
                        null));

        mockMvc.perform(get("/api/v1/market-data/quotes/AAPL/history")
                        .param("range", "1M")
                        .with(userJwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.range").value("1M"))
                .andExpect(jsonPath("$.data.series.length()").value(2))
                .andExpect(jsonPath("$.data.series[0].close").value(294.38));
    }

    @Test
    @DisplayName("GET /quotes/{symbol} for an unknown symbol returns 404 envelope")
    void getQuote_unknownSymbol_returns404() throws Exception {
        when(twelveDataClient.quote("NOPE")).thenThrow(new UnknownSymbolException("NOPE"));

        mockMvc.perform(get("/api/v1/market-data/quotes/NOPE").with(userJwt()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").value("No instrument found for symbol 'NOPE'"));
    }

    @Test
    @DisplayName("GET /search when the provider is down returns 502 envelope")
    void search_providerUnavailable_returns502() throws Exception {
        when(twelveDataClient.search(anyString()))
                .thenThrow(new MarketDataUnavailableException(new IllegalStateException("boom")));

        mockMvc.perform(get("/api/v1/market-data/search").param("q", "apple").with(userJwt()))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error")
                        .value("Live market data is temporarily unavailable. Please try again later."));
    }

    @Test
    @DisplayName("GET /quotes/{symbol}/history with an invalid range returns 400 without upstream call")
    void getQuoteHistory_invalidRange_returns400() throws Exception {
        mockMvc.perform(get("/api/v1/market-data/quotes/AAPL/history")
                        .param("range", "13M")
                        .with(userJwt()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").value("Invalid range '13M'; allowed values are 1D, 1W, 1M, 1Y, MAX"));

        verify(twelveDataClient, never()).timeSeries(anyString(), any());
    }

    private static SecurityMockMvcRequestPostProcessors.JwtRequestPostProcessor userJwt() {
        return jwt().jwt(builder ->
                builder.subject(USER_SUB).claim("preferred_username", "alice").claim("email", "alice@kontor.test"));
    }
}
