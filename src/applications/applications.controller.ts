import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApplicationsService, UpdateApplicationDto } from './applications.service';
import { User, ApplicationStatus } from '../generated/prisma';
import { IsEnum } from 'class-validator';

class UpdateStatusDto {
  @IsEnum(ApplicationStatus)
  status: ApplicationStatus;
}

@ApiTags('applications')
@Controller('applications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Get()
  @ApiOperation({ summary: 'List all application tracker entries (Kanban board data)' })
  async listApplications(@CurrentUser() user: User) {
    return this.applicationsService.listApplications(user.id);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get application board stats by status' })
  async getBoardStats(@CurrentUser() user: User) {
    return this.applicationsService.getBoardStats(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single application detail' })
  async getApplication(@Param('id') id: string, @CurrentUser() user: User) {
    return this.applicationsService.getApplication(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update application details (notes, recruiter, job URL)' })
  async updateApplication(
    @Param('id') id: string,
    @Body() dto: UpdateApplicationDto,
    @CurrentUser() user: User,
  ) {
    return this.applicationsService.updateApplication(id, user.id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Move application to a different status (Kanban drag)' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateStatusDto,
    @CurrentUser() user: User,
  ) {
    return this.applicationsService.updateStatus(id, user.id, body.status);
  }

  @Get(':id/follow-up')
  @ApiOperation({ summary: 'Generate a follow-up email for a stale application' })
  async generateFollowUp(@Param('id') id: string, @CurrentUser() user: User) {
    return this.applicationsService.generateFollowUp(id, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an application tracker entry' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteApplication(@Param('id') id: string, @CurrentUser() user: User) {
    await this.applicationsService.deleteApplication(id, user.id);
  }
}
