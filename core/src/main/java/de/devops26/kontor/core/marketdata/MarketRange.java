package de.devops26.kontor.core.marketdata;

import java.util.Arrays;
import java.util.stream.Collectors;

public enum MarketRange {
    ONE_DAY("1D", "5min", 78),
    ONE_WEEK("1W", "30min", 65),
    ONE_MONTH("1M", "1day", 22),
    ONE_YEAR("1Y", "1day", 252),
    MAX("MAX", "1month", 5000);

    private final String param;
    private final String interval;
    private final int outputSize;

    MarketRange(String param, String interval, int outputSize) {
        this.param = param;
        this.interval = interval;
        this.outputSize = outputSize;
    }

    public static MarketRange fromParam(String param) {
        return Arrays.stream(values())
                .filter(range -> range.param.equals(param))
                .findFirst()
                .orElseThrow(() -> new InvalidMarketRangeException(param, allowedParams()));
    }

    private static String allowedParams() {
        return Arrays.stream(values()).map(MarketRange::param).collect(Collectors.joining(", "));
    }

    public String param() {
        return param;
    }

    public String interval() {
        return interval;
    }

    public int outputSize() {
        return outputSize;
    }
}
