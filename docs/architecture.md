# NariShield Architecture (MVP)

## Core components

1. Wearable trigger source (simulated for MVP)
2. Backend API (incident, telemetry, audit)
3. Web command dashboard
4. PostgreSQL schema (Supabase-ready)
5. Object storage target for evidence (MinIO locally / Supabase Storage later)

## Supabase now -> AWS later strategy

- Keep business rules in backend services.
- Use SQL migrations committed in repo.
- Abstract auth/storage providers in service layer.
- Persist outbox events for async portability.

## AWS mapping later

- Supabase Postgres -> AWS RDS Postgres
- Supabase Storage -> S3
- Supabase Auth -> Cognito
- Realtime/events -> API Gateway WebSocket + SQS/SNS
- Device telemetry -> AWS IoT Core
