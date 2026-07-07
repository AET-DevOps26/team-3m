package de.devops26.kontor.core.marketdata;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.util.List;
import java.util.function.Supplier;
import org.springframework.http.HttpHeaders;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

public class TwelveDataClient {

    private static final int SEARCH_RESULT_LIMIT = 10;

    private final RestClient restClient;
    private final MarketDataProperties properties;

    public TwelveDataClient(RestClient.Builder builder, MarketDataProperties properties) {
        this.properties = properties;
        this.restClient = builder.baseUrl(properties.baseUrl())
                .defaultHeader(HttpHeaders.AUTHORIZATION, "apikey " + properties.apiKey())
                .build();
    }

    public SearchPayload search(String query) {
        return fetch(
                null,
                () -> restClient
                        .get()
                        .uri(uri -> uri.path("/symbol_search")
                                .queryParam("symbol", query)
                                .queryParam("outputsize", SEARCH_RESULT_LIMIT)
                                .build())
                        .retrieve()
                        .body(SearchPayload.class));
    }

    public QuotePayload quote(String symbol) {
        return fetch(
                symbol,
                () -> restClient
                        .get()
                        .uri(uri ->
                                uri.path("/quote").queryParam("symbol", symbol).build())
                        .retrieve()
                        .body(QuotePayload.class));
    }

    public TimeSeriesPayload timeSeries(String symbol, MarketRange range) {
        return fetch(
                symbol,
                () -> restClient
                        .get()
                        .uri(uri -> uri.path("/time_series")
                                .queryParam("symbol", symbol)
                                .queryParam("interval", range.interval())
                                .queryParam("outputsize", range.outputSize())
                                .queryParam("timezone", "UTC")
                                .build())
                        .retrieve()
                        .body(TimeSeriesPayload.class));
    }

    private <T extends TwelveDataPayload> T fetch(String symbol, Supplier<T> call) {
        if (properties.apiKey().isBlank()) {
            throw new MarketDataUnavailableException("Live market data is not configured");
        }
        T payload;
        try {
            payload = call.get();
        } catch (RestClientResponseException e) {
            if (symbol != null && isNotFoundStatus(e.getStatusCode().value())) {
                throw new UnknownSymbolException(symbol);
            }
            throw new MarketDataUnavailableException(e);
        } catch (RestClientException e) {
            throw new MarketDataUnavailableException(e);
        }
        if (payload == null) {
            throw new MarketDataUnavailableException(
                    new IllegalStateException("Twelve Data returned an empty response body"));
        }
        if (payload.isError()) {
            if (symbol != null && payload.code() != null && isNotFoundStatus(payload.code())) {
                throw new UnknownSymbolException(symbol);
            }
            throw new MarketDataUnavailableException(
                    new IllegalStateException("Twelve Data error " + payload.code() + ": " + payload.message()));
        }
        return payload;
    }

    private static boolean isNotFoundStatus(int status) {
        return status == 404;
    }

    public interface TwelveDataPayload {
        String status();

        Integer code();

        String message();

        default boolean isError() {
            return "error".equals(status());
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SearchPayload(List<SearchMatch> data, String status, Integer code, String message)
            implements TwelveDataPayload {

        public SearchPayload {
            data = data == null ? List.of() : List.copyOf(data);
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SearchMatch(
            String symbol,
            @JsonProperty("instrument_name") String instrumentName,
            String exchange,
            @JsonProperty("instrument_type") String instrumentType,
            String currency) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record QuotePayload(
            String symbol,
            String name,
            String currency,
            BigDecimal close,
            BigDecimal change,
            @JsonProperty("percent_change") BigDecimal percentChange,
            String status,
            Integer code,
            String message)
            implements TwelveDataPayload {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record TimeSeriesPayload(
            TimeSeriesMeta meta, List<TimeSeriesValue> values, String status, Integer code, String message)
            implements TwelveDataPayload {

        public TimeSeriesPayload {
            values = values == null ? List.of() : List.copyOf(values);
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record TimeSeriesMeta(String symbol, String currency) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record TimeSeriesValue(String datetime, BigDecimal close) {}
}
