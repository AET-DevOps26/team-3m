package de.devops26.kontor.news.aggregation;

import java.time.Duration;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

@ConfigurationProperties(prefix = "news.aggregation")
public record NewsFeedProperties(
        @DefaultValue("PT15M") Duration interval,
        @DefaultValue("PT1M") Duration initialDelay,
        @DefaultValue("true") boolean fetchFullText,
        @DefaultValue("50") int maxItemsPerFeed,
        @DefaultValue("PT30S") Duration manualTriggerMinInterval,
        @DefaultValue List<Feed> feeds) {

    public NewsFeedProperties {
        if (interval == null || interval.isZero() || interval.isNegative()) {
            throw new IllegalArgumentException("news.aggregation.interval must be positive");
        }
        if (initialDelay == null || initialDelay.isNegative()) {
            throw new IllegalArgumentException("news.aggregation.initial-delay must not be negative");
        }
        if (maxItemsPerFeed < 1) {
            throw new IllegalArgumentException("news.aggregation.max-items-per-feed must be positive");
        }
        if (manualTriggerMinInterval == null || manualTriggerMinInterval.isNegative()) {
            throw new IllegalArgumentException("news.aggregation.manual-trigger-min-interval must not be negative");
        }
        feeds = feeds == null ? List.of() : List.copyOf(feeds);
    }

    public record Feed(String name, String url) {
        public Feed {
            if (name == null || name.isBlank() || name.length() > 100) {
                throw new IllegalArgumentException("feed name must contain 1 to 100 characters");
            }
            if (url == null || url.isBlank()) {
                throw new IllegalArgumentException("feed URL must not be blank");
            }
        }
    }
}
