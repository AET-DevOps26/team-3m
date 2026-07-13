package de.devops26.kontor.core.marketdata;

public class InvalidMarketRangeException extends RuntimeException {

    public InvalidMarketRangeException(String param, String allowedParams) {
        super("Invalid range '" + param + "'; allowed values are " + allowedParams);
    }
}
