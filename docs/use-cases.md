# NariShield Use Cases (Pilot)

## UC-1 Emergency trigger

1. User long-presses bracelet button for 2 seconds.
2. Device/app sends trigger payload to backend.
3. Backend creates incident and audit entry.
4. Dashboard receives live event via websocket.
5. Operator acknowledges and dispatches response.

## UC-2 Device telemetry monitoring

1. Bracelet sends heartbeat every interval.
2. Backend updates latest device status.
3. Dashboard shows online/offline and battery.

## UC-3 Evidence handling (next step)

1. Mobile app uploads evidence metadata + file.
2. Backend stores sha256 hash and storage key.
3. Access is role-gated and audit logged.
