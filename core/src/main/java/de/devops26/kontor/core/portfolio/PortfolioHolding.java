package de.devops26.kontor.core.portfolio;

import java.math.BigDecimal;

public record PortfolioHolding(
        String symbol,
        String name,
        String assetClass,
        String currency,
        BigDecimal shares,
        BigDecimal lastPrice,
        BigDecimal currentValue) {}
