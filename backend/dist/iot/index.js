import { NoopIoTAdapter } from "./adapter.js";
export function createIoTAdapter(config) {
    if (!config.enableIotAdapter) {
        return new NoopIoTAdapter();
    }
    if (config.iotProvider === "aws-iot-core" || config.iotProvider === "mqtt") {
        return new NoopIoTAdapter();
    }
    return new NoopIoTAdapter();
}
