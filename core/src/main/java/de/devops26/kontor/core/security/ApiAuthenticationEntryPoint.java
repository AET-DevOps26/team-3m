package de.devops26.kontor.core.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import de.devops26.kontor.core.web.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.server.resource.web.BearerTokenAuthenticationEntryPoint;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

/**
 * Returns a JSON {@link ApiResponse} envelope on 401 while preserving the
 * {@code WWW-Authenticate: Bearer ...} challenge that Spring Security's default
 * entry point writes for OAuth2 resource servers.
 */
@Component
public class ApiAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final BearerTokenAuthenticationEntryPoint delegate = new BearerTokenAuthenticationEntryPoint();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void commence(
            HttpServletRequest request, HttpServletResponse response, AuthenticationException authException)
            throws IOException {
        // Let the bearer-token entry point set the WWW-Authenticate header and status code,
        // then overwrite the (empty) body with our standard envelope.
        delegate.commence(request, response, authException);

        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        if (!response.containsHeader(HttpHeaders.WWW_AUTHENTICATE)) {
            response.setHeader(HttpHeaders.WWW_AUTHENTICATE, "Bearer");
        }

        var body = ApiResponse.error("Authentication required");
        objectMapper.writeValue(response.getWriter(), body);
    }
}
