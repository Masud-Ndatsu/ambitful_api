import { Request, Response } from "express";
import { authService } from "../services/auth-service";
import { sendSuccess } from "../utils/send-response";
import catchError from "../utils/catch-error";
import { registerSchema, loginSchema } from "../schemas/auth";

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
