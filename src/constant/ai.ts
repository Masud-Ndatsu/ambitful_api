import { config } from "../config/envars";
import AIModelRouter from "../services/ai-model-router";

// Initialize Gemini client

const aiRouter = new AIModelRouter([
  {
    apiKeys: config.GEMINI_API_KEYS,
    maxRetries: 3,
    model: "gemini-2.0-flash",
    provider: "gemini",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
  },
]);

export default aiRouter;
