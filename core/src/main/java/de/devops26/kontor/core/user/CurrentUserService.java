package de.devops26.kontor.core.user;

import java.util.UUID;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CurrentUserService {

    private final AppUserRepository repository;

    public CurrentUserService(AppUserRepository repository) {
        this.repository = repository;
    }

    /**
     * Resolves the local app_user row for the given OIDC JWT, creating or
     * refreshing it on every authenticated request. Runs in its own transaction
     * so user materialization is not rolled back by failures later in the
     * caller's transactional scope.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public AppUser resolve(Jwt jwt) {
        if (jwt == null) {
            throw new IllegalArgumentException("JWT must not be null");
        }

        UUID oidcSub = parseSub(jwt.getSubject());
        String email = jwt.getClaimAsString("email");
        String preferredUsername = jwt.getClaimAsString("preferred_username");

        return repository.upsert(oidcSub, email, preferredUsername);
    }

    private static UUID parseSub(String subject) {
        if (subject == null || subject.isBlank()) {
            throw new IllegalArgumentException("JWT 'sub' claim is missing");
        }
        try {
            return UUID.fromString(subject);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("JWT 'sub' claim is not a valid UUID: " + subject, e);
        }
    }
}
