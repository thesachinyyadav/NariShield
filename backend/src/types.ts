export type IncidentStatus = "triggered" | "acknowledged" | "dispatched" | "closed";

export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface TriggerPayload {
  deviceId: string;
  eventType: "long_press";
  timestamp: string;
  batteryLevel: number;
  gps: GeoPoint;
  signature: string;
}

export interface Incident {
  id: string;
  status: IncidentStatus;
  createdAt: string;
  updatedAt: string;
  deviceId: string;
  latestGps: GeoPoint;
  batteryLevel: number;
  eventType: string;
}

export interface DeviceHeartbeat {
  deviceId: string;
  timestamp: string;
  batteryLevel: number;
  isOnline: boolean;
  gps?: GeoPoint;
}

export interface AuditLog {
  id: string;
  action: string;
  actor: string;
  incidentId?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}
