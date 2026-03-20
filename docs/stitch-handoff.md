# Stitch Handoff for NariShield UI/UX

Use this brief in Stitch to generate production-style interfaces aligned with current APIs.

## Product

NariShield is a campus incident command platform for women-safety response teams.

## Personas

- Security Operator: triage and respond quickly
- University Admin: monitor operational trends and compliance
- End User (mobile): trigger SOS and track incident status

## Web Screens to Generate

1. Command Dashboard
- KPI cards: total incidents, active incidents, online devices
- Live incident queue with status chips
- Quick actions: acknowledge, dispatch, close

2. Incident Detail
- Incident timeline with timestamps
- Device information and battery
- Location section (map placeholder + coordinates)
- Audit activity panel

3. Device Health
- Device table with online/offline state
- Last heartbeat and battery status
- Offline alert indicator

4. Audit Logs
- Filter by actor/action/date
- Incident-linked log view
- Export action placeholder

## Mobile Screens to Generate

1. Home / Safety status
2. Trigger SOS confirmation flow
3. Active incident status and updates
4. Incident history list
5. Trusted contacts management

## Design Rules

- Clean, low cognitive load layouts
- High-contrast status indicators for emergency context
- Mobile-first readability and large touch targets
- Minimal motion; prioritize clarity and urgency

## Current Backend APIs

- `GET /health`
- `POST /api/incidents/trigger`
- `GET /api/incidents`
- `GET /api/incidents/:incidentId`
- `PATCH /api/incidents/:incidentId/status`
- `POST /api/devices/heartbeat`
- `GET /api/devices/status`
- `GET /api/audit-logs`
- `WS /ws` (events: `bootstrap`, `incident.created`, `incident.updated`, `device.heartbeat`)

## Data Contracts for UI

Incident object:
- `id`
- `status` (`triggered | acknowledged | dispatched | closed`)
- `createdAt`
- `updatedAt`
- `deviceId`
- `batteryLevel`
- `latestGps.lat`
- `latestGps.lon`
- `eventType`

Device status object:
- `deviceId`
- `timestamp`
- `batteryLevel`
- `isOnline`

Audit log object:
- `id`
- `action`
- `actor`
- `incidentId`
- `createdAt`

## Output Expected from Stitch

- Component hierarchy and states
- Layout specs for desktop/tablet/mobile
- UX copy for emergency-state actions
- Hand-off ready React component structure suggestions
