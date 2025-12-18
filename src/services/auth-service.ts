import jwt, { JwtPayload } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { config } from "../config/envars";
import { prisma } from "../config/database";
import {
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from "../utils/http-exception";
import logger from "../config/logger";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export interface AuthTokens {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    isEmailVerified: boolean;
  };
}

class AuthService {
  private readonly saltRounds = 12;

  async register(data: RegisterData): Promise<AuthTokens> {
    const { email, password, name, phone } = data;

    console.log({ data });

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException("User with this email already exists");
    }

    const hashedPassword = await bcrypt.hash(password, this.saltRounds);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        phone: phone || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        isEmailVerified: true,
      },
    });

    const accessToken = this.generateAccessToken(user.id);

    logger.info("User registered successfully", {
      userId: user.id,
      email: user.email,
    });

    return {
      accessToken,
      user,
    };
  }

  async login(credentials: LoginCredentials): Promise<AuthTokens> {
    const { email, password } = credentials;

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        isEmailVerified: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const accessToken = this.generateAccessToken(user.id);

    logger.info("User logged in successfully", {
      userId: user.id,
      email: user.email,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isEmailVerified: user.isEmailVerified,
      },
    };
  }

  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        phone: true,
        isEmailVerified: true,
        jobFunction: true,
        preferredLocations: true,
        workAuthorization: true,
        remoteWork: true,
        resumeUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  async verifyToken(token: string): Promise<string> {
    const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
    return decoded.userId;
  }

  private generateAccessToken(userId: string): string {
    const secret = config.JWT_SECRET;
    return jwt.sign({ userId }, secret, {
      expiresIn: "7d",
    });
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  async comparePassword(
    password: string,
    hashedPassword: string
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }
}

export const authService = new AuthService();
export default authService;
