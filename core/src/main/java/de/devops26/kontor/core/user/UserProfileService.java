package de.devops26.kontor.core.user;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserProfileService {

    private final AppUserRepository repository;

    public UserProfileService(AppUserRepository repository) {
        this.repository = repository;
    }

    public UserProfileResponse getProfile(AppUser user) {
        return UserProfileResponse.from(user);
    }

    @Transactional
    public UserProfileResponse updateRiskTolerance(AppUser user, RiskTolerance riskTolerance) {
        var updated = repository.updateRiskTolerance(user.id(), riskTolerance);
        return UserProfileResponse.from(updated);
    }
}
