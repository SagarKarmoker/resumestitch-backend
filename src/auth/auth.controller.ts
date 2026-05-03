import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Request,
  BadRequestException,
  UnauthorizedException,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Public } from './decorators/public.decorator';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto, ChangePasswordDto } from './dto/auth.dto';
import { AuthResponse } from './types';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto): Promise<AuthResponse> {
    try {
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (existing) {
        throw new BadRequestException('Email already registered');
      }

      const passwordHash = await bcrypt.hash(dto.password, 12);

      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          password: passwordHash,
          fullName: dto.fullName || null,
          preferences: {
            create: {},
          },
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          avatarUrl: true,
          tier: true,
        },
      });

      const payload = { sub: user.id, email: user.email };
      const accessToken = this.jwt.sign(payload);

      return {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          avatarUrl: user.avatarUrl,
          tier: user.tier,
        },
      };
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Registration failed', error.message);
      throw new InternalServerErrorException('Registration failed. Please try again.');
    }
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto): Promise<AuthResponse> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid email or password');
      }

      const valid = await bcrypt.compare(dto.password, user.password);
      if (!valid) {
        throw new UnauthorizedException('Invalid email or password');
      }

      const payload = { sub: user.id, email: user.email };
      const accessToken = this.jwt.sign(payload);

      return {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          avatarUrl: user.avatarUrl,
          tier: user.tier,
        },
      };
    } catch (error: any) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.error('Login failed', error.message);
      throw new InternalServerErrorException('Login failed. Please try again.');
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout() {}

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (!user) {
        return;
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000);

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken,
          resetTokenExpiry,
        },
      });

      const resetUrl = `${this.config.get('FRONTEND_URL')}/auth/reset-password?token=${resetToken}`;
      this.logger.log(`Password reset link: ${resetUrl}`);
    } catch (error: any) {
      this.logger.error('Forgot password failed', error.message);
    }
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          resetToken: dto.token,
          resetTokenExpiry: {
            gt: new Date(),
          },
        },
      });

      if (!user) {
        throw new BadRequestException('Invalid or expired reset token');
      }

      const passwordHash = await bcrypt.hash(dto.newPassword, 12);

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          password: passwordHash,
          resetToken: null,
          resetTokenExpiry: null,
        },
      });
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Reset password failed', error.message);
      throw new InternalServerErrorException('Password reset failed. Please try again.');
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: req.user.id },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const valid = await bcrypt.compare(dto.currentPassword, user.password);
      if (!valid) {
        throw new BadRequestException('Current password is incorrect');
      }

      const passwordHash = await bcrypt.hash(dto.newPassword, 12);

      await this.prisma.user.update({
        where: { id: user.id },
        data: { password: passwordHash },
      });
    } catch (error: any) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
      this.logger.error('Change password failed', error.message);
      throw new InternalServerErrorException('Password change failed. Please try again.');
    }
  }

@UseGuards(AuthGuard('jwt'))
  @Get('me')
  async me(@Request() req: any) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          fullName: true,
          avatarUrl: true,
          tier: true,
          createdAt: true,
        },
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      return user;
    } catch (error: any) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error('Get user failed', error.message);
      throw new InternalServerErrorException('Failed to get user info. Please try again.');
    }
  }
}