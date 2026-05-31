package de.devops26.kontor.core.transaction;

import java.time.OffsetDateTime;
import java.util.UUID;

/** Keyset-pagination cursor: the datetime and id of the last row on the previous page. */
public record TransactionCursor(OffsetDateTime afterDatetime, UUID afterId) {}
