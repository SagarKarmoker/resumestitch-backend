import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Res,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtGuard } from '../auth/guards/optional-jwt.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { GenerationService } from './generation.service';
import { User } from '../generated/prisma';
import { GeneratePackageDto, RegenerateSectionDto, FeedbackDto, JdAnalysisDto, AtsCheckDto } from './dto/generation.dto';

@ApiTags('generation')
@Controller('generation')
export class GenerationController {
  constructor(private readonly generationService: GenerationService) {}

  /**
   * Analyze a job description — guest + authenticated
   */
  @Post('analyze-jd')
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Analyze a job description and extract key information' })
  @HttpCode(HttpStatus.OK)
  async analyzeJd(@Body() body: JdAnalysisDto) {
    return this.generationService.analyzeJobDescription(body.jobDescription);
  }

  /**
   * Generate full application package — streams via SSE
   * Works for guests (no auth) and authenticated users
   */
  @Post('package/stream')
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Generate a full application package (SSE stream)' })
  async generatePackageStream(
    @Body() dto: GeneratePackageDto,
    @CurrentUser() user: User | null,
    @Res() res: Response,
  ) {
    await this.generationService.generatePackageStream(dto, user, res);
  }

  /**
   * Regenerate a specific resume section (Pro feature, authenticated)
   */
  @Post(':generationId/regenerate-section')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Regenerate a specific section of the resume' })
  async regenerateSection(
    @Param('generationId') generationId: string,
    @Body() body: RegenerateSectionDto,
    @CurrentUser() user: User,
  ) {
    return this.generationService.regenerateSection(
      generationId,
      user.id,
      body.section,
      body.instruction,
    );
  }

  /**
   * Generate interview prep questions (Career tier)
   */
  @Get(':generationId/interview-questions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate interview prep questions for a generation' })
  async getInterviewQuestions(
    @Param('generationId') generationId: string,
    @CurrentUser() user: User,
  ) {
    return this.generationService.generateInterviewQuestions(generationId, user.id);
  }

  /**
   * LinkedIn profile optimizer (Career tier)
   */
  @Get(':generationId/linkedin')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate LinkedIn headline and About section' })
  async optimizeLinkedIn(
    @Param('generationId') generationId: string,
    @CurrentUser() user: User,
  ) {
    return this.generationService.optimizeLinkedIn(generationId, user.id);
  }

  /**
   * Submit feedback on a generated output
   */
  @Post(':generationId/feedback')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit thumbs up/down feedback on a generated output' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async submitFeedback(
    @Param('generationId') generationId: string,
    @Body() body: FeedbackDto,
    @CurrentUser() user: User,
  ) {
    await this.generationService.submitFeedback(
      generationId,
      user.id,
      body.type,
      body.rating,
      body.note,
    );
  }

  /**
   * ATS checker — completely public, no login required
   */
  @Post('ats-check')
  @Public()
  @ApiOperation({ summary: 'Free ATS keyword match checker (no login required)' })
  @HttpCode(HttpStatus.OK)
  async atsCheck(@Body() body: AtsCheckDto) {
    return this.generationService.checkAts(body.jobDescription, body.resumeText);
  }

  /**
   * Get presigned download URL for a generated PDF
   */
  @Get(':generationId/pdf/:type')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get presigned URL for a generated PDF (resume | cover-letter | email)' })
  async getPdfUrl(
    @Param('generationId') generationId: string,
    @Param('type') type: string,
    @CurrentUser() user: User,
  ) {
    const url = await this.generationService.getPdfDownloadUrl(
      generationId,
      user.id,
      type as 'resume' | 'cover-letter' | 'email',
    );
    return { url };
  }
}
