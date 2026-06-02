package de.devops26.kontor.core.web;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

public record ApiResponse<T>(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) boolean success, T data, String error, List<?> details) {

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, data, null, null);
    }

    public static <T> ApiResponse<T> error(String message) {
        return new ApiResponse<>(false, null, message, null);
    }

    public static <T> ApiResponse<T> error(String message, List<?> details) {
        return new ApiResponse<>(false, null, message, details == null ? null : List.copyOf(details));
    }
}
