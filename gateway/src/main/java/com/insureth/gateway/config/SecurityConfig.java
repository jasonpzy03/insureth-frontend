package com.insureth.gateway.config;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final GatewayJwtAuthenticationFilter gatewayJwtAuthenticationFilter;

    public SecurityConfig(GatewayJwtAuthenticationFilter gatewayJwtAuthenticationFilter) {
        this.gatewayJwtAuthenticationFilter = gatewayJwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(Customizer.withDefaults())
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .addFilterBefore(gatewayJwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .exceptionHandling(exception -> exception.authenticationEntryPoint((request, response, authException) -> {
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                    response.getWriter().write("{\"message\":\"Authentication required\"}");
                }))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/error").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/auth/cp-users/exists").permitAll()
                        .requestMatchers("/api/v1/auth/cp-users/signup/**").permitAll()
                        .requestMatchers("/api/v1/auth/client/nonce", "/api/v1/auth/client/login").permitAll()
                        .requestMatchers("/api/v1/auth/backoffice/nonce", "/api/v1/auth/backoffice/login").permitAll()
                        .requestMatchers("/api/v1/auth/cp-users/**").authenticated()
                        .requestMatchers("/api/v1/auth/client/**").authenticated()
                        .requestMatchers("/api/v1/auth/backoffice/**").authenticated()
                        .requestMatchers("/api/v1/insurance/admin/**").authenticated()
                        .requestMatchers("/api/v1/insurance/flightinsurance/notifications/**").authenticated()
                        .anyRequest().permitAll());

        return http.build();
    }
}
