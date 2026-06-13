package de.devops26.kontor.core.user;

import de.devops26.kontor.core.security.AuthenticatedUser;
import de.devops26.kontor.core.web.ApiResponse;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/profile")
@SecurityRequirement(name = "bearerAuth")
public class UserProfileController {

    private final UserProfileService service;

    public UserProfileController(UserProfileService service) {
        this.service = service;
    }

    @GetMapping
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "200",
            description = "OK",
            content =
                    @io.swagger.v3.oas.annotations.media.Content(
                            mediaType = "application/json",
                            schema =
                                    @io.swagger.v3.oas.annotations.media.Schema(
                                            implementation = UserProfileResponse.class)))
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized")
    public ResponseEntity<ApiResponse<UserProfileResponse>> getProfile(
            @Parameter(hidden = true) @AuthenticatedUser AppUser user) {
        return ResponseEntity.ok(ApiResponse.ok(service.getProfile(user)));
    }

    @PutMapping
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
            responseCode = "200",
            description = "OK",
            content =
                    @io.swagger.v3.oas.annotations.media.Content(
                            mediaType = "application/json",
                            schema =
                                    @io.swagger.v3.oas.annotations.media.Schema(
                                            implementation = UserProfileResponse.class)))
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Invalid request body")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Unauthorized")
    public ResponseEntity<ApiResponse<UserProfileResponse>> updateProfile(
            @Parameter(hidden = true) @AuthenticatedUser AppUser user,
            @Valid @RequestBody UpdateRiskToleranceRequest request) {
        var updated = service.updateRiskTolerance(user, request.riskTolerance());
        return ResponseEntity.ok(ApiResponse.ok(updated));
    }
}
