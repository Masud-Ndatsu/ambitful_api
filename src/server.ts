import "dotenv/config";
import express, { Express, Request, Response } from "express";
import compression from "compression";
import cors from "cors";
import helmet from "helmet";
import http from "http";
import { validateEnv } from "./config/validate-env";
import routes from "./routes";
import logger from "./config/logger";
import { errorHandler } from "./middleware/error-handler";
import { notFoundHandler } from "./middleware/not-found-handler";
import { requestId } from "./middleware/request-id";
import { setupSwagger } from "./config/swagger";
import { config } from "./config/envars";

const app: Express = express();

const PORT = config.PORT;
validateEnv();

app.use(requestId);
app.use(cors());
app.use(helmet());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(compression());

app.get("/", async (req: Request, res: Response) => {
  res.send({ message: "Ambitful AI API server is Running!!!" });
});

setupSwagger(app);

app.use("/api", routes);
app.use(errorHandler);
app.use(notFoundHandler);

const server = http.createServer(app);

server.listen(PORT, async () => {
  logger.info(`Server running on port ${PORT}`);
});

const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Graceful shutdown started.`);

  try {
    server.close(() => {
      logger.info("HTTP server closed.");
      process.exit(0);
    });
  } catch (error) {
    logger.error("Error during shutdown:", error);
    process.exit(1);
  }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
