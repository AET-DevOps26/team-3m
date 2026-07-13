package de.devops26.kontor.news.aggregation;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
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
                Duration.ofMinutes(15), Duration.ofMinutes(1), true, 50, Duration.ofSeconds(30), List.of());
        when(runRepository.findLatestStartedAt(AggregationTrigger.MANUAL))
                .thenReturn(Optional.of(OffsetDateTime.now(ZoneOffset.UTC)));

        assertThatThrownBy(() -> new ManualTriggerRateLimiter(runRepository, properties).checkAllowed())
                .isInstanceOf(ManualTriggerRateLimitException.class)
                .hasMessageContaining("retry");
    }
}
