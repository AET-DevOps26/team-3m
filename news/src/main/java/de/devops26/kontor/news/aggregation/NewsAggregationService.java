package de.devops26.kontor.news.aggregation;

import de.devops26.kontor.news.crawl.CrawledArticle;
import de.devops26.kontor.news.crawl.CrawledArticleRepository;
import de.devops26.kontor.news.messaging.ArticleMessage;
import de.devops26.kontor.news.messaging.ArticlePublisher;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.task.AsyncTaskExecutor;
import org.springframework.stereotype.Service;

@Service
public class NewsAggregationService {

    private static final Logger log = LoggerFactory.getLogger(NewsAggregationService.class);

    private final FeedClient feedClient;
    private final ArticleContentExtractor contentExtractor;
    private final CrawledArticleRepository crawledArticleRepository;
    private final ArticlePublisher articlePublisher;
    private final AggregationRunRepository runRepository;
    private final AggregationRunLeaseManager leaseManager;
    private final ManualTriggerRateLimiter manualTriggerRateLimiter;
    private final OutboundUrlPolicy urlPolicy;
    private final NewsFeedProperties properties;
    private final AsyncTaskExecutor taskExecutor;

    private final AtomicBoolean running = new AtomicBoolean(false);
    private volatile UUID currentRunId;

    public NewsAggregationService(
            FeedClient feedClient,
            ArticleContentExtractor contentExtractor,
            CrawledArticleRepository crawledArticleRepository,
            ArticlePublisher articlePublisher,
            AggregationRunRepository runRepository,
            AggregationRunLeaseManager leaseManager,
            ManualTriggerRateLimiter manualTriggerRateLimiter,
            OutboundUrlPolicy urlPolicy,
            NewsFeedProperties properties,
            @Qualifier("applicationTaskExecutor") AsyncTaskExecutor taskExecutor) {
        this.feedClient = feedClient;
        this.contentExtractor = contentExtractor;
        this.crawledArticleRepository = crawledArticleRepository;
        this.articlePublisher = articlePublisher;
        this.runRepository = runRepository;
        this.leaseManager = leaseManager;
        this.manualTriggerRateLimiter = manualTriggerRateLimiter;
        this.urlPolicy = urlPolicy;
        this.properties = properties;
        this.taskExecutor = taskExecutor;
    }

    public AggregationRun startRun(AggregationTrigger trigger) {
        if (!running.compareAndSet(false, true)) {
            throw new AggregationInFlightException(currentRunId);
        }
        AggregationRunLeaseManager.Lease lease = null;
        AggregationRun run = null;
        try {
            var acquired = leaseManager.tryAcquire();
            if (acquired.isEmpty()) {
                throw new AggregationInFlightException(
                        runRepository.findMostRecentRunningId().orElse(null));
            }
            lease = acquired.orElseThrow();
            var now = OffsetDateTime.now(ZoneOffset.UTC);
            runRepository.failStaleRunning(now, "Marked as failed: the previous service owner stopped");
            if (trigger == AggregationTrigger.MANUAL) {
                manualTriggerRateLimiter.checkAllowed();
            }
            run = runRepository.insertRunning(trigger, now);
            currentRunId = run.id();
            var acquiredLease = lease;
            var runId = run.id();
            taskExecutor.execute(() -> executeRun(runId, acquiredLease));
            return run;
        } catch (RuntimeException e) {
            if (run != null) {
                markSubmissionFailed(run.id(), e);
            }
            try {
                closeLease(lease);
            } catch (RuntimeException closeFailure) {
                e.addSuppressed(closeFailure);
            }
            currentRunId = null;
            running.set(false);
            throw e;
        }
    }

    private void markSubmissionFailed(UUID runId, RuntimeException failure) {
        try {
            runRepository.markFinished(
                    runId,
                    AggregationStatus.FAILED,
                    OffsetDateTime.now(ZoneOffset.UTC),
                    0,
                    0,
                    "Could not schedule aggregation: " + failure.getMessage());
        } catch (RuntimeException persistenceFailure) {
            failure.addSuppressed(persistenceFailure);
        }
    }

    private void executeRun(UUID runId, AggregationRunLeaseManager.Lease lease) {
        try {
            var results = aggregateAllFeeds();
            var itemsSeen = results.stream().mapToInt(FeedResult::itemsSeen).sum();
            var itemsPublished =
                    results.stream().mapToInt(FeedResult::itemsPublished).sum();
            var errors = results.stream()
                    .map(FeedResult::error)
                    .filter(Objects::nonNull)
                    .toList();
            var allFailed = !results.isEmpty() && itemsPublished == 0 && errors.size() == results.size();
            var status = allFailed ? AggregationStatus.FAILED : AggregationStatus.SUCCEEDED;
            var error = errors.isEmpty() ? null : String.join("; ", errors);
            runRepository.markFinished(
                    runId, status, OffsetDateTime.now(ZoneOffset.UTC), itemsSeen, itemsPublished, error);
            log.info(
                    "Aggregation run {} finished: status={}, itemsSeen={}, itemsPublished={}",
                    runId,
                    status.dbValue(),
                    itemsSeen,
                    itemsPublished);
        } catch (RuntimeException e) {
            log.error("Aggregation run {} failed unexpectedly", runId, e);
            runRepository.markFinished(
                    runId, AggregationStatus.FAILED, OffsetDateTime.now(ZoneOffset.UTC), 0, 0, e.getMessage());
        } finally {
            currentRunId = null;
            running.set(false);
            try {
                closeLease(lease);
            } catch (RuntimeException e) {
                log.error("Could not release the aggregation lock for run {}", runId, e);
            }
        }
    }

    private List<FeedResult> aggregateAllFeeds() {
        var claimedHashes = ConcurrentHashMap.<String>newKeySet();
        var futures = properties.feeds().stream()
                .map(feed -> CompletableFuture.supplyAsync(() -> aggregateFeed(feed, claimedHashes), taskExecutor))
                .toList();
        return futures.stream().map(CompletableFuture::join).toList();
    }

    private FeedResult aggregateFeed(NewsFeedProperties.Feed feed, java.util.Set<String> claimedHashes) {
        try {
            var items = feedClient.fetchItems(feed).stream()
                    .limit(properties.maxItemsPerFeed())
                    .toList();
            var published = publishNewItems(feed, items, claimedHashes);
            log.info("Feed '{}': {} items seen, {} published", feed.name(), items.size(), published.published());
            return new FeedResult(items.size(), published.published(), published.error());
        } catch (RuntimeException e) {
            log.warn("Feed '{}' failed: {}", feed.name(), e.getMessage());
            return new FeedResult(0, 0, feed.name() + ": " + e.getMessage());
        }
    }

    private PublishOutcome publishNewItems(
            NewsFeedProperties.Feed feed, List<FeedItem> items, java.util.Set<String> claimedHashes) {
        var hashedItems = items.stream()
                .flatMap(item -> hashSafeItem(feed, item).stream())
                .filter(item -> claimedHashes.add(item.urlHash()))
                .toList();
        var alreadyPushed = crawledArticleRepository.findPushedUrlHashes(
                hashedItems.stream().map(HashedItem::urlHash).toList());
        var published = 0;
        var failures = 0;
        for (var hashedItem : hashedItems) {
            if (alreadyPushed.contains(hashedItem.urlHash())) {
                continue;
            }
            if (publishItem(feed, hashedItem)) {
                published++;
            } else {
                failures++;
            }
        }
        var error = failures > 0 ? feed.name() + ": " + failures + " item(s) failed to publish" : null;
        return new PublishOutcome(published, error);
    }

    private Optional<HashedItem> hashSafeItem(NewsFeedProperties.Feed feed, FeedItem item) {
        try {
            var safeUrl = urlPolicy.validate(item.url()).toString();
            return Optional.of(new HashedItem(
                    new FeedItem(item.title(), safeUrl, item.externalId(), item.summary(), item.publishedAt()),
                    UrlNormalizer.sha256Hex(UrlNormalizer.normalize(safeUrl))));
        } catch (UnsafeOutboundUrlException e) {
            log.warn("Skipping an unsafe article URL from feed '{}'", feed.name());
            return Optional.empty();
        }
    }

    private boolean publishItem(NewsFeedProperties.Feed feed, HashedItem hashedItem) {
        var item = hashedItem.item();
        var now = OffsetDateTime.now(ZoneOffset.UTC);
        var crawledArticle = new CrawledArticle(
                hashedItem.urlHash(), item.url(), feed.name(), feed.url(), item.title(), item.publishedAt(), now, null);
        var contentText = properties.fetchFullText() ? fetchContentText(item.url()) : null;
        var message = new ArticleMessage(
                hashedItem.urlHash(),
                feed.name(),
                feed.url(),
                item.url(),
                item.title(),
                item.summary(),
                contentText,
                item.publishedAt(),
                now);
        try {
            articlePublisher.publish(message);
            crawledArticleRepository.markPushed(crawledArticle, OffsetDateTime.now(ZoneOffset.UTC));
            return true;
        } catch (RuntimeException e) {
            log.warn("Publishing article {} failed: {}", hashedItem.urlHash(), e.getMessage());
            crawledArticleRepository.markSeen(crawledArticle);
            return false;
        }
    }

    private String fetchContentText(String url) {
        try {
            var html = feedClient.fetchHtml(url);
            return contentExtractor.extract(html, url).orElse(null);
        } catch (RuntimeException e) {
            log.debug("Full-text extraction failed for {}: {}", url, e.getMessage());
            return null;
        }
    }

    private static void closeLease(AggregationRunLeaseManager.Lease lease) {
        if (lease != null) {
            lease.close();
        }
    }

    private record HashedItem(FeedItem item, String urlHash) {}

    private record PublishOutcome(int published, String error) {}

    private record FeedResult(int itemsSeen, int itemsPublished, String error) {}
}
