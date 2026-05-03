import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { User, Tier } from '@generated/prisma';
import * as pdfParse from 'pdf-parse';
import { ParsedResume, CreateBaseResumeDto } from './types';

const RESUME_LIMITS: Record<Tier, number> = {
  FREE: 1,
  PRO: 5,
  CAREER: 10,
  ENTERPRISE: 20,
};

@Injectable()
export class ResumeService {
  private readonly logger = new Logger(ResumeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Parse a PDF buffer and extract resume text
   */
  async parsePdf(buffer: Buffer): Promise<ParsedResume> {
    try {
      const data = await pdfParse(buffer);
      const text = data.text?.trim() || '';

      if (!text) {
        return {
          text: '',
          confidence: 0,
          warning: 'No text could be extracted. This may be a scanned or image-based PDF.',
        };
      }

      const confidence = this.computeConfidence(text, data.numpages);

      return {
        text,
        confidence,
        warning: confidence < 0.5
          ? 'We had trouble reading parts of your resume. Please review the extracted text and correct any errors.'
          : undefined,
      };
    } catch (error) {
      this.logger.error('PDF parsing failed', error);
      throw new BadRequestException('Failed to parse PDF. Please ensure the file is a valid, text-based PDF.');
    }
  }

  /**
   * Heuristic confidence score based on resume text characteristics
   */
  private computeConfidence(text: string, numPages: number): number {
    const lines = text.split('\n').filter((l) => l.trim().length > 0);
    const avgLineLength = lines.reduce((s, l) => s + l.length, 0) / (lines.length || 1);

    // Common resume section markers increase confidence
    const sectionPatterns = [
      /experience|work history/i,
      /education/i,
      /skills/i,
      /summary|objective|profile/i,
    ];
    const sectionsFound = sectionPatterns.filter((p) => p.test(text)).length;

    // Garbled text indicators reduce confidence
    const garbledRatio = (text.match(/[^\x00-\x7F]/g) || []).length / text.length;

    let score = 0.4; // base
    score += Math.min(sectionsFound / 4, 1) * 0.35;
    score += Math.min(avgLineLength / 40, 1) * 0.15;
    score -= garbledRatio * 0.5;
    score = Math.max(0, Math.min(1, score));

    return Math.round(score * 100) / 100;
  }

  /**
   * Save a base resume for authenticated users
   */
  async saveBaseResume(
    user: User,
    name: string,
    buffer: Buffer,
    originalName: string,
    mimeType: string,
  ) {
    try {
      const count = await this.prisma.baseResume.count({ where: { userId: user.id } });
      const limit = RESUME_LIMITS[user.tier];

      if (count >= limit) {
        throw new ForbiddenException(
          `Your ${user.tier} plan allows up to ${limit} saved resume(s). ` +
          `Upgrade your plan or delete an existing resume.`,
        );
      }

      const { text, confidence, warning } = await this.parsePdf(buffer);

      if (!text) {
        throw new BadRequestException('Could not extract text from your resume PDF.');
      }

      const upload = await this.storage.uploadResume(user.id, originalName, buffer, mimeType);

      const baseResume = await this.prisma.baseResume.create({
        data: {
          userId: user.id,
          name,
          extractedText: text,
          storageKey: upload.key,
          fileSize: buffer.length,
          mimeType,
        },
      });

      return { baseResume, confidence, warning };
    } catch (error: any) {
      if (error instanceof ForbiddenException || error instanceof BadRequestException) throw error;
      this.logger.error('Save base resume failed', error.message);
      throw new InternalServerErrorException('Failed to save resume. Please try again.');
    }
  }

  async listBaseResumes(userId: string) {
    try {
      return await this.prisma.baseResume.findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          fileSize: true,
          mimeType: true,
          lastUsedAt: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error: any) {
      this.logger.error('List base resumes failed', error.message);
      throw new InternalServerErrorException('Failed to retrieve resumes. Please try again.');
    }
  }

  async getBaseResume(id: string, userId: string) {
    try {
      const resume = await this.prisma.baseResume.findFirst({
        where: { id, userId },
      });

      if (!resume) {
        throw new NotFoundException('Resume not found');
      }

      return resume;
    } catch (error: any) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error('Get base resume failed', error.message);
      throw new InternalServerErrorException('Failed to retrieve resume. Please try again.');
    }
  }

  /** Short-lived signed URL so the viewer can embed the vault PDF (same access as GET :id). */
  async getBaseResumePdfUrl(id: string, userId: string): Promise<{ url: string }> {
    const resume = await this.getBaseResume(id, userId);
    if (!resume.storageKey) {
      throw new BadRequestException('Resume PDF is unavailable.');
    }
    const url = await this.storage.getResumeUrl(resume.storageKey);
    return { url };
  }

  async deleteBaseResume(id: string, userId: string) {
    try {
      const resume = await this.getBaseResume(id, userId);

      if (resume.storageKey) {
        await this.storage.deleteResume(resume.storageKey);
      }

      await this.prisma.baseResume.delete({ where: { id } });
    } catch (error: any) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error('Delete base resume failed', error.message);
      throw new InternalServerErrorException('Failed to delete resume. Please try again.');
    }
  }

  async renameBaseResume(id: string, userId: string, name: string) {
    try {
      await this.getBaseResume(id, userId);

      return await this.prisma.baseResume.update({
        where: { id },
        data: { name },
      });
    } catch (error: any) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error('Rename base resume failed', error.message);
      throw new InternalServerErrorException('Failed to rename resume. Please try again.');
    }
  }

  async markResumeUsed(id: string) {
    try {
      await this.prisma.baseResume.update({
        where: { id },
        data: { lastUsedAt: new Date() },
      });
    } catch (error: any) {
      this.logger.warn('Mark resume used failed (non-critical)', error.message);
    }
  }
}
