package de.devops26.kontor.news.aggregation;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(
        prefix = "news.aggregation",
        name = "scheduler-enabled",
        havingValue = "true",
        matchIfMissing = true)
public class NewsAggregationScheduler {

    private static final Logger log = LoggerFactory.getLogger(NewsAggregationScheduler.class);

    private final NewsAggregationService aggregationService;

    public NewsAggregationScheduler(NewsAggregationService aggregationService) {
        this.aggregationService = aggregationService;
    }

    @Scheduled(
            initialDelayString = "${news.aggregation.initial-delay}",
            fixedDelayString = "${news.aggregation.interval}")
    public void aggregate() {
        try {
            var run = aggregationService.startRun(AggregationTrigger.SCHEDULED);
            log.info("Scheduled aggregation run {} started", run.id());
        } catch (AggregationInFlightException e) {
            log.info("Skipping scheduled aggregation: {}", e.getMessage());
        }
    }
}
