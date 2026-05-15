package de.devops26.kontor.core;

import java.sql.DriverManager;
import java.sql.SQLException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class DatabaseController {

	private final String databaseUrl;
	private final String databaseUsername;
	private final String databasePassword;

	public DatabaseController(
			@Value("${app.database.url}") String databaseUrl,
			@Value("${app.database.username}") String databaseUsername,
			@Value("${app.database.password}") String databasePassword) {
		this.databaseUrl = databaseUrl;
		this.databaseUsername = databaseUsername;
		this.databasePassword = databasePassword;
	}

	@GetMapping("/database")
	public ResponseEntity<String> database() {
		try (var connection = DriverManager.getConnection(databaseUrl, databaseUsername, databasePassword);
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
