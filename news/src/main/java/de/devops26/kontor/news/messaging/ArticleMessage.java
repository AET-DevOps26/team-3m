package de.devops26.kontor.news.messaging;

import java.time.OffsetDateTime;

/**
 * Message published to the news queue for the AI consumer. {@code id}
 * is the SHA-256 hash of the normalized article URL and doubles as the AMQP
 * messageId; delivery is at-least-once, so consumers must dedup on it.
 */
public record ArticleMessage(
        String id,
        String source,
        String feedUrl,
        String url,
        String title,
        String summary,
        String contentText,
        OffsetDateTime publishedAt,
        OffsetDateTime fetchedAt) {}
