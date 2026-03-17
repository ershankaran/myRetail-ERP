package com.myretailerp.pos.service;

import com.myretailerp.pos.dto.CartDto;
import com.myretailerp.pos.dto.CheckoutRequest;
import com.myretailerp.pos.dto.SaleResponse;
import com.myretailerp.pos.entity.Receipt;
import com.myretailerp.pos.entity.Sale;
import com.myretailerp.pos.entity.SaleItem;
import com.myretailerp.pos.entity.SaleStatus;
import com.myretailerp.pos.exception.CartEmptyException;
import com.myretailerp.pos.exception.SaleNotFoundException;
import com.myretailerp.pos.kafka.PosEventPublisher;
import com.myretailerp.pos.repository.ReceiptRepository;
import com.myretailerp.pos.repository.SaleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class SaleService {

    private final SaleRepository saleRepository;
    private final ReceiptRepository receiptRepository;
    private final CartService cartService;
    private final PosEventPublisher eventPublisher;

    // ─── CHECKOUT ─────────────────────────────────────────────────
    @Transactional
    public SaleResponse checkout(String terminalId,
                                 String storeId,
                                 CheckoutRequest request) {

        CartDto cart = cartService.getCart(terminalId);

        if (cart.items().isEmpty()) {
            throw new CartEmptyException(terminalId);
        }

        String cashierId = getCurrentUserEmail();

        // Build sale entity
        Sale sale = Sale.builder()
                .terminalId(terminalId)
                .storeId(storeId)
                .cashierId(cashierId)
                .customerId(request.customerId())
                .totalAmount(cart.totalAmount())
                .paymentMethod(request.paymentMethod())
                .status(SaleStatus.COMPLETED)
                .build();

        // Build sale items
        List<SaleItem> saleItems = cart.items().stream()
                .map(cartItem -> SaleItem.builder()
                        .sale(sale)
                        .productId(cartItem.productId())
                        .sku(cartItem.sku())
                        .productName(cartItem.productName())
                        .quantity(cartItem.quantity())
                        .unitPrice(cartItem.unitPrice())
                        .subtotal(cartItem.subtotal())
                        .build())
                .toList();

        sale.getItems().addAll(saleItems);

        // Persist sale — ACID transaction
        saleRepository.save(sale);

        // Generate receipt
        String receiptNumber = generateReceiptNumber(storeId);
        Receipt receipt = Receipt.builder()
                .sale(sale)
                .receiptNumber(receiptNumber)
                .build();
        receiptRepository.save(receipt);

        // Clear cart — sale is done
        cartService.clearCart(terminalId);

        // Emit post-sale events (after transaction commits)
        eventPublisher.publishSaleCompleted(sale, receiptNumber);

        log.info("Sale completed: {} terminal: {} total: {}",
                sale.getId(), terminalId, sale.getTotalAmount());

        return SaleResponse.from(sale, receiptNumber);
    }

    // ─── VOID SALE ────────────────────────────────────────────────
    @Transactional
    public SaleResponse voidSale(UUID saleId, String reason) {
        Sale sale = saleRepository.findById(saleId)
                .orElseThrow(() -> new SaleNotFoundException(saleId));

        if (sale.getStatus() == SaleStatus.VOIDED) {
            throw new IllegalStateException("Sale already voided");
        }

        sale.setStatus(SaleStatus.VOIDED);
        sale.setVoidReason(reason);
        sale.setVoidedAt(java.time.LocalDateTime.now());
        saleRepository.save(sale);

        eventPublisher.publishSaleVoided(sale, reason);

        log.info("Sale voided: {} reason: {}", saleId, reason);

        Receipt receipt = receiptRepository.findBySaleId(saleId)
                .orElse(null);
        return SaleResponse.from(sale,
                receipt != null ? receipt.getReceiptNumber() : null);
    }

    // ─── GET SALE ─────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public SaleResponse getSale(UUID saleId) {
        Sale sale = saleRepository.findById(saleId)
                .orElseThrow(() -> new SaleNotFoundException(saleId));
        Receipt receipt = receiptRepository.findBySaleId(saleId)
                .orElse(null);
        return SaleResponse.from(sale,
                receipt != null ? receipt.getReceiptNumber() : null);
    }

    // ─── GET SALES BY TERMINAL ────────────────────────────────────
    @Transactional(readOnly = true)
    public List<SaleResponse> getSalesByTerminal(String terminalId) {
        return saleRepository.findByTerminalId(terminalId)
                .stream()
                .map(sale -> {
                    Receipt r = receiptRepository
                            .findBySaleId(sale.getId()).orElse(null);
                    return SaleResponse.from(sale,
                            r != null ? r.getReceiptNumber() : null);
                })
                .toList();
    }

    // ─── RECEIPT NUMBER GENERATOR ─────────────────────────────────
    // Format: RCP-20260317-STORE1-00042
    private String generateReceiptNumber(String storeId) {
        String date = LocalDate.now()
                .format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String prefix = "RCP-" + date + "-" + storeId + "-";
        long count = receiptRepository
                .countByReceiptNumberPrefix(prefix) + 1;
        return prefix + String.format("%05d", count);
    }

    private String getCurrentUserEmail() {
        return SecurityContextHolder.getContext()
                .getAuthentication().getName();
    }
}
