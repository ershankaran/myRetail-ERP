# Authentication, Authorization, SSO & OIDC — Enterprise Guide

---

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [Authentication vs Authorization](#authentication-vs-authorization)
3. [JWT — Deep Dive](#jwt--deep-dive)
4. [Spring Security Implementation](#spring-security-implementation)
5. [RBAC — Role-Based Access Control](#rbac--role-based-access-control)
6. [OAuth 2.0](#oauth-20)
7. [OpenID Connect (OIDC)](#openid-connect-oidc)
8. [SSO — Single Sign-On](#sso--single-sign-on)
9. [Security Best Practices](#security-best-practices)
10. [Microservices Auth Patterns](#microservices-auth-patterns)
11. [Troubleshooting](#troubleshooting)
12. [myRetail ERP Implementation](#myretail-erp-implementation)

---

## Core Concepts

### The Fundamental Question

```
Authentication: WHO are you?
  → Verify identity (username + password, biometric, token)

Authorization:  WHAT can you do?
  → Check permissions (roles, scopes, policies)

You cannot authorize without first authenticating.
```

### Identity vs Session vs Token

```
Traditional Session (stateful):
  Login → Server creates session → Stores in memory/DB
  Each request → Server looks up session → Verifies
  Problem: Doesn't scale (all servers must share session store)

JWT Token (stateless):
  Login → Server creates signed token → Returns to client
  Each request → Client sends token → Server VERIFIES signature (no DB lookup)
  Benefit: Scales infinitely — any server can verify any token
```

---

## Authentication vs Authorization

### Authentication Methods

| Method | How | Use Case |
|---|---|---|
| Password | Hash compare in DB | Standard login |
| JWT | Signed token verification | API auth, microservices |
| OAuth 2.0 | Delegated access via auth server | Third-party login |
| OIDC | OAuth 2.0 + identity layer | SSO, enterprise login |
| mTLS | Client certificate | Service-to-service |
| API Key | Pre-shared secret in header | Machine-to-machine |

### Authorization Models

```
RBAC (Role-Based):
  User → has Role → Role has Permissions
  Example: CASHIER can POST /pos/checkout but NOT DELETE /users

ABAC (Attribute-Based):
  Policy = Subject + Action + Resource + Environment
  Example: CASHIER at STORE-CHENNAI can only access STORE-CHENNAI terminals

PBAC (Policy-Based):
  Centralized policy engine (OPA, Casbin)
  Most flexible, most complex
```

---

## JWT — Deep Dive

### Structure

```
JWT = Header.Payload.Signature

eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9   ← Header (base64)
.
eyJzdWIiOiJhZG1pbkByZXRhaWxlcnAuY29tIiwiZXhwIjoxNzc0MDAwMDAwLCJyb2xlIjoiQURNSU4ifQ
                                          ← Payload (base64)
.
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c   ← Signature (HMAC-SHA256)
```

### Decoded Payload

```json
{
  "sub": "admin@retailerp.com",    // subject (user identifier)
  "iat": 1773672000,               // issued at (Unix timestamp)
  "exp": 1773758400,               // expiry (Unix timestamp)
  "role": "ADMIN",                 // custom claim
  "jti": "uuid"                    // JWT ID (for blacklisting)
}
```

### How JWT Verification Works

```
Client sends:
  Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ...

Server verifies:
  1. Split into Header.Payload.Signature
  2. Recompute: HMAC-SHA256(Header.Payload, secretKey)
  3. Compare with provided Signature
  4. If match → token is authentic → extract claims
  5. Check exp claim → not expired?
  6. Extract sub, role → set in SecurityContext

No DB lookup needed — the secret key is the proof of authenticity.
```

### JWT in Our Implementation (JwtService.java)

```java
public class JwtService {

    @Value("${jwt.secret}")
    private String secretKey;   // 256-bit hex string

    @Value("${jwt.expiration}")
    private long expirationMs;  // 86400000 = 24 hours

    // Generate token with role claim
    public String generateToken(UserDetails user, String role) {
        return Jwts.builder()
            .subject(user.getUsername())
            .claim("role", role)           // custom claim
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + expirationMs))
            .signWith(getSigningKey())     // HMAC-SHA256
            .compact();
    }

    // Verify and extract username
    public String extractUsername(String token) {
        return parseClaims(token).getSubject();
    }

    // Extract role
    public String extractRole(String token) {
        return (String) parseClaims(token).get("role");
    }

    // Validate: signature valid AND not expired
    public boolean isTokenValid(String token, UserDetails user) {
        final String username = extractUsername(token);
        return username.equals(user.getUsername())
            && !isTokenExpired(token);
    }

    private boolean isTokenExpired(String token) {
        return parseClaims(token).getExpiration().before(new Date());
    }

    public Claims parseClaims(String token) {
        return Jwts.parser()
            .verifyWith(getSigningKey())
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }

    private SecretKey getSigningKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
```

### JWT Pitfalls

```
❌ Storing JWT in localStorage → XSS vulnerable
✅ Store in httpOnly cookie → XSS protected

❌ No expiry (exp claim missing) → token valid forever
✅ Always set expiry (24h for access token, 7d for refresh token)

❌ Weak secret (< 256 bits) → brute-force vulnerable
✅ Generate with: openssl rand -hex 32

❌ Storing sensitive data in payload → anyone can decode it
✅ Only store non-sensitive identifiers (userId, role)
   (Payload is base64, NOT encrypted — readable by anyone)

❌ No token invalidation strategy → can't logout
✅ Short expiry + refresh tokens + blacklist for logout
```

---

## Spring Security Implementation

### Security Filter Chain

```
HTTP Request
    │
    ▼
DelegatingFilterProxy (Spring)
    │
    ▼
FilterChainProxy
    │
    ├── DisableEncodeUrlFilter
    ├── SecurityContextHolderFilter
    ├── HeaderWriterFilter
    ├── JwtAuthFilter           ← OUR custom filter
    │       │
    │       ├── Extract "Bearer {token}" from Authorization header
    │       ├── Validate JWT signature
    │       ├── Extract username + role from claims
    │       └── Set Authentication in SecurityContextHolder
    │
    ├── AuthorizationFilter     ← checks @PreAuthorize
    └── ...
    │
    ▼
Controller method executes
```

### JwtAuthFilter (from common-lib)

```java
@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");

        // Skip if no Bearer token
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        final String token = authHeader.substring(7);  // remove "Bearer "
        final String username = jwtService.extractUsername(token);
        final String role = jwtService.extractRole(token);  // e.g. "ADMIN"

        // Only set auth if not already set
        if (username != null &&
            SecurityContextHolder.getContext().getAuthentication() == null) {

            UserDetails userDetails = userDetailsService
                .loadUserByUsername(username);

            if (jwtService.isTokenValid(token, userDetails)) {
                // Create auth token with role as authority
                UsernamePasswordAuthenticationToken authToken =
                    new UsernamePasswordAuthenticationToken(
                        userDetails,
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_" + role))
                    );
                authToken.setDetails(
                    new WebAuthenticationDetailsSource()
                        .buildDetails(request));

                // Set in context — downstream can read it
                SecurityContextHolder.getContext()
                    .setAuthentication(authToken);
            }
        }
        filterChain.doFilter(request, response);
    }
}
```

### SecurityConfig.java Pattern

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity    // enables @PreAuthorize on methods
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http)
            throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)    // CSRF not needed for stateless JWT
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/auth/**").permitAll()   // login/register public
                .requestMatchers("/actuator/health").permitAll()
                .anyRequest().authenticated()
            )
            .sessionManagement(sess -> sess
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)  // no sessions
            )
            .addFilterBefore(jwtAuthFilter,
                UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
```

### @PreAuthorize at Controller Level

```java
// Role-based access
@PostMapping("/products")
@PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER')")
public ResponseEntity<?> createProduct(@RequestBody CreateProductRequest request) { ... }

// Single role
@DeleteMapping("/users/{id}")
@PreAuthorize("hasRole('ADMIN')")
public ResponseEntity<?> deleteUser(@PathVariable UUID id) { ... }

// Expression-based
@GetMapping("/orders/my-orders")
@PreAuthorize("isAuthenticated()")
public ResponseEntity<?> getMyOrders() {
    // Gets current user from SecurityContext
    String email = SecurityContextHolder.getContext()
        .getAuthentication().getName();
    return orderService.getOrdersByCustomer(email);
}
```

### Circular Dependency Solution

```
Problem:
  JwtAuthFilter → UserDetailsService
  SecurityConfig → JwtAuthFilter
  SecurityConfig @Bean UserDetailsService → JwtAuthFilter (circular)

Solution: Standalone @Service for UserDetailsService

@Service  // standalone — NOT a @Bean inside SecurityConfig
public class ServiceNameUserDetailsService
        implements UserDetailsService {

    @Override
    public UserDetails loadUserByUsername(String username) {
        return User.builder()
            .username(username)
            .password("")
            .authorities(List.of(
                new SimpleGrantedAuthority("ROLE_USER")))
            .build();
    }
}

Rule: NEVER define UserDetailsService as @Bean inside SecurityConfig
      when JwtAuthFilter is also a Spring bean.
```

---

## RBAC — Role-Based Access Control

### Role Hierarchy

```
myRetail ERP Roles:

ADMIN
  └── Full access to everything

STORE_MANAGER
  └── Manage store products, view all orders, manage staff

CASHIER
  └── POS operations (cart, checkout), view own sales

FINANCE
  └── View financial reports, manage ledger entries

HR
  └── Manage employee records, payroll

PROCUREMENT
  └── Manage purchase orders, supplier management
```

### Role in JWT vs Database

```
Option A — Role in JWT (what we do):
  Login → Role fetched from DB → Embedded in JWT claim
  Every request → Role extracted from JWT (no DB call)
  Problem: Role change requires new token (or short expiry)

Option B — Role from DB on every request:
  Every request → DB lookup for current role
  Benefit: Role change is immediate
  Problem: Extra DB call per request

Option C — Hybrid:
  Short-lived access token (15 min) with role in JWT
  Long-lived refresh token (7 days) to get new access token
  Role change → old access tokens expire in 15 min max
```

### JwtAuthFilter Role Extraction (ADR-008)

```java
// Key decision in our system:
// Role extracted from JWT claims, NOT from UserDetailsService

final String role = jwtService.extractRole(token);
// → "ADMIN", "STORE_MANAGER", "CASHIER" etc.

List.of(new SimpleGrantedAuthority("ROLE_" + role))
// → "ROLE_ADMIN", "ROLE_STORE_MANAGER", "ROLE_CASHIER"

// This is then checked by @PreAuthorize("hasRole('ADMIN')")
// hasRole('ADMIN') checks for authority "ROLE_ADMIN"
```

---

## OAuth 2.0

### The Problem OAuth Solves

```
Before OAuth:
  "Login with Google" → App asks for your Google password
  → App now has your password → Security nightmare

OAuth 2.0:
  "Login with Google" → Google asks YOU to authorize the app
  → Google gives app a token (not your password)
  → App uses token to access only what you authorized
  → You can revoke anytime
```

### OAuth 2.0 Roles

```
Resource Owner:    The user (you)
Client:            The application requesting access
Authorization Server: Issues tokens (Google, Okta, Keycloak)
Resource Server:   API that validates tokens (your backend)
```

### OAuth 2.0 Flows

```
Authorization Code Flow (most secure — for web apps):
  1. App redirects user to auth server
  2. User logs in + approves scopes
  3. Auth server redirects back with auth CODE
  4. App exchanges CODE for access token (server-to-server)
  5. App uses token to call APIs

Client Credentials Flow (machine-to-machine):
  1. Service A sends: clientId + clientSecret to auth server
  2. Auth server returns access token
  3. Service A uses token to call Service B
  (No user involved — service identity only)

Device Code Flow (TV, CLI tools):
  1. Device shows code
  2. User goes to URL on phone, enters code
  3. Device polls for token
```

---

## OpenID Connect (OIDC)

### OIDC = OAuth 2.0 + Identity

```
OAuth 2.0 says: "Here's a token to access resources"
               But doesn't say WHO the user is

OIDC adds:     "Here's an ID Token that proves WHO the user is"

OAuth 2.0 → Authorization (access to resources)
OIDC      → Authentication (identity of user)

OIDC ID Token (JWT) contains:
{
  "sub": "user-uuid",          // unique user identifier
  "iss": "https://auth.company.com",  // issuer
  "aud": "your-app-client-id",        // audience
  "exp": 1773758400,
  "iat": 1773672000,
  "email": "user@company.com",
  "name": "John Doe",
  "email_verified": true
}
```

### OIDC Discovery Endpoint

```
Every OIDC provider exposes:
https://auth.company.com/.well-known/openid-configuration

Returns:
{
  "issuer": "https://auth.company.com",
  "authorization_endpoint": "https://auth.company.com/oauth/authorize",
  "token_endpoint": "https://auth.company.com/oauth/token",
  "userinfo_endpoint": "https://auth.company.com/oauth/userinfo",
  "jwks_uri": "https://auth.company.com/.well-known/jwks.json",
  "scopes_supported": ["openid", "email", "profile"],
  "response_types_supported": ["code"]
}
```

---

## SSO — Single Sign-On

### How SSO Works

```
Without SSO:
  User logs into App A → session
  User opens App B → logs in again
  User opens App C → logs in again (3 separate sessions)

With SSO:
  User logs into Identity Provider (IdP) → session at IdP
  User opens App A → App A redirects to IdP → IdP sees session → issues token → App A logged in ✅
  User opens App B → App B redirects to IdP → IdP sees session → issues token → App B logged in ✅
  User opens App C → same → logged in ✅
  Single logout → logs out of all apps

The IdP holds the golden session. Apps trust IdP-issued tokens.
```

### SSO Providers

| Provider | Type | Best For |
|---|---|---|
| Keycloak | Open source, self-hosted | Enterprise, on-premise |
| Okta | Cloud SaaS | Enterprise, quick setup |
| Auth0 | Cloud SaaS | Startups, developer-friendly |
| Azure AD (Entra) | Microsoft cloud | Microsoft shops |
| Google Workspace | Cloud | Google-first orgs |
| AWS Cognito | Cloud | AWS-native apps |

### Keycloak Setup (Most Common for Enterprise)

```yaml
# docker-compose.yml
services:
  keycloak:
    image: quay.io/keycloak/keycloak:24.0
    command: start-dev
    environment:
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: admin
    ports:
      - "8080:8080"
```

```
Keycloak concepts:
  Realm:   Isolated namespace (like a tenant) — e.g. "myretail"
  Client:  Your application registered with Keycloak
  User:    Identity managed in Keycloak
  Role:    Permission assigned to users
  Scope:   What data the token includes (openid, email, profile)
```

### Spring Boot + Keycloak (OIDC)

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-oauth2-resource-server</artifactId>
</dependency>
```

```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: http://localhost:8080/realms/myretail
          # Spring auto-fetches public keys from:
          # http://localhost:8080/realms/myretail/.well-known/openid-configuration
```

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http)
            throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/public/**").permitAll()
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt
                    .jwtAuthenticationConverter(jwtAuthConverter())
                )
            );
        return http.build();
    }

    @Bean
    public JwtAuthenticationConverter jwtAuthConverter() {
        JwtGrantedAuthoritiesConverter converter =
            new JwtGrantedAuthoritiesConverter();
        converter.setAuthoritiesClaimName("roles");         // Keycloak roles claim
        converter.setAuthorityPrefix("ROLE_");

        JwtAuthenticationConverter authConverter =
            new JwtAuthenticationConverter();
        authConverter.setJwtGrantedAuthoritiesConverter(converter);
        return authConverter;
    }
}
```

### Token Flow with Keycloak

```
1. User opens myRetail Angular app
2. App redirects to Keycloak login page
3. User enters credentials at Keycloak
4. Keycloak issues: access_token (JWT) + id_token + refresh_token
5. App stores access_token
6. App calls: GET /inventory/products
   Authorization: Bearer {access_token}
7. inventory-service validates JWT using Keycloak's public key
8. JWT contains roles → @PreAuthorize works normally
```

---

## Security Best Practices

### Token Storage

```
Web Browser:
  ✅ httpOnly cookie (XSS protected — JS can't read it)
  ✅ SameSite=Strict (CSRF protected)
  ❌ localStorage (XSS vulnerable — JS can read it)
  ❌ sessionStorage (same as localStorage)

Mobile App:
  ✅ Secure Keychain (iOS) / Keystore (Android)
  ❌ SharedPreferences (Android) — not encrypted
```

### Refresh Token Pattern

```
Access Token: short-lived (15 min), sent with every request
Refresh Token: long-lived (7 days), stored securely, used only to get new access token

Flow:
  Login → access_token (15 min) + refresh_token (7 days)
  
  15 min later → access_token expires
  App: POST /auth/refresh { refresh_token }
  Server: validates refresh_token → issues new access_token
  
  Logout → refresh_token invalidated (stored in blacklist or DB)
           access_token expires naturally (15 min max)
```

### Secret Key Requirements

```bash
# Generate a strong 256-bit JWT secret
openssl rand -hex 32
# → 3cfa76ef14937c1c0ea519f8fc057a80fcd04a7420f8e8bcd0a7567c272e007b

# Store in environment variable — NEVER hardcode in application.yml
export JWT_SECRET=3cfa76ef14937c1c0ea519f8fc057a80fcd04a7420f8e8bcd0a7567c272e007b
```

```yaml
# application.yml
jwt:
  secret: ${JWT_SECRET}      # from environment
  expiration: ${JWT_EXPIRY:86400000}  # 24h default
```

### Password Storage

```java
// Always use BCrypt — never store plaintext or MD5/SHA
@Bean
public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder(12);  // cost factor 12
}

// Usage
String hashed = passwordEncoder.encode("rawPassword");
boolean matches = passwordEncoder.matches("rawPassword", hashed);
```

### CORS Configuration

```java
@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOrigins(List.of(
        "http://localhost:4200",           // Angular dev
        "https://app.myretailerp.com"     // production
    ));
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE"));
    config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
    config.setAllowCredentials(true);     // needed for cookies

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    return source;
}
```

---

## Microservices Auth Patterns

### Pattern 1 — JWT Propagation (What We Built)

```
Client → API Gateway → Service A → Service B

Each service validates JWT independently.
Service A → Service B: forward the original JWT.

Pros: Simple, no extra infrastructure
Cons: All services need JWT validation logic (use common-lib)
```

### Pattern 2 — API Gateway Token Validation

```
Client → API Gateway (validates JWT) → Service A (trusts gateway)

Gateway validates token, extracts claims, passes as headers:
  X-User-Id: admin@retailerp.com
  X-User-Role: ADMIN

Services trust these headers (no JWT validation in services).

Pros: JWT logic in one place
Cons: Services must trust internal headers (secure your network)
```

### Pattern 3 — Service-to-Service (Client Credentials)

```
When Service A calls Service B (no user involved):

Service A → POST /auth/token { client_id, client_secret } → Auth Server
         ← access_token

Service A → GET /inventory/products
           Authorization: Bearer {service-token}

Service B verifies the service identity, not a user identity.
```

### Inter-Service JWT Forwarding

```java
// When POS calls Inventory to get price:
// Forward the user's JWT from the current request

private String getCurrentBearerToken() {
    ServletRequestAttributes attrs =
        (ServletRequestAttributes) RequestContextHolder
            .getRequestAttributes();
    HttpServletRequest request = attrs.getRequest();
    return request.getHeader("Authorization");  // "Bearer eyJ..."
}

// Use in RestClient
restClient.get()
    .uri("/inventory/products/{id}", productId)
    .header("Authorization", getCurrentBearerToken())
    .retrieve()
    .body(String.class);
```

---

## Troubleshooting

### 401 Unauthorized

```
Possible causes:
1. Token missing from request header
   Fix: Check Authorization: Bearer {token} header

2. Token expired
   Fix: Re-login to get new token (check exp claim)

3. Token signature invalid (wrong secret key)
   Fix: Verify jwt.secret matches across services (shared common-lib)

4. Token malformed (truncated, extra spaces)
   Fix: Check the raw token value

Debug: jwt.io → paste token → see if valid + check expiry
```

### 403 Forbidden (AuthorizationDeniedException)

```
Possible causes:
1. Wrong role — CASHIER trying ADMIN endpoint
   Fix: Check @PreAuthorize("hasRole('ADMIN')") vs user's actual role

2. Role not extracted from JWT
   Fix: Check JwtAuthFilter extracts role and sets as "ROLE_ADMIN" authority
        Log: authentication.getAuthorities()

3. @EnableMethodSecurity missing
   Fix: Add @EnableMethodSecurity to SecurityConfig

Handler in exception handler:
@ExceptionHandler(AuthorizationDeniedException.class)
public ResponseEntity<ApiResponse<Void>> handleAccessDenied(...) {
    return ResponseEntity.status(HttpStatus.FORBIDDEN)
        .body(ApiResponse.error("Access denied"));
}
```

### Circular Dependency on Startup

```
Error: The dependencies of some of the beans form a cycle:
  jwtAuthFilter → securityConfig → jwtAuthFilter

Fix: Extract UserDetailsService to standalone @Service
     Never define it as @Bean inside SecurityConfig
     See: SecurityConfig Circular Dependency Solution section above
```

### CORS Error in Browser

```
Error: Access to XMLHttpRequest blocked by CORS policy

Fix:
1. Add CorsConfigurationSource bean (see Security Best Practices)
2. Apply it in SecurityFilterChain:
   http.cors(cors -> cors.configurationSource(corsConfigurationSource()))
3. Make sure allowed origins match exactly (no trailing slash)
4. In dev: allow localhost:4200 (Angular default port)
```

---

## myRetail ERP Implementation

### What We Built

```
Authentication: Custom JWT (iam-service)
Authorization:  RBAC via @PreAuthorize
Token storage:  Client stores JWT (Postman/Browser)
Role in JWT:    Yes — extracted in JwtAuthFilter

Services:
  iam-service  → Issues tokens (login, register)
  common-lib   → JwtService, JwtAuthFilter (shared)
  All services → Validate JWT independently
```

### Roles and Permissions Matrix

| Endpoint | ADMIN | STORE_MANAGER | CASHIER | FINANCE | HR |
|---|---|---|---|---|---|
| POST /inventory/products | ✅ | ✅ | ❌ | ❌ | ❌ |
| GET /inventory/products | ✅ | ✅ | ✅ | ✅ | ❌ |
| PATCH /inventory/stock | ✅ | ✅ | ❌ | ❌ | ❌ |
| POST /orders | ✅ | ✅ | ✅ | ❌ | ❌ |
| POST /pos/checkout | ✅ | ✅ | ✅ | ❌ | ❌ |
| PATCH /orders/{id}/ship | ✅ | ✅ | ❌ | ❌ | ❌ |
| GET /orders/status/{status} | ✅ | ✅ | ❌ | ❌ | ❌ |

### Future: SSO with Keycloak

```
When Angular UI is built (Phase 9):
  Replace iam-service login page
  with Keycloak SSO login

Benefits:
  Single login for all services
  Social login (Google, Microsoft)
  MFA support
  Session management
  Token refresh handled by Keycloak

Migration path:
  iam-service issues JWT → Keycloak issues JWT
  JwtAuthFilter validates either (same structure)
  No change in services
```

### JWT Secret Sharing Across Services

```
Problem: Multiple services need the same JWT secret to validate tokens

Current approach: Same jwt.secret in each service's application.yml
  Simple but requires secret rotation across all services

Better approach: Common-lib reads secret from environment variable
  export JWT_SECRET=3cfa76ef...
  Each service reads ${JWT_SECRET}
  Rotate by updating one env var + restart

Production approach: Secret Manager (AWS Secrets Manager, Vault)
  Services fetch secret at startup from central secret store
  Rotation is centralized
```
