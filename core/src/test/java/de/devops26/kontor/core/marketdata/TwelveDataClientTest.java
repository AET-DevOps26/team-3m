package de.devops26.kontor.core.marketdata;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withTooManyRequests;

import java.math.BigDecimal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class TwelveDataClientTest {

    private static final MarketDataProperties PROPERTIES =
            new MarketDataProperties("https://twelvedata.test", "test-key");

    private static final String SEARCH_BODY =
            "{\"data\":[{\"symbol\":\"AAPL\",\"instrument_name\":\"Apple Inc.\",\"exchange\":\"NASDAQ\","
                    + "\"instrument_type\":\"Common Stock\",\"country\":\"United States\",\"currency\":\"USD\"}],"
                    + "\"status\":\"ok\"}";

    private static final String QUOTE_BODY =
            "{\"symbol\":\"AAPL\",\"name\":\"Apple Inc.\",\"currency\":\"USD\",\"close\":\"308.235\","
                    + "\"change\":\"13.855\",\"percent_change\":\"4.7065\",\"is_market_open\":false}";

    private static final String TIME_SERIES_BODY = "{\"meta\":{\"symbol\":\"AAPL\",\"currency\":\"USD\"},"
            + "\"values\":[{\"datetime\":\"2026-07-02\",\"close\":\"308.235\"}],\"status\":\"ok\"}";

    private static final String NOT_FOUND_BODY = "{\"code\":404,\"message\":\"symbol not found\",\"status\":\"error\"}";

    private static final String RATE_LIMIT_BODY =
            "{\"code\":429,\"message\":\"rate limit reached\",\"status\":\"error\"}";

    private MockRestServiceServer server;
    private TwelveDataClient client;

    @BeforeEach
    void setUp() {
        var builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        client = new TwelveDataClient(builder, PROPERTIES);
    }

    @Test
    @DisplayName("search sends api key header and parses matches")
    void search_validQuery_parsesMatches() {
        server.expect(requestTo("https://twelvedata.test/symbol_search?symbol=apple&outputsize=10"))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "apikey test-key"))
                .andRespond(withSuccess(SEARCH_BODY, MediaType.APPLICATION_JSON));

        var payload = client.search("apple");

        assertThat(payload.data()).hasSize(1);
        var match = payload.data().getFirst();
        assertThat(match.symbol()).isEqualTo("AAPL");
        assertThat(match.instrumentName()).isEqualTo("Apple Inc.");
        assertThat(match.exchange()).isEqualTo("NASDAQ");
        assertThat(match.instrumentType()).isEqualTo("Common Stock");
        assertThat(match.currency()).isEqualTo("USD");
    }

    @Test
    @DisplayName("quote parses string numbers into BigDecimal")
    void quote_validSymbol_parsesNumbers() {
        server.expect(requestTo("https://twelvedata.test/quote?symbol=AAPL"))
                .andRespond(withSuccess(QUOTE_BODY, MediaType.APPLICATION_JSON));

        var payload = client.quote("AAPL");

        assertThat(payload.close()).isEqualByComparingTo(new BigDecimal("308.235"));
        assertThat(payload.change()).isEqualByComparingTo(new BigDecimal("13.855"));
        assertThat(payload.percentChange()).isEqualByComparingTo(new BigDecimal("4.7065"));
        assertThat(payload.name()).isEqualTo("Apple Inc.");
    }

    @Test
    @DisplayName("timeSeries requests the range's interval, output size, and UTC timezone")
    void timeSeries_range_buildsExpectedRequest() {
        server.expect(requestTo(
                        "https://twelvedata.test/time_series?symbol=AAPL&interval=1day&outputsize=22&timezone=UTC"))
                .andRespond(withSuccess(TIME_SERIES_BODY, MediaType.APPLICATION_JSON));

        var payload = client.timeSeries("AAPL", MarketRange.ONE_MONTH);

        assertThat(payload.meta().symbol()).isEqualTo("AAPL");
        assertThat(payload.values()).hasSize(1);
        assertThat(payload.values().getFirst().close()).isEqualByComparingTo(new BigDecimal("308.235"));
    }

    @Test
    @DisplayName("quote HTTP 404 raises UnknownSymbolException")
    void quote_http404_throwsUnknownSymbol() {
        server.expect(requestTo("https://twelvedata.test/quote?symbol=NOPE"))
                .andRespond(withStatus(HttpStatus.NOT_FOUND));

        assertThatThrownBy(() -> client.quote("NOPE"))
                .isInstanceOf(UnknownSymbolException.class)
                .hasMessageContaining("NOPE");
    }

    @Test
    @DisplayName("quote error body with code 404 raises UnknownSymbolException")
    void quote_errorBodyNotFound_throwsUnknownSymbol() {
        server.expect(requestTo("https://twelvedata.test/quote?symbol=NOPE"))
                .andRespond(withSuccess(NOT_FOUND_BODY, MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> client.quote("NOPE"))
                .isInstanceOf(UnknownSymbolException.class)
                .hasMessageContaining("NOPE");
    }

    @Test
    @DisplayName("search error body raises MarketDataUnavailableException")
    void search_errorBody_throwsUnavailable() {
        server.expect(requestTo("https://twelvedata.test/symbol_search?symbol=apple&outputsize=10"))
                .andRespond(withSuccess(RATE_LIMIT_BODY, MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> client.search("apple")).isInstanceOf(MarketDataUnavailableException.class);
    }

    @Test
    @DisplayName("quote rate-limit error body raises MarketDataUnavailableException")
    void quote_errorBodyRateLimit_throwsUnavailable() {
        server.expect(requestTo("https://twelvedata.test/quote?symbol=AAPL"))
                .andRespond(withSuccess(RATE_LIMIT_BODY, MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> client.quote("AAPL")).isInstanceOf(MarketDataUnavailableException.class);
    }

    @Test
    @DisplayName("quote HTTP 429 raises MarketDataUnavailableException")
    void quote_http429_throwsUnavailable() {
        server.expect(requestTo("https://twelvedata.test/quote?symbol=AAPL")).andRespond(withTooManyRequests());

        assertThatThrownBy(() -> client.quote("AAPL")).isInstanceOf(MarketDataUnavailableException.class);
    }

    @Test
    @DisplayName("quote HTTP 500 raises MarketDataUnavailableException")
    void quote_http500_throwsUnavailable() {
        server.expect(requestTo("https://twelvedata.test/quote?symbol=AAPL")).andRespond(withServerError());

        assertThatThrownBy(() -> client.quote("AAPL")).isInstanceOf(MarketDataUnavailableException.class);
    }

    @Test
    @DisplayName("blank api key raises MarketDataUnavailableException without calling upstream")
    void quote_blankApiKey_throwsNotConfigured() {
        var unconfigured = new TwelveDataClient(RestClient.builder(), new MarketDataProperties("http://x", ""));

        assertThatThrownBy(() -> unconfigured.quote("AAPL"))
                .isInstanceOf(MarketDataUnavailableException.class)
                .hasMessageContaining("not configured");
    }
}
