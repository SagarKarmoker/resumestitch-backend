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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GenerationService } from './generation.service';
import { User } from '@generated/prisma';
import { GeneratePackageDto, RegenerateSectionDto, FeedbackDto, JdAnalysisDto, AtsCheckDto } from './dto/generation.dto';

@ApiTags('generation')
@Controller('generation')
export class GenerationController {
  constructor(private readonly generationService: GenerationService) {}

  /**
   * Analyze a job description (authenticated)
   */
  @Post('analyze-jd')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Analyze a job description', description: 'Extract company name, role, skills, seniority from job description' })
  @ApiResponse({ status: 200, description: 'JD analysis result', example: { companyName: 'Google', roleTitle: 'Senior Software Engineer', seniority: 'SENIOR', requiredSkills: ['React', 'Node.js', 'TypeScript'], preferredSkills: ['GraphQL', 'AWS'] } })
  @HttpCode(HttpStatus.OK)
  async analyzeJd(@Body() body: JdAnalysisDto) {
    return this.generationService.analyzeJobDescription(body.jobDescription);
  }

  /**
   * Generate full application package — streams via SSE
   */
  @Post('package/stream')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate application package', description: 'Generate tailored resume, cover letter, and email via SSE stream' })
  @ApiResponse({ status: 200, description: 'SSE stream with generated content chunks' })
  @ApiResponse({ status: 400, description: 'Invalid job description or resume' })
  @ApiResponse({ status: 403, description: 'Upgrade required for this feature' })
  async generatePackageStream(
    @Body() dto: GeneratePackageDto,
    @CurrentUser() user: User,
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
  @ApiOperation({ summary: 'Submit feedback', description: 'Rate generated output with thumbs up/down (1 or -1)' })
  @ApiResponse({ status: 204, description: 'Feedback recorded successfully' })
  @ApiResponse({ status: 404, description: 'Generation not found' })
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
   * ATS checker (authenticated)
   */
  @Post('ats-check')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ATS keyword checker', description: 'Check resume against job description for keyword matching' })
  @ApiResponse({ status: 200, description: 'ATS score and keywords', example: { atsScore: 85, matchedKeywords: ['React', 'TypeScript', 'Node.js'], missingKeywords: ['AWS', 'GraphQL'] } })
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

  /**
   * Full generation snapshot for history viewer (text + PDF availability)
   */
  @Get(':generationId/detail')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get generation detail for dashboard viewer',
    description: 'Returns stored JD, resume snapshot, tailored outputs, and which PDFs are available.',
  })
  async getGenerationDetail(
    @Param('generationId') generationId: string,
    @CurrentUser() user: User,
  ) {
    return this.generationService.getGenerationDetail(generationId, user.id);
  }
}
