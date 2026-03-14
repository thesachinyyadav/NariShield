# NariShield IIoT Notes

This folder captures the wearable protocol and simulator examples.

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
```
