package de.devops26.kontor.core.marketdata;

import de.devops26.kontor.core.security.AuthenticatedUser;
import de.devops26.kontor.core.user.AppUser;
import de.devops26.kontor.core.web.ApiResponse;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/v1/market-data")
public class MarketDataController {

    private final MarketDataService service;

    public MarketDataController(MarketDataService service) {
        this.service = service;
    }

    @GetMapping(path = "/search", produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
                responseCode = "200",
                description = "Instruments matching the query",
                content =
                        @Content(
                                mediaType = MediaType.APPLICATION_JSON_VALUE,
                                schema = @Schema(implementation = InstrumentSearchApiResponse.class))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
                responseCode = "502",
                description = "Market data provider unavailable",
                content =
                        @Content(
                                mediaType = MediaType.APPLICATION_JSON_VALUE,
                                schema = @Schema(implementation = ApiResponse.class))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
                responseCode = "429",
                description = "Market data provider rate limit reached",
                content =
                        @Content(
                                mediaType = MediaType.APPLICATION_JSON_VALUE,
                                schema = @Schema(implementation = ApiResponse.class)))
    })
    public ResponseEntity<InstrumentSearchApiResponse> searchInstruments(
            @RequestParam(defaultValue = "") String q, @Parameter(hidden = true) @AuthenticatedUser AppUser user) {
        var result = service.search(q);
        return ResponseEntity.ok(InstrumentSearchApiResponse.from(ApiResponse.ok(result)));
    }

    @GetMapping(path = "/quotes/{symbol}", produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
                responseCode = "200",
                description = "Current quote for the instrument",
                content =
                        @Content(
                                mediaType = MediaType.APPLICATION_JSON_VALUE,
                                schema = @Schema(implementation = InstrumentQuoteApiResponse.class))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
                responseCode = "404",
                description = "Unknown symbol",
                content =
                        @Content(
                                mediaType = MediaType.APPLICATION_JSON_VALUE,
                                schema = @Schema(implementation = ApiResponse.class))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
                responseCode = "502",
                description = "Market data provider unavailable",
                content =
                        @Content(
                                mediaType = MediaType.APPLICATION_JSON_VALUE,
                                schema = @Schema(implementation = ApiResponse.class))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
                responseCode = "429",
                description = "Market data provider rate limit reached",
                content =
                        @Content(
                                mediaType = MediaType.APPLICATION_JSON_VALUE,
                                schema = @Schema(implementation = ApiResponse.class)))
    })
    public ResponseEntity<InstrumentQuoteApiResponse> getQuote(
            @PathVariable String symbol, @Parameter(hidden = true) @AuthenticatedUser AppUser user) {
        var result = service.getQuote(symbol);
        return ResponseEntity.ok(InstrumentQuoteApiResponse.from(ApiResponse.ok(result)));
    }

    @GetMapping(path = "/quotes/{symbol}/history", produces = MediaType.APPLICATION_JSON_VALUE)
    @ApiResponses({
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
                responseCode = "200",
                description = "Historical prices for the instrument",
                content =
                        @Content(
                                mediaType = MediaType.APPLICATION_JSON_VALUE,
                                schema = @Schema(implementation = InstrumentHistoryApiResponse.class))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
                responseCode = "400",
                description = "Invalid range parameter",
                content =
                        @Content(
                                mediaType = MediaType.APPLICATION_JSON_VALUE,
                                schema = @Schema(implementation = ApiResponse.class))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
                responseCode = "404",
                description = "Unknown symbol",
                content =
                        @Content(
                                mediaType = MediaType.APPLICATION_JSON_VALUE,
                                schema = @Schema(implementation = ApiResponse.class))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
                responseCode = "502",
                description = "Market data provider unavailable",
                content =
                        @Content(
                                mediaType = MediaType.APPLICATION_JSON_VALUE,
                                schema = @Schema(implementation = ApiResponse.class))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(
                responseCode = "429",
                description = "Market data provider rate limit reached",
                content =
                        @Content(
                                mediaType = MediaType.APPLICATION_JSON_VALUE,
                                schema = @Schema(implementation = ApiResponse.class)))
    })
    public ResponseEntity<InstrumentHistoryApiResponse> getQuoteHistory(
            @PathVariable String symbol,
            @Parameter(schema = @Schema(allowableValues = {"1D", "1W", "1M", "1Y", "MAX"}))
                    @RequestParam(defaultValue = "1M")
                    String range,
            @Parameter(hidden = true) @AuthenticatedUser AppUser user) {
        var result = service.getHistory(symbol, MarketRange.fromParam(range));
        return ResponseEntity.ok(InstrumentHistoryApiResponse.from(ApiResponse.ok(result)));
    }
}
