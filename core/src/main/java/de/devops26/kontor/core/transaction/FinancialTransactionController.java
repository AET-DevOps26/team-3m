package de.devops26.kontor.core.transaction;

import java.io.IOException;
import java.util.Map;
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

    private final FinancialTransactionService service;

    public FinancialTransactionController(FinancialTransactionService service) {
        this.service = service;
    }

    @PostMapping("/import")
    public ResponseEntity<CsvImportResult> importCsv(@RequestParam("file") MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(new CsvImportResult(0, "Uploaded file is empty"));
        }
        var result = service.importCsv(file.getInputStream());
        return ResponseEntity.ok(result);
    }

    @ExceptionHandler(CsvParsingException.class)
    public ResponseEntity<Map<String, Object>> handleCsvParsingException(CsvParsingException ex) {
        return ResponseEntity.badRequest()
                .body(Map.of("success", false, "message", ex.getMessage(), "errors", ex.errors()));
    }
}
