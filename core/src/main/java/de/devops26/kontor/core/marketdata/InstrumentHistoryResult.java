package de.devops26.kontor.core.marketdata;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public record InstrumentHistoryResult(String symbol, String currency, String range, List<PricePoint> series) {

    public InstrumentHistoryResult {
        series = series == null ? List.of() : List.copyOf(series);
    }

    public record PricePoint(OffsetDateTime timestamp, BigDecimal close) {}
}
