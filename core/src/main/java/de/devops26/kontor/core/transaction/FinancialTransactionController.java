package de.devops26.kontor.core.transaction;

import de.devops26.kontor.core.security.AuthenticatedUser;
import de.devops26.kontor.core.user.AppUser;
import de.devops26.kontor.core.web.ApiResponse;
import java.io.IOException;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.UUID;
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
    public ResponseEntity<ApiResponse<?>> listTransactions(
            @AuthenticatedUser AppUser user,
            @RequestParam(defaultValue = "200") int pageSize,
            @RequestParam(required = false) String afterDatetime,
            @RequestParam(required = false) UUID afterId) {
        if ((afterDatetime == null) != (afterId == null)) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("afterDatetime and afterId must be provided together"));
        }
        TransactionCursor cursor = null;
        if (afterDatetime != null) {
            try {
                cursor = new TransactionCursor(
                        OffsetDateTime.parse(afterDatetime, DateTimeFormatter.ISO_OFFSET_DATE_TIME), afterId);
            } catch (DateTimeParseException e) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Invalid afterDatetime format; expected ISO-8601 with offset"));
            }
        }
        var page = service.listTransactions(user.id(), pageSize, cursor);
        return ResponseEntity.ok(ApiResponse.ok(page));
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
