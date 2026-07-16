package de.devops26.kontor.news.web;

import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
class ApiDocsForwardedHeadersTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("OpenAPI server URL honors X-Forwarded-Proto/Host from the TLS-terminating proxy")
    void apiDocs_behindTlsProxy_generatesHttpsServerUrl() throws Exception {
        mockMvc.perform(get("/news/v3/api-docs")
                        .header("X-Forwarded-Proto", "https")
                        .header("X-Forwarded-Host", "kontor.example.com"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.servers[0].url").value(startsWith("https://kontor.example.com")));
    }
}
