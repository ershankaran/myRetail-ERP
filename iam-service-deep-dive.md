# IAM Service — Deep Dive
## How It Works, Down to the Code Level

> **Service:** `iam-service`  
> **Port:** 8081  
> **Database:** `iam_db` (PostgreSQL)  
> **Responsibility:** User registration, authentication, JWT issuance, RBAC

---

## Table of Contents
1. [High-Level Flow](#1-high-level-flow)
2. [Project Structure](#2-project-structure)
3. [Dependency Chain](#3-dependency-chain)
4. [Entity Layer](#4-entity-layer)
5. [Repository Layer](#5-repository-layer)
6. [Security Layer](#6-security-layer)
7. [JWT Mechanics](#7-jwt-mechanics)
8. [Service Layer](#8-service-layer)
9. [Controller Layer](#9-controller-layer)
10. [Exception Handling](#10-exception-handling)
11. [API Response Envelope](#11-api-response-envelope)
12. [Spring Security Filter Chain](#12-spring-security-filter-chain)
13. [Request Lifecycle — Register](#13-request-lifecycle--register)
14. [Request Lifecycle — Login](#14-request-lifecycle--login)
15. [Request Lifecycle — Protected Endpoint](#15-request-lifecycle--protected-endpoint)
16. [Key Design Decisions](#16-key-design-decisions)

---

## 1. High-Level Flow

```
Client
  │
  ├─ POST /auth/register ──► AuthController
  │                               │
  │                          AuthService
  │                               │
  │                    ┌──────────┴──────────┐
  │                    │                     │
  │              UserRepository          JwtService
  │              (save user)         (generate token)
  │                    │                     │
  │               PostgreSQL            JWT String
  │                    └──────────┬──────────┘
  │                               │
  │                          ApiResponse
  │                        { token, email, role }
  │◄──────────────────────────────┘
  │
  ├─ POST /auth/login ──► AuthController
  │                            │
  │                       AuthService
  │                            │
  │               AuthenticationManager.authenticate()
  │                            │
  │                  DaoAuthenticationProvider
  │                            │
  │               UserDetailsServiceImpl.loadUserByUsername()
  │                            │
  │                      UserRepository.findByEmail()
  │                            │
  │                  BCrypt.matches(raw, encoded)
  │                            │
  │                       JwtService.generateToken()
  │◄───────────────────────────┘
  │
  └─ GET /any-protected-endpoint
       │
       JwtAuthFilter (OncePerRequestFilter)
       │
       Extract "Bearer <token>" from Authorization header
       │
       JwtService.extractUsername(token)
       │
       UserDetailsServiceImpl.loadUserByUsername(email)
       │
       JwtService.isTokenValid(token, userDetails)
       │
       SecurityContextHolder.setAuthentication(...)
       │
       Request proceeds to Controller
```

---

## 2. Project Structure

```
iam-service/
└── src/main/java/com/myretailerp/iam/
    ├── IamServiceApplication.java       ← Spring Boot entry point
    │
    ├── entity/
    │   └── User.java                    ← JPA entity + UserDetails
    │
    ├── enums/
    │   └── Role.java                    ← ADMIN, STORE_MANAGER, CASHIER, FINANCE, HR
    │
    ├── repository/
    │   └── UserRepository.java          ← JPA repository
    │
    ├── dto/
    │   ├── RegisterRequest.java         ← Incoming register payload (record)
    │   ├── LoginRequest.java            ← Incoming login payload (record)
    │   ├── AuthResponse.java            ← Outgoing token payload (record)
    │   └── ApiResponse.java             ← Universal response envelope (record)
    │
    ├── Security/
    │   ├── JwtService.java              ← JWT create/validate/parse
    │   ├── JwtAuthFilter.java           ← Per-request JWT validation filter
    │   └── UserDetailsServiceImpl.java  ← Loads User from DB for Spring Security
    │
    ├── config/
    │   └── SecurityConfig.java          ← Filter chain, beans, RBAC rules
    │
    ├── service/
    │   └── AuthService.java             ← Register + Login business logic
    │
    ├── controller/
    │   └── AuthController.java          ← HTTP endpoints
    │
    └── exception/
        ├── GlobalExceptionHandler.java  ← @RestControllerAdvice
        ├── EmailAlreadyExistsException.java
        ├── InvalidCredentialsException.java
        └── UserNotFoundException.java
```

---

## 3. Dependency Chain

```
AuthController
    └── AuthService
            ├── UserRepository          (DB access)
            ├── PasswordEncoder         (BCrypt)
            ├── JwtService              (token ops)
            └── AuthenticationManager   (delegates to ↓)
                    └── DaoAuthenticationProvider
                            ├── UserDetailsServiceImpl
                            │       └── UserRepository
                            └── PasswordEncoder

JwtAuthFilter
    ├── JwtService
    └── UserDetailsServiceImpl
            └── UserRepository

SecurityConfig
    ├── JwtAuthFilter          (injected)
    └── UserDetailsService     (injected — implemented by UserDetailsServiceImpl)
```

**Why no circular dependency:**
`SecurityConfig` injects `UserDetailsServiceImpl` (a separate `@Service` bean).
It does NOT define `UserDetailsService` itself anymore.
So: `SecurityConfig` → `UserDetailsServiceImpl` → `UserRepository` — clean linear chain.

---

## 4. Entity Layer

### `Role.java`
```java
public enum Role {
    ADMIN, STORE_MANAGER, CASHIER, FINANCE, HR
}
```
Simple enum. Stored as a `VARCHAR` in PostgreSQL via `@Enumerated(EnumType.STRING)`.
Using `STRING` (not `ORDINAL`) means DB stores `"ADMIN"` not `0` — safe if enum order ever changes.

---

### `User.java`
```java
@Entity
@Table(name = "users")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class User implements UserDetails {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String password;       // BCrypt hash, never plain text

    @Column(nullable = false)
    private String fullName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    // UserDetails contract methods...
}
```

**Why `implements UserDetails`:**
Spring Security's `AuthenticationManager` works with `UserDetails` objects.
By making `User` implement `UserDetails`, we avoid a separate adapter class —
the entity IS the security principal directly.

**Why `@Getter @Setter` instead of `@Data`:**
`@Data` generates `getPassword()` which conflicts with `UserDetails.getPassword()`.
Using `@Getter @Setter` + explicit `getPassword()` override avoids the conflict.

**Why UUID:**
```
@Id
@GeneratedValue
@UuidGenerator   ← Hibernate 6 native UUID generation
```
- ID is generated in the JVM before the DB insert
- Safe across shards, migrations, service merges
- Non-guessable (unlike sequential Long)
- Required for Saga pattern — events need the ID before DB confirms the write

**Why `@Column(updatable = false)` on id:**
Prevents any code from accidentally updating the primary key after creation.

---

## 5. Repository Layer

### `UserRepository.java`
```java
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
}
```

**How Spring Data JPA works here:**
- `JpaRepository<User, UUID>` gives you `save()`, `findById()`, `findAll()`, `delete()` for free
- `findByEmail` → Spring generates: `SELECT * FROM users WHERE email = ?`
- `existsByEmail` → Spring generates: `SELECT COUNT(*) > 0 FROM users WHERE email = ?`
- No SQL written — Spring parses method names at startup and generates queries

---

## 6. Security Layer

### `UserDetailsServiceImpl.java`
```java
@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String username)
            throws UsernameNotFoundException {
        return userRepository.findByEmail(username)
                .orElseThrow(() ->
                        new UsernameNotFoundException(
                                "User not found: " + username));
    }
}
```

**What this does:**
Spring Security calls `loadUserByUsername(email)` during authentication.
This implementation fetches the `User` from PostgreSQL by email.
Since `User implements UserDetails`, it's returned directly.

**Why it's a separate class (not in SecurityConfig):**
If defined as a `@Bean` inside `SecurityConfig`, it creates a circular dependency:
`SecurityConfig` → `UserDetailsService` → `UserRepository` is fine,
but `SecurityConfig` also needs `JwtAuthFilter` which needs `UserDetailsService` —
and Spring tries to create `SecurityConfig` to get `UserDetailsService`
while `JwtAuthFilter` is waiting for it. Cycle.
Extracting to `@Service` breaks the cycle cleanly.

---

### `SecurityConfig.java`
```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final UserDetailsService userDetailsService;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http)
            throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)       // stateless API — no CSRF needed
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/auth/**").permitAll() // public endpoints
                .anyRequest().authenticated()            // everything else needs JWT
            )
            .sessionManagement(sess -> sess
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS) // no sessions
            )
            .authenticationProvider(authenticationProvider())
            .addFilterBefore(jwtAuthFilter,
                    UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
```

**Key decisions explained:**

`csrf().disable()`:
CSRF attacks exploit browser cookies. Since we use JWT in `Authorization` header
(not cookies), CSRF is irrelevant. Disabling it removes unnecessary overhead.

`SessionCreationPolicy.STATELESS`:
No `HttpSession` is created. Each request must carry its own JWT.
This is what makes the service horizontally scalable — any instance
can serve any request because no session state is stored server-side.

`addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)`:
Inserts our JWT filter BEFORE Spring's default username/password filter.
This means JWT validation runs first on every request.

`@EnableMethodSecurity`:
Enables `@PreAuthorize("hasRole('ADMIN')")` on individual controller methods.
We'll use this heavily in Phase 2+ for fine-grained RBAC.

---

### `JwtAuthFilter.java`
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

        // 1. No Authorization header or not Bearer → skip, pass to next filter
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        // 2. Extract JWT from "Bearer <token>"
        final String jwt = authHeader.substring(7);

        // 3. Extract email from JWT claims
        final String userEmail = jwtService.extractUsername(jwt);

        // 4. If email found and not already authenticated
        if (userEmail != null &&
                SecurityContextHolder.getContext().getAuthentication() == null) {

            // 5. Load full UserDetails from DB
            UserDetails userDetails =
                    userDetailsService.loadUserByUsername(userEmail);

            // 6. Validate token against UserDetails
            if (jwtService.isTokenValid(jwt, userDetails)) {

                // 7. Create authentication token and set in SecurityContext
                UsernamePasswordAuthenticationToken authToken =
                        new UsernamePasswordAuthenticationToken(
                                userDetails, null,
                                userDetails.getAuthorities());
                authToken.setDetails(
                        new WebAuthenticationDetailsSource()
                                .buildDetails(request));
                SecurityContextHolder.getContext()
                        .setAuthentication(authToken);
            }
        }

        // 8. Continue filter chain
        filterChain.doFilter(request, response);
    }
}
```

**Step-by-step what happens on every request:**

```
Request arrives
    │
    ▼
Has "Authorization: Bearer <token>" header?
    │
    ├─ NO  → pass through (Spring Security will reject if endpoint needs auth)
    │
    └─ YES → extract JWT string
                │
                ▼
           Parse JWT → extract email from "sub" claim
                │
                ▼
           Already authenticated in SecurityContext?
                │
                ├─ YES → skip (already processed, pass through)
                │
                └─ NO  → load UserDetails from DB by email
                              │
                              ▼
                         Token valid + not expired?
                              │
                              ├─ NO  → don't set auth (request will be rejected)
                              │
                              └─ YES → set Authentication in SecurityContext
                                            │
                                            ▼
                                      Request proceeds to Controller
```

**Why `OncePerRequestFilter`:**
Guarantees the filter runs exactly once per request, even in
forward/include scenarios where filters can run multiple times.

**Why check `SecurityContextHolder.getContext().getAuthentication() == null`:**
Avoids re-processing if authentication was already set earlier in the chain.

---

## 7. JWT Mechanics

### `JwtService.java`

**What is a JWT:**
```
eyJhbGciOiJIUzM4NCJ9          ← Header (algorithm: HS384)
.eyJyb2xlIjoiUk9MRV9BRE1JTiIs  ← Payload (claims: role, sub, iat, exp)
  InN1YiI6ImFkbWluQHJldGFpbC   
.n7H36PytM7vNQqgBEUMX...       ← Signature (HMAC-SHA384 of header.payload)
```

Decoded payload:
```json
{
  "role": "ROLE_ADMIN",
  "sub": "admin@retailerp.com",
  "iat": 1773636276,
  "exp": 1773722676
}
```

**Token generation:**
```java
public String generateToken(UserDetails userDetails) {
    Map<String, Object> claims = new HashMap<>();
    claims.put("role", userDetails.getAuthorities()
            .iterator().next().getAuthority());   // "ROLE_ADMIN"

    return Jwts.builder()
            .claims(claims)                        // custom claims
            .subject(userDetails.getUsername())    // email as subject
            .issuedAt(new Date())                  // iat
            .expiration(new Date(               
                System.currentTimeMillis() + expiration))  // exp = now + 24h
            .signWith(getSigningKey())             // HMAC-SHA384
            .compact();                            // serialize to string
}
```

**Token validation:**
```java
public boolean isTokenValid(String token, UserDetails userDetails) {
    final String username = extractUsername(token);
    return username.equals(userDetails.getUsername())  // email matches
            && !isTokenExpired(token);                  // not expired
}
```

**Signing key:**
```java
private SecretKey getSigningKey() {
    byte[] keyBytes = Decoders.BASE64.decode(secretKey);  // decode Base64 secret
    return Keys.hmacShaKeyFor(keyBytes);                   // create HMAC key
}
```
The secret (`jwt.secret` in `application.yml`) is a Base64-encoded 256-bit key.
Anyone with this secret can forge tokens — in production it lives in **HashiCorp Vault**,
not in `application.yml`.

---

## 8. Service Layer

### `AuthService.java`

**Register flow:**
```java
public AuthResponse register(RegisterRequest request) {

    // 1. Check duplicate email
    if (userRepository.existsByEmail(request.email())) {
        throw new EmailAlreadyExistsException(request.email());
        // → GlobalExceptionHandler catches → 409 CONFLICT
    }

    // 2. Build entity — password is BCrypt hashed
    User user = User.builder()
            .email(request.email())
            .password(passwordEncoder.encode(request.password()))
            // "admin123" → "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
            .fullName(request.fullName())
            .role(request.role())
            .build();

    // 3. Persist to PostgreSQL (UUID generated by Hibernate here)
    userRepository.save(user);

    // 4. Generate JWT for immediate use
    String token = jwtService.generateToken(user);

    // 5. Return token + user info
    return new AuthResponse(token, user.getEmail(), user.getRole().name());
}
```

**Login flow:**
```java
public AuthResponse login(LoginRequest request) {

    // 1. Delegate to Spring Security's AuthenticationManager
    authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(
                    request.email(), request.password()));
    // Internally:
    //   → DaoAuthenticationProvider
    //   → UserDetailsServiceImpl.loadUserByUsername(email)
    //   → BCrypt.matches(rawPassword, storedHash)
    //   → throws BadCredentialsException if wrong → 401

    // 2. Load user (we know it exists — auth passed)
    User user = userRepository.findByEmail(request.email())
            .orElseThrow(() -> new UserNotFoundException(request.email()));

    // 3. Issue new JWT
    String token = jwtService.generateToken(user);

    return new AuthResponse(token, user.getEmail(), user.getRole().name());
}
```

**Why call `userRepository.findByEmail` after `authenticate()`:**
`authenticate()` doesn't return the user object — it just throws or passes.
We need to load the user separately to build the JWT response.

---

## 9. Controller Layer

### `AuthController.java`
```java
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(
            @Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity
                .status(HttpStatus.CREATED)            // 201
                .body(ApiResponse.success(
                        "User registered successfully", response));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity
                .ok(ApiResponse.success("Login successful", response)); // 200
    }
}
```

**`@Valid`:** Triggers jakarta.validation on the request record before
the method body executes. If validation fails, `MethodArgumentNotValidException`
is thrown automatically — caught by `GlobalExceptionHandler`.

**HTTP status codes:**
- `201 CREATED` for register — a new resource was created
- `200 OK` for login — no new resource, just returning a token
- These matter for API consumers and API gateway routing rules

---

## 10. Exception Handling

### `GlobalExceptionHandler.java`

```java
@RestControllerAdvice   // applies to all @RestController classes
public class GlobalExceptionHandler {
```

`@RestControllerAdvice` = `@ControllerAdvice` + `@ResponseBody`.
Intercepts exceptions thrown anywhere in the controller layer and
converts them to structured HTTP responses.

**Exception hierarchy:**

```
Exception (catch-all → 500)
├── EmailAlreadyExistsException     → 409 CONFLICT
├── UserNotFoundException            → 404 NOT FOUND
├── InvalidCredentialsException      → 401 UNAUTHORIZED
├── BadCredentialsException          → 401 UNAUTHORIZED  (Spring Security)
└── MethodArgumentNotValidException  → 400 BAD REQUEST   (validation)
```

**Validation error handler:**
```java
@ExceptionHandler(MethodArgumentNotValidException.class)
public ResponseEntity<ApiResponse<Map<String, String>>> handleValidation(
        MethodArgumentNotValidException ex) {

    Map<String, String> errors = ex.getBindingResult()
            .getFieldErrors()
            .stream()
            .collect(Collectors.toMap(
                    FieldError::getField,          // "email"
                    FieldError::getDefaultMessage, // "must not be blank"
                    (a, b) -> a
            ));

    return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(ApiResponse.error("Validation failed", errors));
}
```

Response:
```json
{
  "status": "ERROR",
  "message": "Validation failed",
  "data": {
    "email": "Email is required",
    "password": "Password must be between 6 and 50 characters",
    "fullName": "Full name is required"
  },
  "timestamp": "2026-03-16T10:15:04"
}
```

---

## 11. API Response Envelope

### `ApiResponse.java`
```java
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiResponse<T>(
        String status,      // "SUCCESS" | "ERROR"
        String message,     // human-readable message
        T data,             // payload (null on errors)
        LocalDateTime timestamp
) {
    public static <T> ApiResponse<T> success(String message, T data) { ... }
    public static <T> ApiResponse<T> error(String message) { ... }
    public static <T> ApiResponse<T> error(String message, T data) { ... }
}
```

`@JsonInclude(NON_NULL)`: Omits `"data": null` from error responses — cleaner JSON.

**Generic type `T`:**
- `ApiResponse<AuthResponse>` for login/register
- `ApiResponse<Map<String, String>>` for validation errors
- `ApiResponse<Void>` for errors with no data
- `ApiResponse<List<Product>>` when we build inventory service

---

## 12. Spring Security Filter Chain

Every request passes through this chain in order:

```
Request
  │
  ▼
DisableEncodeUrlFilter          ← prevents session ID in URLs
  │
  ▼
SecurityContextHolderFilter     ← sets up SecurityContext for request
  │
  ▼
HeaderWriterFilter              ← adds security headers (X-Frame-Options etc)
  │
  ▼
LogoutFilter                    ← handles /logout
  │
  ▼
JwtAuthFilter  ◄── OUR FILTER  ← validates JWT, sets Authentication
  │
  ▼
RequestCacheAwareFilter
  │
  ▼
SecurityContextHolderAwareFilter
  │
  ▼
AnonymousAuthenticationFilter   ← sets anonymous auth if none set
  │
  ▼
SessionManagementFilter
  │
  ▼
ExceptionTranslationFilter      ← converts AccessDeniedException → 403
  │
  ▼
AuthorizationFilter             ← checks if authenticated/authorized
  │
  ▼ (if authorized)
DispatcherServlet → Controller
```

---

## 13. Request Lifecycle — Register

```
POST /auth/register
Body: { email, password, fullName, role }

1. DisableEncodeUrlFilter → pass through
2. JwtAuthFilter
   → No "Authorization" header
   → filterChain.doFilter() immediately (skip JWT logic)
3. AuthorizationFilter
   → requestMatchers("/auth/**").permitAll() → ALLOW
4. DispatcherServlet → AuthController.register()
5. @Valid triggers → RegisterRequest fields validated
   → If invalid → MethodArgumentNotValidException → GlobalExceptionHandler → 400
6. AuthService.register()
   → existsByEmail() → if true → EmailAlreadyExistsException → 409
   → User.builder() → password BCrypt encoded
   → userRepository.save() → INSERT INTO users ...
   → jwtService.generateToken() → JWT string
7. AuthController returns ResponseEntity (201)
   → ApiResponse.success("User registered successfully", authResponse)
8. Response: 201 + JSON body
```

---

## 14. Request Lifecycle — Login

```
POST /auth/login
Body: { email, password }

1. JwtAuthFilter → No auth header → skip
2. AuthorizationFilter → /auth/** → permitAll → ALLOW
3. AuthController.login()
4. @Valid → LoginRequest validated
5. AuthService.login()
   → authenticationManager.authenticate(email, rawPassword)
      → DaoAuthenticationProvider
         → UserDetailsServiceImpl.loadUserByUsername(email)
            → SELECT * FROM users WHERE email = ?
            → If not found → UsernameNotFoundException → 401
         → BCryptPasswordEncoder.matches(rawPassword, storedHash)
            → If mismatch → BadCredentialsException → 401
   → userRepository.findByEmail() → load User
   → jwtService.generateToken(user)
      → build JWT: { role, sub=email, iat, exp=iat+24h }
      → sign with HMAC-SHA384
6. Return 200 + ApiResponse { token, email, role }
```

---

## 15. Request Lifecycle — Protected Endpoint

```
GET /inventory/products
Headers: Authorization: Bearer eyJhbGci...

1. JwtAuthFilter
   → authHeader = "Bearer eyJhbGci..."
   → jwt = "eyJhbGci..."
   → jwtService.extractUsername(jwt)
      → parse JWT → verify signature → extract "sub" claim → "admin@retailerp.com"
   → SecurityContext has no auth yet
   → userDetailsService.loadUserByUsername("admin@retailerp.com")
      → SELECT * FROM users WHERE email = ?
   → jwtService.isTokenValid(jwt, userDetails)
      → email matches? YES
      → expired? NO
   → Create UsernamePasswordAuthenticationToken(userDetails, null, authorities)
      → authorities = [ROLE_ADMIN]
   → SecurityContextHolder.setAuthentication(authToken)

2. AuthorizationFilter
   → anyRequest().authenticated()
   → SecurityContext has authentication → ALLOW

3. Request proceeds to Controller
   → @PreAuthorize("hasRole('ADMIN')") checked if present
```

---

## 16. Key Design Decisions

| Decision | Choice | Why |
|---|---|---|
| Primary key | UUID | ID generated before DB insert; Saga-safe; non-guessable |
| Password storage | BCrypt | Adaptive hash; slow by design; salt built-in |
| Token type | JWT (stateless) | No server-side session; horizontally scalable |
| Token storage | Header only | Never in URL (logs); client stores in memory/httpOnly cookie |
| Session policy | STATELESS | Any service instance can serve any request |
| DTO type | Java records | Immutable; zero boilerplate; modern Java 21 |
| Entity annotations | `@Getter @Setter` not `@Data` | Avoids `UserDetails.getPassword()` conflict |
| Exception strategy | Typed exceptions | Meaningful HTTP codes; no leaking stack traces |
| Response format | `ApiResponse<T>` envelope | Consistent contract for all API consumers |
| CSRF | Disabled | JWT in header — CSRF irrelevant for stateless APIs |
| Circular dep fix | Extract `UserDetailsServiceImpl` | Single responsibility; clean dependency graph |

---

## What Each Annotation Does — Quick Reference

| Annotation | Where | What it does |
|---|---|---|
| `@RestController` | Controller | `@Controller` + `@ResponseBody` — returns JSON |
| `@RequestMapping` | Controller | Base URL path for all methods |
| `@PostMapping` | Method | Maps POST requests |
| `@RequestBody` | Parameter | Deserializes JSON body to Java object |
| `@Valid` | Parameter | Triggers jakarta.validation on the object |
| `@RequiredArgsConstructor` | Class | Lombok: constructor for all `final` fields |
| `@Service` | Class | Spring bean; business logic layer |
| `@Component` | Class | Spring bean; generic component |
| `@Configuration` | Class | Spring bean; defines other beans |
| `@Bean` | Method | Registers return value as Spring bean |
| `@Entity` | Class | JPA: maps class to DB table |
| `@Table` | Class | JPA: specifies table name |
| `@Id` | Field | JPA: primary key |
| `@GeneratedValue` + `@UuidGenerator` | Field | Hibernate 6: auto UUID generation |
| `@Column` | Field | JPA: column constraints |
| `@Enumerated(STRING)` | Field | JPA: store enum as string not ordinal |
| `@RestControllerAdvice` | Class | Global exception handler for all controllers |
| `@ExceptionHandler` | Method | Handles specific exception type |
| `@EnableMethodSecurity` | Config | Enables `@PreAuthorize` on methods |
| `@JsonInclude(NON_NULL)` | Class | Jackson: omit null fields from JSON |
