# syntax=docker/dockerfile:1

FROM eclipse-temurin:25.0.4_7-jdk-alpine AS build

WORKDIR /workspace

COPY gradlew ./
COPY gradle ./gradle
COPY settings.gradle build.gradle ./
RUN chmod +x gradlew && ./gradlew --no-daemon dependencies

COPY . .
RUN ./gradlew --no-daemon bootJar

FROM eclipse-temurin:25.0.4_7-jre-alpine

WORKDIR /app

ARG OTEL_AGENT_VERSION=2.28.1
ARG OTEL_AGENT_SHA256=faa89bdeebf9b1f52be4a4374689176717b02a59df2d8f8b6eb9aa39f9292589
RUN mkdir -p /app/otel \
 && wget -qO /app/otel/opentelemetry-javaagent.jar \
    "https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/download/v${OTEL_AGENT_VERSION}/opentelemetry-javaagent.jar" \
 && echo "${OTEL_AGENT_SHA256}  /app/otel/opentelemetry-javaagent.jar" | sha256sum -c -

RUN addgroup -S app && adduser -S app -G app && chmod -R a+rX /app/otel

COPY --from=build --chown=app:app /workspace/build/libs/*.jar app.jar

USER app

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
