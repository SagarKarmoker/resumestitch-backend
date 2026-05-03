import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CoverLetterTone, SeniorityLevel, User } from '../generated/prisma';
import { UpdatePreferencesDto } from './dto/users.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        preferences: true,
        _count: {
          select: {
            baseResumes: true,
            generations: true,
            applications: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async getPreferences(userId: string) {
    const prefs = await this.prisma.userPreferences.findUnique({
      where: { userId },
    });

    if (!prefs) {
      // Create default preferences if not present
      return this.prisma.userPreferences.create({
        data: { userId },
      });
    }

    return prefs;
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    return this.prisma.userPreferences.upsert({
      where: { userId },
      create: { userId, ...dto },
      update: dto,
    });
  }

  async getUsageDashboard(userId: string) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      user,
      generationsThisMonth,
      totalGenerations,
      activeApplications,
      generationsLast30Days,
    ] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, tier: true, email: true, fullName: true },
      }),
      this.prisma.generation.count({
        where: {
          userId,
          createdAt: {
            gte: new Date(now.getFullYear(), now.getMonth(), 1),
          },
        },
      }),
      this.prisma.generation.count({ where: { userId } }),
      this.prisma.application.count({
        where: {
          userId,
          status: { notIn: ['REJECTED', 'ARCHIVED'] },
        },
      }),
      // Activity per day for last 30 days
      this.prisma.generation.groupBy({
        by: ['createdAt'],
        where: {
          userId,
          createdAt: { gte: thirtyDaysAgo },
        },
        _count: { id: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // Most targeted company
    const mostTargeted = await this.prisma.generation.groupBy({
      by: ['companyName'],
      where: { userId, companyName: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 1,
    });

    const tierLimits: Record<string, number | null> = {
      FREE: 1,
      PRO: 30,
      CAREER: null,
      ENTERPRISE: null,
    };

    return {
      user,
      generationsThisMonth,
      tierMonthlyLimit: tierLimits[user?.tier || 'FREE'],
      totalGenerations,
      activeApplications,
      mostTargetedCompany: mostTargeted[0]?.companyName || null,
      activityLast30Days: generationsLast30Days.map((g) => ({
        date: g.createdAt,
        count: g._count.id,
      })),
    };
  }

  async getGenerationHistory(
    userId: string,
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;

    const [generations, total] = await Promise.all([
      this.prisma.generation.findMany({
        where: { userId },
        select: {
          id: true,
          companyName: true,
          roleTitle: true,
          atsScore: true,
          coverLetterTone: true,
          modelUsed: true,
          resumeRating: true,
          coverLetterRating: true,
          emailRating: true,
          createdAt: true,
          application: {
            select: { id: true, status: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.generation.count({ where: { userId } }),
    ]);

    return {
      data: generations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async deleteAccount(userId: string): Promise<void> {
    await this.prisma.user.delete({ where: { id: userId } });
    this.logger.log(`Deleted account for user ${userId}`);
  }

  async exportUserData(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        preferences: true,
        baseResumes: {
          select: {
            id: true,
            name: true,
            createdAt: true,
            lastUsedAt: true,
          },
        },
        generations: {
          select: {
            id: true,
            companyName: true,
            roleTitle: true,
            atsScore: true,
            createdAt: true,
          },
        },
        applications: true,
      },
    });

    return user;
  }
}
