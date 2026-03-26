# Redis — Enterprise Setup, Configuration, Patterns & Troubleshooting Guide

---

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [Setup & Installation](#setup--installation)
3. [Spring Boot Configuration](#spring-boot-configuration)
4. [Data Structures & When to Use Each](#data-structures--when-to-use-each)
5. [Caching Patterns](#caching-patterns)
6. [Session & Cart Management](#session--cart-management)
7. [TTL Strategy](#ttl-strategy)
8. [Serialization](#serialization)
9. [Eviction Policies](#eviction-policies)
10. [Security](#security)
11. [High Availability](#high-availability)
12. [Monitoring & Observability](#monitoring--observability)
13. [Troubleshooting](#troubleshooting)
14. [myRetail ERP Patterns](#myretail-erp-patterns)

---

## Core Concepts

### The Mental Model

```
Redis is an in-memory data structure store.
Think of it as an extremely fast HashMap that:
  - Lives outside your JVM (shared across instances)
  - Supports rich data types (not just String → String)
  - Has TTL (auto-expiry)
  - Can persist to disk
  - Scales via clustering

Speed: sub-millisecond reads/writes (vs 5-50ms for DB)
```

### What Redis is NOT

```
❌ Not a primary database (data can be lost on crash without persistence)
❌ Not for large blobs (keep values under 1MB ideally)
❌ Not for complex queries (no SQL, no joins)
❌ Not transactional like a RDBMS (MULTI/EXEC has limitations)

✅ Cache layer in front of DB
✅ Session/cart storage
✅ Rate limiting counters
✅ Pub/Sub messaging
✅ Distributed locks
✅ Leaderboards (Sorted Sets)
✅ Real-time presence tracking
```

---

## Setup & Installation

### Docker Compose (Development)

```yaml
services:
  redis:
    image: redis:7.2-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru
    volumes:
      - redis-data:/data

volumes:
  redis-data:
```

### Production Redis (Sentinel — High Availability)

```yaml
services:
  redis-master:
    image: redis:7.2-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}

  redis-replica-1:
    image: redis:7.2-alpine
    command: >
      redis-server
      --replicaof redis-master 6379
      --requirepass ${REDIS_PASSWORD}
      --masterauth ${REDIS_PASSWORD}

  redis-sentinel-1:
    image: redis:7.2-alpine
    command: redis-sentinel /etc/redis/sentinel.conf
    # sentinel.conf: monitor, quorum=2, failover settings
```

### Redis CLI Basics

```bash
# Connect
redis-cli -h localhost -p 6379

# Basic operations
SET key value
GET key
DEL key
EXISTS key
TTL key          # seconds remaining (-1 = no expiry, -2 = key missing)
EXPIRE key 3600  # set 1 hour TTL
KEYS pattern     # NEVER use in production — use SCAN instead
SCAN 0 MATCH "cart:*" COUNT 100

# Monitor all commands (dev only)
MONITOR

# Get server info
INFO memory
INFO stats
INFO keyspace
```

---

## Spring Boot Configuration

### Dependencies (pom.xml)

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
```

### application.yml

```yaml
spring:
  data:
    redis:
      host: localhost
      port: 6379
      password: ${REDIS_PASSWORD:}        # empty for dev
      timeout: 2000ms                     # connection timeout
      lettuce:
        pool:
          max-active: 20                  # max connections
          max-idle: 10
          min-idle: 5
          max-wait: 1000ms               # wait for connection from pool
```

### RedisConfig.java (Spring Data Redis 4.x)

```java
@Configuration
public class RedisConfig {

    @Bean
    public RedisTemplate<String, Object> redisTemplate(
            RedisConnectionFactory factory,
            ObjectMapper objectMapper) {

        // Spring Data Redis 4.x — use GenericJackson2JsonRedisSerializer
        GenericJackson2JsonRedisSerializer serializer =
            new GenericJackson2JsonRedisSerializer(objectMapper);

        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(factory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(serializer);
        template.setHashKeySerializer(new StringRedisSerializer());
        template.setHashValueSerializer(serializer);
        template.afterPropertiesSet();
        return template;
    }
}
```

### ObjectMapper Bean (required)

```java
@Bean
public ObjectMapper objectMapper() {
    ObjectMapper mapper = new ObjectMapper();
    mapper.registerModule(new JavaTimeModule());
    mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    return mapper;
}
```

---

## Data Structures & When to Use Each

### String (most common)

```java
// Store any scalar value or serialized object
redisTemplate.opsForValue().set("user:123:name", "John");
redisTemplate.opsForValue().set("user:123:session", sessionJson, 30, TimeUnit.MINUTES);

String name = (String) redisTemplate.opsForValue().get("user:123:name");

// Atomic increment (counters, rate limiting)
redisTemplate.opsForValue().increment("api:calls:today");
Long count = redisTemplate.opsForValue().increment("login:attempts:" + ip);
```

### Hash (object with multiple fields)

```java
// Store object fields separately — update individual fields without re-serializing
redisTemplate.opsForHash().put("user:123", "name", "John");
redisTemplate.opsForHash().put("user:123", "email", "john@example.com");
redisTemplate.opsForHash().put("user:123", "loyaltyPoints", "250");

// Get single field — efficient
String email = (String) redisTemplate.opsForHash().get("user:123", "email");

// Get all fields
Map<Object, Object> user = redisTemplate.opsForHash().entries("user:123");

// Use for: user sessions, product attributes, config
// Benefit: partial updates without reading/writing entire object
```

### List (ordered, duplicates allowed)

```java
// Push to list
redisTemplate.opsForList().leftPush("order:history:user123", orderId);

// Get range
List<Object> history = redisTemplate.opsForList().range("order:history:user123", 0, 9); // last 10

// Use for: activity feeds, queues, recent items
```

### Set (unordered, unique values)

```java
// Add members
redisTemplate.opsForSet().add("product:tags:mouse001", "electronics", "wireless", "gaming");

// Check membership (O(1))
Boolean isElectronics = redisTemplate.opsForSet().isMember("product:tags:mouse001", "electronics");

// Intersection (common tags)
Set<Object> commonTags = redisTemplate.opsForSet()
    .intersect("product:tags:mouse001", "product:tags:keyboard001");

// Use for: tags, permissions, unique visitors
```

### Sorted Set (ordered by score)

```java
// Add with score
redisTemplate.opsForZSet().add("store:sales:leaderboard", "STORE-CHENNAI", 89970.00);
redisTemplate.opsForZSet().add("store:sales:leaderboard", "STORE-MUMBAI", 125000.00);

// Top 10 stores by sales (descending)
Set<Object> topStores = redisTemplate.opsForZSet()
    .reverseRange("store:sales:leaderboard", 0, 9);

// Use for: leaderboards, priority queues, time-series (score = timestamp)
```

---

## Caching Patterns

### Cache-Aside (Most Common)

```java
// 1. Check cache first
// 2. Cache miss → load from DB → store in cache
// 3. Return value

public ProductResponse getProduct(UUID productId) {
    String key = "product:" + productId;

    // Try cache
    Object cached = redisTemplate.opsForValue().get(key);
    if (cached != null) {
        return objectMapper.convertValue(cached, ProductResponse.class);
    }

    // Cache miss — load from DB
    Product product = productRepository.findById(productId)
        .orElseThrow(() -> new ProductNotFoundException(productId));
    ProductResponse response = ProductResponse.from(product);

    // Store in cache with TTL
    redisTemplate.opsForValue().set(key, response, 60, TimeUnit.MINUTES);

    return response;
}

// Invalidate on update
public void updateProduct(UUID productId, UpdateRequest request) {
    // ... update DB ...
    redisTemplate.delete("product:" + productId);  // evict cache
}
```

### Write-Through Cache

```java
// Write to DB and cache simultaneously
// Cache is always up to date
// Slightly slower writes, but reads always hit cache

public ProductResponse createProduct(CreateProductRequest request) {
    Product product = productRepository.save(/* ... */);
    ProductResponse response = ProductResponse.from(product);

    // Write to cache immediately
    redisTemplate.opsForValue().set(
        "product:" + product.getId(),
        response,
        60, TimeUnit.MINUTES);

    return response;
}
```

### @Cacheable (Spring Cache Abstraction)

```java
// Enable caching
@SpringBootApplication
@EnableCaching
public class Application { ... }

// Cache method results automatically
@Cacheable(value = "products", key = "#productId", unless = "#result == null")
public ProductResponse getProduct(UUID productId) {
    // Only called on cache miss
    return productRepository.findById(productId)
        .map(ProductResponse::from)
        .orElse(null);
}

@CacheEvict(value = "products", key = "#productId")
public void updateProduct(UUID productId, UpdateRequest request) {
    // Cache evicted automatically after update
}

// Config in application.yml
spring:
  cache:
    type: redis
    redis:
      time-to-live: 3600000  # 1 hour in ms
```

---

## Session & Cart Management

### Cart Storage Pattern (What We Built)

```java
// Key design
"cart:{terminalId}"      → CartDto (JSON)
TTL: 30 minutes, reset on every action

// Store
redisTemplate.opsForValue().set(
    "cart:" + terminalId,
    cartDto,
    30, TimeUnit.MINUTES);

// Read — IMPORTANT: always use objectMapper.convertValue()
Object raw = redisTemplate.opsForValue().get("cart:" + terminalId);
CartDto cart = objectMapper.convertValue(raw, CartDto.class);

// Why convertValue()?
// Redis returns LinkedHashMap, not CartDto
// objectMapper maps field-by-field by name
// Works with Java records ✅
```

### Price Cache Pattern

```java
// Key design
"price:{storeId}:{productId}" → "29.99" (String)
TTL: 60 minutes (refreshed hourly)

// Store
redisTemplate.opsForValue().set(
    String.format("price:%s:%s", storeId, productId),
    price.toString(),
    60, TimeUnit.MINUTES);

// Read
Object cached = redisTemplate.opsForValue().get(key);
BigDecimal price = cached != null
    ? new BigDecimal(cached.toString())
    : fetchFromInventory();
```

### Distributed Lock Pattern

```java
// Prevent concurrent access to same resource
// Use for: inventory updates, payment processing

public boolean acquireLock(String resource, String lockId, long ttlSeconds) {
    Boolean acquired = redisTemplate.opsForValue()
        .setIfAbsent(
            "lock:" + resource,
            lockId,          // unique value to identify the lock owner
            ttlSeconds,
            TimeUnit.SECONDS);
    return Boolean.TRUE.equals(acquired);
}

public void releaseLock(String resource, String lockId) {
    String key = "lock:" + resource;
    String current = (String) redisTemplate.opsForValue().get(key);
    if (lockId.equals(current)) {
        redisTemplate.delete(key);  // only release if we own it
    }
}

// Usage
String lockId = UUID.randomUUID().toString();
if (acquireLock("product:" + productId, lockId, 10)) {
    try {
        // critical section
    } finally {
        releaseLock("product:" + productId, lockId);
    }
}
```

### Rate Limiting

```java
// Allow N requests per time window per user
public boolean isRateLimited(String userId, int maxRequests, int windowSeconds) {
    String key = "rate:" + userId + ":" + (System.currentTimeMillis() / (windowSeconds * 1000));

    Long count = redisTemplate.opsForValue().increment(key);
    if (count == 1) {
        redisTemplate.expire(key, windowSeconds, TimeUnit.SECONDS);
    }

    return count > maxRequests;
}
```

---

## TTL Strategy

### TTL Rules for myRetail ERP

| Data | TTL | Reasoning |
|---|---|---|
| Active cart | 30 min (reset on action) | Idle cashier timeout |
| Price cache | 60 min | Prices change infrequently |
| JWT session | Match token expiry | Security consistency |
| Rate limit counter | Window size | Auto-reset after window |
| Distributed lock | Operation timeout | Prevent deadlock |
| Product cache | 15 min | Reasonable freshness |

### TTL Anti-Patterns

```java
// ❌ WRONG — no TTL = memory leak
redisTemplate.opsForValue().set("cart:" + id, cart);

// ❌ WRONG — TTL too long for frequently changing data
redisTemplate.opsForValue().set("stock:" + id, qty, 24, TimeUnit.HOURS);

// ✅ CORRECT — appropriate TTL + reset on activity
redisTemplate.opsForValue().set("cart:" + id, cart, 30, TimeUnit.MINUTES);

// ✅ CORRECT — reset TTL on activity (keep alive)
redisTemplate.expire("cart:" + id, 30, TimeUnit.MINUTES);
```

---

## Serialization

### The LinkedHashMap Problem

```
Storing:
  CartDto → Jackson → JSON bytes → Redis

Reading:
  Redis → JSON bytes → Jackson → ???
                               ↑
                       Jackson sees { } → defaults to LinkedHashMap
                       It doesn't know this was a CartDto

Fix:
  Object raw = redis.get(key);          // LinkedHashMap
  CartDto cart = objectMapper           // Convert by field name
      .convertValue(raw, CartDto.class);
```

### For Lists

```java
// Reading a list of objects from Redis
Object raw = redisTemplate.opsForValue().get("products:category:electronics");
List<ProductResponse> products = objectMapper.convertValue(
    raw,
    objectMapper.getTypeFactory()
        .constructCollectionType(List.class, ProductResponse.class)
);
```

### Records vs Classes in Redis

```java
// Records work fine for storage (serialization)
// Records have a quirk on deserialization — use convertValue()

// If you have many Redis reads, create a helper:
private <T> T fromRedis(Object raw, Class<T> type) {
    if (raw == null) return null;
    return objectMapper.convertValue(raw, type);
}
```

---

## Eviction Policies

### When Redis Hits maxmemory

```
Policy                  Behavior
─────────────────────────────────────────
noeviction              Return error on write (safest for critical data)
allkeys-lru             Evict least recently used key (best for cache)
allkeys-lfu             Evict least frequently used key
volatile-lru            Evict LRU key with TTL set
volatile-ttl            Evict key closest to expiry
allkeys-random          Evict random key (rarely useful)
```

### Recommended Policy per Use Case

```yaml
# Pure cache (all data is reproducible)
maxmemory-policy: allkeys-lru

# Mixed (some critical data, some cache)
maxmemory-policy: volatile-lru  # only evict keys WITH ttl set
# → Set TTL on cache keys, no TTL on critical keys
```

---

## Security

### Authentication

```yaml
spring:
  data:
    redis:
      password: ${REDIS_PASSWORD}   # always use env var, never hardcode
```

### TLS (Production)

```yaml
spring:
  data:
    redis:
      ssl:
        enabled: true
      host: redis.prod.example.com
      port: 6380   # TLS port
```

### Key Namespacing (Multi-Tenant)

```java
// Prefix all keys with service name to avoid collision
"pos-service:cart:STORE1-T1"
"inventory-service:product:uuid"

// Or configure RedisTemplate with key prefix:
@Bean
public KeyspaceConfiguration keyspaceConfiguration() {
    KeyspaceConfiguration config = new KeyspaceConfiguration();
    config.addKeyspaceSettings(new KeyspaceSettings(CartDto.class, "pos:cart"));
    return config;
}
```

---

## High Availability

### Redis Sentinel (Automatic Failover)

```yaml
spring:
  data:
    redis:
      sentinel:
        master: mymaster
        nodes:
          - sentinel1:26379
          - sentinel2:26379
          - sentinel3:26379
        password: ${SENTINEL_PASSWORD}
```

### Redis Cluster (Horizontal Scaling)

```yaml
spring:
  data:
    redis:
      cluster:
        nodes:
          - redis-node1:6379
          - redis-node2:6379
          - redis-node3:6379
        max-redirects: 3
```

---

## Monitoring & Observability

### Key Metrics

| Metric | Command | Alert Threshold |
|---|---|---|
| Memory usage | `INFO memory` | > 80% maxmemory |
| Hit rate | `INFO stats` → `keyspace_hits/misses` | < 80% hit rate |
| Connected clients | `INFO clients` | Near maxclients |
| Evicted keys | `INFO stats` → `evicted_keys` | Any eviction |
| Replication lag | `INFO replication` | > 0 bytes behind |

### Useful Commands

```bash
# Memory usage
INFO memory | grep used_memory_human

# Hit/miss rate
INFO stats | grep -E "keyspace_hits|keyspace_misses"

# All keys by pattern (use SCAN, never KEYS in prod)
redis-cli SCAN 0 MATCH "cart:*" COUNT 100

# Size of a specific key
MEMORY USAGE cart:STORE1-T1

# Monitor slow commands
SLOWLOG GET 10

# Flush specific pattern (careful!)
redis-cli SCAN 0 MATCH "cart:*" COUNT 100 | xargs redis-cli DEL
```

---

## Troubleshooting

### Connection Refused

```
Error: Unable to connect to Redis, Connection refused

Checklist:
1. Is Redis running? docker ps | grep redis
2. Is port 6379 open? netstat -an | grep 6379
3. Is host correct in application.yml?
4. If Docker: is Redis on same network as app?
5. Password configured? requirepass in redis.conf
```

### High Memory Usage

```
Info: used_memory_human: 490.00M (maxmemory: 512M)

Actions:
1. Check eviction policy: CONFIG GET maxmemory-policy
2. Find large keys: redis-cli --bigkeys
3. Check for keys without TTL: SCAN + TTL check
4. Increase maxmemory or add more nodes
```

### Cache Stampede (Thundering Herd)

```
Problem:
  Popular key expires
  1000 requests hit DB simultaneously
  DB overwhelmed

Solution — Probabilistic Early Expiry:
  Before TTL expires, proactively refresh the cache
  Or use locking to ensure only one request refreshes:

  if (cache miss) {
      if (acquireLock("refresh:" + key, lockId, 5)) {
          try {
              value = loadFromDB();
              cache.set(key, value, TTL);
          } finally {
              releaseLock();
          }
      } else {
          // Another thread is refreshing — wait briefly and retry
          Thread.sleep(100);
          return cache.get(key);  // should be populated now
      }
  }
```

### Redis Not Persisting Data (After Restart)

```
By default Redis loses data on restart.

Enable persistence:
  appendonly yes         # AOF — every write logged (safest)
  save 900 1             # RDB — snapshot every 900s if 1 key changed

docker command:
  redis-server --appendonly yes
```

---

## myRetail ERP Patterns

### Key Naming Convention

```
{service}:{entity}:{identifier}

pos:cart:{terminalId}
pos:price:{storeId}:{productId}
inventory:product:{productId}
iam:token:blacklist:{jti}
rate:login:{ipAddress}
lock:stock:{productId}
```

### Service-Specific Patterns

| Service | Redis Usage | Key Pattern | TTL |
|---|---|---|---|
| POS | Active cart | `cart:{terminalId}` | 30 min |
| POS | Price cache | `price:{storeId}:{productId}` | 60 min |
| IAM | Token blacklist | `token:blacklist:{jti}` | Token expiry |
| API Gateway | Rate limiting | `rate:{clientId}:{window}` | Window size |
| Inventory | Stock cache | `stock:{productId}` | 5 min |

### The convertValue() Pattern (Always Required)

```java
// Any time you read a custom object from Redis:

// ❌ WRONG — ClassCastException
CartDto cart = (CartDto) redisTemplate.opsForValue().get(key);

// ✅ CORRECT — always convertValue
Object raw = redisTemplate.opsForValue().get(key);
CartDto cart = objectMapper.convertValue(raw, CartDto.class);

// Why: Redis returns LinkedHashMap for JSON objects.
// objectMapper.convertValue() maps it to your class by field name.
// Works with records, works with classes.
```
