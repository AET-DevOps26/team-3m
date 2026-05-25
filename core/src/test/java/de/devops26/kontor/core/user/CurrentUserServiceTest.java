package de.devops26.kontor.core.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.jwt.Jwt;

@ExtendWith(MockitoExtension.class)
class CurrentUserServiceTest {

    private static final UUID SUB = UUID.fromString("0e7c4ad7-1ae3-4f7c-95e6-30db5ad7b341");

    @Mock
    private AppUserRepository repository;

    private CurrentUserService service;

    @BeforeEach
    void setUp() {
        service = new CurrentUserService(repository);
    }

    @Test
    @DisplayName("resolve upserts the local app_user from JWT claims")
    void resolve_validJwt_upsertsUser() {
        var jwt = jwt(SUB.toString(), Map.of("email", "alice@example.com", "preferred_username", "alice"));
        var expected = new AppUser(UUID.randomUUID(), SUB, "alice@example.com", "alice");
        when(repository.upsert(eq(SUB), eq("alice@example.com"), eq("alice"))).thenReturn(expected);

        var result = service.resolve(jwt);

        assertThat(result).isEqualTo(expected);
        verify(repository).upsert(SUB, "alice@example.com", "alice");
    }

    @Test
    @DisplayName("resolve throws when sub claim is missing")
    void resolve_missingSub_throws() {
        var jwt = jwt(null, Map.of("email", "alice@example.com"));

        assertThatThrownBy(() -> service.resolve(jwt))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("sub");
    }

    @Test
    @DisplayName("resolve throws when sub claim is not a UUID")
    void resolve_invalidSub_throws() {
        var jwt = jwt("not-a-uuid", Map.of());

        assertThatThrownBy(() -> service.resolve(jwt))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("UUID");
    }

    @Test
    @DisplayName("resolve passes null email when claim is absent")
    void resolve_missingEmail_passesNullToRepository() {
        var jwt = jwt(SUB.toString(), Map.of("preferred_username", "alice"));
        var expected = new AppUser(UUID.randomUUID(), SUB, null, "alice");
        when(repository.upsert(eq(SUB), eq(null), eq("alice"))).thenReturn(expected);

        service.resolve(jwt);

        verify(repository).upsert(SUB, null, "alice");
    }

    private static Jwt jwt(String subject, Map<String, Object> extraClaims) {
        var claims = new java.util.HashMap<String, Object>(extraClaims);
        if (subject != null) {
            claims.put("sub", subject);
        }
        return new Jwt(
                "fake-token-value", Instant.now(), Instant.now().plusSeconds(300), Map.of("alg", "none"), claims);
    }
}
