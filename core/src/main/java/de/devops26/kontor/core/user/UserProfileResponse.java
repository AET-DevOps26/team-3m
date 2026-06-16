package de.devops26.kontor.core.user;

import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.media.Schema.RequiredMode;
import java.util.UUID;

public record UserProfileResponse(
        @Schema(requiredMode = RequiredMode.REQUIRED) UUID id,
        @Schema String email,
        @Schema String preferredUsername,
        @Schema(nullable = true) RiskTolerance riskTolerance) {

    public static UserProfileResponse from(AppUser user) {
        return new UserProfileResponse(user.id(), user.email(), user.preferredUsername(), user.riskTolerance());
    }
}
