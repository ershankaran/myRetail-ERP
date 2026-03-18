package com.myretailerp.finance.config;

import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class FinanceUserDetailsService implements UserDetailsService {

    @Override
    public UserDetails loadUserByUsername(String username)
            throws UsernameNotFoundException {
        return User.builder()
                .username(username)
                .password("")
                .authorities(List.of(
                        new SimpleGrantedAuthority("ROLE_USER")))
                .build();
    }
}
