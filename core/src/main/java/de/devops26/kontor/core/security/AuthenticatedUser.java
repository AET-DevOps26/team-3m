package de.devops26.kontor.core.security;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a controller method parameter that should be resolved to the
 * {@link de.devops26.kontor.core.user.AppUser} corresponding to the JWT in the
 * current security context. Resolution is performed by
 * {@link AuthenticatedUserArgumentResolver}.
 */
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
public @interface AuthenticatedUser {}
