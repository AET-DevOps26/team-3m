package de.devops26.kontor.core.portfolio;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
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
        var snapshots = buildDailySnapshots(transactions, LocalDate.now(ZoneOffset.UTC));
        return new PortfolioPerformance(List.copyOf(snapshots), currency);
    }

    /**
     * Computes one snapshot per calendar day from the first transaction date up to {@code today},
     * carrying the last known portfolio value forward on days without transactions. Package-private
     * so tests can supply a fixed {@code today} and stay deterministic.
     */
    List<PortfolioSnapshot> buildDailySnapshots(List<TransactionRow> transactions, LocalDate today) {
        if (transactions.isEmpty()) {
            return List.of();
        }

        Map<String, BigDecimal> netShares = new LinkedHashMap<>();
        Map<String, BigDecimal> lastPrices = new LinkedHashMap<>();
        BigDecimal cashBalance = BigDecimal.ZERO;
        // Running holdings total updated incrementally — O(1) per transaction instead of O(symbols).
        BigDecimal holdingsTotal = BigDecimal.ZERO;
        // Insertion order = chronological order because transactions are sorted by datetime.
        // Same-day transactions overwrite with the state after the day's last transaction.
        LinkedHashMap<LocalDate, BigDecimal> transactionDayValues = new LinkedHashMap<>();

        for (var tx : transactions) {
            if (tx.amount() != null) {
                cashBalance = cashBalance.add(tx.amount());
            }

            if (tx.symbol() != null && tx.shares() != null) {
                var sym = tx.symbol();
                var currentShares = netShares.getOrDefault(sym, BigDecimal.ZERO);
                var currentPrice = lastPrices.get(sym);

                // Remove old contribution for this symbol before mutating shares/price.
                if (currentPrice != null) {
                    holdingsTotal = holdingsTotal.subtract(currentShares.multiply(currentPrice));
                }

                BigDecimal newShares;
                if ("BUY".equals(tx.type())) {
                    newShares = currentShares.add(tx.shares());
                } else if ("SELL".equals(tx.type())) {
                    newShares = currentShares.subtract(tx.shares());
                } else {
                    newShares = currentShares;
                }
                netShares.put(sym, newShares);

                if (tx.price() != null) {
                    lastPrices.put(sym, tx.price());
                }

                // Add new contribution using the now-current price.
                var effectivePrice = lastPrices.get(sym);
                if (effectivePrice != null) {
                    holdingsTotal = holdingsTotal.add(newShares.multiply(effectivePrice));
                }
            }

            transactionDayValues.put(tx.date(), cashBalance.add(holdingsTotal));
        }

        // Fill every calendar day from the first transaction date to today, carrying the last
        // known value forward. This gives the chart daily granularity for all time-range views.
        LocalDate start = transactionDayValues.keySet().iterator().next();
        BigDecimal runningValue = BigDecimal.ZERO;
        List<PortfolioSnapshot> result = new ArrayList<>();

        for (LocalDate date = start; !date.isAfter(today); date = date.plusDays(1)) {
            if (transactionDayValues.containsKey(date)) {
                runningValue = transactionDayValues.get(date);
            }
            result.add(new PortfolioSnapshot(date, runningValue));
        }

        return result;
    }
}
