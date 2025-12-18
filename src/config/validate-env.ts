import { cleanEnv, str, num, port } from "envalid";

export const validateEnv = () =>
  cleanEnv(process.env, {
    NODE_ENV: str({
      choices: ["development", "production", "test"],
      default: "development",
    }),
    PORT: port({ default: 3001 }),
    DATABASE_URL: str(),
    JWT_SECRET: str(),
    JWT_EXPIRES_IN: str({ default: "7d" }),
    CORS_ORIGIN: str({ default: "http://localhost:3000" }),
    RATE_LIMIT_WINDOW_MS: num({ default: 900000 }),
    RATE_LIMIT_MAX_REQUESTS: num({ default: 100 }),
    MAX_FILE_SIZE: num({ default: 5242880 }),
    UPLOAD_DIR: str({ default: "uploads" }),
  });

export const ENV = validateEnv();
