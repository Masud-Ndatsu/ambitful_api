import jwt, { JwtPayload } from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { config } from '../config/envars';
import { prisma } from '../config/database';
import {
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '../utils/http-exception';
import logger from '../config/logger';
import { RegisterData, LoginCredentials, AuthTokens } from '../schemas/auth';

class AuthService {
  private readonly saltRounds = 12;

  async register(data: RegisterData): Promise<AuthTokens> {
    const { email, password, name, phone, role } = data;

    console.log({ data });

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, this.saltRounds);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        phone: phone || null,
        role: role || 'USER',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isEmailVerified: true,
        isOnboardingComplete: true,
      },
    });

    const accessToken = this.generateAccessToken(user.id);
    const refreshToken = this.generateRefreshToken(user.id);

    logger.info('User registered successfully', {
      userId: user.id,
      email: user.email,
    });

    return {
      accessToken,
      refreshToken,
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
        role: true,
        password: true,
        isEmailVerified: true,
        isOnboardingComplete: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.generateAccessToken(user.id);
    const refreshToken = this.generateRefreshToken(user.id);

    logger.info('User logged in successfully', {
      userId: user.id,
      email: user.email,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isOnboardingComplete: user.isOnboardingComplete,
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
        role: true,
        avatar: true,
        phone: true,
        isEmailVerified: true,
        isOnboardingComplete: true,
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
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async verifyToken(token: string): Promise<string> {
    const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload;

    if (decoded.type !== 'access') {
      throw new UnauthorizedException('Invalid access token');
    }

    return decoded.userId;
  }

  private generateAccessToken(userId: string): string {
    const secret = config.JWT_SECRET;
    return jwt.sign({ userId, type: 'access' }, secret, {
      expiresIn: '7d',
    });
  }

  private generateRefreshToken(userId: string): string {
    const secret = config.JWT_SECRET;
    return jwt.sign({ userId, type: 'refresh' }, secret, {
      expiresIn: '30d',
    });
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const decoded = jwt.verify(refreshToken, config.JWT_SECRET) as JwtPayload;

    if (decoded.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.getUserById(decoded.userId);

    const newAccessToken = this.generateAccessToken(user.id);
    const newRefreshToken = this.generateRefreshToken(user.id);

    logger.info('Token refreshed successfully', {
      userId: user.id,
      email: user.email,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isOnboardingComplete: user.isOnboardingComplete,
      },
    };
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
