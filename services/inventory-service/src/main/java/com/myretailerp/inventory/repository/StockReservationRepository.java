package com.myretailerp.inventory.repository;

import com.myretailerp.inventory.entity.ReservationStatus;
import com.myretailerp.inventory.entity.StockReservation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface StockReservationRepository
        extends JpaRepository<StockReservation, UUID> {

    List<StockReservation> findByOrderId(UUID orderId);

    List<StockReservation> findByOrderIdAndStatus(
            UUID orderId, ReservationStatus status);

    boolean existsByOrderIdAndStatus(
            UUID orderId, ReservationStatus status);
}
