# myRetail ERP — Complete Runbook

**Version:** 1.0  
**Last Updated:** 2026-03-18  
**Project:** myRetail-ERP  
**Location:** `C:\shankar\Code-practise\myRetail-ERP`

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Infrastructure](#2-infrastructure)
3. [Service Inventory](#3-service-inventory)
4. [Startup Procedure](#4-startup-procedure)
5. [Shutdown Procedure](#5-shutdown-procedure)
6. [Service Management](#6-service-management)
7. [Database Operations](#7-database-operations)
8. [Kafka Operations](#8-kafka-operations)
9. [Redis Operations](#9-redis-operations)
10. [API Reference](#10-api-reference)
11. [Authentication](#11-authentication)
12. [Business Flows](#12-business-flows)
13. [Monitoring & Health Checks](#13-monitoring--health-checks)
14. [Troubleshooting](#14-troubleshooting)
15. [Known Issues & Workarounds](#15-known-issues--workarounds)
16. [Data Recovery Procedures](#16-data-recovery-procedures)
17. [Architecture Decisions](#17-architecture-decisions)
18. [Kafka Topics Reference](#18-kafka-topics-reference)
19. [Role Permissions Matrix](#19-role-permissions-matrix)
20. [Environment Configuration](#20-environment-configuration)

---

## 1. System Overview

myRetail ERP is a production-grade enterprise retail management system built as microservices. It manages inventory, orders, point-of-sale billing, and financial accounting for a multi-store retail chain.

### Architecture

```
Client (Postman / Angular UI)
         │
         ▼
┌─────────────────────────────────────────────────┐
│                 Spring Boot Services             │
│                                                  │
│  IAM (8081)  ←→  Inventory (8082)               │
│       ↕               ↕                          │
│  Order (8083)  ←→  POS (8086)                   │
│       ↕               ↕                          │
│  Finance (8084)                                  │
└──────────────────┬──────────────────────────────┘
                   │
         ┌─────────┴──────────┐
         ▼                    ▼
    Kafka (9092)         PostgreSQL (5432)
    Redis (6379)         9 Databases
```

### Technology Stack

| Component | Technology | Version |
|---|---|---|
| Language | Java | 23 |
| Framework | Spring Boot | 4.0.3 |
| ORM | Hibernate | 7.2.4 |
| Message Broker | Apache Kafka | 4.1.1 |
| Cache | Redis | 7.2 |
| Database | PostgreSQL | 16.11 |
| Security | Spring Security + JWT | JJWT 0.12.3 |
| Build | Maven | 3.x |
| Container | Docker + Docker Compose | Latest |

---

## 2. Infrastructure

### Docker Containers

| Container | Image | Port | Purpose |
|---|---|---|---|
| postgres | postgres:16-alpine | 5432 | Primary database |
| kafka | confluentinc/cp-kafka:7.6.0 | 9092 | Message broker |
| kafka-ui | provectuslabs/kafka-ui:latest | 8090 | Kafka monitoring |
| redis | redis:7.2-alpine | 6379 | Cache + cart storage |
| zookeeper | confluentinc/cp-zookeeper:7.6.0 | 2181 | Kafka coordinator |

### Docker Compose Location

```
C:\shankar\Code-practise\myRetail-ERP\docker-compose.yml
```

### Infrastructure Commands

```bash
# Start all infrastructure
cd C:\shankar\Code-practise\myRetail-ERP
docker-compose up -d

# Stop all infrastructure (data preserved)
docker-compose down

# Stop and wipe all data (DESTRUCTIVE)
docker-compose down -v

# Check container status
docker ps

# View container logs
docker logs kafka --tail 50
docker logs postgres --tail 50
docker logs redis --tail 50
```

---

## 3. Service Inventory

| Service | Port | Database | Package | Main Class |
|---|---|---|---|---|
| iam-service | 8081 | iam_db | com.myretailerp.iam | IamServiceApplication |
| inventory-service | 8082 | inventory_db | com.myretailerp.inventory | InventoryServiceApplication |
| order-service | 8083 | order_db | com.myretailerp.order | OrderServiceApplication |
| finance-service | 8084 | finance_db | com.myretailerp.finance | FinanceServiceApplication |
| pos-service | 8086 | pos_db | com.myretailerp.pos | PosServiceApplication |

### Shared Library

```
Location: C:\shankar\Code-practise\myRetail-ERP\shared\common-lib
GroupId:  com.myretailerp
ArtifactId: common-lib
Version: 1.0.0

Contains:
  - JwtService (token generation + validation)
  - JwtAuthFilter (Spring Security filter)
  - ApiResponse<T> (universal response envelope)
  - GlobalExceptionHandler (validation + error handling)
```

### Database Inventory

| Database | Service | Tables |
|---|---|---|
| iam_db | iam-service | users |
| inventory_db | inventory-service | products, stock_levels, stock_transactions, stock_reservations |
| order_db | order-service | orders, order_items |
| finance_db | finance-service | journal_entries, journal_entry_lines, ledger_accounts |
| pos_db | pos-service | terminals, sales, sale_items, receipts, customers |
| hr_db | hr-service (future) | — |
| procurement_db | procurement-service (future) | — |
| analytics_db | analytics-service (future) | — |
| notification_db | notification-service (future) | — |

---

## 4. Startup Procedure

### Prerequisites

```
✅ Docker Desktop running
✅ Java 23 installed
✅ Maven installed
✅ All services compiled (target/ directories exist)
```

### Step 1 — Start Infrastructure

```bash
cd C:\shankar\Code-practise\myRetail-ERP
docker-compose up -d
```

Wait 30 seconds. Verify:

```bash
docker ps
# All 5 containers should show "Up"
```

Verify Kafka UI accessible: `http://localhost:8090`

### Step 2 — Build common-lib (only when changed)

```bash
cd C:\shankar\Code-practise\myRetail-ERP\shared\common-lib
mvn clean install -DskipTests
```

### Step 3 — Start Services (ORDER MATTERS)

**IAM Service first** (all other services need JWT validation):

```bash
cd C:\shankar\Code-practise\myRetail-ERP\services\iam-service
.\mvnw spring-boot:run
```

Wait for: `Started IamServiceApplication`

**Inventory Service second** (order-service depends on it for price validation):

```bash
cd C:\shankar\Code-practise\myRetail-ERP\services\inventory-service
.\mvnw spring-boot:run
```

Wait for: `partitions assigned: [order.created-0]`

**Order Service third**:

```bash
cd C:\shankar\Code-practise\myRetail-ERP\services\order-service
.\mvnw spring-boot:run
```

Wait for: `partitions assigned: [inventory.stock.reserved-0]`

**Finance Service fourth**:

```bash
cd C:\shankar\Code-practise\myRetail-ERP\services\finance-service
.\mvnw spring-boot:run
```

Wait for: `Chart of accounts initialized.`

**POS Service last**:

```bash
cd C:\shankar\Code-practise\myRetail-ERP\services\pos-service
.\mvnw spring-boot:run
```

Wait for: `Started PosServiceApplication`

### Step 4 — Verify Full Stack

```bash
# Get a token
curl -X POST http://localhost:8081/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@retailerp.com","password":"admin123"}'

# Test each service
curl http://localhost:8082/inventory/products -H "Authorization: Bearer {token}"
curl http://localhost:8083/orders/my-orders -H "Authorization: Bearer {token}"
curl http://localhost:8084/finance/ledger -H "Authorization: Bearer {token}"
curl "http://localhost:8086/pos/terminals/STORE1-T1/cart?storeId=STORE-CHENNAI-001" \
  -H "Authorization: Bearer {token}"
```

---

## 5. Shutdown Procedure

### Graceful Shutdown (Recommended)

Stop services in reverse order (Ctrl+C in each terminal):

```
1. pos-service
2. finance-service
3. order-service
4. inventory-service
5. iam-service
6. docker-compose down
```

### Quick Stop

```bash
# Stop all Spring Boot processes (Windows)
taskkill /F /IM java.exe

# Stop infrastructure
cd C:\shankar\Code-practise\myRetail-ERP
docker-compose down
```

### Full Reset (DESTRUCTIVE — wipes all data)

```bash
docker-compose down -v
```

---

## 6. Service Management

### Restart a Single Service

```bash
# Example: restart inventory-service after code change
cd C:\shankar\Code-practise\myRetail-ERP\services\inventory-service

# If common-lib was changed first:
cd ..\..\shared\common-lib && mvn clean install -DskipTests
cd ..\..\services\inventory-service

.\mvnw clean spring-boot:run
```

### Check Service Logs (IntelliJ)

Each service runs in its own IntelliJ Run/Debug window. Logs are visible in the Console tab.

### Service Dependencies

```
pos-service
  └── inventory-service (price lookup via REST)
  └── Kafka (pos.sale.completed)

order-service
  └── inventory-service (price validation via REST)
  └── Kafka (order.created, order.confirmed, order.cancelled)

inventory-service
  └── Kafka (consumes order.*, produces inventory.*)

finance-service
  └── Kafka (consumes order.finance.confirmed, pos.sale.completed,
             pos.sale.voided, order.cancelled)
```

---

## 7. Database Operations

### Connect to Any Database

```bash
# Syntax
winpty docker exec -it postgres psql -U erpadmin -d {database_name}

# Examples
winpty docker exec -it postgres psql -U erpadmin -d iam_db
winpty docker exec -it postgres psql -U erpadmin -d inventory_db
winpty docker exec -it postgres psql -U erpadmin -d order_db
winpty docker exec -it postgres psql -U erpadmin -d finance_db
winpty docker exec -it postgres psql -U erpadmin -d pos_db
```

### Run Single Query (No Interactive Mode)

```bash
winpty docker exec -it postgres psql -U erpadmin -d inventory_db \
  -c "SELECT sku, name, quantity, reserved_quantity FROM stock_levels sl JOIN products p ON p.id = sl.product_id;"
```

### Connection Details

| Parameter | Value |
|---|---|
| Host | localhost |
| Port | 5432 |
| Username | erpadmin |
| Password | erpadmin123 |

### Useful Queries

**IAM — List all users:**
```sql
SELECT id, full_name, email, role, created_at FROM users ORDER BY created_at DESC;
```

**Inventory — Stock overview:**
```sql
SELECT p.sku, p.name, sl.quantity, sl.reserved_quantity,
       sl.quantity - sl.reserved_quantity AS available,
       p.reorder_threshold,
       CASE WHEN sl.quantity = 0 THEN 'DEPLETED'
            WHEN sl.quantity <= p.reorder_threshold THEN 'LOW'
            ELSE 'OK' END AS stock_status
FROM products p
JOIN stock_levels sl ON sl.product_id = p.id
WHERE p.active = true
ORDER BY p.sku;
```

**Orders — Recent orders with status:**
```sql
SELECT id, customer_id, status, total_amount, created_at, confirmed_at
FROM orders
ORDER BY created_at DESC
LIMIT 20;
```

**Finance — Current ledger balances:**
```sql
SELECT account_code, account_name, account_type, current_balance
FROM ledger_accounts
ORDER BY account_code;
```

**Finance — Verify books balance:**
```sql
SELECT account_type,
       SUM(CASE WHEN account_type IN ('ASSET','EXPENSE') THEN current_balance ELSE 0 END) AS debits,
       SUM(CASE WHEN account_type IN ('LIABILITY','REVENUE') THEN current_balance ELSE 0 END) AS credits
FROM ledger_accounts
GROUP BY account_type;
```

**POS — Today's sales:**
```sql
SELECT id, terminal_id, store_id, total_amount, payment_method, status, created_at
FROM sales
WHERE created_at::date = CURRENT_DATE
ORDER BY created_at DESC;
```

**POS — Sales summary by store:**
```sql
SELECT store_id,
       COUNT(*) AS total_sales,
       SUM(total_amount) AS total_revenue,
       SUM(CASE WHEN payment_method = 'CASH' THEN total_amount ELSE 0 END) AS cash,
       SUM(CASE WHEN payment_method = 'CARD' THEN total_amount ELSE 0 END) AS card,
       SUM(CASE WHEN payment_method = 'UPI' THEN total_amount ELSE 0 END) AS upi
FROM sales
WHERE status = 'COMPLETED'
GROUP BY store_id;
```

### Reset a Single Database (Dev Only)

```bash
winpty docker exec -it postgres psql -U erpadmin -d postgres \
  -c "DROP DATABASE inventory_db; CREATE DATABASE inventory_db OWNER erpadmin;"
# Then restart inventory-service — Hibernate ddl-auto:update recreates tables
```

---

## 8. Kafka Operations

### Kafka UI

```
URL: http://localhost:8090
```

Use Kafka UI to:
- View all topics and message counts
- Browse message content for debugging
- Check consumer group lag
- Purge topic messages (dev only)

### CLI Operations (Git Bash)

```bash
# List all topics
winpty docker exec -it kafka //bin/bash -c "kafka-topics.sh --list --bootstrap-server localhost:9092"

# Describe a topic
winpty docker exec -it kafka //bin/bash -c \
  "kafka-topics.sh --describe --topic order.created --bootstrap-server localhost:9092"

# Check consumer group lag
winpty docker exec -it kafka //bin/bash -c \
  "kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
   --group inventory-service --describe"

# Reset consumer group offset (stop service first)
winpty docker exec -it kafka //bin/bash -c \
  "kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
   --group finance-service --topic order.cancelled \
   --reset-offsets --to-earliest --execute"
```

### Current Topics

| Topic | Producer | Consumers | Purpose |
|---|---|---|---|
| inventory.product.created | inventory | analytics (future) | New product added |
| inventory.stock.updated | inventory | analytics (future) | Stock level changed |
| inventory.stock.low | inventory | procurement (future) | Below reorder threshold |
| inventory.stock.reserved | inventory | order | Reservation confirmed |
| inventory.reservation.failed | inventory | order | Reservation failed |
| order.created | order | inventory | New order placed |
| order.confirmed | order | inventory | Order confirmed |
| order.cancelled | order | inventory, finance | Order cancelled |
| order.finance.confirmed | order | finance | Order revenue entry |
| pos.sale.completed | pos | finance | POS sale revenue entry |
| pos.sale.voided | pos | finance | POS sale reversal |

### Consumer Groups

| Group | Service | Topics Consumed |
|---|---|---|
| inventory-service | inventory | order.created, order.confirmed, order.cancelled |
| order-service | order | inventory.stock.reserved, inventory.reservation.failed |
| finance-service | finance | order.finance.confirmed, order.cancelled, pos.sale.completed, pos.sale.voided |

---

## 9. Redis Operations

### Connect to Redis

```bash
winpty docker exec -it redis redis-cli
```

### Useful Commands

```bash
# View all active carts
SCAN 0 MATCH "cart:*" COUNT 100

# View a specific cart
GET cart:STORE1-T1

# View price cache
SCAN 0 MATCH "price:*" COUNT 100

# Delete a specific cart (force cashier to start fresh)
DEL cart:STORE1-T1

# Check memory usage
INFO memory | grep used_memory_human

# View all keys (dev only — never in production)
KEYS *

# Flush all data (dev only — DESTRUCTIVE)
FLUSHALL

# Exit
EXIT
```

### Redis Key Patterns

| Key Pattern | TTL | Contains |
|---|---|---|
| `cart:{terminalId}` | 30 min | CartDto (active billing session) |
| `price:{storeId}:{productId}` | 60 min | BigDecimal price (from inventory) |

---

## 10. API Reference

### IAM Service (port 8081)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /auth/register | None | Register new user |
| POST | /auth/login | None | Login, returns JWT |

### Inventory Service (port 8082)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /inventory/products | ADMIN, STORE_MANAGER | Create product |
| GET | /inventory/products | Any | List all products |
| GET | /inventory/products/:id | Any | Get product |
| GET | /inventory/products/sku/:sku | Any | Get by SKU |
| GET | /inventory/products/category/:cat | Any | Get by category |
| GET | /inventory/products/low-stock | Any | Low stock products |
| PATCH | /inventory/products/:id/stock | ADMIN, STORE_MANAGER | Update stock |
| DELETE | /inventory/products/:id | ADMIN | Decommission product |
| GET | /inventory/products/:id/transactions | Any | Stock history |

### Order Service (port 8083)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /orders | ADMIN, STORE_MANAGER, CASHIER | Create order |
| GET | /orders/:id | Any | Get order |
| GET | /orders/my-orders | Any | My orders |
| GET | /orders/status/:status | ADMIN, STORE_MANAGER | Orders by status |
| PATCH | /orders/:id/ship | ADMIN, STORE_MANAGER | Ship order |
| PATCH | /orders/:id/deliver | ADMIN, STORE_MANAGER | Deliver order |
| PATCH | /orders/:id/cancel | ADMIN, STORE_MANAGER | Cancel order |

### Finance Service (port 8084)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /finance/journal-entries | ADMIN, FINANCE | List all entries |
| GET | /finance/journal-entries/:id | ADMIN, FINANCE | Get entry |
| GET | /finance/journal-entries/ref/:refId | ADMIN, FINANCE | Get by reference |
| GET | /finance/ledger | ADMIN, FINANCE | All account balances |
| GET | /finance/ledger/:accountCode | ADMIN, FINANCE | Single account |
| GET | /finance/reports/daily-summary | ADMIN, FINANCE | Daily P&L |

### POS Service (port 8086)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /pos/terminals/:id/cart?storeId= | Any | Get/create cart |
| POST | /pos/terminals/:id/cart/items | Any | Add item |
| DELETE | /pos/terminals/:id/cart/items/:sku | Any | Remove item |
| DELETE | /pos/terminals/:id/cart | Any | Clear cart |
| POST | /pos/terminals/:id/checkout?storeId= | Any | Complete sale |
| GET | /pos/sales/:id | Any | Get sale |
| GET | /pos/terminals/:id/sales | ADMIN, STORE_MANAGER | Sales by terminal |
| PATCH | /pos/sales/:id/void?reason= | ADMIN, STORE_MANAGER | Void sale |

---

## 11. Authentication

### Get a Token

```bash
curl -X POST http://localhost:8081/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@retailerp.com","password":"admin123"}'
```

Response:
```json
{
  "status": "SUCCESS",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiJ9..."
  }
}
```

### Use Token in Requests

```bash
curl http://localhost:8082/inventory/products \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

### JWT Configuration

| Parameter | Value |
|---|---|
| Algorithm | HMAC-SHA256 |
| Expiry | 24 hours (86400000 ms) |
| Secret | 3cfa76ef14937c1c0ea519f8fc057a80fcd04a7420f8e8bcd0a7567c272e007b |
| Role claim | `role` (ADMIN, STORE_MANAGER, CASHIER, FINANCE, HR) |

### Available Test Users

| Email | Password | Role |
|---|---|---|
| admin@retailerp.com | admin123 | ADMIN |
| (register more via POST /auth/register) | | |

---

## 12. Business Flows

### Online Order Flow (Saga Pattern)

```
1. POST /orders → Order(PENDING) created
2. order.created → inventory-service reserves stock
3. inventory.stock.reserved → order-service confirms → Order(CONFIRMED)
4. order.confirmed → inventory-service deducts physical stock
5. order.finance.confirmed → finance-service posts journal entry
   DEBIT  1100 Accounts Receivable
   CREDIT 4002 Online Sales Revenue

Failure path:
  inventory.reservation.failed → Order(CANCELLED) → order.cancelled
  → inventory releases reservation
  → finance reverses entry (if already posted)
```

### POS Sale Flow (ACID)

```
1. GET /pos/terminals/:id/cart → create cart in Redis
2. POST /pos/terminals/:id/cart/items → add items (price from cache)
3. POST /pos/terminals/:id/checkout → atomic transaction:
   - Sale saved to PostgreSQL
   - Receipt generated
   - Cart cleared from Redis
4. pos.sale.completed → finance-service posts journal entry:
   DEBIT  1001/1002/1003 Cash/Card/UPI
   CREDIT 4001 POS Sales Revenue
```

### POS Void Flow

```
1. PATCH /pos/sales/:id/void?reason=...
2. pos.sale.voided → finance-service posts reversal:
   DEBIT  4001 POS Sales Revenue
   CREDIT 1001/1002/1003 Cash/Card/UPI
3. Original journal entry marked REVERSED
```

### Double-Entry Accounting Rules

```
Account Type  | DEBIT   | CREDIT
──────────────────────────────────
ASSET         | ↑ Up    | ↓ Down
LIABILITY     | ↓ Down  | ↑ Up
REVENUE       | ↓ Down  | ↑ Up
EXPENSE       | ↑ Up    | ↓ Down

Rule: Total Debits = Total Credits (always)
```

---

## 13. Monitoring & Health Checks

### Service Health

```bash
# Check if service is responding
curl http://localhost:8081/actuator/health
curl http://localhost:8082/actuator/health
curl http://localhost:8083/actuator/health
curl http://localhost:8084/actuator/health
curl http://localhost:8086/actuator/health
```

### Kafka UI Dashboard

```
http://localhost:8090

Key metrics to check:
- Topic message counts (growing = events flowing)
- Consumer group lag (should be 0 or near 0)
- Broker status (should show 1 broker active)
```

### Check Consumer Lag

```bash
winpty docker exec -it kafka //bin/bash -c \
  "kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
   --group inventory-service --describe"

# LAG column should be 0 for all partitions
# High LAG means consumer is falling behind
```

### Database Size Check

```bash
winpty docker exec -it postgres psql -U erpadmin -d postgres \
  -c "SELECT datname, pg_size_pretty(pg_database_size(datname)) AS size FROM pg_database ORDER BY pg_database_size(datname) DESC;"
```

### Redis Memory

```bash
winpty docker exec -it redis redis-cli INFO memory | grep used_memory_human
```

---

## 14. Troubleshooting

### Service Won't Start

**Symptom:** `Error creating bean` on startup

**Check 1 — common-lib not installed:**
```bash
cd shared/common-lib && mvn clean install -DskipTests
```

**Check 2 — PostgreSQL not ready:**
```bash
docker ps | grep postgres
# Must show "Up" and "healthy"
```

**Check 3 — Port already in use:**
```bash
# Windows
netstat -ano | findstr :8081
taskkill /PID {PID} /F
```

**Check 4 — Circular dependency:**
```
Error: The dependencies form a cycle: jwtAuthFilter → securityConfig

Fix: Extract UserDetailsService to standalone @Service
     Never define as @Bean inside SecurityConfig
```

---

### 401 Unauthorized

```
Causes:
  1. Token missing from Authorization header
  2. Token expired (24h TTL)
  3. Token malformed or truncated

Fix:
  Re-login: POST /auth/login
  Check token at jwt.io
  Ensure header format: "Authorization: Bearer {token}"
```

### 403 Forbidden

```
Causes:
  1. Wrong role for endpoint
  2. Double slash in URL (/pos/terminals//STORE1-T1)
  3. @EnableMethodSecurity missing

Check URL for double slashes.
Check user's role vs endpoint's @PreAuthorize.
```

### 404 Not Found

```
Cause:  Entity doesn't exist
        OR URL path variable is wrong

Check:  Correct UUID in path
        Entity exists in DB
```

### Kafka Events Not Being Consumed

```
Checklist:
  1. @EnableKafka present on main application class?
  2. KafkaConfig bean defined?
  3. auto-offset-reset: latest (won't replay old events)
  4. Is service subscribed? Check logs for "partitions assigned"
  5. Consumer group correct in @KafkaListener?
```

### Kafka Messages Replaying on Restart

```
Cause:  auto-offset-reset: earliest

Fix:    Change to: auto-offset-reset: latest
        in application.yml of the affected service
```

### Cart Not Found (404)

```
Cause:  Cart TTL expired (30 minutes of inactivity)

Fix:    GET /pos/terminals/:id/cart?storeId=... to recreate
```

### Price Unavailable (500)

```
Cause:  PriceCacheService returning 403 from inventory-service
        JWT not being forwarded in the REST call

Fix:    Ensure PriceCacheService uses RequestContextHolder
        to extract and forward the Authorization header
```

### LinkedHashMap Cannot Be Cast

```
Cause:  Redis returns LinkedHashMap instead of CartDto
        Different classloaders in Spring Boot fat jar vs IntelliJ debug

Fix:    objectMapper.convertValue(raw, CartDto.class)
        Always use convertValue() when reading from Redis
```

### Finance Ledger Balance Incorrect

```
Cause:  finance-service was not running when event was published
        Missed event cannot be replayed with auto-offset-reset: latest

Fix (dev):
  UPDATE journal_entries SET status = 'REVERSED'
  WHERE reference_id = '{orderId}' AND status = 'POSTED';

  UPDATE ledger_accounts SET current_balance = 0
  WHERE account_code IN ('1100', '4002');

Fix (production): Implement Outbox Pattern
```

### LEADER_NOT_AVAILABLE Warning

```
2026-03-17 WARN: LEADER_NOT_AVAILABLE for topic X

This is HARMLESS. New topic being created — leader election in progress.
Kafka retries automatically. Disappears within 1-2 seconds.
```

---

## 15. Known Issues & Workarounds

### Issue 1 — Kafka CLI in Git Bash

```
Problem: /bin/bash path mangled by Git Bash to C:/Program Files/Git/...

Workaround: Use //bin/bash (double slash)
  winpty docker exec -it kafka //bin/bash -c "kafka-topics.sh ..."

Alternative: Use Kafka UI at http://localhost:8090 instead of CLI
```

### Issue 2 — Redis Deserialization (LinkedHashMap)

```
Problem: Objects stored in Redis come back as LinkedHashMap

Root cause: RedisTemplate<String, Object> — Jackson doesn't know target type
            Spring Boot fat jar uses different classloader than IntelliJ debug

Workaround: objectMapper.convertValue(raw, YourClass.class)
            This is already applied in CartService.toCartDto()

Note: Works fine in IntelliJ debug mode (masks the issue — don't rely on this)
```

### Issue 3 — Stale Hibernate Cache on updateStock Response

```
Problem: PATCH /inventory/products/:id/stock response shows wrong
         reservedStock value (shows stale in-memory value)

Root cause: Hibernate L1 cache within same @Transactional
            entity in memory != committed DB value

Workaround: Split into two methods — transactional save + non-transactional read
            Already fixed in InventoryService.updateStock()
```

### Issue 4 — Duplicate Ledger Accounts on First Startup

```
Problem: CommandLineRunner inserts ledger accounts but
         existsByAccountCode check may return stale result

Workaround: Add @Transactional to CommandLineRunner bean
            Or run: DELETE FROM ledger_accounts WHERE id NOT IN
            (SELECT MIN(id::text)::uuid FROM ledger_accounts GROUP BY account_code)
```

### Issue 5 — Missed Finance Events When Service Was Down

```
Problem: finance-service was down when order.cancelled was published
         auto-offset-reset: latest — event is gone, ledger stays wrong

Workaround (dev): Direct DB correction (see Data Recovery Procedures)
Production fix: Implement Outbox Pattern (Phase 9)
```

---

## 16. Data Recovery Procedures

### Fix Stale Ledger Balance

When a finance event was missed and ledger shows incorrect balance:

```bash
winpty docker exec -it postgres psql -U erpadmin -d finance_db
```

```sql
-- Step 1: Mark the affected journal entry as REVERSED
UPDATE journal_entries
SET status = 'REVERSED'
WHERE reference_id = '{orderId_or_saleId}'
AND status = 'POSTED';

-- Step 2: Reset affected account balances
-- For missed online order cancellation:
UPDATE ledger_accounts SET current_balance = 0
WHERE account_code IN ('1100', '4002');

-- For missed POS void:
UPDATE ledger_accounts SET current_balance = 0
WHERE account_code IN ('1001', '4001');

-- Step 3: Verify
SELECT account_code, current_balance
FROM ledger_accounts
WHERE current_balance != 0;
-- Should match expected state
```

### Reset Stock Reserved Quantity

When stock shows incorrect reserved_quantity:

```bash
winpty docker exec -it postgres psql -U erpadmin -d inventory_db
```

```sql
-- Check reservations
SELECT status, COUNT(*), SUM(reserved_quantity)
FROM stock_reservations
WHERE product_id = '{productId}'
GROUP BY status;

-- Reset reserved_quantity to match only RESERVED status rows
UPDATE stock_levels sl
SET reserved_quantity = (
    SELECT COALESCE(SUM(reserved_quantity), 0)
    FROM stock_reservations sr
    WHERE sr.product_id = sl.product_id
    AND sr.status = 'RESERVED'
)
WHERE product_id = '{productId}';
```

### Restore Accidentally Deleted Product

Products use soft delete (`active = false`). To restore:

```sql
UPDATE products
SET active = true, decommissioned_at = NULL
WHERE sku = '{sku}';
```

---

## 17. Architecture Decisions

| ADR | Decision | Reason |
|---|---|---|
| ADR-001 | UUID primary keys | Globally unique, no sequence contention |
| ADR-002 | Soft delete for products | Audit trail, referential integrity |
| ADR-003 | Choreography-based Saga | No single point of failure, loose coupling |
| ADR-004 | One database per service | True isolation, independent scaling |
| ADR-005 | common-lib for JWT + ApiResponse | DRY, consistent auth across services |
| ADR-006 | Java records for DTOs | Immutable, compact, compile-time safety |
| ADR-007 | ByteArraySerializer + manual Jackson | Spring Kafka 4.x compatibility |
| ADR-008 | Role extracted from JWT claims | No DB call on every request |
| ADR-009 | reservedQuantity separate from quantity | Prevents overselling |
| ADR-010 | Immutable StockTransaction audit trail | Complete history, never modified |
| ADR-011 | ACID for POS checkout | Single-store operation, immediate consistency |
| ADR-012 | Double-entry bookkeeping | Industry standard, self-verifying |
| ADR-013 | Price validation on order creation | Prevents price tampering |
| ADR-014 | Redis for POS cart | Sub-millisecond access, TTL-based cleanup |

---

## 18. Kafka Topics Reference

### Topic Naming Convention

```
{service_domain}.{entity}.{event}

Examples:
  inventory.product.created
  order.finance.confirmed
  pos.sale.completed
```

### Event Payload Reference

**order.created**
```json
{
  "eventType": "ORDER_CREATED",
  "orderId": "uuid",
  "customerId": "email",
  "items": [{ "productId", "sku", "productName", "quantity", "unitPrice" }],
  "totalAmount": 0.00,
  "timestamp": "2026-03-18T06:00:00"
}
```

**inventory.stock.reserved**
```json
{
  "eventType": "STOCK_RESERVED",
  "orderId": "uuid",
  "items": [{ "productId", "sku", "productName", "quantity", "unitPrice" }],
  "timestamp": "2026-03-18T06:00:00"
}
```

**order.finance.confirmed**
```json
{
  "eventType": "ORDER_FINANCE_CONFIRMED",
  "orderId": "uuid",
  "customerId": "email",
  "totalAmount": 0.00,
  "items": [...],
  "confirmedAt": "2026-03-18T06:00:00",
  "timestamp": "2026-03-18T06:00:00"
}
```

**pos.sale.completed**
```json
{
  "eventType": "POS_SALE_COMPLETED",
  "saleId": "uuid",
  "terminalId": "STORE1-T1",
  "storeId": "STORE-CHENNAI-001",
  "cashierId": "admin@retailerp.com",
  "customerId": null,
  "totalAmount": 0.00,
  "paymentMethod": "CASH",
  "items": [...],
  "receiptNumber": "RCP-20260318-STORE-CHENNAI-001-00001",
  "timestamp": "2026-03-18T06:00:00"
}
```

---

## 19. Role Permissions Matrix

| Endpoint | ADMIN | STORE_MGR | CASHIER | FINANCE | HR |
|---|:---:|:---:|:---:|:---:|:---:|
| POST /auth/register | ✅ | ❌ | ❌ | ❌ | ❌ |
| POST /inventory/products | ✅ | ✅ | ❌ | ❌ | ❌ |
| GET /inventory/products | ✅ | ✅ | ✅ | ✅ | ❌ |
| PATCH /inventory/products/:id/stock | ✅ | ✅ | ❌ | ❌ | ❌ |
| DELETE /inventory/products/:id | ✅ | ❌ | ❌ | ❌ | ❌ |
| POST /orders | ✅ | ✅ | ✅ | ❌ | ❌ |
| GET /orders/my-orders | ✅ | ✅ | ✅ | ❌ | ❌ |
| GET /orders/status/:status | ✅ | ✅ | ❌ | ❌ | ❌ |
| PATCH /orders/:id/ship | ✅ | ✅ | ❌ | ❌ | ❌ |
| PATCH /orders/:id/cancel | ✅ | ✅ | ❌ | ❌ | ❌ |
| GET/POST /pos/terminals/:id/cart | ✅ | ✅ | ✅ | ❌ | ❌ |
| POST /pos/terminals/:id/checkout | ✅ | ✅ | ✅ | ❌ | ❌ |
| PATCH /pos/sales/:id/void | ✅ | ✅ | ❌ | ❌ | ❌ |
| GET /pos/terminals/:id/sales | ✅ | ✅ | ❌ | ❌ | ❌ |
| GET /finance/journal-entries | ✅ | ❌ | ❌ | ✅ | ❌ |
| GET /finance/ledger | ✅ | ❌ | ❌ | ✅ | ❌ |
| GET /finance/reports/daily-summary | ✅ | ❌ | ❌ | ✅ | ❌ |

---

## 20. Environment Configuration

### application.yml Reference (All Services)

```yaml
# Common to all services
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/{service_db}
    username: erpadmin
    password: erpadmin123
  jpa:
    hibernate:
      ddl-auto: update       # creates/updates tables on startup
    show-sql: true           # logs all SQL (disable in prod)
    open-in-view: false      # never use open-in-view

jwt:
  secret: 3cfa76ef14937c1c0ea519f8fc057a80fcd04a7420f8e8bcd0a7567c272e007b
  expiration: 86400000       # 24 hours

# Kafka consumers
spring:
  kafka:
    consumer:
      auto-offset-reset: latest   # only new messages (not earliest)
      enable-auto-commit: false   # manual commit after processing
```

### Service-Specific Config

| Service | Port | Extra Config |
|---|---|---|
| iam-service | 8081 | None |
| inventory-service | 8082 | None |
| order-service | 8083 | `services.inventory.url: http://localhost:8082` |
| finance-service | 8084 | None |
| pos-service | 8086 | `services.inventory.url: http://localhost:8082`, `pos.cart.ttl-minutes: 30`, `pos.price-cache.ttl-minutes: 60` |

### Production Checklist (Before Going Live)

```
Security:
  ☐ JWT secret in environment variable (not hardcode in yml)
  ☐ Database passwords in secrets manager
  ☐ HTTPS/TLS enabled on all endpoints
  ☐ CORS restricted to known origins
  ☐ Kafka SASL/SSL enabled
  ☐ Redis AUTH password set

Reliability:
  ☐ auto-offset-reset: latest on all consumers
  ☐ Outbox Pattern for critical financial events
  ☐ DLQ (Dead Letter Queue) configured for all consumers
  ☐ Database connection pooling tuned
  ☐ Redis maxmemory-policy: allkeys-lru

Observability:
  ☐ Prometheus metrics enabled (Spring Actuator)
  ☐ Grafana dashboards for service health
  ☐ Jaeger/Zipkin distributed tracing
  ☐ Centralized logging (ELK stack)
  ☐ Kafka consumer lag alerts

Data:
  ☐ Flyway migrations instead of ddl-auto: update
  ☐ Database backups scheduled
  ☐ show-sql: false in production
  ☐ Redis persistence (appendonly yes)
```
