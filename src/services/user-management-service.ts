import { prisma } from '../config/database';
import bcrypt from 'bcrypt';
import logger from '../config/logger';
import {
  UserQueryParams,
  CreateUserData,
  UpdateUserData,
  UserResponse,
  UserListResponse,
} from '../schemas/user-management';
import { NotFoundException, ConflictException } from '../utils/http-exception';

class UserManagementService {
  private readonly saltRounds = 12;

  async getUsers(params: UserQueryParams): Promise<UserListResponse> {
    const { page, limit, search, role, isEmailVerified, isOnboardingComplete } = params;

    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (isEmailVerified !== undefined) {
      where.isEmailVerified = isEmailVerified;
    }

    if (isOnboardingComplete !== undefined) {
      where.isOnboardingComplete = isOnboardingComplete;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          avatar: true,
          role: true,
          isEmailVerified: true,
          jobFunction: true,
          preferredLocations: true,
          workAuthorization: true,
          remoteWork: true,
          resumeUrl: true,
          isOnboardingComplete: true,
          onboardingCompletedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return {
      users: users as UserResponse[],
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
    };
  }

  async getUserById(id: string): Promise<UserResponse> {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        role: true,
        isEmailVerified: true,
        jobFunction: true,
        preferredLocations: true,
        workAuthorization: true,
        remoteWork: true,
        resumeUrl: true,
        isOnboardingComplete: true,
        onboardingCompletedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user as UserResponse;
  }

  async createUser(data: CreateUserData): Promise<UserResponse> {
    const { email, password, name, phone, role } = data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, this.saltRounds);

    // Create user
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
        phone: true,
        avatar: true,
        role: true,
        isEmailVerified: true,
        jobFunction: true,
        preferredLocations: true,
        workAuthorization: true,
        remoteWork: true,
        resumeUrl: true,
        isOnboardingComplete: true,
        onboardingCompletedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    logger.info('User created successfully', {
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return user as UserResponse;
  }

  async updateUser(id: string, data: UpdateUserData): Promise<UserResponse> {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        role: true,
        isEmailVerified: true,
        jobFunction: true,
        preferredLocations: true,
        workAuthorization: true,
        remoteWork: true,
        resumeUrl: true,
        isOnboardingComplete: true,
        onboardingCompletedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    logger.info('User updated successfully', {
      userId: id,
      updatedFields: Object.keys(data),
    });

    return updatedUser as UserResponse;
  }

  async deleteUser(id: string): Promise<void> {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Delete user (cascade will handle related records)
    await prisma.user.delete({
      where: { id },
    });

    logger.info('User deleted successfully', {
      userId: id,
      email: existingUser.email,
    });
  }

  async toggleUserStatus(id: string): Promise<UserResponse> {
    // Get current user
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        isEmailVerified: true,
      },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Toggle email verification status (using this as active/inactive)
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        isEmailVerified: !existingUser.isEmailVerified,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        role: true,
        isEmailVerified: true,
        jobFunction: true,
        preferredLocations: true,
        workAuthorization: true,
        remoteWork: true,
        resumeUrl: true,
        isOnboardingComplete: true,
        onboardingCompletedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    logger.info('User status toggled successfully', {
      userId: id,
      newStatus: updatedUser.isEmailVerified ? 'active' : 'inactive',
    });

    return updatedUser as UserResponse;
  }
}

export const userManagementService = new UserManagementService();
export default userManagementService;