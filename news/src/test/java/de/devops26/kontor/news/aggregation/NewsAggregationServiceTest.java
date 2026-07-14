package de.devops26.kontor.news.aggregation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import de.devops26.kontor.news.crawl.CrawledArticleRepository;
import de.devops26.kontor.news.messaging.ArticleMessage;
import de.devops26.kontor.news.messaging.ArticlePublishException;
import de.devops26.kontor.news.messaging.ArticlePublisher;
import java.net.URI;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.task.AsyncTaskExecutor;
import org.springframework.core.task.TaskRejectedException;

@ExtendWith(MockitoExtension.class)
class NewsAggregationServiceTest {

    private static final NewsFeedProperties.Feed FEED_A =
            new NewsFeedProperties.Feed("feed-a", "https://example.com/a.rss");
    private static final NewsFeedProperties.Feed FEED_B =
            new NewsFeedProperties.Feed("feed-b", "https://example.com/b.rss");

    @Mock
    private FeedClient feedClient;

    @Mock
    private CrawledArticleRepository crawledArticleRepository;

    @Mock
    private ArticlePublisher articlePublisher;

    @Mock
    private AggregationRunRepository runRepository;

    @Mock
    private AggregationRunLeaseManager leaseManager;

    @Mock
    private AggregationRunLeaseManager.Lease lease;

    @Mock
    private ManualTriggerRateLimiter manualTriggerRateLimiter;

    @Mock
    private OutboundUrlPolicy urlPolicy;

    private NewsAggregationService service;

    @BeforeEach
    void setUp() {
        lenient().when(leaseManager.tryAcquire()).thenReturn(Optional.of(lease));
        lenient()
                .when(urlPolicy.validate(any(String.class)))
                .thenAnswer(invocation -> URI.create(invocation.getArgument(0)));
        service = newService(List.of(FEED_A, FEED_B), Runnable::run);
    }

    private NewsAggregationService newService(List<NewsFeedProperties.Feed> feeds, AsyncTaskExecutor executor) {
        var properties =
                new NewsFeedProperties(Duration.ofMinutes(15), Duration.ofMinutes(1), false, 50, Duration.ZERO, feeds);
        var httpProperties = new NewsHttpProperties(Duration.ofSeconds(2), 1024, 2048, 1000, 3, false, false);
        return new NewsAggregationService(
                feedClient,
                new ArticleContentExtractor(httpProperties),
                crawledArticleRepository,
                articlePublisher,
                runRepository,
                leaseManager,
                manualTriggerRateLimiter,
                urlPolicy,
                properties,
                executor);
    }

    private void stubRunInsert(UUID runId, AggregationTrigger trigger) {
        when(runRepository.insertRunning(eq(trigger), any()))
                .thenReturn(new AggregationRun(
                        runId,
                        trigger,
                        AggregationStatus.RUNNING,
                        OffsetDateTime.now(ZoneOffset.UTC),
                        null,
                        0,
                        0,
                        null));
    }

    @Test
    @DisplayName("startRun publishes all new items and marks the run succeeded with counts")
    void startRun_allNewItems_publishesAndMarksSucceeded() {
        var runId = UUID.randomUUID();
        stubRunInsert(runId, AggregationTrigger.MANUAL);
        when(feedClient.fetchItems(FEED_A))
                .thenReturn(List.of(new FeedItem("Title A", "https://example.com/1", null, "Summary", null)));
        when(feedClient.fetchItems(FEED_B))
                .thenReturn(List.of(new FeedItem("Title B", "https://example.com/2", null, null, null)));
        when(crawledArticleRepository.findPushedUrlHashes(anyCollection())).thenReturn(Set.of());

        service.startRun(AggregationTrigger.MANUAL);

        var messageCaptor = ArgumentCaptor.forClass(ArticleMessage.class);
        verify(articlePublisher, times(2)).publish(messageCaptor.capture());
        assertThat(messageCaptor.getAllValues())
                .extracting(ArticleMessage::title)
                .containsExactlyInAnyOrder("Title A", "Title B");
        assertThat(messageCaptor.getAllValues())
                .allSatisfy(m -> assertThat(m.id()).hasSize(64));
        verify(crawledArticleRepository, times(2)).markPushed(any(), any());
        verify(runRepository).markFinished(eq(runId), eq(AggregationStatus.SUCCEEDED), any(), eq(2), eq(2), eq(null));
    }

    @Test
    @DisplayName("already-pushed items are skipped without publishing")
    void startRun_alreadyPushedItems_areSkipped() {
        var runId = UUID.randomUUID();
        stubRunInsert(runId, AggregationTrigger.MANUAL);
        var url = "https://example.com/known";
        var knownHash = UrlNormalizer.sha256Hex(UrlNormalizer.normalize(url));
        when(feedClient.fetchItems(FEED_A)).thenReturn(List.of(new FeedItem("Known", url, null, null, null)));
        when(feedClient.fetchItems(FEED_B)).thenReturn(List.of());
        when(crawledArticleRepository.findPushedUrlHashes(anyCollection())).thenReturn(Set.of(knownHash));

        service.startRun(AggregationTrigger.MANUAL);

        verify(articlePublisher, never()).publish(any());
        verify(crawledArticleRepository, never()).markPushed(any(), any());
        verify(runRepository).markFinished(eq(runId), eq(AggregationStatus.SUCCEEDED), any(), eq(1), eq(0), eq(null));
    }

    @Test
    @DisplayName("publish failure marks the item seen (not pushed) and records an error")
    void startRun_publishFails_marksSeenAndRecordsError() {
        var runId = UUID.randomUUID();
        stubRunInsert(runId, AggregationTrigger.MANUAL);
        when(feedClient.fetchItems(FEED_A))
                .thenReturn(List.of(new FeedItem("Broken", "https://example.com/1", null, null, null)));
        when(feedClient.fetchItems(FEED_B)).thenReturn(List.of());
        when(crawledArticleRepository.findPushedUrlHashes(anyCollection())).thenReturn(Set.of());
        var publishFailure = new ArticlePublishException("hash", "nack", null);
        org.mockito.Mockito.doThrow(publishFailure).when(articlePublisher).publish(any());

        service.startRun(AggregationTrigger.MANUAL);

        verify(crawledArticleRepository).markSeen(any());
        verify(crawledArticleRepository, never()).markPushed(any(), any());
        var errorCaptor = ArgumentCaptor.forClass(String.class);
        verify(runRepository)
                .markFinished(eq(runId), eq(AggregationStatus.SUCCEEDED), any(), eq(1), eq(0), errorCaptor.capture());
        assertThat(errorCaptor.getValue()).contains("feed-a").contains("failed to publish");
    }

    @Test
    @DisplayName("partial publish failures on every feed keep the run succeeded when items got published")
    void startRun_partialPublishFailuresEverywhere_staysSucceeded() {
        var runId = UUID.randomUUID();
        stubRunInsert(runId, AggregationTrigger.MANUAL);
        when(feedClient.fetchItems(FEED_A))
                .thenReturn(List.of(
                        new FeedItem("A ok", "https://example.com/a-ok", null, null, null),
                        new FeedItem("A broken", "https://example.com/a-broken", null, null, null)));
        when(feedClient.fetchItems(FEED_B))
                .thenReturn(List.of(
                        new FeedItem("B ok", "https://example.com/b-ok", null, null, null),
                        new FeedItem("B broken", "https://example.com/b-broken", null, null, null)));
        when(crawledArticleRepository.findPushedUrlHashes(anyCollection())).thenReturn(Set.of());
        org.mockito.stubbing.Answer<Void> failBrokenPublishes = invocation -> {
            ArticleMessage message = invocation.getArgument(0);
            if (message.title().contains("broken")) {
                throw new ArticlePublishException("hash", "nack", null);
            }
            return null;
        };
        org.mockito.Mockito.doAnswer(failBrokenPublishes).when(articlePublisher).publish(any());

        service.startRun(AggregationTrigger.MANUAL);

        verify(runRepository)
                .markFinished(eq(runId), eq(AggregationStatus.SUCCEEDED), any(), eq(4), eq(2), any(String.class));
    }

    @Test
    @DisplayName("the run is marked failed when every feed fails")
    void startRun_allFeedsFail_marksFailed() {
        var runId = UUID.randomUUID();
        stubRunInsert(runId, AggregationTrigger.SCHEDULED);
        when(feedClient.fetchItems(any())).thenThrow(new FeedFetchException("https://example.com", null));

        service.startRun(AggregationTrigger.SCHEDULED);

        verify(runRepository)
                .markFinished(eq(runId), eq(AggregationStatus.FAILED), any(), eq(0), eq(0), any(String.class));
    }

    @Test
    @DisplayName("startRun releases the guard so a follow-up run can start")
    void startRun_afterCompletion_guardIsReleased() {
        stubRunInsert(UUID.randomUUID(), AggregationTrigger.MANUAL);
        when(feedClient.fetchItems(any())).thenThrow(new FeedFetchException("https://example.com", null));

        service.startRun(AggregationTrigger.MANUAL);
        service.startRun(AggregationTrigger.MANUAL);

        verify(runRepository, times(2)).markFinished(any(), any(), any(), anyInt(), anyInt(), any());
    }

    @Test
    @DisplayName("startRun throws AggregationInFlightException while a run is executing")
    void startRun_whileRunning_throwsInFlight() {
        var runId = UUID.randomUUID();
        stubRunInsert(runId, AggregationTrigger.MANUAL);
        var queued = new ArrayList<Runnable>();
        var deferredService = newService(List.of(), queued::add);

        deferredService.startRun(AggregationTrigger.MANUAL);

        assertThatThrownBy(() -> deferredService.startRun(AggregationTrigger.MANUAL))
                .isInstanceOf(AggregationInFlightException.class)
                .hasMessageContaining(runId.toString());
    }

    @Test
    @DisplayName("a database lock held by another instance prevents a second run")
    void startRun_lockUnavailable_throwsInFlight() {
        when(leaseManager.tryAcquire()).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.startRun(AggregationTrigger.MANUAL))
                .isInstanceOf(AggregationInFlightException.class);
        verify(runRepository, never()).insertRunning(any(), any());
    }

    @Test
    @DisplayName("executor rejection marks the inserted run failed and releases its lock")
    void startRun_executorRejects_marksFailedAndReleasesLease() {
        var runId = UUID.randomUUID();
        stubRunInsert(runId, AggregationTrigger.MANUAL);
        AsyncTaskExecutor rejectingExecutor = command -> {
            throw new TaskRejectedException("executor full");
        };
        var rejectingService = newService(List.of(), rejectingExecutor);

        assertThatThrownBy(() -> rejectingService.startRun(AggregationTrigger.MANUAL))
                .isInstanceOf(TaskRejectedException.class);
        verify(runRepository)
                .markFinished(eq(runId), eq(AggregationStatus.FAILED), any(), eq(0), eq(0), any(String.class));
        verify(lease).close();
    }
}
