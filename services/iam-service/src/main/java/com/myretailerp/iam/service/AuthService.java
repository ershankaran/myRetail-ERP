package com.myretailerp.iam.service;

import com.myretailerp.common.security.JwtService;
import com.myretailerp.iam.dto.AuthResponse;
import com.myretailerp.iam.dto.LoginRequest;
import com.myretailerp.iam.dto.RegisterRequest;
import com.myretailerp.iam.dto.UserResponse;
import com.myretailerp.iam.entity.User;
import com.myretailerp.iam.Exception.EmailAlreadyExistsException;
import com.myretailerp.iam.Exception.UserNotFoundException;
import com.myretailerp.iam.repo.UserRepository;
import lombok.RequiredArgsConstructor;

import java.util.List;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

        private final UserRepository userRepository;
        private final PasswordEncoder passwordEncoder;
        private final JwtService jwtService;
        private final AuthenticationManager authenticationManager;

        public AuthResponse register(RegisterRequest request) {
                if (userRepository.existsByEmail(request.email())) {
                        throw new EmailAlreadyExistsException(request.email());
                }
                User user = User.builder()
                                .email(request.email())
                                .password(passwordEncoder.encode(request.password()))
                                .fullName(request.fullName())
                                .role(request.role())
                                .build();
                userRepository.save(user);
                String token = jwtService.generateToken(user);
                return new AuthResponse(token, user.getEmail(),
                                user.getRole().name());
        }

        public AuthResponse login(LoginRequest request) {
                authenticationManager.authenticate(
                                new UsernamePasswordAuthenticationToken(
                                                request.email(), request.password()));
                User user = userRepository.findByEmail(request.email())
                                .orElseThrow(() -> new UserNotFoundException(request.email()));
                String token = jwtService.generateToken(user);
                return new AuthResponse(token, user.getEmail(),
                                user.getRole().name());
        }

        @Transactional(readOnly = true)
        public List<UserResponse> getAllUsers() {
                try {
                        List<User> users = userRepository.findAll();
                        System.out.println("Found " + users.size() + " users");
                        return users.stream().map(UserResponse::from).toList();
                } catch (Exception e) {
                        System.out.println("ERROR in getAllUsers: " + e.getMessage());
                        e.printStackTrace();
                        throw e;
                }
        }
}