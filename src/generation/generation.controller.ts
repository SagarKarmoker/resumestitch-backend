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
import { IsString, IsOptional, IsEnum, MinLength, IsIn } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtGuard } from '../auth/guards/optional-jwt.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { GenerationService } from './generation.service';
import { User, CoverLetterTone } from '../generated/prisma';

class GeneratePackageDto {
  @IsString()
  @MinLength(50)
  jobDescription: string;

  @IsOptional()
  @IsString()
  resumeText?: string;

  @IsOptional()
  @IsString()
  baseResumeId?: string;

  @IsOptional()
  @IsEnum(CoverLetterTone)
  coverLetterTone?: CoverLetterTone;
}

class RegenerateSectionDto {
  @IsString()
  section: string;

  @IsOptional()
  @IsString()
  instruction?: string;
}

class FeedbackDto {
  @IsIn(['resume', 'coverLetter', 'email'])
  type: 'resume' | 'coverLetter' | 'email';

  @IsIn([1, -1])
  rating: 1 | -1;

  @IsOptional()
  @IsString()
  note?: string;
}

class AtsCheckDto {
  @IsString()
  @MinLength(20)
  jobDescription: string;

  @IsString()
  @MinLength(20)
  resumeText: string;
}

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
  async analyzeJd(@Body() body: { jobDescription: string }) {
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
}
