# Kafka — Enterprise Setup, Configuration, Patterns & Troubleshooting Guide

---

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [Setup & Installation](#setup--installation)
3. [Spring Boot Configuration](#spring-boot-configuration)
4. [Messaging Patterns](#messaging-patterns)
5. [Producer Best Practices](#producer-best-practices)
6. [Consumer Best Practices](#consumer-best-practices)
7. [Error Handling & Dead Letter Queues](#error-handling--dead-letter-queues)
8. [Serialization](#serialization)
9. [Security](#security)
10. [Monitoring & Observability](#monitoring--observability)
11. [Troubleshooting](#troubleshooting)
12. [myRetail ERP Patterns](#myretail-erp-patterns)

---

## Core Concepts

### The Mental Model

```
Kafka is a distributed commit log — not a queue.

Traditional Queue:              Kafka:
Message produced →              Message produced →
  stored in queue →               stored in topic/partition →
    consumed once →                 consumed by MANY consumer groups →
      message deleted               message retained for N days
                                    offset tracked per group
```

### Key Terms

| Term | Definition |
|---|---|
| **Topic** | A named category for messages (like a DB table) |
| **Partition** | A topic is split into N partitions for parallelism |
| **Offset** | Sequential position of a message within a partition |
| **Consumer Group** | A group of consumers sharing work across partitions |
| **Broker** | A single Kafka server node |
| **Replication Factor** | How many broker copies of each partition exist |
| **ISR** | In-Sync Replicas — brokers that are caught up with the leader |
| **Leader** | The primary partition replica that handles reads/writes |

### Partitions and Parallelism

```
Topic: order.created (3 partitions)

Partition 0: [msg1, msg4, msg7...]
Partition 1: [msg2, msg5, msg8...]
Partition 2: [msg3, msg6, msg9...]

Consumer Group A (3 consumers):
  Consumer A1 → reads Partition 0
  Consumer A2 → reads Partition 1
  Consumer A3 → reads Partition 2

Consumer Group B (1 consumer):
  Consumer B1 → reads ALL 3 partitions

Rule: max parallelism = number of partitions
      consumers > partitions = idle consumers
```

---

## Setup & Installation

### Docker Compose (Development)

```yaml
version: '3.8'
services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.6.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    ports:
      - "2181:2181"

  kafka:
    image: confluentinc/cp-kafka:7.6.0
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: false     # never auto-create in prod
      KAFKA_LOG_RETENTION_HOURS: 168             # 7 days
      KAFKA_LOG_SEGMENT_BYTES: 1073741824        # 1GB segments

  kafka-ui:
    image: provectuslabs/kafka-ui:latest
    depends_on:
      - kafka
    ports:
      - "8090:8080"
    environment:
      KAFKA_CLUSTERS_0_NAME: local
      KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS: kafka:9092
```

### Production Cluster (3-broker minimum)

```yaml
# broker-1
KAFKA_BROKER_ID: 1
KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 3
KAFKA_DEFAULT_REPLICATION_FACTOR: 3
KAFKA_MIN_INSYNC_REPLICAS: 2
KAFKA_UNCLEAN_LEADER_ELECTION_ENABLE: false   # never elect out-of-sync leader

# Same for broker-2 (BROKER_ID: 2) and broker-3 (BROKER_ID: 3)
```

### Topic Creation (Manual — Never Auto-Create in Production)

```bash
# Create topic with explicit settings
kafka-topics.sh --create \
  --bootstrap-server localhost:9092 \
  --topic order.created \
  --partitions 6 \
  --replication-factor 3 \
  --config retention.ms=604800000 \   # 7 days
  --config min.insync.replicas=2

# List all topics
kafka-topics.sh --list --bootstrap-server localhost:9092

# Describe a topic
kafka-topics.sh --describe \
  --topic order.created \
  --bootstrap-server localhost:9092

# Delete a topic
kafka-topics.sh --delete \
  --topic order.created \
  --bootstrap-server localhost:9092
```

---

## Spring Boot Configuration

### pom.xml

```xml
<dependency>
    <groupId>org.springframework.kafka</groupId>
    <artifactId>spring-kafka</artifactId>
</dependency>
```

### application.yml

```yaml
spring:
  kafka:
    bootstrap-servers: localhost:9092
    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.apache.kafka.common.serialization.ByteArraySerializer
      acks: all                    # wait for all replicas to acknowledge
      retries: 3
      properties:
        enable.idempotence: true   # exactly-once producer semantics
        max.in.flight.requests.per.connection: 5
    consumer:
      group-id: order-service
      auto-offset-reset: latest    # only read new messages (not earliest)
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.apache.kafka.common.serialization.ByteArrayDeserializer
      enable-auto-commit: false    # always manage offsets manually
```

### KafkaConfig.java (Spring Boot 4.x / Spring Kafka 4.x)

```java
// Spring Kafka 4.x removed JsonSerializer — use ByteArray + manual Jackson
@Configuration
public class KafkaConfig {

    @Value("${spring.kafka.bootstrap-servers}")
    private String bootstrapServers;

    // ─── PRODUCER ────────────────────────────────────────────────
    @Bean
    public ProducerFactory<String, byte[]> producerFactory() {
        Map<String, Object> config = new HashMap<>();
        config.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        config.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        config.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, ByteArraySerializer.class);
        config.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
        config.put(ProducerConfig.ACKS_CONFIG, "all");
        config.put(ProducerConfig.RETRIES_CONFIG, 3);
        return new DefaultKafkaProducerFactory<>(config);
    }

    @Bean
    public KafkaTemplate<String, byte[]> kafkaTemplate() {
        return new KafkaTemplate<>(producerFactory());
    }

    // ─── CONSUMER ────────────────────────────────────────────────
    @Bean
    public ConsumerFactory<String, byte[]> consumerFactory() {
        Map<String, Object> config = new HashMap<>();
        config.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        config.put(ConsumerConfig.GROUP_ID_CONFIG, "order-service");
        config.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "latest");
        config.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        config.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, ByteArrayDeserializer.class);
        config.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);
        return new DefaultKafkaConsumerFactory<>(config);
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, byte[]>
    kafkaListenerContainerFactory() {
        ConcurrentKafkaListenerContainerFactory<String, byte[]> factory =
            new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(consumerFactory());
        factory.getContainerProperties()
            .setAckMode(ContainerProperties.AckMode.RECORD); // commit after each message
        return factory;
    }
}
```

### EventPublisher Pattern

```java
@Component
@RequiredArgsConstructor
@Slf4j
public class OrderEventPublisher {

    private final KafkaTemplate<String, byte[]> kafkaTemplate;
    private final ObjectMapper objectMapper;

    public void publishOrderCreated(Order order) {
        OrderCreatedEvent event = new OrderCreatedEvent(
            "ORDER_CREATED",
            order.getId(),
            order.getCustomerId(),
            order.getItems().stream().map(OrderItemEvent::from).toList(),
            LocalDateTime.now()
        );
        send("order.created", order.getId().toString(), event);
    }

    private void send(String topic, String key, Object payload) {
        try {
            byte[] bytes = objectMapper.writeValueAsBytes(payload);
            kafkaTemplate.send(topic, key, bytes)
                .whenComplete((result, ex) -> {
                    if (ex != null) {
                        log.error("Failed to publish to {}: {}", topic, ex.getMessage());
                    } else {
                        log.info("Published {} partition={} offset={}",
                            topic,
                            result.getRecordMetadata().partition(),
                            result.getRecordMetadata().offset());
                    }
                });
        } catch (JsonProcessingException e) {
            log.error("Serialization error for topic {}: {}", topic, e.getMessage());
            throw new RuntimeException("Event serialization failed", e);
        }
    }
}
```

### Consumer Pattern

```java
@Component
@RequiredArgsConstructor
@Slf4j
@EnableKafka   // ← required on @SpringBootApplication or @Configuration
public class OrderEventConsumer {

    private final ObjectMapper objectMapper;
    private final InventoryService inventoryService;

    @KafkaListener(
        topics = "order.created",
        groupId = "inventory-service",
        containerFactory = "kafkaListenerContainerFactory"
    )
    public void onOrderCreated(byte[] payload) {
        try {
            OrderCreatedEvent event = objectMapper.readValue(
                payload, OrderCreatedEvent.class);
            log.info("Consuming order.created for orderId: {}", event.orderId());
            inventoryService.reserveStock(event);
        } catch (Exception e) {
            log.error("Failed to process order.created: {}", e.getMessage());
            // Let it retry or go to DLQ depending on error type
            throw new RuntimeException("Consumer processing failed", e);
        }
    }
}
```

---

## Messaging Patterns

### 1. Event Notification (Fire and Forget)

```
Producer emits an event to notify that something happened.
Consumers react independently.
No response expected.

Use for: audit logs, analytics, notifications

order.confirmed → Finance (create invoice)
             → Analytics (update dashboards)
             → Loyalty (award points)
             → Notification (send email)
```

### 2. Event-Carried State Transfer

```
The event carries ALL the data consumers need.
Consumers don't need to call back to the producer.

// BAD — thin event, consumer must call back
{ "eventType": "ORDER_CREATED", "orderId": "uuid" }
// Consumer must: GET /orders/uuid → adds coupling

// GOOD — fat event, self-contained
{
  "eventType": "ORDER_CREATED",
  "orderId": "uuid",
  "customerId": "email",
  "items": [{ "productId", "sku", "qty", "price" }],
  "totalAmount": 89.97
}
// Consumer has everything it needs
```

### 3. Choreography-Based Saga (What We Built)

```
No central coordinator — services react to each other's events.

Order Service          Inventory Service
     │                       │
     POST /orders             │
     │                       │
     Order(PENDING) ──────────────────► order.created
                              │
                    reserveStock()
                              │
                    inventory.stock.reserved ◄──────
                              │
     Order(CONFIRMED) ◄───────────────────────────
                              │
     order.confirmed ─────────────────────────────►
                              │
                    confirmReservation()

Compensating transaction on failure:
     inventory.reservation.failed ◄──────────────
     │
     Order(CANCELLED) ──────────────────────────►
                              │
                    releaseReservation()
```

### 4. CQRS (Command Query Responsibility Segregation)

```
Write side (commands):
  POST /orders → order-service (writes to order_db)
              → emits order.created

Read side (queries):
  Kafka consumer updates read-optimized view in analytics_db
  GET /analytics/orders → reads from analytics_db (fast, denormalized)

Commands and queries use different data stores optimized for each.
```

### 5. Outbox Pattern (Transactional Messaging)

```
Problem:
  @Transactional {
      save(order);         // DB commit ✅
      kafkaTemplate.send() // Kafka publish ❌ (crash here = lost event)
  }

Solution — Outbox table:
  @Transactional {
      save(order);                   // DB commit
      save(outboxEvent);             // Same DB transaction
  }
  // Separate process reads outbox → publishes to Kafka → marks sent

Guarantees: at-least-once delivery (never lose events)
```

```sql
-- Outbox table
CREATE TABLE outbox_events (
    id UUID PRIMARY KEY,
    aggregate_type VARCHAR NOT NULL,  -- 'ORDER'
    aggregate_id UUID NOT NULL,
    event_type VARCHAR NOT NULL,      -- 'ORDER_CREATED'
    payload JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL,
    sent_at TIMESTAMP,                -- null = not yet sent
    retry_count INT DEFAULT 0
);
```

---

## Producer Best Practices

### Message Keys (Ordering Guarantee)

```java
// Use the entity ID as the key
// All messages with the same key go to the same partition
// Ordering guaranteed within a partition

kafkaTemplate.send("order.events", order.getId().toString(), payload);
//                                  ↑ key = orderId

// All order events for order-123 → same partition → ordered
// ORDER_CREATED → ORDER_CONFIRMED → ORDER_SHIPPED (in order)
```

### Idempotent Producer

```java
// Prevents duplicate messages on retry
config.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
config.put(ProducerConfig.ACKS_CONFIG, "all");
config.put(ProducerConfig.MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION, 5);
```

### Async vs Sync Send

```java
// Async (fire and forget with callback) — preferred for high throughput
kafkaTemplate.send(topic, key, payload)
    .whenComplete((result, ex) -> {
        if (ex != null) log.error("Send failed", ex);
        else log.info("Sent offset={}", result.getRecordMetadata().offset());
    });

// Sync (wait for acknowledgment) — use for critical events only
try {
    SendResult<String, byte[]> result =
        kafkaTemplate.send(topic, key, payload).get(5, TimeUnit.SECONDS);
    log.info("Sent offset={}", result.getRecordMetadata().offset());
} catch (TimeoutException e) {
    log.error("Kafka send timed out");
}
```

---

## Consumer Best Practices

### auto-offset-reset

```yaml
auto-offset-reset: earliest   # replay ALL historical messages on first connect
                               # Use for: new consumers that need full history

auto-offset-reset: latest     # only consume NEW messages from now
                               # Use for: services that have already processed history
```

### Concurrency

```java
// Process multiple partitions in parallel
@KafkaListener(
    topics = "order.created",
    groupId = "inventory-service",
    concurrency = "3"  // 3 threads = handles 3 partitions in parallel
)
public void onOrderCreated(byte[] payload) { ... }
```

### Idempotent Consumer

```java
// Always make consumers idempotent — Kafka delivers at-least-once
// The same message CAN arrive twice (on retry, rebalance, etc.)

@Transactional
public void reserveStock(OrderCreatedEvent event) {
    // Check if already processed
    if (stockReservationRepository.existsByOrderId(event.orderId())) {
        log.warn("Duplicate event ignored for order: {}", event.orderId());
        return;  // idempotent — safe to skip
    }
    // ... process
}
```

---

## Error Handling & Dead Letter Queues

### Retry + DLQ Pattern

```java
@Bean
public ConcurrentKafkaListenerContainerFactory<String, byte[]>
kafkaListenerContainerFactory() {
    ConcurrentKafkaListenerContainerFactory<String, byte[]> factory =
        new ConcurrentKafkaListenerContainerFactory<>();
    factory.setConsumerFactory(consumerFactory());

    // Retry 3 times with backoff, then send to DLQ
    DefaultErrorHandler errorHandler = new DefaultErrorHandler(
        new DeadLetterPublishingRecoverer(kafkaTemplate(),
            (record, ex) -> new TopicPartition(
                record.topic() + ".dlq",  // order.created.dlq
                record.partition()
            )
        ),
        new FixedBackOff(1000L, 3L)  // 1s delay, 3 attempts
    );

    // Don't retry validation errors — send directly to DLQ
    errorHandler.addNotRetryableExceptions(
        JsonProcessingException.class,
        IllegalArgumentException.class
    );

    factory.setCommonErrorHandler(errorHandler);
    return factory;
}
```

### DLQ Consumer (Alert + Manual Review)

```java
@KafkaListener(topics = "order.created.dlq", groupId = "dlq-monitor")
public void onDeadLetter(byte[] payload,
                          @Header(KafkaHeaders.EXCEPTION_MESSAGE) String error) {
    log.error("DLQ message received. Error: {}", error);
    alertService.sendAlert("Dead letter in order.created: " + error);
    // Store for manual review
    dlqRepository.save(new DlqRecord(payload, error, LocalDateTime.now()));
}
```

---

## Serialization

### Why ByteArray + Jackson (Not JsonSerializer)

```
Spring Kafka 4.x deprecated JsonSerializer.
The correct approach is manual serialization:

Producer: Object → ObjectMapper.writeValueAsBytes() → byte[]
Consumer: byte[] → ObjectMapper.readValue() → Object

This gives you:
✅ Full control over serialization
✅ No dependency on Kafka-specific serializers
✅ Works with Java records
✅ Compatible with any consumer (language agnostic)
```

### Event Record Design

```java
// Events are records — immutable, self-describing
public record OrderCreatedEvent(
    String eventType,          // always include for DLQ debugging
    UUID orderId,
    String customerId,
    List<OrderItemEvent> items,
    BigDecimal totalAmount,
    LocalDateTime timestamp    // always include for audit
) {}

// Register JavaTimeModule for LocalDateTime serialization
@Bean
public ObjectMapper objectMapper() {
    ObjectMapper mapper = new ObjectMapper();
    mapper.registerModule(new JavaTimeModule());
    mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    return mapper;
}
```

---

## Security

### SASL/SCRAM Authentication (Production)

```yaml
spring:
  kafka:
    bootstrap-servers: kafka-broker:9092
    properties:
      security.protocol: SASL_SSL
      sasl.mechanism: SCRAM-SHA-512
      sasl.jaas.config: >
        org.apache.kafka.common.security.scram.ScramLoginModule required
        username="order-service"
        password="${KAFKA_PASSWORD}";
      ssl.truststore.location: /certs/kafka.truststore.jks
      ssl.truststore.password: ${TRUSTSTORE_PASSWORD}
```

### ACLs (Access Control)

```bash
# Grant order-service write access to order.* topics only
kafka-acls.sh --add \
  --allow-principal User:order-service \
  --operation Write \
  --topic 'order.*' \
  --bootstrap-server localhost:9092

# Grant inventory-service read access to order.* topics
kafka-acls.sh --add \
  --allow-principal User:inventory-service \
  --operation Read \
  --group inventory-service \
  --topic 'order.*' \
  --bootstrap-server localhost:9092
```

---

## Monitoring & Observability

### Key Metrics to Monitor

| Metric | Alert Threshold | Meaning |
|---|---|---|
| `kafka.consumer.lag` | > 1000 | Consumer falling behind |
| `kafka.producer.record-error-rate` | > 0 | Messages failing to send |
| `kafka.network.io.wait-time-ns-avg` | High | Broker overloaded |
| `kafka.log.log-size` | > 80% disk | Disk pressure |
| `kafka.replica.under-replicated-partitions` | > 0 | Replication lag |

### Consumer Lag Check

```bash
# Check consumer group lag
kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --group inventory-service \
  --describe

# Output:
# GROUP           TOPIC           PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG
# inventory-svc   order.created   0          100             150             50  ← 50 messages behind
```

### Kafka UI (http://localhost:8090)

Topics panel shows:
- Message count per topic
- Consumer group lag
- Partition distribution
- Message content (for debugging)

---

## Troubleshooting

### LEADER_NOT_AVAILABLE (Harmless Warning)

```
WARN: The metadata response reported LEADER_NOT_AVAILABLE for topic X

Cause:  New topic being created — leader election in progress
Fix:    Not needed — Kafka retries automatically
        Disappears within 1-2 seconds
```

### Consumer Not Receiving Messages

```
Checklist:
1. Is @EnableKafka present on @Configuration class?
2. Is auto-offset-reset: earliest needed for replaying history?
3. Does the consumer group match exactly?
4. Check consumer lag: kafka-consumer-groups.sh --describe
5. Check for exceptions in the listener being silently swallowed
```

### Messages Being Replayed on Restart

```
Cause:  auto-offset-reset: earliest replays all messages when service restarts
Fix:    Change to auto-offset-reset: latest

Cause:  Consumer crashed before committing offset
Fix:    enable-auto-commit: false + AckMode.RECORD (commit after each message)
```

### Deserialization Failure (Poison Pill)

```
A malformed message blocks the entire partition — no messages processed.

Fix: Add error handler that skips and sends to DLQ:
errorHandler.addNotRetryableExceptions(JsonProcessingException.class)

This skips the bad message and continues processing.
```

### Offset Out of Range

```
Error: OffsetOutOfRangeException

Cause:  Consumer's last committed offset was deleted (log retention)
Fix:    Set auto-offset-reset: latest to resume from newest message
        Or reset the consumer group: kafka-consumer-groups.sh --reset-offsets
```

---

## myRetail ERP Patterns

### Topic Naming Convention

```
{service}.{entity}.{event}

inventory.product.created
inventory.stock.updated
inventory.stock.reserved
inventory.reservation.failed
order.created
order.confirmed
order.cancelled
order.finance.confirmed
pos.sale.completed
pos.sale.voided
```

### Event Flow Summary

```
Online Order Flow:
  POST /orders
  → order.created → inventory reserves → inventory.stock.reserved
  → order.confirmed → inventory confirms → stock deducted
  → order.finance.confirmed → finance creates invoice

POS Sale Flow:
  POST /pos/checkout
  → ACID transaction (sale + items + receipt saved)
  → pos.sale.completed → finance journal entry
                       → analytics update
                       → loyalty points
                       → inventory threshold check
```

### Standard Event Record Template

```java
public record YourEvent(
    String eventType,      // "ORDER_CREATED" — for debugging and DLQ
    UUID aggregateId,      // the main entity ID
    // ... domain fields ...
    LocalDateTime timestamp // always include
) {}
```

### @EnableKafka Placement

```java
// Required for @KafkaListener to work
// Place on main application class:
@SpringBootApplication
@EnableKafka
@ComponentScan({"com.myretailerp.yourservice", "com.myretailerp.common"})
public class YourServiceApplication { ... }
```
