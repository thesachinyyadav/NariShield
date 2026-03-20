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
  eventType?: string;
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

interface EventEnvelope {
  type: string;
  payload: unknown;
}

type DashboardSection = "dashboard" | "incidents" | "devices" | "logs" | "settings";

const apiBase = "http://localhost:4000";

const statusClassMap: Record<IncidentStatus, string> = {
  triggered: "status-triggered",
  acknowledged: "status-acknowledged",
  dispatched: "status-dispatched",
  closed: "status-closed"
};

const statusLabelMap: Record<IncidentStatus, string> = {
  triggered: "TRIGGERED",
  acknowledged: "ACKNOWLEDGED",
  dispatched: "DISPATCHED",
  closed: "CLOSED"
};

function formatDateTime(value: string): string {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function isIncidentArray(value: unknown): value is Incident[] {
  return Array.isArray(value);
}

function isDeviceArray(value: unknown): value is DeviceHeartbeat[] {
  return Array.isArray(value);
}

function getNextStatus(status: IncidentStatus): IncidentStatus | null {
  if (status === "triggered") return "acknowledged";
  if (status === "acknowledged") return "dispatched";
  if (status === "dispatched") return "closed";
  return null;
}

function getActionLabel(status: IncidentStatus): string {
  if (status === "triggered") return "Acknowledge";
  if (status === "acknowledged") return "Dispatch";
  if (status === "dispatched") return "Close Case";
  return "Archived";
}

export function App() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [devices, setDevices] = useState<DeviceHeartbeat[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<DashboardSection>("dashboard");
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

  const activeCount = useMemo(() => incidents.filter((incident) => incident.status !== "closed").length, [incidents]);

  const onlineDevices = useMemo(() => devices.filter((device) => device.isOnline).length, [devices]);

  const incidentInLast24h = incidents.length;

  const selectedIncident = useMemo(() => incidents.find((incident) => incident.id === selectedIncidentId) ?? incidents[0], [incidents, selectedIncidentId]);

  const selectedAuditLogs = useMemo(() => {
    if (!selectedIncident) {
      return [];
    }
    return auditLogs
      .filter((entry) => entry.incidentId === selectedIncident.id)
      .slice(0, 12);
  }, [auditLogs, selectedIncident]);

  const allAuditRows = useMemo(() => auditLogs.slice(0, 8), [auditLogs]);

  useEffect(() => {
    void bootstrap();

    const socket = new WebSocket("ws://localhost:4000/ws");
    socket.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data as string) as EventEnvelope;

        if (event.type === "bootstrap") {
          if (typeof event.payload === "object" && event.payload !== null) {
            const payload = event.payload as { incidents?: unknown; devices?: unknown };
            if (isIncidentArray(payload.incidents)) {
              setIncidents(payload.incidents);
            }
            if (isDeviceArray(payload.devices)) {
              setDevices(payload.devices);
            }
          }
          return;
        }

        if (event.type === "incident.created") {
          if (typeof event.payload === "object" && event.payload !== null) {
            const createdIncident = event.payload as Incident;
            setIncidents((prev) => [createdIncident, ...prev]);
            setSelectedIncidentId(createdIncident.id);
          }
        }

        if (event.type === "incident.updated") {
          if (typeof event.payload === "object" && event.payload !== null) {
            const updatedIncident = event.payload as Incident;
            setIncidents((prev) => prev.map((entry) => (entry.id === updatedIncident.id ? updatedIncident : entry)));
          }
        }

        if (event.type === "device.heartbeat") {
          if (typeof event.payload === "object" && event.payload !== null) {
            const heartbeat = event.payload as DeviceHeartbeat;
            setDevices((prev) => {
              const rest = prev.filter((device) => device.deviceId !== heartbeat.deviceId);
              return [heartbeat, ...rest];
            });
          }
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

    const incidentData = (await incidentsResponse.json()) as Incident[];
    setIncidents(incidentData);
    setDevices((await devicesResponse.json()) as DeviceHeartbeat[]);
    setAuditLogs((await auditResponse.json()) as AuditLog[]);
    setLoading(false);

    if (!selectedIncidentId) {
      if (incidentData.length > 0) {
        setSelectedIncidentId(incidentData[0].id);
      }
    }
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
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">◍</div>
          <div>
            <h2>NariShield</h2>
            <p>Command Center</p>
          </div>
        </div>

        <nav className="menu">
          {(["dashboard", "incidents", "devices", "logs", "settings"] as DashboardSection[]).map((section) => (
            <button
              key={section}
              className={activeSection === section ? "menu-item active" : "menu-item"}
              onClick={() => setActiveSection(section)}
            >
              {section[0].toUpperCase() + section.slice(1)}
            </button>
          ))}
        </nav>

        <button className="new-incident" onClick={() => setActiveSection("incidents")}>New Incident</button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <h1>{activeSection === "incidents" ? "Incident Details" : "System Overview"}</h1>
          <div className="topbar-controls">
            <input placeholder="Search incidents, devices..." aria-label="Search" />
            <button className="mini">⤴</button>
            <button className="export">Export Report</button>
            <div className="operator">Command Center 01</div>
          </div>
        </header>

        {loading ? <p className="loading">Loading...</p> : null}

        {activeSection !== "incidents" ? (
          <>
            <section className="kpis">
              <article className="kpi-card">
                <div className="kpi-head">
                  <span>Total Incidents (24h)</span>
                  <strong className="up">+12%</strong>
                </div>
                <h3>{incidentInLast24h.toLocaleString()}</h3>
              </article>
              <article className="kpi-card">
                <div className="kpi-head">
                  <span>Active Alerts</span>
                  <strong className="live">LIVE</strong>
                </div>
                <h3>{activeCount}</h3>
              </article>
              <article className="kpi-card">
                <div className="kpi-head">
                  <span>Online Devices</span>
                  <strong>Stable</strong>
                </div>
                <h3>{onlineDevices}</h3>
              </article>
            </section>

            <section className="panel">
              <div className="panel-head">
                <h2>Live Incident Queue</h2>
                <div className="panel-actions">
                  <button className="ghost">Filter</button>
                  <button className="ghost">Export</button>
                </div>
              </div>

              <table className="queue-table">
                <thead>
                  <tr>
                    <th>ID / Location</th>
                    <th>Timestamp</th>
                    <th>Incident Type</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.map((incident) => {
                    const nextStatus = getNextStatus(incident.status);
                    return (
                      <tr key={incident.id}>
                        <td>
                          <strong>#{incident.id.slice(0, 8)}</strong>
                          <small>{incident.deviceId}</small>
                        </td>
                        <td>{formatDateTime(incident.createdAt)}</td>
                        <td>{incident.eventType ?? "SOS Panic Triggered"}</td>
                        <td>
                          <span className={`status-chip ${statusClassMap[incident.status]}`}>{statusLabelMap[incident.status]}</span>
                        </td>
                        <td>
                          <button
                            className={incident.status === "closed" ? "table-action muted" : "table-action"}
                            disabled={!nextStatus}
                            onClick={() => {
                              if (nextStatus) {
                                void updateStatus(incident.id, nextStatus);
                              }
                            }}
                          >
                            {getActionLabel(incident.status)}
                          </button>
                          <button
                            className="link-action"
                            onClick={() => {
                              setSelectedIncidentId(incident.id);
                              setActiveSection("incidents");
                            }}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>

            <section className="bottom-grid">
              <article className="panel map-card">
                <div className="mock-map">Geospatial Monitoring Active</div>
              </article>
              <article className="panel health-card">
                <h3>System Health Score</h3>
                <p className="score">98.4%</p>
                <div className="metric-line"><span>Network Latency</span><strong>12ms</strong></div>
                <div className="progress"><span style={{ width: "88%" }} /></div>
                <div className="metric-line"><span>Server Load</span><strong>24%</strong></div>
                <div className="progress pink"><span style={{ width: "24%" }} /></div>
              </article>
            </section>
          </>
        ) : (
          <section className="incident-layout">
            {!selectedIncident ? (
              <article className="panel">
                <p>No incident selected.</p>
              </article>
            ) : (
              <>
                <article className="incident-title">
                  <h2>Incident #{selectedIncident.id.slice(0, 8)}</h2>
                  <span className="priority">HIGH PRIORITY</span>
                  <p>Reported at {new Date(selectedIncident.createdAt).toLocaleString()}</p>
                </article>

                <section className="incident-tabs">
                  <button className="tab-active">Overview</button>
                  <button>Evidence</button>
                  <button>Timeline</button>
                  <button>Audit Trail</button>
                </section>

                <div className="incident-grid">
                  <div className="left-stack">
                    <article className="panel">
                      <h3>Incident Timeline</h3>
                      <ul className="timeline">
                        <li>
                          <strong>SOS Triggered</strong>
                          <small>{formatDateTime(selectedIncident.createdAt)}</small>
                        </li>
                        <li>
                          <strong>Location Transmitted</strong>
                          <small>{formatDateTime(selectedIncident.updatedAt)}</small>
                        </li>
                        <li>
                          <strong>Audio Stream Started</strong>
                          <small>Encrypted session active</small>
                        </li>
                      </ul>
                    </article>

                    <article className="panel evidence-list">
                      <h3>Evidence List</h3>
                      <div className="evidence-grid">
                        <div className="evidence-item">
                          <strong>Primary Audio Log</strong>
                          <p>Duration 04:12 • 4.2 MB</p>
                        </div>
                        <div className="evidence-item">
                          <strong>Device Status Log</strong>
                          <p>System dump • 12 KB</p>
                        </div>
                      </div>
                    </article>

                    <article className="panel">
                      <h3>Audit Trail</h3>
                      <table className="audit-table">
                        <thead>
                          <tr>
                            <th>Action</th>
                            <th>User</th>
                            <th>Timestamp</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(selectedAuditLogs.length > 0 ? selectedAuditLogs : allAuditRows).map((entry) => (
                            <tr key={entry.id}>
                              <td>{entry.action}</td>
                              <td>{entry.actor}</td>
                              <td>{new Date(entry.createdAt).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </article>
                  </div>

                  <div className="right-stack">
                    <article className="panel">
                      <div className="mini-map">Live Location</div>
                      <div className="coords">
                        <span>Coordinates</span>
                        <strong>
                          {selectedIncident.latestGps.lat.toFixed(4)}° N, {selectedIncident.latestGps.lon.toFixed(4)}° E
                        </strong>
                      </div>
                      <button className="outline">Open in External Maps</button>
                    </article>

                    <article className="panel">
                      <h4>Device Status</h4>
                      <p>ShieldV3 Pro • {selectedIncident.deviceId}</p>
                      <div className="metric-line"><span>Battery Level</span><strong>{selectedIncident.batteryLevel}%</strong></div>
                      <div className="progress pink"><span style={{ width: `${selectedIncident.batteryLevel}%` }} /></div>
                      <div className="tag-row">
                        <span className="tag">Signal Strong</span>
                        <span className="tag online">Online</span>
                      </div>
                    </article>

                    <article className="panel">
                      <h4>Personnel Assigned</h4>
                      <p>Officer Elena Rodriguez</p>
                      <small>Unit: Response-Delta</small>
                    </article>
                  </div>
                </div>
              </>
            )}
          </section>
        )}
      </section>
    </main>
  );
}
