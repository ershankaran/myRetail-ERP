package com.myretailerp.finance;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.myretailerp.finance.entity.AccountType;
import com.myretailerp.finance.entity.LedgerAccount;
import com.myretailerp.finance.repository.LedgerAccountRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@SpringBootApplication
@EnableKafka
@ComponentScan(basePackages = {
		"com.myretailerp.finance",
		"com.myretailerp.common"
})
@Slf4j
public class FinanceServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(FinanceServiceApplication.class, args);
	}

	@Bean
	public ObjectMapper objectMapper() {
		ObjectMapper mapper = new ObjectMapper();
		mapper.registerModule(new JavaTimeModule());
		mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
		return mapper;
	}

	// ─── CHART OF ACCOUNTS INITIALIZER ───────────────────────────
	// Seeds ledger accounts on startup if they don't exist
	@Bean
	@Transactional
	public CommandLineRunner initChartOfAccounts(
			LedgerAccountRepository repo) {
		return args -> {
			List<Object[]> accounts = List.of(
					// ASSET accounts
					new Object[]{"1001", "Cash",               AccountType.ASSET},
					new Object[]{"1002", "Card Receivable",    AccountType.ASSET},
					new Object[]{"1003", "UPI Receivable",     AccountType.ASSET},
					new Object[]{"1100", "Accounts Receivable",AccountType.ASSET},
					new Object[]{"1200", "Inventory Asset",    AccountType.ASSET},
					// LIABILITY accounts
					new Object[]{"2001", "Accounts Payable",   AccountType.LIABILITY},
					new Object[]{"2002", "Tax Payable",        AccountType.LIABILITY},
					// REVENUE accounts
					new Object[]{"4001", "POS Sales Revenue",  AccountType.REVENUE},
					new Object[]{"4002", "Online Sales Revenue",AccountType.REVENUE},
					new Object[]{"4003", "Sales Returns",      AccountType.REVENUE},
					// EXPENSE accounts
					new Object[]{"5001", "Cost of Goods Sold", AccountType.EXPENSE},
					new Object[]{"5002", "Payroll Expense",    AccountType.EXPENSE},
					new Object[]{"5003", "Procurement Expense",AccountType.EXPENSE}
			);

			accounts.forEach(a -> {
				String code = (String) a[0];
				if (!repo.existsByAccountCode(code)) {
					repo.save(LedgerAccount.builder()
							.accountCode(code)
							.accountName((String) a[1])
							.accountType((AccountType) a[2])
							.build());
					log.info("Created ledger account: {} - {}",
							code, a[1]);
				}
			});
			log.info("Chart of accounts initialized.");
		};
	}
}