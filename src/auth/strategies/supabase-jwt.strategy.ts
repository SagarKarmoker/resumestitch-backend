import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

export interface SupabaseJwtPayload {
  sub: string;         // Supabase user ID
  email: string;
  role: string;
  aud: string;
  exp: number;
  iat: number;
  app_metadata?: {
    provider?: string;
    providers?: string[];
  };
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
    name?: string;
  };
}

@Injectable()
export class SupabaseJwtStrategy extends PassportStrategy(Strategy, 'supabase-jwt') {
  private readonly logger = new Logger(SupabaseJwtStrategy.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('SUPABASE_JWT_SECRET'),
      audience: 'authenticated',
    });
  }

  async validate(payload: SupabaseJwtPayload) {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Upsert user in our DB on first auth or metadata changes
    const user = await this.prisma.user.upsert({
      where: { authId: payload.sub },
      update: {
        email: payload.email,
        fullName: payload.user_metadata?.full_name || payload.user_metadata?.name || null,
        avatarUrl: payload.user_metadata?.avatar_url || null,
      },
      create: {
        authId: payload.sub,
        email: payload.email,
        fullName: payload.user_metadata?.full_name || payload.user_metadata?.name || null,
        avatarUrl: payload.user_metadata?.avatar_url || null,
        preferences: {
          create: {},
        },
      },
    });

    return { ...user, authId: payload.sub };
  }
}
