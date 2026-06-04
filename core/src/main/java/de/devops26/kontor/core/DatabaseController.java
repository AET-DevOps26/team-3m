package de.devops26.kontor.core;

import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import java.sql.SQLException;
import javax.sql.DataSource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class DatabaseController {

    private final DataSource dataSource;

    public DatabaseController(DataSource dataSource) {
        this.dataSource = dataSource;
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
        try (var connection = dataSource.getConnection();
                var statement = connection.createStatement();
                var resultSet = statement.executeQuery("SELECT 1")) {
            if (resultSet.next() && resultSet.getInt(1) == 1) {
                return ResponseEntity.ok("Database connection OK");
            }
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body("Database connection check returned an unexpected result");
        } catch (SQLException e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body("Database connection failed: " + e.getMessage());
        }
    }
}
