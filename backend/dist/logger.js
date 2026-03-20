function write(level, message, metadata) {
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
    info(message, metadata) {
        write("info", message, metadata);
    },
    warn(message, metadata) {
        write("warn", message, metadata);
    },
    error(message, metadata) {
        write("error", message, metadata);
    }
};
