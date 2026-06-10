package de.devops26.kontor.core.user;

import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.media.Schema.RequiredMode;
import jakarta.validation.constraints.NotNull;

public record UpdateRiskToleranceRequest(
        @Schema(requiredMode = RequiredMode.REQUIRED) @NotNull RiskTolerance riskTolerance) {}
