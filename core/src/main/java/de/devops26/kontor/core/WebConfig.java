package de.devops26.kontor.core;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@EnableConfigurationProperties(WebConfig.CorsProperties.class)
public class WebConfig implements WebMvcConfigurer {

	private final CorsProperties corsProperties;

	public WebConfig(CorsProperties corsProperties) {
		this.corsProperties = corsProperties;
	}

	@Override
	public void addCorsMappings(CorsRegistry registry) {
		registry.addMapping("/**")
				.allowedOrigins(corsProperties.allowedOrigins().toArray(String[]::new))
				.allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
				.allowedHeaders("*");
	}

	@ConfigurationProperties(prefix = "app.cors")
	public record CorsProperties(List<String> allowedOrigins) {
		public CorsProperties {
			allowedOrigins = allowedOrigins == null ? List.of() : List.copyOf(allowedOrigins);
		}
	}
}
