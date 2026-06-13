package de.devops26.kontor.core.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
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

    private static final String SUB = "auth-provider|alice";

    @Mock
    private AppUserRepository repository;

    private CurrentUserService service;

    @BeforeEach
    void setUp() {
        service = new CurrentUserService(repository);
    }

    @Test
    @DisplayName("resolve upserts the local app_user when it is missing")
    void resolve_missingUser_upsertsUser() {
        var jwt = jwt(SUB, Map.of("email", "alice@example.com", "preferred_username", "alice"));
        var expected = new AppUser(UUID.randomUUID(), SUB, "alice@example.com", "alice", null);
        when(repository.findByOidcSub(SUB)).thenReturn(Optional.empty());
        when(repository.upsert(eq(SUB), eq("alice@example.com"), eq("alice"))).thenReturn(expected);

        var result = service.resolve(jwt);

        assertThat(result).isEqualTo(expected);
        verify(repository).findByOidcSub(SUB);
        verify(repository).upsert(SUB, "alice@example.com", "alice");
    }

    @Test
    @DisplayName("resolve returns existing app_user when claims are unchanged")
    void resolve_existingUserWithSameClaims_returnsExistingUser() {
        var jwt = jwt(SUB, Map.of("email", "alice@example.com", "preferred_username", "alice"));
        var expected = new AppUser(UUID.randomUUID(), SUB, "alice@example.com", "alice", null);
        when(repository.findByOidcSub(SUB)).thenReturn(Optional.of(expected));

        var result = service.resolve(jwt);

        assertThat(result).isEqualTo(expected);
        verify(repository).findByOidcSub(SUB);
        verify(repository, never()).upsert(eq(SUB), eq("alice@example.com"), eq("alice"));
    }

    @Test
    @DisplayName("resolve upserts existing app_user when claims change")
    void resolve_existingUserWithChangedClaims_upsertsUser() {
        var jwt = jwt(SUB, Map.of("email", "alice.changed@example.com", "preferred_username", "alice"));
        var existing = new AppUser(UUID.randomUUID(), SUB, "alice@example.com", "alice", null);
        var expected = new AppUser(existing.id(), SUB, "alice.changed@example.com", "alice", null);
        when(repository.findByOidcSub(SUB)).thenReturn(Optional.of(existing));
        when(repository.upsert(eq(SUB), eq("alice.changed@example.com"), eq("alice")))
                .thenReturn(expected);

        var result = service.resolve(jwt);

        assertThat(result).isEqualTo(expected);
        verify(repository).findByOidcSub(SUB);
        verify(repository).upsert(SUB, "alice.changed@example.com", "alice");
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
    @DisplayName("resolve throws when sub claim is blank")
    void resolve_blankSub_throws() {
        var jwt = jwt(" ", Map.of());

        assertThatThrownBy(() -> service.resolve(jwt))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("sub");
    }

    @Test
    @DisplayName("resolve passes null email when claim is absent")
    void resolve_missingEmail_passesNullToRepository() {
        var jwt = jwt(SUB, Map.of("preferred_username", "alice"));
        var expected = new AppUser(UUID.randomUUID(), SUB, null, "alice", null);
        when(repository.findByOidcSub(SUB)).thenReturn(Optional.empty());
        when(repository.upsert(eq(SUB), eq(null), eq("alice"))).thenReturn(expected);

        service.resolve(jwt);

        verify(repository).findByOidcSub(SUB);
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
