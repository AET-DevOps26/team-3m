package de.devops26.kontor.core.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class UserProfileServiceTest {

    @Mock
    private AppUserRepository repository;

    private UserProfileService service;

    @BeforeEach
    void setUp() {
        service = new UserProfileService(repository);
    }

    @Test
    @DisplayName("getProfile maps AppUser fields to UserProfileResponse")
    void getProfile_validUser_returnsMappedResponse() {
        var user = new AppUser(UUID.randomUUID(), "sub", "alice@example.com", "alice", RiskTolerance.MODERATE);

        var result = service.getProfile(user);

        assertThat(result.id()).isEqualTo(user.id());
        assertThat(result.email()).isEqualTo("alice@example.com");
        assertThat(result.preferredUsername()).isEqualTo("alice");
        assertThat(result.riskTolerance()).isEqualTo(RiskTolerance.MODERATE);
    }

    @Test
    @DisplayName("getProfile maps null riskTolerance when not yet set")
    void getProfile_noRiskTolerance_returnsNullRiskTolerance() {
        var user = new AppUser(UUID.randomUUID(), "sub", "bob@example.com", "bob", null);

        var result = service.getProfile(user);

        assertThat(result.riskTolerance()).isNull();
    }

    @Test
    @DisplayName("updateRiskTolerance delegates to repository and returns updated profile")
    void updateRiskTolerance_validRequest_returnsUpdatedProfile() {
        var userId = UUID.randomUUID();
        var user = new AppUser(userId, "sub", "alice@example.com", "alice", null);
        var updated = new AppUser(userId, "sub", "alice@example.com", "alice", RiskTolerance.AGGRESSIVE);
        when(repository.updateRiskTolerance(userId, RiskTolerance.AGGRESSIVE)).thenReturn(updated);

        var result = service.updateRiskTolerance(user, RiskTolerance.AGGRESSIVE);

        assertThat(result.riskTolerance()).isEqualTo(RiskTolerance.AGGRESSIVE);
        verify(repository).updateRiskTolerance(userId, RiskTolerance.AGGRESSIVE);
    }
}
