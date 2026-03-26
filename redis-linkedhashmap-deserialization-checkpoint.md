# Redis Deserialization — LinkedHashMap Issue
## Checkpoint for Future Reference

---

## The Problem

When storing an object to Redis using `RedisTemplate<String, Object>` and reading it back, Jackson returns a `LinkedHashMap` instead of the original class.

```
ClassCastException:
java.util.LinkedHashMap cannot be cast to com.myretailerp.pos.dto.CartDto
```

---

## Why It Happens — In Simple Terms

```
STORE to Redis:
  CartDto object → Jackson converts to JSON string → stored in Redis
  {"cartId":"T1","storeId":"STORE1","items":[],...}

READ from Redis:
  JSON string → Jackson reads it back → ???
  
  Jackson sees: { } = JSON object
  Jackson thinks: "I'll make this a LinkedHashMap"
  Jackson doesn't know: "This was a CartDto"
  
  Because: The JSON has no CartDto type information in it.
  Result: LinkedHashMap instead of CartDto ❌
```

---

## Why Debug Mode vs Regular Run Behaves Differently

```
Regular run (mvnw spring-boot:run):
  Spring Boot uses TWO classloaders:
  - LaunchedURLClassLoader → loads app classes (CartDto)
  - BootstrapClassLoader   → loads JDK classes (LinkedHashMap)
  
  These are DIFFERENT loaders → cast between them FAILS
  Error message says exactly this:
  "LinkedHashMap is in loader 'bootstrap'; CartDto is in loader 'app'"

Debug mode (IntelliJ):
  IntelliJ uses ONE classloader for everything
  LinkedHashMap and CartDto share the same loader
  → cast SUCCEEDS (incorrectly — it's still the wrong type)
  
  This is why it "worked" in debug but failed in production.
  Debug mode masked the real bug.
```

---

## The Fix — `objectMapper.convertValue()`

```java
// Read from Redis — always returns LinkedHashMap for JSON objects
Object raw = redisTemplate.opsForValue().get("cart:T1");

// Convert LinkedHashMap → CartDto using ObjectMapper
CartDto cart = objectMapper.convertValue(raw, CartDto.class);

// ObjectMapper maps each LinkedHashMap key → CartDto field by name
// No type info needed in Redis JSON ✅
// Works with Java records ✅
```

---

## Where Applied in POS Service

**`CartService.java`** — every Redis read uses `toCartDto()`:

```java
private CartDto toCartDto(Object raw) {
    return objectMapper.convertValue(raw, CartDto.class);
}

public CartDto getCart(String terminalId) {
    Object raw = redisTemplate.opsForValue()
            .get(CART_KEY_PREFIX + terminalId);
    if (raw == null) throw new CartNotFoundException(terminalId);
    return toCartDto(raw);  // ← convert here
}
```

---

## Three Solutions — Comparison

| Solution | How | Works with Records | Flexible |
|---|---|---|---|
| `objectMapper.convertValue()` | Convert after read | ✅ Yes | ✅ Yes |
| Typed `RedisTemplate<K, CartDto>` | Declare type upfront | ✅ Yes | ❌ One type only |
| `DefaultTyping` in ObjectMapper | Embeds class name in JSON | ❌ Breaks records | ✅ Yes |

**Use `objectMapper.convertValue()` — cleanest solution for records.**

---

## Pattern to Apply Everywhere

Any time you have `RedisTemplate<String, Object>` and store a custom class:

```java
// STORE — works fine
redisTemplate.opsForValue().set(key, myObject);

// READ — always convert
Object raw = redisTemplate.opsForValue().get(key);
MyClass result = objectMapper.convertValue(raw, MyClass.class);

// For lists:
List<MyClass> list = objectMapper.convertValue(
    raw, 
    objectMapper.getTypeFactory()
        .constructCollectionType(List.class, MyClass.class)
);
```

---

## The Mental Model

```
Redis stores bytes.
Bytes have no Java type information.
Jackson sees { } → defaults to LinkedHashMap.
You must tell Jackson what type you want: convertValue().
```

---

## Related Issue — Why DefaultTyping Didn't Work

When we tried `DefaultTyping.NON_FINAL`, Jackson wraps the JSON in an array:

```json
["com.myretailerp.pos.dto.CartDto", {"cartId":"T1",...}]
```

Java records cannot be deserialized this way because:
- Records require all fields at construction time
- WRAPPER_ARRAY format conflicts with record's canonical constructor
- Error: "Unexpected token START_OBJECT, expected START_ARRAY"

**Conclusion: Never use DefaultTyping with Java records in Redis.**
