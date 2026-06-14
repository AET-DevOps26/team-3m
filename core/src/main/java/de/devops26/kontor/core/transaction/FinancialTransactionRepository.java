package de.devops26.kontor.core.transaction;

import static de.devops26.kontor.core.generated.tables.FinancialTransaction.FINANCIAL_TRANSACTION;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.Query;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class FinancialTransactionRepository {

    private final DSLContext dsl;

    public FinancialTransactionRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    @Transactional(readOnly = true)
    public TransactionPage findPage(UUID userId, int pageSize, TransactionCursor cursor, TransactionFilter filter) {
        var table = FINANCIAL_TRANSACTION;
        var condition = table.USER_ID.eq(userId);
        if (cursor != null) {
            condition = condition.and(table.DATETIME
                    .lessThan(cursor.afterDatetime())
                    .or(table.DATETIME.eq(cursor.afterDatetime()).and(table.ID.lessThan(cursor.afterId()))));
        }
        if (filter != null) {
            condition = condition.and(buildFilterCondition(filter));
        }
        // Fetch one extra row to detect whether a next page exists without a COUNT query.
        var probe = dsl.selectFrom(table)
                .where(condition)
                .orderBy(table.DATETIME.desc(), table.ID.desc())
                .limit(pageSize + 1)
                .fetch(r -> new FinancialTransactionResponse(
                        r.get(table.ID),
                        r.get(table.DATETIME),
                        r.get(table.DATE),
                        r.get(table.ACCOUNT_TYPE),
                        r.get(table.CATEGORY),
                        r.get(table.TYPE),
                        r.get(table.ASSET_CLASS),
                        r.get(table.NAME),
                        r.get(table.SYMBOL),
                        r.get(table.SHARES),
                        r.get(table.PRICE),
                        r.get(table.AMOUNT),
                        r.get(table.FEE),
                        r.get(table.TAX),
                        r.get(table.CURRENCY),
                        r.get(table.ORIGINAL_AMOUNT),
                        r.get(table.ORIGINAL_CURRENCY),
                        r.get(table.FX_RATE),
                        r.get(table.DESCRIPTION),
                        r.get(table.EXTERNAL_TRANSACTION_ID),
                        r.get(table.COUNTERPARTY_NAME),
                        r.get(table.COUNTERPARTY_IBAN),
                        r.get(table.PAYMENT_REFERENCE),
                        r.get(table.MCC_CODE)));
        var hasMore = probe.size() > pageSize;
        var items = hasMore ? probe.subList(0, pageSize) : probe;
        var nextCursor = hasMore
                ? new TransactionCursor(
                        items.get(items.size() - 1).datetime(),
                        items.get(items.size() - 1).id())
                : null;
        return new TransactionPage(items, nextCursor);
    }

    private Condition buildFilterCondition(TransactionFilter filter) {
        var table = FINANCIAL_TRANSACTION;
        Condition condition = DSL.trueCondition();

        if (filter.search() != null && !filter.search().isBlank()) {
            var escaped = escapeLike(filter.search().toLowerCase(Locale.ROOT));
            var term = "%" + escaped + "%";
            condition = condition.and(DSL.lower(table.NAME)
                    .like(term, '\\')
                    .or(DSL.lower(table.COUNTERPARTY_NAME).like(term, '\\'))
                    .or(DSL.lower(table.DESCRIPTION).like(term, '\\')));
        }
        if (filter.category() != null && !filter.category().isBlank()) {
            condition = condition.and(table.CATEGORY.eq(filter.category()));
        }
        if (filter.type() != null && !filter.type().isBlank()) {
            var escapedType = escapeLike(filter.type().toLowerCase(Locale.ROOT));
            var normalizedType = DSL.lower(DSL.replace(table.TYPE, "_", " "));
            condition = condition.and(normalizedType.like(escapedType + "%", '\\'));
        }
        if (filter.dateFrom() != null) {
            condition = condition.and(table.DATE.ge(filter.dateFrom()));
        }
        if (filter.dateTo() != null) {
            condition = condition.and(table.DATE.le(filter.dateTo()));
        }

        return condition;
    }

    private static String escapeLike(String value) {
        return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }

    @Transactional(readOnly = true)
    public TransactionMetadata findMetadata(UUID userId) {
        var table = FINANCIAL_TRANSACTION;
        var categories = dsl.selectDistinct(table.CATEGORY)
                .from(table)
                .where(table.USER_ID.eq(userId).and(table.CATEGORY.isNotNull()))
                .orderBy(table.CATEGORY.asc())
                .fetch(table.CATEGORY);
        var types = dsl.selectDistinct(table.TYPE)
                .from(table)
                .where(table.USER_ID.eq(userId).and(table.TYPE.isNotNull()))
                .orderBy(table.TYPE.asc())
                .fetch(table.TYPE);
        return new TransactionMetadata(categories, types);
    }

    public void deleteAllForUser(UUID userId) {
        dsl.deleteFrom(FINANCIAL_TRANSACTION)
                .where(FINANCIAL_TRANSACTION.USER_ID.eq(userId))
                .execute();
    }

    public int upsertAll(List<TransactionCsvRow> rows, UUID userId) {
        if (rows.isEmpty()) {
            return 0;
        }
        var now = OffsetDateTime.now(ZoneOffset.UTC);
        var queries = rows.stream().map(row -> buildUpsert(row, userId, now)).toList();
        var results = dsl.batch(queries).execute();
        return (int) Arrays.stream(results).filter(result -> result > 0).count();
    }

    private Query buildUpsert(TransactionCsvRow row, UUID userId, OffsetDateTime now) {
        var table = FINANCIAL_TRANSACTION;
        return dsl.insertInto(table)
                .set(table.ID, UUID.randomUUID())
                .set(table.USER_ID, userId)
                .set(table.UPDATED_AT, now)
                .set(table.DATETIME, row.datetime())
                .set(table.DATE, row.date())
                .set(table.ACCOUNT_TYPE, row.accountType())
                .set(table.CATEGORY, row.category())
                .set(table.TYPE, row.type())
                .set(table.ASSET_CLASS, row.assetClass())
                .set(table.NAME, row.name())
                .set(table.SYMBOL, row.symbol())
                .set(table.SHARES, row.shares())
                .set(table.PRICE, row.price())
                .set(table.AMOUNT, row.amount())
                .set(table.FEE, row.fee())
                .set(table.TAX, row.tax())
                .set(table.CURRENCY, row.currency())
                .set(table.ORIGINAL_AMOUNT, row.originalAmount())
                .set(table.ORIGINAL_CURRENCY, row.originalCurrency())
                .set(table.FX_RATE, row.fxRate())
                .set(table.DESCRIPTION, row.description())
                .set(table.EXTERNAL_TRANSACTION_ID, row.transactionId())
                .set(table.COUNTERPARTY_NAME, row.counterpartyName())
                .set(table.COUNTERPARTY_IBAN, row.counterpartyIban())
                .set(table.PAYMENT_REFERENCE, row.paymentReference())
                .set(table.MCC_CODE, row.mccCode())
                .onConflict(table.USER_ID, table.EXTERNAL_TRANSACTION_ID)
                .doUpdate()
                .set(table.UPDATED_AT, DSL.excluded(table.UPDATED_AT))
                .set(table.DATETIME, DSL.excluded(table.DATETIME))
                .set(table.DATE, DSL.excluded(table.DATE))
                .set(table.ACCOUNT_TYPE, DSL.excluded(table.ACCOUNT_TYPE))
                .set(table.CATEGORY, DSL.excluded(table.CATEGORY))
                .set(table.TYPE, DSL.excluded(table.TYPE))
                .set(table.ASSET_CLASS, DSL.excluded(table.ASSET_CLASS))
                .set(table.NAME, DSL.excluded(table.NAME))
                .set(table.SYMBOL, DSL.excluded(table.SYMBOL))
                .set(table.SHARES, DSL.excluded(table.SHARES))
                .set(table.PRICE, DSL.excluded(table.PRICE))
                .set(table.AMOUNT, DSL.excluded(table.AMOUNT))
                .set(table.FEE, DSL.excluded(table.FEE))
                .set(table.TAX, DSL.excluded(table.TAX))
                .set(table.CURRENCY, DSL.excluded(table.CURRENCY))
                .set(table.ORIGINAL_AMOUNT, DSL.excluded(table.ORIGINAL_AMOUNT))
                .set(table.ORIGINAL_CURRENCY, DSL.excluded(table.ORIGINAL_CURRENCY))
                .set(table.FX_RATE, DSL.excluded(table.FX_RATE))
                .set(table.DESCRIPTION, DSL.excluded(table.DESCRIPTION))
                .set(table.COUNTERPARTY_NAME, DSL.excluded(table.COUNTERPARTY_NAME))
                .set(table.COUNTERPARTY_IBAN, DSL.excluded(table.COUNTERPARTY_IBAN))
                .set(table.PAYMENT_REFERENCE, DSL.excluded(table.PAYMENT_REFERENCE))
                .set(table.MCC_CODE, DSL.excluded(table.MCC_CODE));
    }
}
