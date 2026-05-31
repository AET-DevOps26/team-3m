package de.devops26.kontor.core.transaction;

import java.util.List;

/**
 * A page of financial transactions. {@code nextCursor} is {@code null} when there are no more
 * pages.
 */
public record TransactionPage(List<FinancialTransactionResponse> items, TransactionCursor nextCursor) {}
