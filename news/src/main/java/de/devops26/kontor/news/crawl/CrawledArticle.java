package de.devops26.kontor.news.crawl;

import java.time.OffsetDateTime;

public record CrawledArticle(
        String urlHash,
        String url,
        String source,
        String feedUrl,
        String title,
        OffsetDateTime publishedAt,
        OffsetDateTime firstSeenAt,
        OffsetDateTime pushedAt) {}
