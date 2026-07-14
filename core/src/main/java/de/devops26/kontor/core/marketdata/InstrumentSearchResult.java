package de.devops26.kontor.core.marketdata;

import java.util.List;

public record InstrumentSearchResult(List<Match> matches) {

    public InstrumentSearchResult {
        matches = matches == null ? List.of() : List.copyOf(matches);
    }

    public record Match(String symbol, String name, String exchange, String type, String currency) {}
}
