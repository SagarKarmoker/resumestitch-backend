import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GenerationService } from '../generation/generation.service';
import { ApplicationStatus, Tier } from '@generated/prisma';
import { UpdateApplicationDto } from './dto/applications.dto';

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);
  private readonly trackerAllowedTiers: Tier[] = ['CAREER', 'ENTERPRISE'];

  constructor(
    private readonly prisma: PrismaService,
    private readonly generationService: GenerationService,
  ) {}

  async listApplications(userId: string) {
    try {
      await this.assertTrackerAccess(userId);
      return await this.prisma.application.findMany({
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
    } catch (error: any) {
      this.logger.error('List applications failed', error.message);
      throw new InternalServerErrorException('Failed to retrieve applications. Please try again.');
    }
  }

  async getApplication(id: string, userId: string) {
    try {
      await this.assertTrackerAccess(userId);
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
    } catch (error: any) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error('Get application failed', error.message);
      throw new InternalServerErrorException('Failed to get application. Please try again.');
    }
  }

  async updateApplication(id: string, userId: string, dto: UpdateApplicationDto) {
    try {
      await this.assertTrackerAccess(userId);
      await this.getApplication(id, userId);

      return await this.prisma.application.update({
        where: { id },
        data: {
          ...dto,
          lastContactAt: dto.recruiterEmail ? new Date() : undefined,
        },
      });
    } catch (error: any) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error('Update application failed', error.message);
      throw new InternalServerErrorException('Failed to update application. Please try again.');
    }
  }

  async updateStatus(id: string, userId: string, status: ApplicationStatus) {
    try {
      await this.assertTrackerAccess(userId);
      await this.getApplication(id, userId);

      return await this.prisma.application.update({
        where: { id },
        data: { status, updatedAt: new Date() },
      });
    } catch (error: any) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error('Update status failed', error.message);
      throw new InternalServerErrorException('Failed to update status. Please try again.');
    }
  }

  async deleteApplication(id: string, userId: string) {
    try {
      await this.assertTrackerAccess(userId);
      await this.getApplication(id, userId);
      await this.prisma.application.delete({ where: { id } });
    } catch (error: any) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error('Delete application failed', error.message);
      throw new InternalServerErrorException('Failed to delete application. Please try again.');
    }
  }

  async generateFollowUp(applicationId: string, userId: string) {
    try {
      await this.assertTrackerAccess(userId);
      await this.getApplication(applicationId, userId);
      return await this.generationService.generateFollowUpEmail(applicationId, userId);
    } catch (error: any) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error('Generate follow-up failed', error.message);
      throw new InternalServerErrorException('Failed to generate follow-up email. Please try again.');
    }
  }

  async getBoardStats(userId: string) {
    try {
      await this.assertTrackerAccess(userId);
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
    } catch (error: any) {
      this.logger.error('Get board stats failed', error.message);
      throw new InternalServerErrorException('Failed to get board stats. Please try again.');
    }
  }

  private async assertTrackerAccess(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tier: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!this.trackerAllowedTiers.includes(user.tier)) {
      throw new ForbiddenException(
        'Application Tracker is available on Career and Enterprise plans.',
      );
    }
  }
}
