# Start with a base image containing Java runtime
FROM eclipse-temurin:21-jre-alpine

# Set the working directory inside the container
WORKDIR /app

# The gateway is also a Spring Boot application!
# Make sure you compile it first with './gradlew build' in the gateway directory
COPY build/libs/*-SNAPSHOT.jar app.jar

# Inform Docker that the container listens on port 8080
EXPOSE 8080

# The command to execute when the container starts
ENTRYPOINT ["java", "-jar", "app.jar"]
