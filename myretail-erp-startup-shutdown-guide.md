# myRetail ERP — Complete Startup & Shutdown Guide

---

## Project Structure

```
C:\shankar\Code-practise\myRetail-ERP\
├── docker-compose.yml          ← Infrastructure (PostgreSQL, Kafka, Redis, Zookeeper)
├── infra\
│   └── init-db.sql             ← Creates all 9 databases on first run
├── shared\
│   └── common-lib\             ← Shared JWT, ApiResponse, GlobalExceptionHandler
└── services\
    ├── iam-service\            ← Port 8081
    ├── inventory-service\      ← Port 8082
    ├── order-service\          ← Port 8083
    └── pos-service\            ← Port 8086
```

---

## Service Registry

| Service | Port | Database | Status |
|---|---|---|---|
| PostgreSQL | 5432 | All 9 DBs | Infrastructure |
| Kafka | 9092 | — | Infrastructure |
| Kafka UI | 8090 | — | Infrastructure |
| Redis | 6379 | — | Infrastructure |
| Zookeeper | 2181 | — | Infrastructure |
| iam-service | 8081 | iam_db | ✅ Phase 1 |
| inventory-service | 8082 | inventory_db | ✅ Phase 2 |
| order-service | 8083 | order_db | ✅ Phase 3 |
| pos-service | 8086 | pos_db | ✅ Phase 4 |

---

## Prerequisites

Before starting anything, ensure these are installed:

```
✅ Docker Desktop (running)
✅ Java 23 (JDK)
✅ Maven (or use ./mvnw in each service)
✅ IntelliJ IDEA (or terminal)
```

Check Docker is running:
```bash
docker info
# Should show server version, not an error
```

---

## STARTUP PROCEDURE

### Step 1 — Start Infrastructure (Always First)

```bash
cd C:\shankar\Code-practise\myRetail-ERP

docker-compose up -d
```

This starts:
- PostgreSQL on 5432
- Zookeeper on 2181
- Kafka on 9092
- Kafka UI on 8090
- Redis on 6379

Wait ~30 seconds for all containers to be healthy.

**Verify all containers are running:**
```bash
docker ps

# Expected output:
# CONTAINER ID   IMAGE                         STATUS
# xxxxxxxxxxxx   confluentinc/cp-kafka         Up 30 seconds
# xxxxxxxxxxxx   confluentinc/cp-zookeeper     Up 31 seconds
# xxxxxxxxxxxx   postgres:16                   Up 31 seconds
# xxxxxxxxxxxx   redis:7.2-alpine              Up 31 seconds
# xxxxxxxxxxxx   provectuslabs/kafka-ui        Up 30 seconds
```

**Verify PostgreSQL databases exist:**
```bash
winpty docker exec -it postgres psql -U erpadmin -d postgres -c "\l"

# Expected: iam_db, inventory_db, order_db, pos_db, finance_db,
#           hr_db, procurement_db, analytics_db, notification_db
```

**Verify Kafka is ready:**
```bash
# Open Kafka UI
http://localhost:8090
# Should show cluster with topics
```

---

### Step 2 — Build common-lib (Only When Changed)

Run this if you've made changes to `shared/common-lib`. Otherwise skip.

```bash
cd C:\shankar\Code-practise\myRetail-ERP\shared\common-lib

mvn clean install -DskipTests
```

Expected output:
```
[INFO] BUILD SUCCESS
[INFO] Installing common-lib-1.0.0.jar to ~/.m2/repository/com/myretailerp/common-lib/1.0.0/
```

---

### Step 3 — Start Services (Order Matters)

Services must be started in dependency order.

#### Start 1: iam-service (Port 8081)

```bash
cd C:\shankar\Code-practise\myRetail-ERP\services\iam-service

#for windows
./mvnw spring-boot:run
# OR in IntelliJ: Run IamServiceApplication
```

**Wait for:**
```
Started IamServiceApplication in X seconds
Tomcat started on port 8081
```

**Verify:**
```bash
curl http://localhost:8081/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@retailerp.com","password":"admin123"}'
# Expected: 200 OK with token
```

---

#### Start 2: inventory-service (Port 8082)

```bash
cd C:\shankar\Code-practise\myRetail-ERP\services\inventory-service

./mvnw spring-boot:run
```

**Wait for:**
```
Started InventoryServiceApplication in X seconds
Tomcat started on port 8082
partitions assigned: [order.created-0]
partitions assigned: [order.confirmed-0]
partitions assigned: [order.cancelled-0]
```

**Verify:**
```bash
curl http://localhost:8082/inventory/products \
  -H "Authorization: Bearer $TOKEN"
# Expected: 200 OK with products list
```

---

#### Start 3: order-service (Port 8083)

```bash
cd C:\shankar\Code-practise\myRetail-ERP\services\order-service

.\mvnw spring-boot:run
```

**Wait for:**
```
Started OrderServiceApplication in X seconds
Tomcat started on port 8083
partitions assigned: [inventory.stock.reserved-0]
partitions assigned: [inventory.reservation.failed-0]
```

**Verify:**
```bash
curl http://localhost:8083/orders/my-orders \
  -H "Authorization: Bearer $TOKEN"
# Expected: 200 OK with orders list
```

---

#### Start 4: pos-service (Port 8086)

```bash
cd C:\shankar\Code-practise\myRetail-ERP\services\pos-service

./mvnw spring-boot:run
```

**Wait for:**
```
Started PosServiceApplication in X seconds
Tomcat started on port 8086
```

**Verify:**
```bash
curl "http://localhost:8086/pos/terminals/STORE1-T1/cart?storeId=STORE-CHENNAI-001" \
  -H "Authorization: Bearer $TOKEN"
# Expected: 200 OK with empty cart
```

---

### Step 4 — Verify Full Stack

Once all services are running, verify the complete stack:

```
Infrastructure:
  ✅ http://localhost:8090          → Kafka UI (topics visible)
  ✅ PostgreSQL on 5432             → docker ps shows healthy

Services:
  ✅ http://localhost:8081/auth/login    → IAM Service
  ✅ http://localhost:8082/inventory/products → Inventory Service
  ✅ http://localhost:8083/orders/my-orders   → Order Service
  ✅ http://localhost:8086/pos/terminals/T1/cart?storeId=X → POS Service
```

**Quick health check script (Windows PowerShell):**
```powershell
Write-Host "Checking all services..."
$services = @(
    @{Name="IAM";         Url="http://localhost:8081/actuator/health"},
    @{Name="Inventory";   Url="http://localhost:8082/actuator/health"},
    @{Name="Order";       Url="http://localhost:8083/actuator/health"},
    @{Name="POS";         Url="http://localhost:8086/actuator/health"}
)
foreach ($s in $services) {
    try {
        $r = Invoke-WebRequest -Uri $s.Url -UseBasicParsing
        Write-Host "✅ $($s.Name): UP"
    } catch {
        Write-Host "❌ $($s.Name): DOWN"
    }
}
```

---

## SHUTDOWN PROCEDURE

### Option A — Graceful Shutdown (Recommended)

Stop services first, then infrastructure. This allows in-flight messages to be processed.

#### Step 1 — Stop Spring Boot Services

For each IntelliJ run window, press the **Stop** button (red square).

Or if running in terminal, press `Ctrl+C` in each terminal window.

Stop in reverse order:
```
1. pos-service         (Ctrl+C)
2. order-service       (Ctrl+C)
3. inventory-service   (Ctrl+C)
4. iam-service         (Ctrl+C)
```

Wait for each to log:
```
Stopping service [Tomcat]
HikariPool-1 - Shutdown completed
```

#### Step 2 — Stop Infrastructure

```bash
cd C:\shankar\Code-practise\myRetail-ERP

docker-compose down
```

**Verify:**
```bash
docker ps
# No myRetail containers should appear
```

---

### Option B — Quick Stop (Dev Only)

Stop everything at once (data in PostgreSQL/Redis persists on volumes):

```bash
# Stop all services (Ctrl+C in each terminal)
# Then:
docker-compose down
```

---

### Option C — Full Reset (Wipe All Data)

**⚠ WARNING: This deletes ALL database data, Kafka topics, and Redis cache.**

```bash
cd C:\shankar\Code-practise\myRetail-ERP

# Stop and remove containers + volumes
docker-compose down -v

# Verify clean
docker ps -a | grep myretail    # should be empty
docker volume ls | grep myretail # should be empty
```

After full reset, the next `docker-compose up -d` will:
- Recreate all databases from `infra/init-db.sql`
- Create empty Kafka topics (if topic creation is configured)
- Start with a clean Redis instance

---

## RESTART A SINGLE SERVICE

Use this when you've made code changes to one service:

```bash
# Example: restart inventory-service after code change
cd C:\shankar\Code-practise\myRetail-ERP\services\inventory-service

# If common-lib was changed:
cd ..\..\..\shared\common-lib
mvn clean install -DskipTests
cd ..\..\services\inventory-service

# Restart the service
.\mvnw clean spring-boot:run
```

Infrastructure (Docker) does not need to restart for code changes.

---

## KAFKA TOPIC MANAGEMENT

### View All Topics
```
http://localhost:8090
```

### Purge a Topic (Dev Only — Reset test data)
```bash
# Via Kafka UI: Topics → Select topic → Actions → Purge Messages

# Via CLI:
winpty docker exec -it kafka kafka-topics.sh \
  --bootstrap-server localhost:9092 \
  --delete --topic order.created

# Recreate it:
winpty docker exec -it kafka kafka-topics.sh \
  --bootstrap-server localhost:9092 \
  --create --topic order.created --partitions 1 --replication-factor 1
```

### Check Consumer Group Offsets
```bash
winpty docker exec -it kafka kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --group inventory-service \
  --describe
```

### Reset Consumer Group (If Messages Replaying)
```bash
# Stop inventory-service first, then:
winpty docker exec -it kafka kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --group inventory-service \
  --reset-offsets \
  --to-latest \
  --all-topics \
  --execute
```

---

## POSTGRESQL DATABASE MANAGEMENT

### Connect to Any Database
```bash
# Connect to inventory_db
winpty docker exec -it postgres psql -U erpadmin -d inventory_db

# Connect to pos_db
winpty docker exec -it postgres psql -U erpadmin -d pos_db

# Connect to order_db
winpty docker exec -it postgres psql -U erpadmin -d order_db
```

### Useful Queries
```sql
-- List all tables
\dt

-- View stock levels
SELECT p.sku, p.name, sl.quantity, sl.reserved_quantity,
       sl.quantity - sl.reserved_quantity AS available
FROM products p
JOIN stock_levels sl ON sl.product_id = p.id;

-- View recent orders
SELECT id, customer_id, status, total_amount, created_at
FROM orders
ORDER BY created_at DESC
LIMIT 10;

-- View recent POS sales
SELECT id, terminal_id, store_id, total_amount,
       payment_method, status, created_at
FROM sales
ORDER BY created_at DESC
LIMIT 10;

-- View receipts
SELECT r.receipt_number, s.total_amount, s.created_at
FROM receipts r
JOIN sales s ON s.id = r.sale_id
ORDER BY r.generated_at DESC
LIMIT 10;
```

### Reset a Single Database (Dev Only)
```bash
winpty docker exec -it postgres psql -U erpadmin -d postgres -c "DROP DATABASE inventory_db;"
winpty docker exec -it postgres psql -U erpadmin -d postgres -c "CREATE DATABASE inventory_db OWNER erpadmin;"
# Then restart inventory-service — Hibernate ddl-auto:update recreates tables
```

---

## REDIS MANAGEMENT

### Connect to Redis
```bash
winpty docker exec -it redis redis-cli
```

### Useful Commands
```bash
# View all cart keys
SCAN 0 MATCH "cart:*" COUNT 100

# View a cart
GET cart:STORE1-T1

# View price cache
SCAN 0 MATCH "price:*" COUNT 100

# Delete a specific cart (force cashier to start fresh)
DEL cart:STORE1-T1

# Flush ALL Redis data (dev only)
FLUSHALL

# Check memory usage
INFO memory | grep used_memory_human

# Monitor all commands in real-time (dev debugging)
MONITOR
```

---

## COMMON ISSUES & FIXES

### "Port already in use"
```bash
# Windows — find what's using port 8081
netstat -ano | findstr :8081
# Kill the process
taskkill /PID {PID} /F
```

### "Could not resolve placeholder 'services.inventory.url'"
```
Cause:  Missing property in application.yml
Fix:    Add services.inventory.url: http://localhost:8082
        to order-service and pos-service application.yml
```

### "No active cart for terminal: STORE1-T1"
```
Cause:  Cart expired (30 min TTL) or Redis was flushed
Fix:    GET /pos/terminals/{terminalId}/cart?storeId=X to recreate
```

### "Price unavailable for product: uuid"
```
Cause:  PriceCacheService getting 403 from inventory-service
        (No JWT forwarded in the REST call)
Fix:    Ensure PriceCacheService forwards Bearer token from
        RequestContextHolder.getRequestAttributes()
```

### "Reservation SUCCESS but unitPrice=0"
```
Cause:  Old bug (fixed) — client was not sending unitPrice
        and inventory REST call was not wired
Fix:    Order service now validates price via InventoryClient
        before creating order
```

### Kafka events replaying on restart
```
Cause:  auto-offset-reset: earliest replays all history
Fix:    Change to auto-offset-reset: latest in consumer services
        (inventory-service, order-service)
```

### "LinkedHashMap cannot be cast to CartDto"
```
Cause:  Redis returns LinkedHashMap when reading stored objects
        Different classloaders in Spring Boot fat jar
Fix:    objectMapper.convertValue(raw, CartDto.class)
        See: redis-linkedhashmap-deserialization-checkpoint.md
```

### Circular dependency on startup
```
Cause:  UserDetailsService defined as @Bean inside SecurityConfig
        + JwtAuthFilter injected into SecurityConfig
Fix:    Extract UserDetailsService to standalone @Service
        (e.g. PosUserDetailsService, InventoryUserDetailsService)
```

---

## GETTING A TEST TOKEN

```bash
# Login and get token
curl -X POST http://localhost:8081/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@retailerp.com","password":"admin123"}'

# Response:
# { "data": { "token": "eyJhbGciOiJIUzI1NiJ9..." } }

# Use in Postman: Authorization → Bearer Token → paste token
# Or set as variable {{devToken}} in Postman environment
```

---

## STARTUP ORDER DIAGRAM

```
docker-compose up -d
        │
        ├── PostgreSQL (5432)    ← Must be ready before services
        ├── Zookeeper (2181)     ← Must be ready before Kafka
        ├── Kafka (9092)         ← Must be ready before services
        ├── Kafka UI (8090)      ← Optional, for debugging
        └── Redis (6379)         ← Must be ready before POS service
        │
        │ (wait ~30 seconds)
        │
mvn spring-boot:run (iam-service)
        │
        │ (wait for "Started IamServiceApplication")
        │
mvn spring-boot:run (inventory-service)
        │
        │ (wait for "partitions assigned")
        │
mvn spring-boot:run (order-service)
        │
        │ (wait for "partitions assigned")
        │
mvn spring-boot:run (pos-service)
        │
        │ (wait for "Started PosServiceApplication")
        │
        ✅ Full stack ready
```

---

## CURRENT KAFKA TOPICS

| Topic | Producer | Consumer |
|---|---|---|
| `inventory.product.created` | inventory-service | analytics (future) |
| `inventory.stock.updated` | inventory-service | analytics (future) |
| `inventory.stock.low` | inventory-service | procurement (future) |
| `inventory.stock.reserved` | inventory-service | order-service |
| `inventory.reservation.failed` | inventory-service | order-service |
| `order.created` | order-service | inventory-service |
| `order.confirmed` | order-service | inventory-service |
| `order.cancelled` | order-service | inventory-service |
| `order.finance.confirmed` | order-service | finance-service (future) |
| `pos.sale.completed` | pos-service | finance, analytics, loyalty (future) |
| `pos.sale.voided` | pos-service | finance-service (future) |
