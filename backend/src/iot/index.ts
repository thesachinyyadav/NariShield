import { type IoTAdapter, NoopIoTAdapter } from "./adapter.js";

interface IoTFactoryConfig {
  enableIotAdapter: boolean;
  iotProvider: "noop" | "aws-iot-core" | "mqtt";
}

export function createIoTAdapter(config: IoTFactoryConfig): IoTAdapter {
  if (!config.enableIotAdapter) {
    return new NoopIoTAdapter();
  }

  if (config.iotProvider === "aws-iot-core" || config.iotProvider === "mqtt") {
    return new NoopIoTAdapter();
  }

  return new NoopIoTAdapter();
}
