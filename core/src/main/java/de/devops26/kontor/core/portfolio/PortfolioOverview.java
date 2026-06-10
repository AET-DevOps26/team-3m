package de.devops26.kontor.core.portfolio;

import java.math.BigDecimal;
import java.util.List;

public record PortfolioOverview(
        List<PortfolioHolding> holdings, BigDecimal cashBalance, String currency, BigDecimal totalValue) {}
