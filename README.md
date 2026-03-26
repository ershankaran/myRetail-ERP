# myRetail ERP

A production-grade Enterprise Resource Planning system for retail chains, built as microservices with Spring Boot 4.x and Angular 21.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Services](#services)
- [Frontend](#frontend)
- [API Reference](#api-reference)
- [Business Flows](#business-flows)
- [Development Guide](#development-guide)
- [Troubleshooting](#troubleshooting)

---

## Overview

myRetail ERP unifies five core retail operations into a single integrated platform:

| Module | Description |
|---|---|
| **IAM** | User authentication, JWT-based security, role-based access control |
| **Inventory** | Product catalogue, real-time stock management, audit trail |
| **Orders** | Online order processing with Saga-based distributed transactions |
| **POS** | In-store point-of-sale billing with Redis cart and ACID checkout |
| **Finance** | Automated double-entry bookkeeping on every transaction |

---

## Architecture

```
Angular 21 SPA (localhost:4200)
         │
         │ HTTPS + JWT
         ▼
┌─────────────────────────────────────────────┐
│              Spring Boot Services            │
│                                             │
│  IAM (8081)      Inventory (8082)           │
│  Order (8083)    Finance (8084)             │
│  POS (8086)                                 │
└──────────────┬──────────────────────────────┘
               │
    ┌──────────┼──────────┐
    ▼          ▼          ▼
PostgreSQL   Kafka      Redis
 (5432)     (9092)     (6379)
```

### Communication Patterns

- **Synchronous (REST):** Client → Service, POS → Inventory (price), Order → Inventory (price validation)
- **Asynchronous (Kafka):** Order ↔ Inventory (Saga), Order → Finance, POS → Finance

---

## Tech Stack

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Java | 23 | Language |
| Spring Boot | 4.0.3 | Framework |
| Spring Security | 6.x | JWT auth, RBAC |
| Hibernate | 7.2.4 | ORM |
| Apache Kafka | 4.1.1 | Event streaming |
| Redis | 7.2 | Cart cache |
| PostgreSQL | 16.11 | Primary database |
| JJWT | 0.12.3 | JWT library |
| Lombok | Latest | Boilerplate reduction |

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| Angular | 21.2.5 | Framework (standalone) |
| Angular Material | 21.2.3 | UI components |
| Angular CDK | 21.2.3 | Component development kit |

### Infrastructure
| Technology | Purpose |
|---|---|
| Docker + Docker Compose | Container orchestration |
| Maven | Build tool |

---

## Project Structure

```
myRetail-ERP/
├── docker-compose.yml              # Infrastructure (PostgreSQL, Kafka, Redis)
├── infra/
│   └── init-db.sql                 # Creates all 9 databases
├── shared/
│   └── common-lib/                 # Shared JWT, ApiResponse, GlobalExceptionHandler
├── services/
│   ├── iam-service/                # Port 8081
│   ├── inventory-service/          # Port 8082
│   ├── order-service/              # Port 8083
│   ├── finance-service/            # Port 8084
│   └── pos-service/                # Port 8086
└── erpUI/                          # Angular 21 frontend
    └── src/
        └── app/
            ├── core/               # Guards, interceptors, services, models
            ├── shared/             # Shared models
            ├── shell/              # Layout, sidebar, header
            └── features/           # Auth, inventory, orders, pos, finance, iam
```

---

## Prerequisites

- **Java 23** — [Download](https://adoptium.net/)
- **Maven 3.x** — [Download](https://maven.apache.org/)
- **Node.js 22+** — [Download](https://nodejs.org/)
- **Angular CLI 21** — `npm install -g @angular/cli`
- **Docker Desktop** — [Download](https://www.docker.com/products/docker-desktop/)

---

## Quick Start

### 1 — Start Infrastructure

```bash
cd myRetail-ERP
docker-compose up -d
```

Verify containers are running:
```bash
docker ps
# postgres, kafka, kafka-ui, redis, zookeeper should all show "Up"
```

Kafka UI available at: `http://localhost:8090`

### 2 — Build Shared Library

```bash
cd shared/common-lib
mvn clean install -DskipTests
```

### 3 — Start Backend Services (in order)

Open 5 separate terminals:

```bash
# Terminal 1 — IAM
cd services/iam-service && ./mvnw spring-boot:run

# Terminal 2 — Inventory (wait for IAM to start)
cd services/inventory-service && ./mvnw spring-boot:run

# Terminal 3 — Order
cd services/order-service && ./mvnw spring-boot:run

# Terminal 4 — Finance
cd services/finance-service && ./mvnw spring-boot:run

# Terminal 5 — POS
cd services/pos-service && ./mvnw spring-boot:run
```

### 4 — Start Frontend

```bash
cd erpUI
npm install
ng serve
```

Open `http://localhost:4200`

### 5 — Login

```
Email:    admin@retailerp.com
Password: admin123
```

---

## Services

### IAM Service — Port 8081

Handles user registration, authentication, and JWT issuance.

**Database:** `iam_db`

**Endpoints:**
```
POST /auth/register    Register new user (ADMIN only)
POST /auth/login       Login, returns JWT
```

**Roles:** `ADMIN`, `STORE_MANAGER`, `CASHIER`, `FINANCE`, `HR`

---

### Inventory Service — Port 8082

Manages product catalogue and stock levels with full audit trail.

**Database:** `inventory_db`

**Endpoints:**
```
GET    /inventory/products                 List all products
POST   /inventory/products                 Create product
GET    /inventory/products/:id             Get product
GET    /inventory/products/sku/:sku        Get by SKU
GET    /inventory/products/low-stock       Low stock products
PATCH  /inventory/products/:id/stock       Update stock
DELETE /inventory/products/:id             Decommission product
GET    /inventory/products/:id/transactions Stock history
```

**Key Design:**
- `reservedStock` separate from `currentStock` prevents overselling
- `@Version` optimistic locking on `StockLevel`
- Immutable `StockTransaction` audit trail
- Choreography Saga consumer for order events

---

### Order Service — Port 8083

Online order management with Saga-based distributed transaction.

**Database:** `order_db`

**Endpoints:**
```
POST   /orders              Create order (validates price)
GET    /orders/:id          Get order
GET    /orders/my-orders    My orders
GET    /orders/status/:s    Orders by status
PATCH  /orders/:id/ship     Ship order
PATCH  /orders/:id/deliver  Deliver order
PATCH  /orders/:id/cancel   Cancel order
```

**Saga Flow:**
```
Order(PENDING) → [order.created] → Inventory reserves stock
             ← [inventory.stock.reserved]
Order(CONFIRMED) → [order.confirmed] → Inventory deducts stock
                → [order.finance.confirmed] → Finance posts entry
```

---

### Finance Service — Port 8084

Automated double-entry bookkeeping on every transaction.

**Database:** `finance_db`

**Endpoints:**
```
GET /finance/journal-entries        All journal entries
GET /finance/journal-entries/:id    Get entry
GET /finance/ledger                 All account balances
GET /finance/ledger/:code           Single account
GET /finance/reports/daily-summary  Daily P&L
```

**Journal Entry Templates:**

| Event | Debit | Credit |
|---|---|---|
| POS Cash Sale | 1001 Cash | 4001 POS Sales Revenue |
| POS Card Sale | 1002 Card Receivable | 4001 POS Sales Revenue |
| Online Order | 1100 Accounts Receivable | 4002 Online Sales Revenue |
| POS Void | 4001 POS Sales Revenue | 1001 Cash |
| Order Cancel | 4002 Online Sales Revenue | 1100 Accounts Receivable |

---

### POS Service — Port 8086

In-store billing with Redis cart and ACID checkout.

**Database:** `pos_db`  
**Cache:** Redis

**Endpoints:**
```
GET    /pos/terminals/:id/cart?storeId=     Get/create cart
POST   /pos/terminals/:id/cart/items        Add item
DELETE /pos/terminals/:id/cart/items/:sku   Remove item
DELETE /pos/terminals/:id/cart              Clear cart
POST   /pos/terminals/:id/checkout?storeId= Checkout
GET    /pos/sales/:id                       Get sale
GET    /pos/terminals/:id/sales             Sales by terminal
PATCH  /pos/sales/:id/void?reason=          Void sale
```

**Redis Keys:**
```
cart:{terminalId}           TTL: 30 minutes
price:{storeId}:{productId} TTL: 60 minutes
```

---

## Frontend

### Tech
- Angular 21 — standalone components (no NgModule)
- Angular Material 21 — UI components
- Angular Signals — reactive state management
- Functional guards and interceptors

### Key Files
```
src/app/
├── app.ts                              Root component
├── app.config.ts                       App providers (HTTP, router, animations)
├── app.routes.ts                       Lazy-loaded routes
├── core/
│   ├── guards/auth.guard.ts            JWT route protection
│   ├── guards/role.guard.ts            Role-based route protection
│   ├── interceptors/auth.interceptor.ts JWT token attachment
│   └── services/                       auth, inventory, order, pos, finance, iam
├── shell/
│   ├── layout/                         App shell with sidenav
│   ├── sidebar/                        Role-based navigation
│   └── header/                         Top toolbar
└── features/
    ├── auth/login/                     Login page
    ├── dashboard/                      Summary cards + quick nav
    ├── inventory/                      Product list + detail + low-stock
    ├── orders/                         Order list + detail
    ├── pos/                            Terminal select + billing + history
    ├── finance/                        Dashboard + journal entries + ledger
    └── iam/                            User management
```

### Role-Based Access

| Feature | ADMIN | STORE_MGR | CASHIER | FINANCE | HR |
|---|:---:|:---:|:---:|:---:|:---:|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Inventory view | ✅ | ✅ | ✅ | ✅ | ❌ |
| Update stock | ✅ | ✅ | ❌ | ❌ | ❌ |
| All orders | ✅ | ✅ | ❌ | ❌ | ❌ |
| My orders | ✅ | ✅ | ✅ | ❌ | ❌ |
| POS billing | ✅ | ✅ | ✅ | ❌ | ❌ |
| Void sale | ✅ | ✅ | ❌ | ❌ | ❌ |
| Finance | ✅ | ❌ | ❌ | ✅ | ❌ |
| User management | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## API Reference

### Authentication

All endpoints except `/auth/**` require JWT:

```bash
# Login
curl -X POST http://localhost:8081/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@retailerp.com","password":"admin123"}'

# Use token
curl http://localhost:8082/inventory/products \
  -H "Authorization: Bearer {token}"
```

### Response Format

All APIs return:

```json
{
  "status": "SUCCESS",
  "message": "Human readable message",
  "data": { ... },
  "timestamp": "2026-03-26T10:00:00"
}
```

---

## Business Flows

### POS Sale Flow

```
1. GET  /pos/terminals/STORE1-T1/cart?storeId=STORE-CHENNAI-001
2. POST /pos/terminals/STORE1-T1/cart/items  { productId, sku, productName, quantity }
3. POST /pos/terminals/STORE1-T1/checkout?storeId=STORE-CHENNAI-001  { paymentMethod: "CASH" }

Result:
  → Sale saved to PostgreSQL
  → Receipt generated (RCP-YYYYMMDD-STOREID-NNNNN)
  → Cart cleared from Redis
  → pos.sale.completed → Finance posts: DEBIT Cash, CREDIT POS Sales Revenue
```

### Online Order Saga Flow

```
1. POST /orders  { items: [...] }
   → Price validated against inventory (1% tolerance)
   → Order(PENDING) created
   → order.created published

2. inventory-service consumes order.created
   → Stock reserved
   → inventory.stock.reserved published

3. order-service consumes inventory.stock.reserved
   → Order(CONFIRMED)
   → order.finance.confirmed published

4. finance-service consumes order.finance.confirmed
   → DEBIT Accounts Receivable, CREDIT Online Sales Revenue
```

---

## Development Guide

### Database Connections

```bash
# Connect to any database
winpty docker exec -it postgres psql -U erpadmin -d {database_name}

# Databases: iam_db, inventory_db, order_db, finance_db, pos_db
```

### Kafka Operations

```bash
# List topics
winpty docker exec -it kafka //bin/bash -c \
  "kafka-topics.sh --list --bootstrap-server localhost:9092"

# Check consumer lag
winpty docker exec -it kafka //bin/bash -c \
  "kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --group finance-service --describe"
```

### Redis Operations

```bash
winpty docker exec -it redis redis-cli

# View all carts
SCAN 0 MATCH "cart:*" COUNT 100

# Delete a cart
DEL cart:STORE1-T1
```

### Adding a New Service

1. Create Maven module under `services/`
2. Add `common-lib` dependency to `pom.xml`
3. Add `@ComponentScan` for both service and `com.myretailerp.common`
4. Create standalone `UserDetailsService` (don't use `@Bean` in SecurityConfig)
5. Add CORS config to `SecurityConfig.java`
6. Create database in `infra/init-db.sql`
7. Add service to `docker-compose.yml` (future)

---

## Troubleshooting

### CORS Error from Angular

The Spring Security filter chain must explicitly configure CORS. Ensure each service's `SecurityConfig.java` has:

```java
.cors(cors -> cors.configurationSource(corsConfigurationSource()))
// AND
.requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
```

### Kafka Events Not Consumed

Check consumer group status:
```bash
winpty docker exec -it kafka //bin/bash -c \
  "kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --group {service-name} --describe"
```

Verify `@EnableKafka` is on the main application class.

### Redis LinkedHashMap Cast Error

When reading from Redis, always use:
```java
objectMapper.convertValue(raw, YourClass.class)
```
Never cast directly — Redis deserializes to `LinkedHashMap` in fat jars.

### Spinner Doesn't Stop After API Call

Add `ChangeDetectorRef` and call `detectChanges()` after setting loading state:
```java
this.loading = false;
this.cdr.detectChanges();
```

### Hibernate Stale L1 Cache

Split `@Transactional` update from the subsequent read:
```java
@Transactional
public void doUpdate() { ... }  // commits here

public Entity read() {          // fresh read after commit
    return repo.findById(id);
}
```

---

## Environment Configuration

### Backend — `application.yml` per service

```yaml
server:
  port: {PORT}

spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/{DB_NAME}
    username: erpadmin
    password: erpadmin123
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true
    open-in-view: false
  kafka:
    bootstrap-servers: localhost:9092
    consumer:
      auto-offset-reset: latest
      enable-auto-commit: false

jwt:
  secret: 3cfa76ef14937c1c0ea519f8fc057a80fcd04a7420f8e8bcd0a7567c272e007b
  expiration: 86400000
```

### Frontend — `src/environments/environment.ts`

```typescript
export const environment = {
  production: false,
  apiUrls: {
    iam:       'http://localhost:8081',
    inventory: 'http://localhost:8082',
    order:     'http://localhost:8083',
    finance:   'http://localhost:8084',
    pos:       'http://localhost:8086'
  }
};
```

---

## Roadmap

```
✅ Phase 0  — Infrastructure (Docker, PostgreSQL, Kafka, Redis)
✅ Phase 1  — IAM Service (JWT, RBAC)
✅ Phase 2  — Inventory Service (stock management, Saga)
✅ Phase 3  — Order Service (choreography Saga)
✅ Phase 4  — POS Service (Redis cart, ACID checkout)
✅ Phase 5  — Finance Service (double-entry bookkeeping)
✅ Phase UI — Angular 21 frontend (dashboard, inventory, orders)

⬜ Phase 6  — Procurement Service
⬜ Phase 7  — HR & Payroll (Spring Batch)
⬜ Phase 8  — Analytics (CQRS, read models)
⬜ Phase 9  — Infrastructure (Kubernetes, CI/CD, Outbox Pattern)
```

---

## License

Internal project — not for public distribution.
