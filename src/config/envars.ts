interface Config {
  OPENAI_API_KEY: string;
  GEN_API_KEY: string;
  GEMINI_API_KEYS: string[];
  PINECONE_API_KEY: string;
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
  REDIS_URL: string;
  SCRAPERDO_API_KEY: string;
}

const getGeminiKeys = (key: string) => {
  if (!key) return [];
  return key.split('::');
};

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
  REDIS_URL: process.env.REDIS_URL!,
  SCRAPERDO_API_KEY: process.env.SCRAPERDO_API_KEY!,
  PINECONE_API_KEY: process.env.PINECONE_API_KEY!,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
  GEN_API_KEY: process.env.GEN_API_KEY!,
  GEMINI_API_KEYS: getGeminiKeys(process.env.GEMINI_API_KEYS! ?? ''),
};

export { getGeminiKeys };
