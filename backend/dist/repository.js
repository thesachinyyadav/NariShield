import { v4 as uuid } from "uuid";
export class InMemoryRepository {
    incidents = new Map();
    heartbeats = new Map();
    audits = [];
    createIncident(payload) {
        const now = new Date().toISOString();
        const incident = {
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
    listIncidents() {
        return Array.from(this.incidents.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    getIncident(id) {
        return this.incidents.get(id);
    }
    updateIncidentStatus(id, status, actor = "operator") {
        const incident = this.incidents.get(id);
        if (!incident) {
            return undefined;
        }
        const updated = {
            ...incident,
            status,
            updatedAt: new Date().toISOString()
        };
        this.incidents.set(id, updated);
        this.addAudit(`incident.${status}`, actor, id);
        return updated;
    }
    upsertHeartbeat(heartbeat) {
        this.heartbeats.set(heartbeat.deviceId, heartbeat);
        this.addAudit("device.heartbeat", "device", undefined, {
            deviceId: heartbeat.deviceId,
            batteryLevel: heartbeat.batteryLevel,
            isOnline: heartbeat.isOnline
        });
        return heartbeat;
    }
    listHeartbeats() {
        return Array.from(this.heartbeats.values()).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    }
    listAuditLogs() {
        return [...this.audits].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    addAudit(action, actor, incidentId, metadata) {
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
