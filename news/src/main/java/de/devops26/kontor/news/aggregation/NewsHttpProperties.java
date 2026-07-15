package de.devops26.kontor.news.aggregation;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

@ConfigurationProperties(prefix = "news.http")
public record NewsHttpProperties(
        @DefaultValue("PT10S") Duration timeout,
        @DefaultValue("1048576") int maxFeedBytes,
        @DefaultValue("2097152") int maxArticleBytes,
        @DefaultValue("100000") int maxContentCharacters,
        @DefaultValue("3") int maxRedirects,
        @DefaultValue("false") boolean allowHttp,
        @DefaultValue("false") boolean allowPrivateAddresses) {

    private static final int MAX_RESPONSE_BYTES = 16 * 1024 * 1024;

    public NewsHttpProperties {
        if (timeout == null || timeout.isZero() || timeout.isNegative()) {
            throw new IllegalArgumentException("news.http.timeout must be positive");
        }
        if (maxFeedBytes < 1
                || maxFeedBytes > MAX_RESPONSE_BYTES
                || maxArticleBytes < 1
                || maxArticleBytes > MAX_RESPONSE_BYTES
                || maxContentCharacters < 1
                || maxContentCharacters > MAX_RESPONSE_BYTES) {
            throw new IllegalArgumentException("news.http response and content limits must be positive");
        }
        if (maxRedirects < 0 || maxRedirects > 10) {
            throw new IllegalArgumentException("news.http.max-redirects must be between 0 and 10");
        }
    }
}
