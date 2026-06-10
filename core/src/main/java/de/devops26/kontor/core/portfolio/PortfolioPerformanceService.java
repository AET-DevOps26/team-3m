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
        var snapshots = buildSnapshots(transactions, LocalDate.now(ZoneOffset.UTC));
        return new PortfolioPerformance(List.copyOf(snapshots), currency);
    }

    /**
     * Emits one snapshot per transaction (at its actual datetime) plus midnight carry-forward
     * snapshots for days with no activity, up to {@code today}. Package-private so tests can
     * supply a fixed {@code today} and stay deterministic.
     */
    List<PortfolioSnapshot> buildSnapshots(List<TransactionRow> transactions, LocalDate today) {
        if (transactions.isEmpty()) {
            return List.of();
        }

        Map<String, BigDecimal> netShares = new LinkedHashMap<>();
        Map<String, BigDecimal> lastPrices = new LinkedHashMap<>();
        BigDecimal cashBalance = BigDecimal.ZERO;
        // Running holdings total updated incrementally — O(1) per transaction instead of O(symbols).
        BigDecimal holdingsTotal = BigDecimal.ZERO;

        List<PortfolioSnapshot> result = new ArrayList<>();
        LocalDate lastTxDate = null;
        DayState running = new DayState(BigDecimal.ZERO, BigDecimal.ZERO);

        for (var tx : transactions) {
            // Fill midnight carry-forward snapshots for quiet days since the last transaction.
            if (lastTxDate != null) {
                for (LocalDate d = lastTxDate.plusDays(1); d.isBefore(tx.date()); d = d.plusDays(1)) {
                    result.add(toSnapshot(d.atStartOfDay().atOffset(ZoneOffset.UTC), running));
                }
            }

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
                    // Cap at zero: selling more than recorded as held must not create negative holdings.
                    newShares = currentShares.subtract(tx.shares()).max(BigDecimal.ZERO);
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

            running = new DayState(cashBalance, holdingsTotal);
            lastTxDate = tx.date();

            result.add(toSnapshot(tx.datetime(), running));
        }

        // Fill carry-forward from the day after the last transaction up to today.
        if (lastTxDate != null) {
            for (LocalDate d = lastTxDate.plusDays(1); !d.isAfter(today); d = d.plusDays(1)) {
                result.add(toSnapshot(d.atStartOfDay().atOffset(ZoneOffset.UTC), running));
            }
        }

        return result;
    }

    private static PortfolioSnapshot toSnapshot(java.time.OffsetDateTime datetime, DayState state) {
        return new PortfolioSnapshot(
                datetime, state.cashValue().add(state.investmentValue()), state.cashValue(), state.investmentValue());
    }

    private record DayState(BigDecimal cashValue, BigDecimal investmentValue) {}
}
