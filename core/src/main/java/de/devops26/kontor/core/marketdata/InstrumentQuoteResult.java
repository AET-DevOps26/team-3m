package de.devops26.kontor.core.marketdata;

import java.math.BigDecimal;

public record InstrumentQuoteResult(
        String symbol, String name, String currency, BigDecimal price, BigDecimal change, BigDecimal changePercent) {}
