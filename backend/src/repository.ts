import { v4 as uuid } from "uuid";
import { AuditLog, DeviceHeartbeat, Incident, IncidentStatus, TriggerPayload } from "./types.js";

export class InMemoryRepository {
  private incidents = new Map<string, Incident>();
  private heartbeats = new Map<string, DeviceHeartbeat>();
  private audits: AuditLog[] = [];

  createIncident(payload: TriggerPayload): Incident {
    const now = new Date().toISOString();
    const incident: Incident = {
      id: uuid(),
      status: "triggered",
      createdAt: now,
      updatedAt: now,
      deviceId: payload.deviceId,
      latestGps: payload.gps,
      batteryLevel: payload.batteryLevel,
      eventType: payload.eventType
    };
    this.incidents.set(incident.id, incident);
    this.addAudit("incident.triggered", "device", incident.id, {
      signature: payload.signature,
      sourceTimestamp: payload.timestamp
    });
    return incident;
  }

  listIncidents(): Incident[] {
    return Array.from(this.incidents.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getIncident(id: string): Incident | undefined {
    return this.incidents.get(id);
  }

  updateIncidentStatus(id: string, status: IncidentStatus, actor = "operator"): Incident | undefined {
    const incident = this.incidents.get(id);
    if (!incident) {
      return undefined;
    }
    const updated: Incident = {
      ...incident,
      status,
      updatedAt: new Date().toISOString()
    };
    this.incidents.set(id, updated);
    this.addAudit(`incident.${status}`, actor, id);
    return updated;
  }

  upsertHeartbeat(heartbeat: DeviceHeartbeat): DeviceHeartbeat {
    this.heartbeats.set(heartbeat.deviceId, heartbeat);
    this.addAudit("device.heartbeat", "device", undefined, {
      deviceId: heartbeat.deviceId,
      batteryLevel: heartbeat.batteryLevel,
      isOnline: heartbeat.isOnline
    });
    return heartbeat;
  }

  listHeartbeats(): DeviceHeartbeat[] {
    return Array.from(this.heartbeats.values()).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  listAuditLogs(): AuditLog[] {
    return [...this.audits].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  private addAudit(action: string, actor: string, incidentId?: string, metadata?: Record<string, unknown>): void {
    this.audits.push({
      id: uuid(),
      action,
      actor,
      incidentId,
      metadata,
      createdAt: new Date().toISOString()
    });
  }
}
