import { Router } from "express";
import { sendSuccess } from "../utils/send-response";
import authRoutes from "./auth-routes";

const router = Router();

router.get("/", (req, res) => {
  return sendSuccess(res, {
    message: "Ambitful AI API",
    version: "1.0.0",
    status: "active",
    timestamp: new Date().toISOString(),
  }, "API is running successfully");
});

// Route modules
router.use("/auth", authRoutes);

export default router;
