# syntax=docker/dockerfile:1

FROM eclipse-temurin:25-jdk-alpine AS build

WORKDIR /workspace

COPY gradlew settings.gradle build.gradle ./
COPY gradle ./gradle

RUN chmod +x ./gradlew && ./gradlew --no-daemon dependencies > /dev/null

COPY src ./src

RUN ./gradlew --no-daemon bootJar

FROM eclipse-temurin:25-jre-alpine

WORKDIR /app

RUN addgroup -S app && adduser -S app -G app

COPY --from=build --chown=app:app /workspace/build/libs/*.jar app.jar

USER app:app

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
