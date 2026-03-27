package com.myretailerp.iam.Controller;

import com.myretailerp.common.dto.ApiResponse;
import com.myretailerp.iam.dto.AuthResponse;
import com.myretailerp.iam.dto.LoginRequest;
import com.myretailerp.iam.dto.RegisterRequest;
import com.myretailerp.iam.dto.UserResponse;
import com.myretailerp.iam.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

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
                                .status(HttpStatus.CREATED)
                                .body(ApiResponse.success("User registered successfully",
                                                response));
        }

        @PostMapping("/login")
        public ResponseEntity<ApiResponse<AuthResponse>> login(
                        @Valid @RequestBody LoginRequest request) {
                AuthResponse response = authService.login(request);
                return ResponseEntity
                                .ok(ApiResponse.success("Login successful", response));
        }

        @GetMapping("/users")
        @PreAuthorize("hasAuthority('ROLE_ADMIN')")
        public ResponseEntity<ApiResponse<List<UserResponse>>> getAllUsers() {
                return ResponseEntity.ok(
                                ApiResponse.success("Users retrieved", authService.getAllUsers()));
        }
}
