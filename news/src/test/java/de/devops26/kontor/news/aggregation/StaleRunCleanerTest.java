package de.devops26.kontor.news.aggregation;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class StaleRunCleanerTest {

    @Mock
    private AggregationRunRepository runRepository;

    @Mock
    private AggregationRunLeaseManager leaseManager;

    @Mock
    private AggregationRunLeaseManager.Lease lease;

    @Test
    @DisplayName("startup sweep marks stale running runs failed with a descriptive error")
    void run_staleRunsPresent_marksThemFailed() {
        when(runRepository.failStaleRunning(any(OffsetDateTime.class), any())).thenReturn(2);
        when(leaseManager.tryAcquire()).thenReturn(Optional.of(lease));

        new StaleRunCleaner(runRepository, leaseManager).run(null);

        verify(runRepository).failStaleRunning(any(OffsetDateTime.class), contains("previous service owner"));
        verify(lease).close();
    }

    @Test
    @DisplayName("startup sweep is a no-op when no run was left in 'running'")
    void run_noStaleRuns_doesNothingElse() {
        when(runRepository.failStaleRunning(any(OffsetDateTime.class), any())).thenReturn(0);
        when(leaseManager.tryAcquire()).thenReturn(Optional.of(lease));

        new StaleRunCleaner(runRepository, leaseManager).run(null);

        verify(runRepository).failStaleRunning(any(OffsetDateTime.class), any());
    }

    @Test
    @DisplayName("startup sweep leaves a run owned by another instance untouched")
    void run_activeLease_skipsSweep() {
        when(leaseManager.tryAcquire()).thenReturn(Optional.empty());

        new StaleRunCleaner(runRepository, leaseManager).run(null);

        verify(runRepository, never()).failStaleRunning(any(), any());
    }
}
