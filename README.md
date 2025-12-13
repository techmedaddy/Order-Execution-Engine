# Order Execution Engine

## 1. Project Overview

This system is a backend-only asynchronous order execution engine designed to handle high-throughput trade requests with strict correctness guarantees. It solves the problem of reliably processing financial transactions in a distributed environment where network failures, race conditions, and duplicate requests are common.

The system ensures at-least-once message handling while enforcing exactly-once side effects through database-level idempotency and atomic state transitions. It is built to be deterministic, observable, and resilient to concurrent execution hazards.

## 2. High-Level Architecture

The system follows a unidirectional pipeline architecture designed for high throughput and fault isolation.

```mermaid
flowchart LR
  subgraph ClientLayer [Client Layer]
    Client[HTTP Client]
  end

  subgraph APILayer [API Layer]
    API[Fastify API]
  end

  subgraph PersistenceLayer [Persistence Layer]
    DB[(PostgreSQL)]
  end

  subgraph QueueLayer [Queue Layer]
    Q[Redis / BullMQ]
  end

  subgraph WorkerLayer [Worker Layer]
    W[Stateless Worker]
  end

  subgraph ExternalLayer [External Dependency]
    DEX[Mock DEX]
  end

  subgraph ObservabilityLayer [Observability Layer]
    WS[WebSocket Events]
  end

  Client -->|POST /execute| API
  API -->|1. Persist Order| DB
  API -->|2. Enqueue Job| Q
  Q -->|3. Process Job| W
  W -->|4. Atomic Claim| DB
  W -->|5. Execute Trade| DEX
  DEX -->|6. Result| W
  W -->|7. Update State| DB
  DB -.->|8. Emit Event| WS
  WS -.->|Stream Updates| Client
```

**Architectural Decisions:**
*   **Async Boundaries:** The API layer is decoupled from execution via the Redis queue. This ensures that slow DEX executions or worker failures do not impact API availability or latency.
*   **Database as Source of Truth:** All state changes (Creation, Claiming, Finalization) are persisted to PostgreSQL *before* any side effects occur. This guarantees data integrity even if a worker crashes mid-process.
*   **Stateless Workers:** Workers maintain no local state. Any worker can process any job, allowing for effortless horizontal scaling.

## 3. Core Design Principles

*   **Database as Source of Truth:** All state is persisted in PostgreSQL before any action is taken. In-memory state is treated as ephemeral.
*   **Idempotency by Design:** Duplicate requests are handled gracefully at the database level, preventing duplicate orders or double-spending.
*   **Stateless Workers:** Workers do not maintain local state between jobs, ensuring any worker can process any job.
*   **Explicit State Machines:** Order transitions are strictly defined and validated. Invalid transitions result in immediate rejection.
*   **Terminal State Safety:** Once an order reaches a terminal state (SUCCESS/FAILED), it is immutable.

## 4. Order Lifecycle & State Machine

The order lifecycle is governed by a strict directed acyclic graph (DAG), enforced via atomic database operations.

```mermaid
sequenceDiagram
  participant Client
  participant API
  participant DB as PostgreSQL
  participant Queue as Redis/BullMQ
  participant Worker
  participant DEX as Mock DEX
  participant WS as WebSocket

  Client->>API: POST /orders (Idempotency-Key)
  API->>DB: INSERT ... ON CONFLICT DO NOTHING
  alt Duplicate Request
    DB-->>API: Return Existing Order ID
    API-->>Client: 202 Accepted (Existing ID)
  else New Request
    DB-->>API: Return New Order ID
    API->>Queue: Add Job (QUEUED)
    API-->>Client: 202 Accepted (New ID)
  end

  Queue->>Worker: Deliver Job
  
  Note over Worker, DB: Atomic Claim (Concurrency Safety)
  Worker->>DB: UPDATE ... WHERE status='QUEUED'
  
  alt Claim Failed (Race Condition)
    DB-->>Worker: 0 rows updated
    Worker->>Worker: Exit Silently
  else Claim Success
    DB-->>Worker: 1 row updated (EXECUTING)
    
    alt Execution Success
      Worker->>DEX: Execute Trade
      DEX-->>Worker: Success Result
      Worker->>DB: UPDATE status='SUCCESS'
      DB-->>WS: Trigger Event
      WS-->>Client: { status: "SUCCESS" }
    else Execution Failure
      Worker->>DEX: Execute Trade
      DEX-->>Worker: Error / Timeout
      Worker->>DB: UPDATE status='FAILED'
      DB-->>WS: Trigger Event
      WS-->>Client: { status: "FAILED" }
    end
  end
```

**Key Mechanisms:**
*   **Atomic DB Claim:** The `UPDATE ... WHERE status='QUEUED'` query ensures that only one worker can ever execute a specific order, effectively eliminating race conditions.
*   **Terminal State Safety:** Once an order reaches `SUCCESS` or `FAILED`, the worker logic prevents any further processing or state changes.
*   **Observability:** WebSocket events are emitted only after the database transaction is committed, ensuring clients never receive updates for unpersisted states.

## 5. Idempotency Strategy

Idempotency is enforced to prevent duplicate order creation from retried client requests.

1.  **Client Responsibility:** Must provide a unique `Idempotency-Key` header.
2.  **Database Constraint:** The `orders` table has a `UNIQUE` constraint on the `idempotency_key` column.
3.  **Resolution Logic:**
    *   Request received.
    *   Attempt `INSERT ... ON CONFLICT DO NOTHING`.
    *   If conflict: Return existing order ID.
    *   If success: Return new order ID and enqueue job.

This guarantees that multiple API calls with the same key result in exactly one database record and one execution job.

## 6. Concurrency & Atomic Execution

To prevent race conditions where multiple workers might attempt to process the same order (e.g., due to queue visibility timeouts), execution ownership is claimed atomically.

**Atomic Claim Pattern:**
```sql
UPDATE orders
SET status = 'EXECUTING', updated_at = NOW()
WHERE id = $1 AND status = 'QUEUED'
RETURNING *;
```

*   If the query returns a row, the worker owns the order and proceeds.
*   If the query returns no rows, the worker assumes another process claimed it and exits silently.
This eliminates the "check-then-act" race condition common in distributed systems.

## 7. Failure Handling & Retry Boundaries

*   **Failure Detection:** Any exception thrown during the execution phase (DEX call, DB update) is caught by the worker.
*   **Terminal States:** Upon failure, the order is immediately transitioned to `FAILED`.
*   **Bounded Retries:** Retries are intentionally disabled (Max Attempts = 1). In a financial context, silent retries can be dangerous. Failures are terminal and require manual intervention or a new order request.
*   **Partial Failures:** Database updates and WebSocket events are synchronized to ensure clients never see a "ghost" state.

## 8. WebSocket Event Model

WebSockets provide real-time observability into the order lifecycle.

*   **Ordered Delivery:** Events are emitted immediately after state transitions.
*   **Payload Structure:**
    ```json
    {
      "orderId": "550e8400-e29b-41d4-a716-446655440000",
      "previousStatus": "QUEUED",
      "currentStatus": "EXECUTING",
      "timestamp": "2023-10-27T10:00:00.000Z"
    }
    ```
*   **Guarantees:** Terminal events (SUCCESS/FAILED) are emitted exactly once per order.

## 9. API Endpoints

### POST /api/orders/execute
Submits a new order for execution.
*   **Headers:** `Idempotency-Key` (Required, String)
*   **Body:** `{ "baseToken": "SOL", "quoteToken": "USDC", "amount": 100 }`
*   **Response:** `202 Accepted` `{ "orderId": "..." }`

### GET /api/orders/:id
Retrieves the current state of an order.
*   **Response:** `{ "orderId": "...", "status": "...", "payload": {...}, "createdAt": "..." }`

### GET /health
Operational health check.
*   **Response:** `200 OK` `{ "ok": true }`

## 10. Tech Stack

*   **Node.js + TypeScript:** Provides strong typing for domain logic and high concurrency for I/O-bound operations.
*   **Fastify:** Low-overhead web framework optimized for throughput.
*   **PostgreSQL:** Relational database chosen for ACID compliance and strict schema enforcement.
*   **Redis + BullMQ:** Robust message queue for asynchronous job processing with atomic job locking.
*   **WebSockets (ws):** Standard protocol for real-time event streaming.

## 11. Local Development Setup (WSL-friendly)

For Windows users, running inside WSL (Windows Subsystem for Linux) is required due to Redis persistence dependencies.

1.  **Prerequisites:**
    *   Node.js v18+
    *   PostgreSQL running locally
    *   Redis running locally

2.  **Installation:**
    ```bash
    npm install
    ```

3.  **Database Setup:**
    Ensure the database exists and apply the schema (idempotency constraint is critical).
    ```sql
    CREATE DATABASE order_engine;
    -- (Schema migration is handled via code/SQL provided in repository)
    ```

4.  **Configuration:**
    Create `.env`:
    ```env
    NODE_ENV=development
    PORT=7542
    DATABASE_URL=postgresql://user:pass@localhost:5432/order_engine
    REDIS_URL=redis://localhost:6379
    MOCK_DEX_FORCE_FAIL=false
    ```

5.  **Run:**
    ```bash
    npm run dev
    ```

## 12. Trade-offs & Future Improvements

*   **Authentication:** Omitted for scope. Production would require JWT/API Key authentication.
*   **Rate Limiting:** Not implemented. Essential for protecting the API from abuse.
*   **Dead Letter Queue (DLQ):** Failed jobs currently stay in the failed set. A DLQ would allow for inspection and manual replay.
*   **Metrics:** Prometheus/Grafana integration would be added for monitoring queue depth and execution latency.

## 13. Final Notes

This assignment demonstrates the implementation of a robust, concurrency-safe backend system. It prioritizes correctness over feature breadth, ensuring that financial primitives (orders) are handled with strict guarantees against double-execution and race conditions. The system assumes a reliable database and queue infrastructure to maintain data integrity.

