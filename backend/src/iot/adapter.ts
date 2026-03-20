import type { DeviceHeartbeat, Incident } from "../types.js";

export interface IoTAdapter {
  readonly provider: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  publishIncidentCreated(incident: Incident): Promise<void>;
  publishIncidentUpdated(incident: Incident): Promise<void>;
  publishDeviceHeartbeat(heartbeat: DeviceHeartbeat): Promise<void>;
}

export class NoopIoTAdapter implements IoTAdapter {
  readonly provider = "noop";

  async start(): Promise<void> {
  }

  async stop(): Promise<void> {
  }

  async publishIncidentCreated(_incident: Incident): Promise<void> {
  }

  async publishIncidentUpdated(_incident: Incident): Promise<void> {
  }

  async publishDeviceHeartbeat(_heartbeat: DeviceHeartbeat): Promise<void> {
  }
}
