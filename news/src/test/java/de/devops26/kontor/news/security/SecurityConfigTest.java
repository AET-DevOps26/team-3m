package de.devops26.kontor.news.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;

class SecurityConfigTest {

    @Test
    @DisplayName("maps realm roles without trusting roles from unrelated clients")
    void jwtAuthenticationConverter_realmRoles_mapsAuthorities() {
        var config = new SecurityConfig(
                "https://issuer.test/jwks",
                "https://issuer.test",
                "kontor-api",
                mock(ApiAuthenticationEntryPoint.class),
                mock(ApiAccessDeniedHandler.class));
        var now = Instant.now();
        var jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject("subject")
                .issuedAt(now)
                .expiresAt(now.plusSeconds(60))
                .claim("realm_access", Map.of("roles", List.of("kontor-admin")))
                .claim("resource_access", Map.of("kontor-api", Map.of("roles", List.of("article-reader"))))
                .build();

        var authentication = config.jwtAuthenticationConverter().convert(jwt);

        assertThat(authentication).isNotNull();
        assertThat(authentication.getAuthorities())
                .extracting(Object::toString)
                .contains("ROLE_kontor-admin")
                .doesNotContain("ROLE_article-reader");
    }
}
