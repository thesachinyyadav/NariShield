import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { WebSocketServer } from "ws";
import { z } from "zod";
import { pool } from "./db.js";
import { env } from "./config.js";
import { AppError, isAppError } from "./errors.js";
import { createIoTAdapter } from "./iot/index.js";
import { log } from "./logger.js";
import { PostgresRepository } from "./repository.js";
import type { IncidentStatus } from "./types.js";
import { parseBody } from "./validation.js";

const app = express();
const server = createServer(app);
const webSocketServer = new WebSocketServer({ server, path: "/ws" });
const repo = new PostgresRepository();
const iotAdapter = createIoTAdapter({
  enableIotAdapter: env.enableIotAdapter,
  iotProvider: env.iotProvider
});

const statusTransitions: Record<IncidentStatus, IncidentStatus[]> = {
  triggered: ["acknowledged"],
  acknowledged: ["dispatched"],
  dispatched: ["closed"],
  closed: []
};

app.use(
  cors({
    origin: env.corsOrigin === "*" ? true : env.corsOrigin.split(",").map((origin) => origin.trim())
  })
);
app.use(express.json({ limit: env.apiBodyLimit }));

app.use((req, res, next) => {
  const startedAt = Date.now();
  const requestId = req.header("x-request-id") ?? randomUUID();
  res.setHeader("x-request-id", requestId);

  res.on("finish", () => {
    log.info("request.completed", {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt
    });
  });

  next();
});

const triggerSchema = z.object({
  deviceId: z.string().min(3),
  eventType: z.literal("long_press"),
  timestamp: z.string().datetime({ offset: true }),
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
  timestamp: z.string().datetime({ offset: true }),
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
  res.json({
    service: "narishield-backend",
    status: "ok",
    environment: env.nodeEnv,
    iotProvider: iotAdapter.provider
  });
});

app.post(
  "/api/incidents/trigger",
  asyncHandler(async (req, res) => {
    const payload = parseBody(triggerSchema, req.body);
    const incident = await repo.createIncident(payload);
    broadcast({ type: "incident.created", payload: incident });
    await publishIoT("incident.created", () => iotAdapter.publishIncidentCreated(incident));
    res.status(201).json(incident);
  })
);

app.get(
  "/api/incidents",
  asyncHandler(async (_req, res) => {
    res.json(await repo.listIncidents());
  })
);

app.get(
  "/api/incidents/:incidentId",
  asyncHandler(async (req, res) => {
    const incident = await repo.getIncident(req.params.incidentId);
    if (!incident) {
      throw new AppError(404, "INCIDENT_NOT_FOUND", "Incident not found");
    }
    res.json(incident);
  })
);

app.patch(
  "/api/incidents/:incidentId/status",
  asyncHandler(async (req, res) => {
    const payload = parseBody(statusSchema, req.body);
    const current = await repo.getIncident(req.params.incidentId);

    if (!current) {
      throw new AppError(404, "INCIDENT_NOT_FOUND", "Incident not found");
    }

    if (current.status !== payload.status && !statusTransitions[current.status].includes(payload.status)) {
      throw new AppError(409, "INVALID_STATUS_TRANSITION", "Invalid incident status transition", {
        from: current.status,
        to: payload.status,
        allowed: statusTransitions[current.status]
      });
    }

    const updated = await repo.updateIncidentStatus(req.params.incidentId, payload.status, payload.actor ?? "operator");
    if (!updated) {
      throw new AppError(404, "INCIDENT_NOT_FOUND", "Incident not found");
    }
    broadcast({ type: "incident.updated", payload: updated });
    await publishIoT("incident.updated", () => iotAdapter.publishIncidentUpdated(updated));
    res.json(updated);
  })
);

app.post(
  "/api/devices/heartbeat",
  asyncHandler(async (req, res) => {
    const payload = parseBody(heartbeatSchema, req.body);
    const heartbeat = await repo.upsertHeartbeat(payload);
    broadcast({ type: "device.heartbeat", payload: heartbeat });
    await publishIoT("device.heartbeat", () => iotAdapter.publishDeviceHeartbeat(heartbeat));
    res.status(201).json(heartbeat);
  })
);

app.get(
  "/api/devices/status",
  asyncHandler(async (_req, res) => {
    res.json(await repo.listHeartbeats());
  })
);

app.get(
  "/api/audit-logs",
  asyncHandler(async (_req, res) => {
    res.json(await repo.listAuditLogs());
  })
);

app.get("/api/iot/status", (_req, res) => {
  res.json({
    enabled: env.enableIotAdapter,
    provider: iotAdapter.provider,
    mode: env.enableIotAdapter ? "adapter-enabled" : "placeholder-noop"
  });
});

webSocketServer.on("connection", async (socket) => {
  try {
    const [incidents, devices] = await Promise.all([repo.listIncidents(), repo.listHeartbeats()]);
    socket.send(JSON.stringify({ type: "bootstrap", payload: { incidents, devices } }));
  } catch {
    socket.send(JSON.stringify({ type: "error", payload: { message: "Failed to bootstrap websocket data" } }));
  }
});

function broadcast(event: Record<string, unknown>): void {
  const data = JSON.stringify(event);
  for (const client of webSocketServer.clients) {
    if (client.readyState === client.OPEN) {
      client.send(data);
    }
  }
}

function asyncHandler(
  handler: (req: express.Request, res: express.Response) => Promise<void>
): express.RequestHandler {
  return (req, res, next) => {
    void handler(req, res).catch(next);
  };
}

async function publishIoT(eventName: string, task: () => Promise<void>): Promise<void> {
  try {
    await task();
  } catch (error) {
    log.warn("iot.publish.failed", { eventName, error: String(error) });
  }
}

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (isAppError(error)) {
    return res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    });
  }

  const details = env.isProduction ? undefined : String(error);
  log.error("request.failed", { error: details ?? "internal-error" });
  return res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Unexpected server error",
      details
    }
  });
});

async function start(): Promise<void> {
  try {
    await pool.query("select 1");
    await iotAdapter.start();

    server.listen(env.port, () => {
      log.info("server.started", {
        url: `http://localhost:${env.port}`,
        iotProvider: iotAdapter.provider,
        iotEnabled: env.enableIotAdapter
      });
    });
  } catch (error) {
    log.error("server.start.failed", { error: String(error) });
    process.exit(1);
  }
}

async function shutdown(signal: string): Promise<void> {
  log.info("server.shutdown.started", { signal });

  webSocketServer.close();
  server.close(async () => {
    await iotAdapter.stop();
    await pool.end();
    log.info("server.shutdown.completed", { signal });
    process.exit(0);
  });
}

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

void start();
