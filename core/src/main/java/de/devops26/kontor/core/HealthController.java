package de.devops26.kontor.core;

import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import org.springframework.boot.health.actuate.endpoint.HealthDescriptor;
import org.springframework.boot.health.actuate.endpoint.HealthEndpoint;
import org.springframework.boot.health.contributor.Status;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/health")
public class HealthController {

    private final HealthEndpoint healthEndpoint;

    public HealthController(HealthEndpoint healthEndpoint) {
        this.healthEndpoint = healthEndpoint;
    }

    @GetMapping("/server")
    @ApiResponses({
        @ApiResponse(
                responseCode = "200",
                description = "Server is up",
                content = @Content(schema = @Schema(implementation = String.class))),
        @ApiResponse(
                responseCode = "503",
                description = "Server is unhealthy",
                content = @Content(schema = @Schema(implementation = String.class)))
    })
    public ResponseEntity<String> server() {
        var status = healthEndpoint.health().getStatus();
        if (Status.UP.equals(status)) {
            return ResponseEntity.ok("Server is up");
        }
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body("Server status: " + status.getCode());
    }

    @GetMapping("/database")
    @ApiResponses({
        @ApiResponse(
                responseCode = "200",
                description = "Database connection OK",
                content = @Content(schema = @Schema(implementation = String.class))),
        @ApiResponse(
                responseCode = "503",
                description = "Database connection check failed",
                content = @Content(schema = @Schema(implementation = String.class)))
    })
    public ResponseEntity<String> database() {
        HealthDescriptor descriptor = healthEndpoint.healthForPath("db");
        var status = descriptor != null ? descriptor.getStatus() : Status.UNKNOWN;
        if (Status.UP.equals(status)) {
            return ResponseEntity.ok("Database connection OK");
        }
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body("Database status: " + status.getCode());
    }
}
