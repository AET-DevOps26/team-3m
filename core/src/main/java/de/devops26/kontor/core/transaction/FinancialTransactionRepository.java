package de.devops26.kontor.core.transaction;

import static de.devops26.kontor.core.generated.tables.FinancialTransaction.FINANCIAL_TRANSACTION;

import java.util.List;
import org.jooq.DSLContext;
import org.jooq.Query;
import org.springframework.stereotype.Repository;

@Repository
public class FinancialTransactionRepository {

    private final DSLContext dsl;

    public FinancialTransactionRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public int upsertAll(List<TransactionCsvRow> rows) {
        var queries = rows.stream().map(this::buildUpsert).toList();
        int[] results = dsl.batch(queries).execute();
        int count = 0;
        for (int r : results) {
            count += r;
        }
        return count;
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
                .set(table.COUNTERPARTY_NAME, row.counterpartyName())
                .set(table.COUNTERPARTY_IBAN, row.counterpartyIban())
                .set(table.PAYMENT_REFERENCE, row.paymentReference())
                .set(table.MCC_CODE, row.mccCode());
    }
}
