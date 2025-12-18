interface Config {
  NODE_ENV: string;
  PORT: string;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  CORS_ORIGIN: string;
  RATE_LIMIT_WINDOW_MS: string;
  RATE_LIMIT_MAX_REQUESTS: string;
  MAX_FILE_SIZE: string;
  UPLOAD_DIR: string;
}

export const config: Config = {
  NODE_ENV: process.env.NODE_ENV!,
  PORT: process.env.PORT!,
  DATABASE_URL: process.env.DATABASE_URL!,
  JWT_SECRET: process.env.JWT_SECRET!,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN!,
  CORS_ORIGIN: process.env.CORS_ORIGIN!,
  RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS!,
  RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS!,
  MAX_FILE_SIZE: process.env.MAX_FILE_SIZE!,
  UPLOAD_DIR: process.env.UPLOAD_DIR!,
};
