package de.devops26.kontor.core.user;

import static de.devops26.kontor.core.generated.tables.AppUser.APP_USER;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.jooq.DSLContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class UserProfileIntegrationTest {

    private static final String USER_SUB = "auth-provider|alice-profile";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private DSLContext dsl;

    @BeforeEach
    void cleanDatabase() {
        dsl.deleteFrom(APP_USER).where(APP_USER.OIDC_SUB.eq(USER_SUB)).execute();
    }

    @Test
    @DisplayName("GET /profile without bearer token returns 401")
    void getProfile_withoutToken_returns401() throws Exception {
        mockMvc.perform(get("/api/v1/profile")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /profile returns profile with null riskTolerance for new user")
    void getProfile_newUser_returnsNullRiskTolerance() throws Exception {
        mockMvc.perform(get("/api/v1/profile").with(jwtFor(USER_SUB, "alice")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.preferredUsername").value("alice"))
                .andExpect(jsonPath("$.data.riskTolerance").doesNotExist());
    }

    @Test
    @DisplayName("PUT /profile persists and returns updated riskTolerance")
    void updateProfile_validRequest_persistsRiskTolerance() throws Exception {
        mockMvc.perform(put("/api/v1/profile")
                        .with(jwtFor(USER_SUB, "alice"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"riskTolerance\":\"MODERATE\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.riskTolerance").value("MODERATE"));
    }

    @Test
    @DisplayName("PUT /profile with invalid value returns 400")
    void updateProfile_invalidValue_returns400() throws Exception {
        mockMvc.perform(put("/api/v1/profile")
                        .with(jwtFor(USER_SUB, "alice"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"riskTolerance\":\"YOLO\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("PUT /profile without token returns 401")
    void updateProfile_withoutToken_returns401() throws Exception {
        mockMvc.perform(put("/api/v1/profile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"riskTolerance\":\"CONSERVATIVE\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /profile after PUT returns the persisted riskTolerance")
    void getProfile_afterUpdate_returnsPersistedValue() throws Exception {
        mockMvc.perform(put("/api/v1/profile")
                        .with(jwtFor(USER_SUB, "alice"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"riskTolerance\":\"AGGRESSIVE\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/profile").with(jwtFor(USER_SUB, "alice")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.riskTolerance").value("AGGRESSIVE"));
    }

    private static SecurityMockMvcRequestPostProcessors.JwtRequestPostProcessor jwtFor(
            String sub, String preferredUsername) {
        return jwt().jwt(builder -> builder.subject(sub)
                .claim("preferred_username", preferredUsername)
                .claim("email", preferredUsername + "@kontor.test"));
    }
}
