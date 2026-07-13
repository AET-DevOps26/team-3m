package de.devops26.kontor.news.aggregation;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import org.springframework.stereotype.Component;

@Component
public class ManualTriggerRateLimiter {

    private final AggregationRunRepository runRepository;
    private final Duration minimumInterval;

    public ManualTriggerRateLimiter(AggregationRunRepository runRepository, NewsFeedProperties properties) {
        this.runRepository = runRepository;
        this.minimumInterval = properties.manualTriggerMinInterval();
    }

    public void checkAllowed() {
        if (minimumInterval.isZero()) {
            return;
        }
        var now = OffsetDateTime.now(ZoneOffset.UTC);
        runRepository.findLatestStartedAt(AggregationTrigger.MANUAL).ifPresent(latest -> {
            var allowedAt = latest.plus(minimumInterval);
            if (allowedAt.isAfter(now)) {
                var remaining = Duration.between(now, allowedAt);
                throw new ManualTriggerRateLimitException(Math.max(1, remaining.toSeconds() + 1));
            }
        });
    }
}
