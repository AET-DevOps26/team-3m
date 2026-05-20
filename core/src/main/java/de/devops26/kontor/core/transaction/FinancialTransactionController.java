package de.devops26.kontor.core.transaction;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/financial-transactions")
public class FinancialTransactionController {

    private static final Logger log = LoggerFactory.getLogger(FinancialTransactionController.class);

    private final FinancialTransactionService service;

    public FinancialTransactionController(FinancialTransactionService service) {
        this.service = service;
    }

    @PostMapping("/import")
    public ResponseEntity<?> importCsv(@RequestParam("file") MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(errorBody("Uploaded file is empty"));
        }
        var result = service.importCsv(file.getInputStream());
        return ResponseEntity.ok(result);
    }

    @ExceptionHandler(CsvParsingException.class)
    public ResponseEntity<Map<String, Object>> handleCsvParsingException(CsvParsingException ex) {
        return ResponseEntity.badRequest()
                .body(Map.of("success", false, "message", ex.getMessage(), "errors", ex.errors()));
    }

    @ExceptionHandler(IOException.class)
    public ResponseEntity<Map<String, Object>> handleIoException(IOException ex) {
        log.warn("Failed to read uploaded CSV", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorBody("Failed to read uploaded file"));
    }

    private static Map<String, Object> errorBody(String message) {
        return Map.of("success", false, "message", message, "errors", List.of());
    }
}
