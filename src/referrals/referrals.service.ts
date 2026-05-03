import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async generateCode(userId: string) {
    try {
      // Allow at most 5 active referral codes per user
      const existing = await this.prisma.referral.count({
        where: { senderId: userId, converted: false },
      });

      if (existing >= 5) {
        throw new BadRequestException('You already have 5 active referral codes. Wait for some to be redeemed.');
      }

      const code = crypto.randomBytes(5).toString('hex').toUpperCase();

      return this.prisma.referral.create({
        data: { senderId: userId, code },
        select: { id: true, code: true, converted: true, createdAt: true },
      });
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Generate referral code failed', error.message);
      throw new InternalServerErrorException('Failed to generate referral code.');
    }
  }

  async redeemCode(userId: string, code: string) {
    try {
      const referral = await this.prisma.referral.findUnique({ where: { code } });

      if (!referral) throw new NotFoundException('Referral code not found');
      if (referral.converted) throw new BadRequestException('This referral code has already been used');
      if (referral.senderId === userId) throw new BadRequestException('You cannot redeem your own referral code');

      // Check if user already redeemed a code
      const alreadyRedeemed = await this.prisma.referral.findFirst({
        where: { receiverId: userId },
      });
      if (alreadyRedeemed) throw new BadRequestException('You have already redeemed a referral code');

      await this.prisma.referral.update({
        where: { code },
        data: { converted: true, receiverId: userId },
      });
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) throw error;
      this.logger.error('Redeem referral code failed', error.message);
      throw new InternalServerErrorException('Failed to redeem referral code.');
    }
  }

  async listMyCodes(userId: string) {
    try {
      return this.prisma.referral.findMany({
        where: { senderId: userId },
        select: { id: true, code: true, converted: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error: any) {
      this.logger.error('List referral codes failed', error.message);
      throw new InternalServerErrorException('Failed to list referral codes.');
    }
  }
}
