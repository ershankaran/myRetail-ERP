package com.myretailerp.pos.repository;

import com.myretailerp.pos.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CustomerRepository
        extends JpaRepository<Customer, UUID> {
    Optional<Customer> findByPhone(String phone);
    Optional<Customer> findByLoyaltyCardId(String loyaltyCardId);
}
