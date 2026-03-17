package com.myretailerp.pos.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.math.BigDecimal;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class PriceCacheService {

    private final RedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper objectMapper;

    @Value("${services.inventory.url}")
    private String inventoryUrl;

    @Value("${pos.price-cache.ttl-minutes}")
    private long priceCacheTtl;

    private static final String PRICE_KEY = "price:%s:%s"; // storeId:productId

    public BigDecimal getPrice(String storeId, UUID productId) {
        String key = String.format(PRICE_KEY, storeId, productId);
        Object cached = redisTemplate.opsForValue().get(key);

        if (cached != null) {
            return new BigDecimal(cached.toString());
        }

        // Cache miss — fetch from inventory
        return fetchAndCachePrice(storeId, productId);
    }

    private BigDecimal fetchAndCachePrice(String storeId,
                                          UUID productId) {
        try {
            String bearerToken = getCurrentBearerToken();

            RestClient client = RestClient.builder()
                    .baseUrl(inventoryUrl)
                    .build();

            String response = client.get()
                    .uri("/inventory/products/{id}", productId)
                    .header("Authorization", bearerToken)
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(response);
            BigDecimal price = new BigDecimal(
                    root.get("data").get("price").asText());

            String key = String.format(PRICE_KEY, storeId, productId);
            redisTemplate.opsForValue().set(
                    key, price.toString(), priceCacheTtl, TimeUnit.MINUTES);

            return price;

        } catch (Exception e) {
            log.error("Failed to fetch price for product {}: {}",
                    productId, e.getMessage());
            throw new RuntimeException(
                    "Price unavailable for product: " + productId);
        }
    }

    // Extract JWT from the current HTTP request context
    private String getCurrentBearerToken() {
        ServletRequestAttributes attrs =
                (ServletRequestAttributes) RequestContextHolder
                        .getRequestAttributes();
        if (attrs == null) {
            throw new RuntimeException(
                    "No request context available");
        }
        HttpServletRequest request = attrs.getRequest();
        String auth = request.getHeader("Authorization");
        if (auth == null || !auth.startsWith("Bearer ")) {
            throw new RuntimeException("No bearer token in request");
        }
        return auth;
    }
}
