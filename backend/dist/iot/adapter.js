export class NoopIoTAdapter {
    provider = "noop";
    async start() {
    }
    async stop() {
    }
    async publishIncidentCreated(_incident) {
    }
    async publishIncidentUpdated(_incident) {
    }
    async publishDeviceHeartbeat(_heartbeat) {
    }
}
