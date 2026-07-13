package de.devops26.kontor.core.marketdata;

public class MarketDataUnavailableException extends RuntimeException {

    private static final String DEFAULT_MESSAGE =
            "Live market data is temporarily unavailable. Please try again later.";

    public MarketDataUnavailableException(Throwable cause) {
        super(DEFAULT_MESSAGE, cause);
    }

    public MarketDataUnavailableException(String message) {
        super(message);
    }
}
