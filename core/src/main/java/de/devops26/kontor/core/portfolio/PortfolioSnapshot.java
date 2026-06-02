package de.devops26.kontor.core.portfolio;

import java.math.BigDecimal;
import java.time.LocalDate;

public record PortfolioSnapshot(LocalDate date, BigDecimal value) {}
