package de.devops26.kontor.core.transaction;

import java.util.List;

public record TransactionMetadata(List<String> categories, List<String> types) {}
