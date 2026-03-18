package com.myretailerp.finance.repository;


import com.myretailerp.finance.entity.AccountType;
import com.myretailerp.finance.entity.LedgerAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LedgerAccountRepository
        extends JpaRepository<LedgerAccount, UUID> {

    Optional<LedgerAccount> findByAccountCode(String accountCode);
    List<LedgerAccount> findByAccountType(AccountType accountType);
    boolean existsByAccountCode(String accountCode);
}
