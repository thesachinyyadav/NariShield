import { z } from "zod";
const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z.string().min(1).default("postgres://narishield:narishield@localhost:5432/narishield"),
    CORS_ORIGIN: z.string().default("*"),
    API_BODY_LIMIT: z.string().default("1mb"),
    ENABLE_IOT_ADAPTER: z
        .enum(["true", "false"])
        .default("false")
        .transform((value) => value === "true"),
    IOT_PROVIDER: z.enum(["noop", "aws-iot-core", "mqtt"]).default("noop")
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    throw new Error(`Invalid environment configuration: ${JSON.stringify(parsed.error.flatten())}`);
}
export const env = {
    nodeEnv: parsed.data.NODE_ENV,
    isProduction: parsed.data.NODE_ENV === "production",
    port: parsed.data.PORT,
    databaseUrl: parsed.data.DATABASE_URL,
    corsOrigin: parsed.data.CORS_ORIGIN,
    apiBodyLimit: parsed.data.API_BODY_LIMIT,
    enableIotAdapter: parsed.data.ENABLE_IOT_ADAPTER,
    iotProvider: parsed.data.IOT_PROVIDER
};
