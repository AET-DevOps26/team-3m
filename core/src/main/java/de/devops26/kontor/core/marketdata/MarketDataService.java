package de.devops26.kontor.core.marketdata;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

@Service
public class MarketDataService {

    public static final String QUOTES_CACHE = "marketQuotes";
    public static final String HISTORY_CACHE = "marketHistory";

    private static final DateTimeFormatter INTRADAY_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final Pattern ISIN_PATTERN = Pattern.compile("[A-Z]{2}[A-Z0-9]{9}[0-9]");
    private static final String PREFERRED_LISTING_COUNTRY = "United States";

    private final TwelveDataClient client;
    private final Map<String, String> tickerByIsin = new ConcurrentHashMap<>();

    public MarketDataService(TwelveDataClient client) {
        this.client = client;
    }

    public InstrumentSearchResult search(String query) {
        if (query == null || query.isBlank()) {
            return new InstrumentSearchResult(List.of());
        }
        var payload = client.search(query.trim());
        var matches = payload.data().stream()
                .filter(MarketDataService::hasUsableSymbol)
                .map(match -> new InstrumentSearchResult.Match(
                        match.symbol(),
                        match.instrumentName(),
                        match.exchange(),
                        match.instrumentType(),
                        match.currency()))
                .toList();
        return new InstrumentSearchResult(matches);
    }

    @Cacheable(QUOTES_CACHE)
    public InstrumentQuoteResult getQuote(String symbol) {
        var payload = client.quote(resolveSymbol(symbol));
        if (payload.close() == null) {
            throw new MarketDataUnavailableException(
                    new IllegalStateException("Quote for '" + symbol + "' has no price"));
        }
        return new InstrumentQuoteResult(
                payload.symbol(),
                payload.name(),
                payload.currency(),
                payload.close(),
                payload.change(),
                payload.percentChange());
    }

    @Cacheable(value = HISTORY_CACHE, key = "#symbol + '-' + #range")
    public InstrumentHistoryResult getHistory(String symbol, MarketRange range) {
        var resolved = resolveSymbol(symbol);
        var payload = client.timeSeries(resolved, range);
        var series = payload.values().stream()
                .filter(value -> value.close() != null && value.datetime() != null)
                .map(value -> new InstrumentHistoryResult.PricePoint(parseTimestamp(value.datetime()), value.close()))
                .sorted(Comparator.comparing(InstrumentHistoryResult.PricePoint::timestamp))
                .toList();
        var meta = payload.meta();
        return new InstrumentHistoryResult(
                meta == null || meta.symbol() == null ? resolved : meta.symbol(),
                meta == null ? null : meta.currency(),
                range.param(),
                series);
    }

    private String resolveSymbol(String symbol) {
        if (symbol == null || !ISIN_PATTERN.matcher(symbol).matches()) {
            return symbol;
        }
        return tickerByIsin.computeIfAbsent(symbol, this::searchTicker);
    }

    private String searchTicker(String isin) {
        var candidates = client.search(isin).data().stream()
                .filter(MarketDataService::hasUsableSymbol)
                .toList();
        if (candidates.isEmpty()) {
            throw new UnknownSymbolException(isin);
        }
        return candidates.stream()
                .filter(match -> PREFERRED_LISTING_COUNTRY.equalsIgnoreCase(match.country()))
                .findFirst()
                .orElse(candidates.getFirst())
                .symbol();
    }

    private static boolean hasUsableSymbol(TwelveDataClient.SearchMatch match) {
        return match.symbol() != null && !match.symbol().isBlank();
    }

    private static OffsetDateTime parseTimestamp(String datetime) {
        try {
            return LocalDate.parse(datetime).atStartOfDay().atOffset(ZoneOffset.UTC);
        } catch (DateTimeParseException dateOnly) {
            try {
                return LocalDateTime.parse(datetime, INTRADAY_FORMAT).atOffset(ZoneOffset.UTC);
            } catch (DateTimeParseException intraday) {
                throw new MarketDataUnavailableException(intraday);
            }
        }
    }
}
