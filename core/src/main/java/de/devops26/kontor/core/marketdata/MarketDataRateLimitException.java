package de.devops26.kontor.core.marketdata;

public class MarketDataRateLimitException extends MarketDataUnavailableException {

    private static final String MESSAGE =
            "Live market data is temporarily paused because the market-data provider's request limit was reached. "
                    + "This is a limit on the provider's side, not a problem with Kontor — "
                    + "please wait about a minute and try again.";

    public MarketDataRateLimitException(Throwable cause) {
        super(MESSAGE, cause);
    }
}
