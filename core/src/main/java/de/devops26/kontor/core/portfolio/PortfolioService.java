package de.devops26.kontor.core.portfolio;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class PortfolioService {

    private final PortfolioRepository repository;

    public PortfolioService(PortfolioRepository repository) {
        this.repository = repository;
    }

    public PortfolioOverview getOverview(UUID userId) {
        List<PortfolioHolding> holdings = repository.findHoldings(userId);
        BigDecimal cashBalance = repository.findCashBalance(userId);
        String currency = repository.findPrimaryCurrency(userId);

        BigDecimal holdingsValue =
                holdings.stream().map(PortfolioHolding::currentValue).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalValue = cashBalance.add(holdingsValue);

        return new PortfolioOverview(List.copyOf(holdings), cashBalance, currency, totalValue);
    }
}
