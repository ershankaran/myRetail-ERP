package com.myretailerp.pos.service;

import com.myretailerp.pos.dto.AddItemRequest;
import com.myretailerp.pos.dto.CartDto;
import com.myretailerp.pos.dto.CartItemDto;
import com.myretailerp.pos.exception.CartNotFoundException;
import com.myretailerp.pos.exception.ItemNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class CartService {

    private final RedisTemplate<String, Object> redisTemplate;
    private final PriceCacheService priceCacheService;
    private final ObjectMapper objectMapper;

    @Value("${pos.cart.ttl-minutes}")
    private long cartTtlMinutes;

    private static final String CART_KEY_PREFIX = "cart:";

    // ─── CREATE OR GET CART ───────────────────────────────────────
    public CartDto getOrCreateCart(String terminalId,
                                   String storeId,
                                   String cashierId) {
        String key = CART_KEY_PREFIX + terminalId;
        Object raw = redisTemplate.opsForValue().get(key);

        if (raw != null) {
            // Extend TTL on activity
            redisTemplate.expire(key, cartTtlMinutes, TimeUnit.MINUTES);
            return toCartDto(raw);
        }

        CartDto cart = new CartDto(
                terminalId,
                terminalId,
                storeId,
                cashierId,
                new ArrayList<>(),
                BigDecimal.ZERO,
                LocalDateTime.now(),
                LocalDateTime.now().plusMinutes(cartTtlMinutes)
        );
        saveCart(cart);
        log.info("Cart created for terminal: {}", terminalId);
        return cart;
    }

    // ─── ADD ITEM ─────────────────────────────────────────────────
    public CartDto addItem(String terminalId,
                           AddItemRequest request) {
        CartDto cart = getCart(terminalId);

        // Get price from cache (store-scoped)
        BigDecimal unitPrice = priceCacheService.getPrice(
                cart.storeId(), request.productId());

        BigDecimal subtotal = unitPrice.multiply(
                BigDecimal.valueOf(request.quantity()));

        // Check if item already in cart — update quantity
        List<CartItemDto> items = new ArrayList<>(cart.items());
        boolean found = false;

        for (int i = 0; i < items.size(); i++) {
            if (items.get(i).sku().equals(request.sku())) {
                CartItemDto existing = items.get(i);
                int newQty = existing.quantity() + request.quantity();
                BigDecimal newSubtotal = unitPrice.multiply(
                        BigDecimal.valueOf(newQty));
                items.set(i, new CartItemDto(
                        existing.productId(),
                        existing.sku(),
                        existing.productName(),
                        newQty,
                        unitPrice,
                        newSubtotal));
                found = true;
                break;
            }
        }

        if (!found) {
            items.add(new CartItemDto(
                    request.productId(),
                    request.sku(),
                    request.productName(),
                    request.quantity(),
                    unitPrice,
                    subtotal));
        }

        BigDecimal newTotal = items.stream()
                .map(CartItemDto::subtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        CartDto updated = new CartDto(
                cart.cartId(),
                cart.terminalId(),
                cart.storeId(),
                cart.cashierId(),
                items,
                newTotal,
                cart.createdAt(),
                LocalDateTime.now().plusMinutes(cartTtlMinutes)
        );

        saveCart(updated);
        log.info("Item added to cart {}: {} x{}",
                terminalId, request.sku(), request.quantity());
        return updated;
    }

    // ─── REMOVE ITEM ──────────────────────────────────────────────
    public CartDto removeItem(String terminalId, String sku) {
        CartDto cart = getCart(terminalId);

        List<CartItemDto> items = cart.items().stream()
                .filter(i -> !i.sku().equals(sku))
                .toList();

        if (items.size() == cart.items().size()) {
            throw new ItemNotFoundException(sku);
        }

        BigDecimal newTotal = items.stream()
                .map(CartItemDto::subtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        CartDto updated = new CartDto(
                cart.cartId(), cart.terminalId(),
                cart.storeId(), cart.cashierId(),
                items, newTotal, cart.createdAt(),
                LocalDateTime.now().plusMinutes(cartTtlMinutes));

        saveCart(updated);
        return updated;
    }

    // ─── CLEAR CART ───────────────────────────────────────────────
    public void clearCart(String terminalId) {
        redisTemplate.delete(CART_KEY_PREFIX + terminalId);
        log.info("Cart cleared for terminal: {}", terminalId);
    }

    // ─── HELPERS ──────────────────────────────────────────────────
    public CartDto getCart(String terminalId) {
        Object cart =  redisTemplate.opsForValue()
                .get(CART_KEY_PREFIX + terminalId);
        if (cart == null) {
            throw new CartNotFoundException(terminalId);
        }
        return toCartDto(cart);
    }

    private void saveCart(CartDto cart) {
        redisTemplate.opsForValue().set(
                CART_KEY_PREFIX + cart.terminalId(),
                cart,
                cartTtlMinutes,
                TimeUnit.MINUTES);
    }

    // ← Key method: converts LinkedHashMap → CartDto
    private CartDto toCartDto(Object raw) {
        return objectMapper.convertValue(raw, CartDto.class);
    }
}
