package com.insureth.gateway.config;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class GatewayJwtAuthenticationFilter extends OncePerRequestFilter {

    private final SecretKey secretKey;

    public GatewayJwtAuthenticationFilter(@Value("${security.jwt.secret}") String jwtSecret) {
        this.secretKey = Keys.hmacShaKeyFor(Decoders.BASE64.decode(jwtSecret));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String authorization = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            Claims claims = Jwts.parser()
                    .verifyWith(secretKey)
                    .build()
                    .parseSignedClaims(authorization.substring(7))
                    .getPayload();

            String subject = claims.getSubject();
            List<String> roles = claims.get("roles", List.class);
            List<String> rights = claims.get("rights", List.class);
            String legacyRole = claims.get("role", String.class);

            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                    subject,
                    null,
                    buildAuthorities(roles, rights, legacyRole)
            );
            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authentication);
            filterChain.doFilter(request, response);
        } catch (Exception exception) {
            SecurityContextHolder.clearContext();
            writeUnauthorized(response, "Invalid or expired JWT");
        }
    }

    private List<SimpleGrantedAuthority> buildAuthorities(List<String> roles, List<String> rights, String legacyRole) {
        LinkedHashSet<String> values = new LinkedHashSet<>();

        if (roles != null) {
            roles.stream()
                    .filter(Objects::nonNull)
                    .map(String::trim)
                    .filter(value -> !value.isBlank())
                    .forEach(role -> values.add("ROLE_" + role));
        }

        if (rights != null) {
            rights.stream()
                    .filter(Objects::nonNull)
                    .map(String::trim)
                    .filter(value -> !value.isBlank())
                    .forEach(values::add);
        }

        if (values.isEmpty() && legacyRole != null && !legacyRole.isBlank()) {
            values.add("ROLE_" + legacyRole);
        }

        return values.stream()
                .map(SimpleGrantedAuthority::new)
                .toList();
    }

    private void writeUnauthorized(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write("{\"message\":\"" + escapeJson(message) + "\"}");
    }

    private String escapeJson(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
