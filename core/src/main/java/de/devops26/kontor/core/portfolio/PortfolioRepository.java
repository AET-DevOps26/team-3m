package de.devops26.kontor.core.portfolio;

import static de.devops26.kontor.core.generated.tables.FinancialTransaction.FINANCIAL_TRANSACTION;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Repository;

@Repository
public class PortfolioRepository {

    private final DSLContext dsl;

    public PortfolioRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public List<PortfolioHolding> findHoldings(UUID userId) {
        var ft = FINANCIAL_TRANSACTION;
        var ft2 = FINANCIAL_TRANSACTION.as("ft2");

        var netSharesExpr = DSL.sum(DSL.when(ft.TYPE.eq("BUY"), ft.SHARES)
                .when(ft.TYPE.eq("SELL"), ft.SHARES.neg())
                .otherwise(DSL.inline(BigDecimal.ZERO)));

        var lastPriceSubquery = DSL.field(dsl.select(ft2.PRICE)
                .from(ft2)
                .where(ft2.SYMBOL.eq(ft.SYMBOL))
                .and(ft2.USER_ID.eq(userId))
                .and(ft2.PRICE.isNotNull())
                .orderBy(ft2.DATETIME.desc())
                .limit(1));

        return dsl.select(
                        ft.SYMBOL,
                        ft.NAME,
                        ft.ASSET_CLASS,
                        ft.CURRENCY,
                        netSharesExpr.as("net_shares"),
                        lastPriceSubquery.as("last_price"))
                .from(ft)
                .where(ft.USER_ID.eq(userId))
                .and(ft.SYMBOL.isNotNull())
                .and(ft.SHARES.isNotNull())
                .groupBy(ft.SYMBOL, ft.NAME, ft.ASSET_CLASS, ft.CURRENCY)
                .having(netSharesExpr.gt(BigDecimal.ZERO))
                .fetch(record -> {
                    var netShares = record.get("net_shares", BigDecimal.class);
                    var lastPrice = record.get("last_price", BigDecimal.class);
                    var currentValue =
                            (netShares != null && lastPrice != null) ? netShares.multiply(lastPrice) : BigDecimal.ZERO;
                    return new PortfolioHolding(
                            record.get(ft.SYMBOL),
                            record.get(ft.NAME),
                            record.get(ft.ASSET_CLASS),
                            record.get(ft.CURRENCY),
                            netShares != null ? netShares : BigDecimal.ZERO,
                            lastPrice,
                            currentValue);
                });
    }

    public BigDecimal findCashBalance(UUID userId) {
        var ft = FINANCIAL_TRANSACTION;
        var result = dsl.select(DSL.sum(ft.AMOUNT))
                .from(ft)
                .where(ft.USER_ID.eq(userId))
                .fetchOne(0, BigDecimal.class);
        return result != null ? result : BigDecimal.ZERO;
    }

    public String findPrimaryCurrency(UUID userId) {
        var ft = FINANCIAL_TRANSACTION;
        var result = dsl.select(ft.CURRENCY)
                .from(ft)
                .where(ft.USER_ID.eq(userId))
                .orderBy(ft.DATETIME.desc())
                .limit(1)
                .fetchOne(ft.CURRENCY);
        return result != null ? result : "EUR";
    }
}
