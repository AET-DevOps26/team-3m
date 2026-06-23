# syntax=docker/dockerfile:1

FROM eclipse-temurin:25.0.3_9-jdk-alpine AS build

WORKDIR /workspace

COPY gradlew ./
COPY gradle ./gradle
COPY settings.gradle build.gradle ./
RUN chmod +x gradlew && ./gradlew --no-daemon dependencies

COPY . .
RUN ./gradlew --no-daemon bootJar

FROM eclipse-temurin:25.0.3_9-jre-alpine

WORKDIR /app

ARG OTEL_AGENT_VERSION=2.28.1
ADD https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/download/v${OTEL_AGENT_VERSION}/opentelemetry-javaagent.jar /app/otel/opentelemetry-javaagent.jar

RUN addgroup -S app && adduser -S app -G app && chmod -R a+rX /app/otel

COPY --from=build --chown=app:app /workspace/build/libs/*.jar app.jar

USER app

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
