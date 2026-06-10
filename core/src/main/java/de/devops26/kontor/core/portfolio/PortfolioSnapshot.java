package de.devops26.kontor.core.portfolio;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record PortfolioSnapshot(
        OffsetDateTime datetime, BigDecimal value, BigDecimal cashValue, BigDecimal investmentValue) {}
