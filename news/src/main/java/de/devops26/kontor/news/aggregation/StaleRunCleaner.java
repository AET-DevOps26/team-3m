package de.devops26.kontor.news.aggregation;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class StaleRunCleaner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(StaleRunCleaner.class);

    private final AggregationRunRepository runRepository;
    private final AggregationRunLeaseManager leaseManager;

    public StaleRunCleaner(AggregationRunRepository runRepository, AggregationRunLeaseManager leaseManager) {
        this.runRepository = runRepository;
        this.leaseManager = leaseManager;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            cleanStaleRuns();
        } catch (RuntimeException e) {
            log.error("Stale-run cleanup failed; continuing startup", e);
        }
    }

    private void cleanStaleRuns() {
        var lease = leaseManager.tryAcquire();
        if (lease.isEmpty()) {
            log.info("An aggregation run is active in another service instance; stale-run cleanup skipped");
            return;
        }
        try (var ignored = lease.orElseThrow()) {
            var failed = runRepository.failStaleRunning(
                    OffsetDateTime.now(ZoneOffset.UTC), "Marked as failed: the previous service owner stopped");
            if (failed > 0) {
                log.warn("Marked {} stale aggregation run(s) as failed after restart", failed);
            }
        }
    }
}
