# NariShield Mobile (Flutter)

This module contains the first Flutter MVP scaffold.

## Implemented

- Home screen with incident list
- Pull-to-refresh via app bar action
- Demo `Trigger SOS` action calling backend trigger endpoint
- Basic incident rendering (status, device, battery, GPS)

## Run

```bash
flutter pub get
flutter run
```

## Backend API dependency

- Base URL configured in `lib/screens/home_screen.dart`
- Current default: `http://localhost:4000`

If using Android emulator, replace with `http://10.0.2.2:4000`.

## Next mobile milestones

- Authentication and session handling
- Consent + onboarding screens
- Bracelet pairing flow (BLE)
- Evidence capture and upload workflow
- Trusted contacts and notifications
