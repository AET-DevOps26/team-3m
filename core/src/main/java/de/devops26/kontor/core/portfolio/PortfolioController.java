package de.devops26.kontor.core.portfolio;

import de.devops26.kontor.core.security.AuthenticatedUser;
import de.devops26.kontor.core.user.AppUser;
import de.devops26.kontor.core.web.ApiResponse;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/portfolio")
@SecurityRequirement(name = "bearerAuth")
public class PortfolioController {

    private final PortfolioService service;
    private final PortfolioPerformanceService performanceService;

    public PortfolioController(PortfolioService service, PortfolioPerformanceService performanceService) {
        this.service = service;
        this.performanceService = performanceService;
    }

    @GetMapping("/overview")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized")
    public ResponseEntity<ApiResponse<PortfolioOverview>> getOverview(
            @Parameter(hidden = true) @AuthenticatedUser AppUser user) {
        var overview = service.getOverview(user.id());
        return ResponseEntity.ok(ApiResponse.ok(overview));
    }

    @GetMapping("/performance")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized")
    public ResponseEntity<ApiResponse<PortfolioPerformance>> getPerformance(
            @Parameter(hidden = true) @AuthenticatedUser AppUser user) {
        var performance = performanceService.getPerformance(user.id());
        return ResponseEntity.ok(ApiResponse.ok(performance));
    }
}
