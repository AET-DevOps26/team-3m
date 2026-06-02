package de.devops26.kontor.core.portfolio;

import de.devops26.kontor.core.security.AuthenticatedUser;
import de.devops26.kontor.core.user.AppUser;
import de.devops26.kontor.core.web.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/portfolio")
public class PortfolioController {

    private final PortfolioService service;
    private final PortfolioPerformanceService performanceService;

    public PortfolioController(PortfolioService service, PortfolioPerformanceService performanceService) {
        this.service = service;
        this.performanceService = performanceService;
    }

    @GetMapping("/overview")
    public ResponseEntity<ApiResponse<PortfolioOverview>> getOverview(@AuthenticatedUser AppUser user) {
        var overview = service.getOverview(user.id());
        return ResponseEntity.ok(ApiResponse.ok(overview));
    }

    @GetMapping("/performance")
    public ResponseEntity<ApiResponse<PortfolioPerformance>> getPerformance(@AuthenticatedUser AppUser user) {
        var performance = performanceService.getPerformance(user.id());
        return ResponseEntity.ok(ApiResponse.ok(performance));
    }
}
