import { AppError } from "./errors.js";
export function parseBody(schema, body) {
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid request body", parsed.error.flatten());
    }
    return parsed.data;
}
