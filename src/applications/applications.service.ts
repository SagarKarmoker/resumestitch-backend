import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GenerationService } from '../generation/generation.service';
import { ApplicationStatus, User } from '../generated/prisma';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class UpdateApplicationDto {
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  recruiterName?: string;

  @IsOptional()
  @IsString()
  recruiterEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @IsOptional()
  @IsString()
  jobUrl?: string;
}

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly generationService: GenerationService,
  ) {}

  async listApplications(userId: string) {
    return this.prisma.application.findMany({
      where: { userId },
      include: {
        generation: {
          select: {
            id: true,
            atsScore: true,
            createdAt: true,
            tailoredResume: true,
          },
        },
      },
      orderBy: { appliedAt: 'desc' },
    });
  }

  async getApplication(id: string, userId: string) {
    const app = await this.prisma.application.findFirst({
      where: { id, userId },
      include: {
        generation: true,
      },
    });

    if (!app) {
      throw new NotFoundException('Application not found');
    }

    return app;
  }

  async updateApplication(id: string, userId: string, dto: UpdateApplicationDto) {
    await this.getApplication(id, userId);

    return this.prisma.application.update({
      where: { id },
      data: {
        ...dto,
        lastContactAt: dto.recruiterEmail ? new Date() : undefined,
      },
    });
  }

  async updateStatus(id: string, userId: string, status: ApplicationStatus) {
    await this.getApplication(id, userId);

    return this.prisma.application.update({
      where: { id },
      data: { status, updatedAt: new Date() },
    });
  }

  async deleteApplication(id: string, userId: string) {
    await this.getApplication(id, userId);
    await this.prisma.application.delete({ where: { id } });
  }

  async generateFollowUp(applicationId: string, userId: string) {
    const app = await this.getApplication(applicationId, userId);

    const daysSinceApplied = Math.floor(
      (Date.now() - app.appliedAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    return this.generationService.generateFollowUpEmail(applicationId, userId);
  }

  async getBoardStats(userId: string) {
    const applications = await this.prisma.application.groupBy({
      by: ['status'],
      where: { userId },
      _count: { id: true },
    });

    const stats: Record<string, number> = {};
    for (const s of Object.values(ApplicationStatus)) {
      stats[s] = 0;
    }
    for (const app of applications) {
      stats[app.status] = app._count.id;
    }

    return stats;
  }
}
