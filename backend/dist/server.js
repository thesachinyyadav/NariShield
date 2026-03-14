import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { z } from "zod";
import { InMemoryRepository } from "./repository.js";
const app = express();
const server = createServer(app);
const webSocketServer = new WebSocketServer({ server, path: "/ws" });
const repo = new InMemoryRepository();
app.use(cors());
app.use(express.json());
const triggerSchema = z.object({
    deviceId: z.string().min(3),
    eventType: z.literal("long_press"),
    timestamp: z.string(),
    batteryLevel: z.number().min(0).max(100),
    gps: z.object({
        lat: z.number(),
        lon: z.number()
    }),
    signature: z.string().min(8)
});
const statusSchema = z.object({
    status: z.enum(["triggered", "acknowledged", "dispatched", "closed"]),
    actor: z.string().min(2).optional()
});
const heartbeatSchema = z.object({
    deviceId: z.string().min(3),
    timestamp: z.string(),
    batteryLevel: z.number().min(0).max(100),
    isOnline: z.boolean(),
    gps: z
        .object({
        lat: z.number(),
        lon: z.number()
    })
        .optional()
});
app.get("/health", (_req, res) => {
    res.json({ service: "narishield-backend", status: "ok" });
});
app.post("/api/incidents/trigger", (req, res) => {
    const parsed = triggerSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }
    const incident = repo.createIncident(parsed.data);
    broadcast({ type: "incident.created", payload: incident });
    return res.status(201).json(incident);
});
app.get("/api/incidents", (_req, res) => {
    res.json(repo.listIncidents());
});
app.get("/api/incidents/:incidentId", (req, res) => {
    const incident = repo.getIncident(req.params.incidentId);
    if (!incident) {
        return res.status(404).json({ error: "Incident not found" });
    }
    return res.json(incident);
});
app.patch("/api/incidents/:incidentId/status", (req, res) => {
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }
    const updated = repo.updateIncidentStatus(req.params.incidentId, parsed.data.status, parsed.data.actor ?? "operator");
    if (!updated) {
        return res.status(404).json({ error: "Incident not found" });
    }
    broadcast({ type: "incident.updated", payload: updated });
    return res.json(updated);
});
app.post("/api/devices/heartbeat", (req, res) => {
    const parsed = heartbeatSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }
    const heartbeat = repo.upsertHeartbeat(parsed.data);
    broadcast({ type: "device.heartbeat", payload: heartbeat });
    return res.status(201).json(heartbeat);
});
app.get("/api/devices/status", (_req, res) => {
    res.json(repo.listHeartbeats());
});
app.get("/api/audit-logs", (_req, res) => {
    res.json(repo.listAuditLogs());
});
webSocketServer.on("connection", (socket) => {
    socket.send(JSON.stringify({
        type: "bootstrap",
        payload: { incidents: repo.listIncidents(), devices: repo.listHeartbeats() }
    }));
});
function broadcast(event) {
    const data = JSON.stringify(event);
    for (const client of webSocketServer.clients) {
        if (client.readyState === client.OPEN) {
            client.send(data);
        }
    }
}
const port = Number(process.env.PORT ?? 4000);
server.listen(port, () => {
    console.log(`NariShield backend listening on http://localhost:${port}`);
});
