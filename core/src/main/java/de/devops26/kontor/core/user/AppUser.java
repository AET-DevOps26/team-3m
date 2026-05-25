package de.devops26.kontor.core.user;

import java.util.UUID;

public record AppUser(UUID id, UUID oidcSub, String email, String preferredUsername) {}
