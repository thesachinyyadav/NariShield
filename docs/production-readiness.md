# Production Readiness Plan (Current Phase)

This document captures how NariShield should run in a production-like environment today, while keeping IoT hardware integration ready for later.

## Core Use Cases Covered

1. Emergency trigger ingestion and incident creation
2. Incident lifecycle orchestration (`triggered -> acknowledged -> dispatched -> closed`)
3. Live command dashboard operations through websocket updates
4. Device telemetry heartbeat visibility
5. Audit visibility for operational review

## Backend Hardening Completed

- Typed environment config with safe defaults in `backend/src/config.ts`
- Unified request-body validation via Zod helper in `backend/src/validation.ts`
- Standardized API error shape via `backend/src/errors.ts`
- Request-level structured logs in `backend/src/logger.ts`
- Graceful shutdown for server/websocket/db/iot adapter in `backend/src/server.ts`
- Lifecycle transition guardrails for incident status updates
- Connection-pool tuning for PostgreSQL in `backend/src/db.ts`

## IoT Integration Strategy (No Hardware Yet)

Current mode is intentionally **placeholder**:

- IoT adapter interface exists in `backend/src/iot/adapter.ts`
- No-op provider is wired through `backend/src/iot/index.ts`
- Endpoint `GET /api/iot/status` exposes readiness state

This means application flows are stable now, and a real provider can be swapped in later without changing API routes.

## When Hardware Arrives

1. Implement real adapter (`AwsIotCoreAdapter` or `MqttAdapter`) behind `IoTAdapter` interface.
2. Add message signing verification policy for incoming triggers.
3. Add device certificate lifecycle and registry sync.
4. Enable `ENABLE_IOT_ADAPTER=true` with provider config.
5. Run integration test matrix with real devices + simulator fallback.

## Recommended Next Production Tasks

1. Add authentication and RBAC middleware for all API routes.
2. Add rate limiting for `/api/incidents/trigger` and `/api/devices/heartbeat`.
3. Add alerting/monitoring pipeline (latency, error-rate, heartbeat gaps).
4. Add automated backup and restore drill for PostgreSQL.
5. Add CI pipeline gates: lint, build, migration check, contract tests.
