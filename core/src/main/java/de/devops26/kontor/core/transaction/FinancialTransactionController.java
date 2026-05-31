package de.devops26.kontor.core.transaction;

import de.devops26.kontor.core.security.AuthenticatedUser;
import de.devops26.kontor.core.user.AppUser;
import de.devops26.kontor.core.web.ApiResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
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

    @GetMapping
    public ResponseEntity<ApiResponse<List<FinancialTransactionResponse>>> listTransactions(
            @AuthenticatedUser AppUser user) {
        var transactions = service.listTransactions(user.id());
        return ResponseEntity.ok(ApiResponse.ok(transactions));
    }

    @PostMapping("/import")
    public ResponseEntity<ApiResponse<CsvImportResult>> importCsv(
            @RequestParam("file") MultipartFile file, @AuthenticatedUser AppUser user) throws IOException {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Uploaded file is empty"));
        }
        var result = service.importCsv(file.getInputStream(), user.id());
        return ResponseEntity.ok(ApiResponse.ok(result));
    }
}
