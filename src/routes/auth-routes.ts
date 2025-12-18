import { Router } from "express";
import { authController } from "../controllers/auth-controller";
import { authenticate } from "../middleware/auth";

const router = Router();

// Public routes
router.post("/register", authController.register);
router.post("/login", authController.login);

// Protected routes
router.get("/me", authenticate, authController.me);
router.post("/logout", authenticate, authController.logout);

export default router;