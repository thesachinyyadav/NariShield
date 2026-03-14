import { useEffect, useMemo, useState } from "react";

type IncidentStatus = "triggered" | "acknowledged" | "dispatched" | "closed";

interface Incident {
  id: string;
  status: IncidentStatus;
  createdAt: string;
  updatedAt: string;
  deviceId: string;
  batteryLevel: number;
  latestGps: { lat: number; lon: number };
}

interface DeviceHeartbeat {
  deviceId: string;
  timestamp: string;
  batteryLevel: number;
  isOnline: boolean;
}

interface AuditLog {
  id: string;
  action: string;
  actor: string;
  incidentId?: string;
  createdAt: string;
}

const apiBase = "http://localhost:4000";

export function App() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [devices, setDevices] = useState<DeviceHeartbeat[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const activeCount = useMemo(
    () => incidents.filter((incident) => incident.status !== "closed").length,
    [incidents]
  );

  useEffect(() => {
    void bootstrap();

    const socket = new WebSocket("ws://localhost:4000/ws");
    socket.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data as string) as {
          type: string;
          payload: any;
        };

        if (event.type === "bootstrap") {
          setIncidents(event.payload.incidents ?? []);
          setDevices(event.payload.devices ?? []);
          return;
        }

        if (event.type === "incident.created") {
          setIncidents((prev) => [event.payload as Incident, ...prev]);
        }

        if (event.type === "incident.updated") {
          setIncidents((prev) => prev.map((entry) => (entry.id === event.payload.id ? event.payload : entry)));
        }

        if (event.type === "device.heartbeat") {
          setDevices((prev) => {
            const rest = prev.filter((device) => device.deviceId !== event.payload.deviceId);
            return [event.payload as DeviceHeartbeat, ...rest];
          });
        }
      } catch {
      }
    };

    return () => socket.close();
  }, []);

  async function bootstrap(): Promise<void> {
    setLoading(true);
    const [incidentsResponse, devicesResponse, auditResponse] = await Promise.all([
      fetch(`${apiBase}/api/incidents`),
      fetch(`${apiBase}/api/devices/status`),
      fetch(`${apiBase}/api/audit-logs`)
    ]);

    setIncidents((await incidentsResponse.json()) as Incident[]);
    setDevices((await devicesResponse.json()) as DeviceHeartbeat[]);
    setAuditLogs((await auditResponse.json()) as AuditLog[]);
    setLoading(false);
  }

  async function updateStatus(incidentId: string, status: IncidentStatus): Promise<void> {
    await fetch(`${apiBase}/api/incidents/${incidentId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, actor: "security-operator" })
    });
    await bootstrap();
  }

  return (
    <main className="layout">
      <header className="header">
        <h1>NariShield Command Dashboard</h1>
        <p>Live pilot incident operations for campus safety teams.</p>
      </header>

      <section className="cards">
        <article className="card">
          <h3>Total Incidents</h3>
          <strong>{incidents.length}</strong>
        </article>
        <article className="card">
          <h3>Active Incidents</h3>
          <strong>{activeCount}</strong>
        </article>
        <article className="card">
          <h3>Known Devices</h3>
          <strong>{devices.length}</strong>
        </article>
      </section>

      {loading ? <p>Loading...</p> : null}

      <section className="panel">
        <h2>Incident Queue</h2>
        {incidents.length === 0 ? (
          <p>No incidents yet. Trigger a simulated device event via API.</p>
        ) : (
          <ul className="list">
            {incidents.map((incident) => (
              <li key={incident.id}>
                <div>
                  <strong>{incident.id.slice(0, 8)}...</strong>
                  <p>
                    Device: {incident.deviceId} | Status: {incident.status}
                  </p>
                  <p>
                    GPS: {incident.latestGps.lat}, {incident.latestGps.lon} | Battery: {incident.batteryLevel}%
                  </p>
                </div>
                <div className="actions">
                  <button onClick={() => updateStatus(incident.id, "acknowledged")}>Acknowledge</button>
                  <button onClick={() => updateStatus(incident.id, "dispatched")}>Dispatch</button>
                  <button onClick={() => updateStatus(incident.id, "closed")}>Close</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <h2>Device Health</h2>
        <ul className="list compact">
          {devices.map((device) => (
            <li key={device.deviceId}>
              <span>{device.deviceId}</span>
              <span>{device.isOnline ? "Online" : "Offline"}</span>
              <span>{device.batteryLevel}%</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2>Audit Logs</h2>
        <ul className="list compact">
          {auditLogs.slice(0, 20).map((entry) => (
            <li key={entry.id}>
              <span>{entry.action}</span>
              <span>{entry.actor}</span>
              <span>{new Date(entry.createdAt).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
