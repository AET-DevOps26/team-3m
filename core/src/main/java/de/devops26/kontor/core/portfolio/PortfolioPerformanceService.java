package de.devops26.kontor.core.portfolio;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class PortfolioPerformanceService {

    private final PortfolioRepository repository;

    public PortfolioPerformanceService(PortfolioRepository repository) {
        this.repository = repository;
    }

    public PortfolioPerformance getPerformance(UUID userId) {
        var transactions = repository.findTransactionsForPerformance(userId);
        var currency = repository.findPrimaryCurrency(userId);
        var snapshots = computeSnapshots(transactions);
        return new PortfolioPerformance(List.copyOf(snapshots), currency);
    }

    private List<PortfolioSnapshot> computeSnapshots(List<TransactionRow> transactions) {
        Map<String, BigDecimal> netShares = new LinkedHashMap<>();
        Map<String, BigDecimal> lastPrices = new LinkedHashMap<>();
        BigDecimal cashBalance = BigDecimal.ZERO;
        // LinkedHashMap preserves insertion order; since transactions are sorted by datetime,
        // each date's value is overwritten with the state after its last transaction of the day.
        LinkedHashMap<LocalDate, BigDecimal> dailyValues = new LinkedHashMap<>();

        for (var tx : transactions) {
            if (tx.amount() != null) {
                cashBalance = cashBalance.add(tx.amount());
            }

            if (tx.symbol() != null && tx.shares() != null) {
                if ("BUY".equals(tx.type())) {
                    netShares.merge(tx.symbol(), tx.shares(), BigDecimal::add);
                } else if ("SELL".equals(tx.type())) {
                    netShares.merge(tx.symbol(), tx.shares().negate(), BigDecimal::add);
                }
                if (tx.price() != null) {
                    lastPrices.put(tx.symbol(), tx.price());
                }
            }

            var holdingsValue = netShares.entrySet().stream()
                    .filter(e -> lastPrices.containsKey(e.getKey()))
                    .map(e -> e.getValue().multiply(lastPrices.get(e.getKey())))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            dailyValues.put(tx.date(), cashBalance.add(holdingsValue));
        }

        return dailyValues.entrySet().stream()
                .map(e -> new PortfolioSnapshot(e.getKey(), e.getValue()))
                .toList();
    }
}
