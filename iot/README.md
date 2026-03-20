# NariShield IIoT Notes

This folder captures the wearable protocol and simulator examples.

## Current Integration Mode

Hardware integration is intentionally staged.

- Backend currently runs a placeholder IoT adapter (`noop`) to keep interfaces stable.
- Adapter contract is in `backend/src/iot/adapter.ts`.
- Runtime factory is in `backend/src/iot/index.ts`.
- Readiness endpoint: `GET /api/iot/status`.

This allows full product flow now while keeping hardware integration low-risk later.

## Trigger payload shape

```json
{
  "deviceId": "BR-1001",
  "eventType": "long_press",
  "timestamp": "2026-03-14T10:30:00.000Z",
  "batteryLevel": 83,
  "gps": { "lat": 12.9716, "lon": 77.5946 },
  "signature": "simulated-signature-001"
}
```

## Heartbeat payload shape

```json
{
  "deviceId": "BR-1001",
  "timestamp": "2026-03-14T10:31:00.000Z",
  "batteryLevel": 82,
  "isOnline": true,
  "gps": { "lat": 12.9716, "lon": 77.5946 }
}

## Future Hardware Activation

When devices are available:

1. Implement an adapter behind `IoTAdapter` (AWS IoT Core or MQTT).
2. Add certificate/device provisioning flow.
3. Enable adapter via backend env:

```bash
ENABLE_IOT_ADAPTER=true
IOT_PROVIDER=aws-iot-core
```
```
