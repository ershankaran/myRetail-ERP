package com.myretailerp.order.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.myretailerp.order.exception.ProductValidationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.math.BigDecimal;
import java.util.UUID;

@Component
@Slf4j
@RequiredArgsConstructor
public class InventoryClient {

    private final ObjectMapper objectMapper;

    @Value("${services.inventory.url}")
    private String inventoryUrl;

    private static final BigDecimal PRICE_TOLERANCE =
            new BigDecimal("0.01");

    public BigDecimal getAndValidatePrice(UUID productId,
                                          String sku,
                                          BigDecimal clientPrice,
                                          String bearerToken) {
        try {
            RestClient restClient = RestClient.builder()
                    .baseUrl(inventoryUrl)
                    .build();

            String responseBody = restClient.get()
                    .uri("/inventory/products/{id}", productId)
                    .header("Authorization", bearerToken)
                    .retrieve()
                    .body(String.class);

            if (responseBody == null) {
                throw new ProductValidationException(
                        "Product not found: " + sku);
            }

            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode data = root.get("data");

            if (data == null || data.isNull()) {
                throw new ProductValidationException(
                        "Product not found: " + sku);
            }

            // Check product is active
            boolean active = data.get("active").asBoolean();
            if (!active) {
                throw new ProductValidationException(
                        "Product is decommissioned: " + sku);
            }

            // Validate price
            BigDecimal inventoryPrice = new BigDecimal(
                    data.get("price").asText());
            BigDecimal priceDiff = clientPrice
                    .subtract(inventoryPrice).abs();
            BigDecimal tolerance = inventoryPrice
                    .multiply(PRICE_TOLERANCE);

            if (priceDiff.compareTo(tolerance) > 0) {
                throw new ProductValidationException(
                        String.format(
                                "Price mismatch for SKU %s: " +
                                        "submitted=%.2f, actual=%.2f",
                                sku, clientPrice, inventoryPrice));
            }

            // Check available stock
            int availableStock = data.get("availableStock").asInt();
            if (availableStock <= 0) {
                throw new ProductValidationException(
                        "No available stock for: " + sku);
            }

            log.info("Price validated for SKU {}: {}", sku,
                    inventoryPrice);
            return inventoryPrice;

        } catch (ProductValidationException e) {
            throw e;  // re-throw business exceptions as-is
        } catch (RestClientException e) {
            log.error("inventory-service unreachable: {}",
                    e.getMessage());
            log.warn("Proceeding with client price {} for SKU {}",
                    clientPrice, sku);
            return clientPrice;
        } catch (Exception e) {
            log.error("Failed to validate price for SKU {}: {}",
                    sku, e.getMessage());
            return clientPrice;
        }
    }
}