type LogLevel = "info" | "warn" | "error";

function write(level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...metadata
  };

  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
    return;
  }
  console.log(line);
}

export const log = {
  info(message: string, metadata?: Record<string, unknown>): void {
    write("info", message, metadata);
  },
  warn(message: string, metadata?: Record<string, unknown>): void {
    write("warn", message, metadata);
  },
  error(message: string, metadata?: Record<string, unknown>): void {
    write("error", message, metadata);
  }
};
