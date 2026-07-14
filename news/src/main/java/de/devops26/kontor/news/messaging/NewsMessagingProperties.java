package de.devops26.kontor.news.messaging;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

@ConfigurationProperties(prefix = "news.messaging")
public record NewsMessagingProperties(
        @DefaultValue("kontor.news") String exchange,
        @DefaultValue("news.articles") String queue,
        @DefaultValue("news.article.crawled") String routingKey,
        @DefaultValue("PT10S") Duration confirmTimeout,
        @DefaultValue("10000") long maxQueueMessages,
        @DefaultValue("268435456") long maxQueueBytes) {

    public NewsMessagingProperties {
        if (exchange == null || exchange.isBlank() || queue == null || queue.isBlank()) {
            throw new IllegalArgumentException("news messaging exchange and queue must not be blank");
        }
        if (routingKey == null || routingKey.isBlank()) {
            throw new IllegalArgumentException("news messaging routing key must not be blank");
        }
        if (confirmTimeout == null || confirmTimeout.isZero() || confirmTimeout.isNegative()) {
            throw new IllegalArgumentException("news.messaging.confirm-timeout must be positive");
        }
        if (maxQueueMessages < 1 || maxQueueBytes < 1) {
            throw new IllegalArgumentException("news messaging queue limits must be positive");
        }
    }
}
