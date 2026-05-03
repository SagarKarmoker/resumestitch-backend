import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductFeedbackDto } from './dto/create-feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateProductFeedbackDto) {
    const row = await this.prisma.productFeedback.create({
      data: {
        userId,
        body: dto.message.trim(),
        category: dto.category?.trim() ? dto.category.trim() : null,
        pageUrl: dto.pageUrl?.trim() ? dto.pageUrl.trim().slice(0, 2048) : null,
      },
      select: { id: true, createdAt: true },
    });
    return { id: row.id, createdAt: row.createdAt.toISOString() };
  }
}
