import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { authService } from "../services/auth-service";
import { sendSuccess } from "../utils/send-response";
import catchError from "../utils/catch-error";

const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

class AuthController {
  register = catchError(async (req: Request, res: Response) => {
    const validatedData = registerSchema.parse(req.body);

    const result = await authService.register(validatedData);

    return sendSuccess(res, result, "User registered successfully", 201);
  });

  login = catchError(async (req: Request, res: Response) => {
    const validatedData = loginSchema.parse(req.body);

    const result = await authService.login(validatedData);

    return sendSuccess(res, result, "Login successful");
  });

  me = catchError(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return sendSuccess(res, null, "No user found");
    }

    const user = await authService.getUserById(userId);

    return sendSuccess(res, user, "User profile retrieved successfully");
  });

  logout = catchError(async (req: Request, res: Response) => {
    // Since we're using stateless JWT tokens, logout is handled client-side
    // by removing the token from storage
    return sendSuccess(res, null, "Logout successful");
  });
}

export const authController = new AuthController();
export default authController;
