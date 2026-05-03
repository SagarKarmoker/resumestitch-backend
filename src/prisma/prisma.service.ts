import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Prisma v7 NestJS service using composition.
 * Exposes all PrismaClient model accessors directly on the service
 * so services can use: this.prisma.user.findMany(), etc.
 */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly _client: PrismaClient;

  // Model accessors — exposed to match the PrismaClient interface
  get user() { return this._client.user; }
  get userPreferences() { return this._client.userPreferences; }
  get baseResume() { return this._client.baseResume; }
  get generation() { return this._client.generation; }
  get application() { return this._client.application; }
  get referral() { return this._client.referral; }
  get productFeedback() { return this._client.productFeedback; }

  // Transaction support
  get $transaction() { return this._client.$transaction.bind(this._client); }
  get $queryRaw() { return this._client.$queryRaw.bind(this._client); }
  get $executeRaw() { return this._client.$executeRaw.bind(this._client); }

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    const adapter = new PrismaPg({ connectionString });

    this._client = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development'
        ? [{ emit: 'event', level: 'query' }, 'error', 'warn']
        : ['error'],
    } as any);
  }

  async onModuleInit() {
    try {
      await (this._client as any).$connect();
      this.logger.log('Connected to Supabase PostgreSQL via Prisma');
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await (this._client as any).$disconnect();
  }
}
