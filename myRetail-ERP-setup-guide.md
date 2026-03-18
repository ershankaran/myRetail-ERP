# myRetail ERP — Setup Progress Guide

> **Project:** Retail ERP for a $1B retail chain  
> **Stack:** Spring Boot 3.x · Angular 17 · PostgreSQL · Kafka · Redis  
> **Architecture:** Microservices from day one  
> **Date:** March 2026

---

## Project Overview

A full-scale ERP system built the way a **Principal Engineer** would approach it — starting with domain decomposition, bounded contexts, and infrastructure-first thinking before writing a single line of business logic.

### Modules Covered
- Inventory & Warehouse
- Order Management
- Finance & Accounting
- HR & Payroll
- POS / Sales
- Procurement & Vendors
- Reporting & Analytics

### Learning Goals
- System design & architecture decisions
- Microservices patterns & inter-service communication
- Production-grade infra (K8s, CI/CD, observability)

---

## Architecture

### Bounded Contexts (DDD)

```
┌─────────────────────────────────────────────────────────────────┐
│                    RETAIL ERP BOUNDED CONTEXTS                  │
├─────────────────┬──────────────────┬────────────────────────────┤
│  Identity &     │  Inventory &     │  Order Management          │
│  Access (IAM)   │  Warehouse       │  (OMS)                     │
├─────────────────┼──────────────────┼────────────────────────────┤
│  Finance &      │  HR & Payroll    │  POS / Sales               │
│  Accounting     │                  │                            │
├─────────────────┼──────────────────┼────────────────────────────┤
│  Procurement    │  Reporting &     │  Notification              │
│  & Vendors      │  Analytics       │  Service                   │
└─────────────────┴──────────────────┴────────────────────────────┘
```

### System Architecture

```
                        ┌──────────────────┐
                        │   Angular 17     │
                        │   (Shell App +   │
                        │  Micro-frontends)│
                        └────────┬─────────┘
                                 │ HTTPS
                        ┌────────▼─────────┐
                        │   API Gateway    │  ← Spring Cloud Gateway
                        │  (Auth, Rate     │
                        │  Limit, Routing) │
                        └────────┬─────────┘
              ┌──────────────────┼──────────────────┐
              │                  │                  │
    ┌─────────▼──────┐  ┌────────▼───────┐  ┌──────▼──────────┐
    │  IAM Service   │  │  OMS Service   │  │ Inventory Svc   │
    └────────────────┘  └────────┬───────┘  └──────┬──────────┘
                                 │    Apache Kafka (Event Bus)
                        ┌────────▼──────────────────▼──────────┐
                        │         Event-Driven Backbone         │
                        │  order.created → inventory.reserve   │
                        │  payment.confirmed → order.confirmed  │
                        │  stock.low → procurement.trigger      │
                        └───────────────────────────────────────┘
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| Backend services | Spring Boot 3.x (Java 21) |
| API Gateway | Spring Cloud Gateway |
| Auth | Spring Security + JWT |
| Messaging | Apache Kafka |
| Primary DB | PostgreSQL 16 |
| Cache | Redis 7.2 |
| Search | Elasticsearch |
| Analytics DB | ClickHouse |
| Frontend | Angular 17 (Module Federation) |
| Infra | Kubernetes + Helm |
| CI/CD | GitHub Actions + ArgoCD |
| Observability | Prometheus + Grafana + Jaeger |
| Secret mgmt | HashiCorp Vault |

---

## Monorepo Structure

```
myRetail-ERP/
├── services/
│   ├── iam-service/
│   ├── inventory-service/
│   ├── order-service/
│   ├── finance-service/
│   ├── hr-service/
│   ├── pos-service/
│   ├── procurement-service/
│   ├── analytics-service/
│   ├── notification-service/
│   └── api-gateway/
├── frontend/
│   ├── shell-app/
│   ├── inventory-mfe/
│   ├── pos-mfe/
│   └── finance-mfe/
├── shared/
│   ├── event-contracts/
│   └── common-lib/
├── infra/
│   ├── helm/
│   ├── k8s/
│   ├── init-db.sql
│   └── docker-compose.yml
└── docs/
    └── adr/
```

---

## Phase Roadmap

| Phase | Scope | Status |
|---|---|---|
| **Phase 0** | Repo structure, Docker infra, Kafka, service scaffolding | ✅ Done |
| **Phase 1** | IAM Service — JWT auth, RBAC, Spring Security | 🔄 Next |
| **Phase 2** | Inventory Service — CRUD, optimistic locking, Kafka events | ⬜ |
| **Phase 3** | Order Service — Saga pattern, order lifecycle state machine | ⬜ |
| **Phase 4** | POS Service + Redis cart + Angular POS UI | ⬜ |
| **Phase 5** | Finance Service — ledger, double-entry bookkeeping | ⬜ |
| **Phase 6** | Procurement — PO lifecycle, vendor management | ⬜ |
| **Phase 7** | HR & Payroll — Spring Batch payroll jobs | ⬜ |
| **Phase 8** | Analytics — CQRS read side, ClickHouse | ⬜ |
| **Phase 9** | Infra — K8s, Helm, Prometheus, Jaeger, CI/CD, ArgoCD | ⬜ |

---

## Phase 0 — Scaffolding & Infrastructure ✅

### Step 1 — Service Scaffolding

Each service was bootstrapped using Spring Initializr via `curl`. Key lesson: use **correct dependency IDs**.

| Wrong ID | Correct ID |
|---|---|
| `gateway` | `cloud-gateway` |
| `eureka` | `cloud-eureka` |
| `config` | `cloud-config-server` |
| `feign` | `cloud-feign` |
| `zipkin` | `distributed-tracing` |

**Always verify file size before unzipping — a few hundred bytes means the server returned an error, not a zip.**

```bash
# iam-service
curl https://start.spring.io/starter.zip \
  -d dependencies=web,security,data-jpa,postgresql \
  -d groupId=com.myretailerp -d artifactId=iam-service \
  -d name=iam-service -d packageName=com.myretailerp.iam \
  -d javaVersion=21 -d type=maven-project \
  -o services/iam-service.zip

# inventory-service
curl https://start.spring.io/starter.zip \
  -d dependencies=web,data-jpa,postgresql,kafka \
  -d groupId=com.myretailerp -d artifactId=inventory-service \
  -d packageName=com.myretailerp.inventory \
  -d javaVersion=21 -d type=maven-project \
  -o services/inventory-service.zip

# order-service
curl https://start.spring.io/starter.zip \
  -d dependencies=web,data-jpa,postgresql,kafka \
  -d groupId=com.myretailerp -d artifactId=order-service \
  -d packageName=com.myretailerp.order \
  -d javaVersion=21 -d type=maven-project \
  -o services/order-service.zip

# finance-service
curl https://start.spring.io/starter.zip \
  -d dependencies=web,data-jpa,postgresql,kafka \
  -d groupId=com.myretailerp -d artifactId=finance-service \
  -d packageName=com.myretailerp.finance \
  -d javaVersion=21 -d type=maven-project \
  -o services/finance-service.zip

# hr-service
curl https://start.spring.io/starter.zip \
  -d dependencies=web,data-jpa,postgresql,kafka,batch \
  -d groupId=com.myretailerp -d artifactId=hr-service \
  -d packageName=com.myretailerp.hr \
  -d javaVersion=21 -d type=maven-project \
  -o services/hr-service.zip

# pos-service
curl https://start.spring.io/starter.zip \
  -d dependencies=web,data-jpa,postgresql,kafka,data-redis \
  -d groupId=com.myretailerp -d artifactId=pos-service \
  -d packageName=com.myretailerp.pos \
  -d javaVersion=21 -d type=maven-project \
  -o services/pos-service.zip

# procurement-service
curl https://start.spring.io/starter.zip \
  -d dependencies=web,data-jpa,postgresql,kafka \
  -d groupId=com.myretailerp -d artifactId=procurement-service \
  -d packageName=com.myretailerp.procurement \
  -d javaVersion=21 -d type=maven-project \
  -o services/procurement-service.zip

# analytics-service
curl https://start.spring.io/starter.zip \
  -d dependencies=web,data-jpa,postgresql,kafka \
  -d groupId=com.myretailerp -d artifactId=analytics-service \
  -d packageName=com.myretailerp.analytics \
  -d javaVersion=21 -d type=maven-project \
  -o services/analytics-service.zip

# notification-service
curl https://start.spring.io/starter.zip \
  -d dependencies=web,kafka,mail \
  -d groupId=com.myretailerp -d artifactId=notification-service \
  -d packageName=com.myretailerp.notification \
  -d javaVersion=21 -d type=maven-project \
  -o services/notification-service.zip

# api-gateway (note: cloud-gateway, NOT gateway)
curl https://start.spring.io/starter.zip \
  -d dependencies=cloud-gateway,security,oauth2-resource-server \
  -d groupId=com.myretailerp -d artifactId=api-gateway \
  -d packageName=com.myretailerp.gateway \
  -d javaVersion=21 -d type=maven-project \
  -o services/api-gateway.zip
```

Unzip all services:

```bash
for svc in iam inventory order finance hr pos procurement analytics notification; do
  mkdir -p services/${svc}-service
  unzip services/${svc}-service.zip -d services/${svc}-service
  rm services/${svc}-service.zip
done

mkdir -p services/api-gateway
unzip services/api-gateway.zip -d services/api-gateway
rm services/api-gateway.zip
```

---

### Step 2 — Docker Infrastructure

**`docker-compose.yml`** (at project root):

```yaml
services:

  zookeeper:
    image: confluentinc/cp-zookeeper:7.6.0
    container_name: zookeeper
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    ports:
      - "2181:2181"
    networks:
      - erp-network

  kafka:
    image: confluentinc/cp-kafka:7.6.0
    container_name: kafka
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092,PLAINTEXT_INTERNAL://kafka:29092
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_INTERNAL:PLAINTEXT
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT_INTERNAL
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
    networks:
      - erp-network

  kafka-ui:
    image: provectuslabs/kafka-ui:latest
    container_name: kafka-ui
    depends_on:
      - kafka
    ports:
      - "8090:8080"
    environment:
      KAFKA_CLUSTERS_0_NAME: local
      KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS: kafka:29092
    networks:
      - erp-network

  redis:
    image: redis:7.2-alpine
    container_name: redis
    ports:
      - "6379:6379"
    networks:
      - erp-network

  postgres:
    image: postgres:16-alpine
    container_name: postgres
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: erpadmin
      POSTGRES_PASSWORD: erpadmin123
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./infra/init-db.sql:/docker-entrypoint-initdb.d/init-db.sql
    networks:
      - erp-network

networks:
  erp-network:
    driver: bridge

volumes:
  postgres-data:
```

**`infra/init-db.sql`** — one database per service:

```sql
CREATE DATABASE iam_db;
CREATE DATABASE inventory_db;
CREATE DATABASE order_db;
CREATE DATABASE finance_db;
CREATE DATABASE hr_db;
CREATE DATABASE pos_db;
CREATE DATABASE procurement_db;
CREATE DATABASE analytics_db;
CREATE DATABASE notification_db;
```

Start the infrastructure:

```bash
docker-compose up -d
docker-compose ps
```

### Infrastructure Ports

| Service | Port | URL |
|---|---|---|
| PostgreSQL | 5432 | `jdbc:postgresql://localhost:5432/<db>` |
| Kafka | 9092 | `localhost:9092` |
| Kafka UI | 8090 | http://localhost:8090 |
| Redis | 6379 | `localhost:6379` |
| Zookeeper | 2181 | `localhost:2181` |

---

## Key Principal Engineer Lessons So Far

1. **Domain first, code second** — Bounded contexts were defined before any service was created.
2. **One database per service** — Non-negotiable. Shared DB = coupled services = microservices in name only.
3. **Verify before unzip** — A ~15KB+ zip is valid. A few hundred bytes means the server returned an error.
4. **Correct dependency IDs matter** — `gateway` ≠ `cloud-gateway`. Always verify at https://start.spring.io.
5. **Infrastructure as code from day one** — `docker-compose.yml` checked into the repo, not manually set up.
6. **Write ADRs** — Document every architecture decision. Future-you will thank present-you.

---

## Up Next — Phase 1: IAM Service

Build the authentication foundation that every other service depends on:

- `User` entity with roles: `ADMIN`, `STORE_MANAGER`, `CASHIER`, `FINANCE`, `HR`
- JWT generation on login
- Spring Security filter chain
- RBAC — role-based endpoint protection
- `POST /auth/register` and `POST /auth/login` endpoints


# Misc
## Connect to any other service database
 - winpty docker exec -it postgres psql -U erpadmin -d inventory_db
 - winpty docker exec -it postgres psql -U erpadmin -d order_db
 - winpty docker exec -it postgres psql -U erpadmin -d pos_db
 - winpty docker exec -it postgres psql -U erpadmin -d finance_db

## Run a single query without entering interactive mode
winpty docker exec -it postgres psql -U erpadmin -d finance_db \
-c "SELECT account_code, account_name, current_balance FROM ledger_accounts ORDER BY account_code;"

## List all databases
winpty docker exec -it postgres psql -U erpadmin -d postgres -c "\l"