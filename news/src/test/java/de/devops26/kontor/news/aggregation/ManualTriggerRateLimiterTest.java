package de.devops26.kontor.news.aggregation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ManualTriggerRateLimiterTest {

    @Mock
    private AggregationRunRepository runRepository;

    @Test
    @DisplayName("rejects a manual trigger inside the configured interval")
    void checkAllowed_recentManualRun_throws() {
        var properties = new NewsFeedProperties(
                Duration.ofSeconds(1), Duration.ZERO, true, 50, Duration.ofMinutes(10), List.of());
        when(runRepository.findLatestStartedAt(AggregationTrigger.MANUAL))
                .thenReturn(Optional.of(OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(1)));

        var exception = catchThrowableOfType(
                ManualTriggerRateLimitException.class,
                () -> new ManualTriggerRateLimiter(runRepository, properties).checkAllowed());

        assertThat(exception.retryAfterSeconds()).isBetween(530L, 540L);
    }
}
