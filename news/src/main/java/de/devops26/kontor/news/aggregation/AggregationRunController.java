package de.devops26.kontor.news.aggregation;

import de.devops26.kontor.news.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/news/aggregation/runs")
@SecurityRequirement(name = "bearerAuth")
public class AggregationRunController {

    private static final int MAX_RUNS_PAGE_SIZE = 100;

    private final NewsAggregationService aggregationService;
    private final AggregationRunRepository runRepository;

    public AggregationRunController(NewsAggregationService aggregationService, AggregationRunRepository runRepository) {
        this.aggregationService = aggregationService;
        this.runRepository = runRepository;
    }

    @PostMapping
    @PreAuthorize("hasRole('kontor-admin')")
    @Operation(
            summary = "Trigger an aggregation run",
            description = "Requires the kontor-admin role. Starts an asynchronous aggregation run over all "
                    + "configured feeds. Returns 202 with the run to poll, 409 if a run is already in flight, "
                    + "or 429 when manual triggers are too frequent.")
    public ResponseEntity<ApiResponse<AggregationRun>> trigger() {
        var run = aggregationService.startRun(AggregationTrigger.MANUAL);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(ApiResponse.ok(run));
    }

    @GetMapping
    @Operation(summary = "List recent aggregation runs")
    public ResponseEntity<ApiResponse<List<AggregationRun>>> list(@RequestParam(defaultValue = "20") int limit) {
        if (limit < 1 || limit > MAX_RUNS_PAGE_SIZE) {
            throw new IllegalArgumentException("limit must be between 1 and " + MAX_RUNS_PAGE_SIZE);
        }
        return ResponseEntity.ok(ApiResponse.ok(runRepository.findRecent(limit)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get an aggregation run by id")
    public ResponseEntity<ApiResponse<AggregationRun>> get(@PathVariable UUID id) {
        var run = runRepository.findById(id).orElseThrow(() -> new AggregationRunNotFoundException(id));
        return ResponseEntity.ok(ApiResponse.ok(run));
    }
}
