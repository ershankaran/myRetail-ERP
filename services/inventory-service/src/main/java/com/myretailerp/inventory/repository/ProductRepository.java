package com.myretailerp.inventory.repository;

import com.myretailerp.inventory.entity.Category;
import com.myretailerp.inventory.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProductRepository extends JpaRepository<Product, UUID> {
    Optional<Product> findBySku(String sku);
    boolean existsBySku(String sku);
    List<Product> findByCategory(Category category);
    List<Product> findByActiveTrue();
    List<Product> findByCategoryAndActiveTrue(Category category);
}
