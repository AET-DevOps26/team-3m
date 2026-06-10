package de.devops26.kontor.core.portfolio;

import java.util.List;

public record PortfolioPerformance(List<PortfolioSnapshot> snapshots, String currency) {}
