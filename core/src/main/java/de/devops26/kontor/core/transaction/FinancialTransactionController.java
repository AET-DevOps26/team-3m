package de.devops26.kontor.core.transaction;

import de.devops26.kontor.core.security.AuthenticatedUser;
import de.devops26.kontor.core.user.AppUser;
import de.devops26.kontor.core.web.ApiResponse;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import java.io.IOException;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.UUID;
import org.springframework.http.MediaType;
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
            @Parameter(hidden = true) @AuthenticatedUser AppUser user,
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

    @PostMapping(
            path = "/import",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
                responseCode = "200",
                description = "CSV imported successfully",
                content =
                        @Content(
                                mediaType = MediaType.APPLICATION_JSON_VALUE,
                                schema = @Schema(implementation = CsvImportApiResponse.class))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
                responseCode = "400",
                description = "Empty upload, malformed CSV, or row-level validation failure",
                content =
                        @Content(
                                mediaType = MediaType.APPLICATION_JSON_VALUE,
                                schema = @Schema(implementation = ApiResponse.class)))
    })
    public ResponseEntity<CsvImportApiResponse> importCsv(
            @RequestParam("file") MultipartFile file, @Parameter(hidden = true) @AuthenticatedUser AppUser user)
            throws IOException {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(CsvImportApiResponse.from(ApiResponse.error("Uploaded file is empty")));
        }
        var result = service.importCsv(file.getInputStream(), user.id());
        return ResponseEntity.ok(CsvImportApiResponse.from(ApiResponse.ok(result)));
    }
}
