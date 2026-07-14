package de.devops26.kontor.core.marketdata;

public class UnknownSymbolException extends RuntimeException {

    public UnknownSymbolException(String symbol) {
        super("No instrument found for symbol '" + symbol + "'");
    }
}
