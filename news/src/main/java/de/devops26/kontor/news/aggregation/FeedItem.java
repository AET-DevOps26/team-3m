package de.devops26.kontor.news.aggregation;

import java.time.OffsetDateTime;

public record FeedItem(String title, String url, String externalId, String summary, OffsetDateTime publishedAt) {}
