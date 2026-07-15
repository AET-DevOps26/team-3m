package de.devops26.kontor.news.security;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PublicDocsSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("Swagger UI and OpenAPI spec are reachable without authentication")
    void swaggerUi_publicEndpoint_returnsSuccessWithoutToken() throws Exception {
        mockMvc.perform(get("/news/v3/api-docs")).andExpect(status().isOk());
        mockMvc.perform(get("/news/swagger-ui/index.html")).andExpect(status().isOk());
    }

    @Test
    @DisplayName("API endpoints still reject anonymous calls with 401 and Bearer challenge")
    void apiEndpoint_anonymous_returns401() throws Exception {
        mockMvc.perform(get("/api/v1/news/aggregation/runs"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().exists("WWW-Authenticate"))
                .andExpect(jsonPath("$.success").value(false));
    }
}
