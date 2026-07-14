package de.devops26.kontor.news.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;

class AudienceValidatorTest {

    private final AudienceValidator validator = new AudienceValidator("kontor-api");

    @Test
    @DisplayName("accepts a token containing the configured audience")
    void validate_expectedAudience_succeeds() {
        assertThat(validator.validate(jwt(List.of("another-api", "kontor-api"))).hasErrors())
                .isFalse();
    }

    @Test
    @DisplayName("rejects a token that does not contain the configured audience")
    void validate_missingAudience_fails() {
        var result = validator.validate(jwt(List.of("another-api")));

        assertThat(result.hasErrors()).isTrue();
        assertThat(result.getErrors()).singleElement().satisfies(error -> {
            assertThat(error.getErrorCode()).isEqualTo("invalid_token");
            assertThat(error.getDescription()).contains("kontor-api");
        });
    }

    private static Jwt jwt(List<String> audience) {
        var now = Instant.now();
        return Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject("subject")
                .audience(audience)
                .issuedAt(now)
                .expiresAt(now.plusSeconds(60))
                .build();
    }
}
