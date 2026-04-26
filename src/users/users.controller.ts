import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UsersService, UpdatePreferencesDto } from './users.service';
import { User } from '../generated/prisma';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser() user: User) {
    return this.usersService.getProfile(user.id);
  }

  @Get('me/preferences')
  @ApiOperation({ summary: 'Get user preferences' })
  async getPreferences(@CurrentUser() user: User) {
    return this.usersService.getPreferences(user.id);
  }

  @Patch('me/preferences')
  @ApiOperation({ summary: 'Update user preferences' })
  async updatePreferences(
    @CurrentUser() user: User,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.usersService.updatePreferences(user.id, dto);
  }

  @Get('me/dashboard')
  @ApiOperation({ summary: 'Get usage dashboard stats' })
  async getDashboard(@CurrentUser() user: User) {
    return this.usersService.getUsageDashboard(user.id);
  }

  @Get('me/history')
  @ApiOperation({ summary: 'Get generation history (paginated)' })
  async getHistory(
    @CurrentUser() user: User,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.usersService.getGenerationHistory(user.id, page, Math.min(limit, 50));
  }

  @Get('me/export')
  @ApiOperation({ summary: 'Export all user data (GDPR)' })
  async exportData(@CurrentUser() user: User) {
    return this.usersService.exportUserData(user.id);
  }

  @Delete('me')
  @ApiOperation({ summary: 'Delete account and all data' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAccount(@CurrentUser() user: User) {
    await this.usersService.deleteAccount(user.id);
  }
}
