package de.devops26.kontor.core.transaction;

import static de.devops26.kontor.core.generated.tables.FinancialTransaction.FINANCIAL_TRANSACTION;

import java.util.Arrays;
import java.util.List;
import org.jooq.DSLContext;
import org.jooq.Query;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Repository;

@Repository
public class FinancialTransactionRepository {

    private final DSLContext dsl;

    public FinancialTransactionRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public int upsertAll(List<TransactionCsvRow> rows) {
        if (rows.isEmpty()) {
            return 0;
        }
        var queries = rows.stream().map(this::buildUpsert).toList();
        var results = dsl.batch(queries).execute();
        return (int) Arrays.stream(results).filter(r -> r > 0).count();
    }

    private Query buildUpsert(TransactionCsvRow row) {
        var table = FINANCIAL_TRANSACTION;
        return dsl.insertInto(table)
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
                .set(table.TRANSACTION_ID, row.transactionId())
                .set(table.COUNTERPARTY_NAME, row.counterpartyName())
                .set(table.COUNTERPARTY_IBAN, row.counterpartyIban())
                .set(table.PAYMENT_REFERENCE, row.paymentReference())
                .set(table.MCC_CODE, row.mccCode())
                .onConflict(table.TRANSACTION_ID)
                .doUpdate()
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
