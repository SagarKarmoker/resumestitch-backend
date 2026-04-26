import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import { ResumeService } from '../resume/resume.service';
import { User, CoverLetterTone } from '../generated/prisma';
import {
  RESUME_SYSTEM_PROMPT,
  COVER_LETTER_SYSTEM_PROMPT,
  EMAIL_SYSTEM_PROMPT,
  JD_ANALYSIS_PROMPT,
  SECTION_REGENERATION_PROMPT,
  FOLLOW_UP_EMAIL_PROMPT,
  INTERVIEW_QUESTIONS_PROMPT,
  LINKEDIN_OPTIMIZER_PROMPT,
} from './prompts';

export interface GeneratePackageDto {
  jobDescription: string;
  resumeText?: string;
  baseResumeId?: string;
  coverLetterTone?: CoverLetterTone;
}

export interface JdAnalysisResult {
  roleTitle: string;
  seniority: string;
  companyName: string | null;
  requiredSkills: string[];
  preferredSkills: string[];
  keyActionVerbs: string[];
  industry: string;
  tone: string;
}

@Injectable()
export class GenerationService {
  private readonly logger = new Logger(GenerationService.name);
  private readonly openai: OpenAI;
  private readonly defaultModel: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly resumeService: ResumeService,
  ) {
    this.openai = new OpenAI({
      apiKey: config.get<string>('OPENROUTER_API_KEY'),
      baseURL: config.get<string>('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1'),
      defaultHeaders: {
        'HTTP-Referer': config.get<string>('FRONTEND_URL', 'http://localhost:5173'),
        'X-Title': 'ResumeForge AI',
      },
    });

    this.defaultModel = config.get<string>('OPENROUTER_DEFAULT_MODEL', 'google/gemini-2.0-flash-001');
  }

  // ─── JD Analysis ─────────────────────────────────────────────────────────

  async analyzeJobDescription(jobDescription: string): Promise<JdAnalysisResult> {
    const response = await this.callAI(
      JD_ANALYSIS_PROMPT,
      `Analyze this job description:\n\n${jobDescription}`,
    );
    return this.parseJson<JdAnalysisResult>(response);
  }

  // ─── Full Package Generation ──────────────────────────────────────────────

  /**
   * Generate a complete application package and stream results via SSE
   */
  async generatePackageStream(
    dto: GeneratePackageDto,
    user: User | null,
    res: Response,
  ): Promise<void> {
    const { jobDescription, resumeText: rawResumeText, baseResumeId, coverLetterTone } = dto;

    if (!jobDescription || jobDescription.trim().length < 50) {
      throw new BadRequestException('Job description must be at least 50 characters.');
    }

    let resumeText = rawResumeText;

    // Load from vault if baseResumeId provided
    if (baseResumeId && user) {
      const base = await this.resumeService.getBaseResume(baseResumeId, user.id);
      resumeText = base.extractedText;
      await this.resumeService.markResumeUsed(baseResumeId);
    }

    if (!resumeText || resumeText.trim().length < 50) {
      throw new BadRequestException('Resume text must be at least 50 characters.');
    }

    const tone = coverLetterTone || CoverLetterTone.PROFESSIONAL;

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const sendEvent = (event: string, data: object) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      // Step 1: Analyze JD (fast, non-streamed)
      sendEvent('status', { type: 'analyzing', message: 'Analyzing job description...' });
      const jdAnalysis = await this.analyzeJobDescription(jobDescription);
      sendEvent('jd_analysis', jdAnalysis);

      // Step 2: Generate all 3 in parallel — each streams its own token events
      sendEvent('status', { type: 'generating', message: 'Generating your application package...' });

      const [resumeResult, coverLetterResult, emailResult] = await Promise.allSettled([
        this.streamResume(jobDescription, resumeText, (token) =>
          sendEvent('resume_token', { token }),
        ),
        this.streamCoverLetter(jobDescription, resumeText, tone, jdAnalysis, (token) =>
          sendEvent('cover_letter_token', { token }),
        ),
        this.streamEmail(jobDescription, resumeText, jdAnalysis, (token) =>
          sendEvent('email_token', { token }),
        ),
      ]);

      const resume = resumeResult.status === 'fulfilled' ? resumeResult.value : null;
      const coverLetter = coverLetterResult.status === 'fulfilled' ? coverLetterResult.value : null;
      const email = emailResult.status === 'fulfilled' ? emailResult.value : null;

      // Step 3: Persist generation record
      let generationId: string | null = null;
      if (user) {
        const generation = await this.prisma.generation.create({
          data: {
            userId: user.id,
            baseResumeId: baseResumeId || null,
            jobDescription,
            resumeText,
            companyName: jdAnalysis.companyName,
            roleTitle: jdAnalysis.roleTitle,
            seniority: jdAnalysis.seniority,
            requiredSkills: jdAnalysis.requiredSkills,
            preferredSkills: jdAnalysis.preferredSkills,
            tailoredResume: resume || undefined,
            coverLetter: coverLetter || undefined,
            applicationEmail: email || undefined,
            coverLetterTone: tone,
            atsScore: resume?.atsScore || null,
            matchedKeywords: resume?.matchedKeywords || [],
            missingKeywords: resume?.missingKeywords || [],
            modelUsed: this.defaultModel,
          },
        });
        generationId = generation.id;

        // Auto-create application tracker entry
        if (jdAnalysis.companyName && jdAnalysis.roleTitle) {
          await this.prisma.application.create({
            data: {
              userId: user.id,
              generationId: generation.id,
              companyName: jdAnalysis.companyName,
              roleTitle: jdAnalysis.roleTitle,
            },
          });
        }
      }

      sendEvent('complete', {
        generationId,
        resume,
        coverLetter,
        email,
        jdAnalysis,
        atsScore: resume?.atsScore,
        matchedKeywords: resume?.matchedKeywords,
        missingKeywords: resume?.missingKeywords,
      });

    } catch (error) {
      this.logger.error('Generation failed', error);
      sendEvent('error', { message: error.message || 'Generation failed. Please try again.' });
    } finally {
      res.end();
    }
  }

  // ─── Individual Output Streams ────────────────────────────────────────────

  private async streamResume(
    jd: string,
    resumeText: string,
    onToken: (token: string) => void,
  ): Promise<any> {
    const fullText = await this.streamCompletion(
      RESUME_SYSTEM_PROMPT,
      `Job Description:\n${jd}\n\nMy Current Resume:\n${resumeText}`,
      onToken,
    );

    return this.parseJson(fullText);
  }

  private async streamCoverLetter(
    jd: string,
    resumeText: string,
    tone: CoverLetterTone,
    jdAnalysis: JdAnalysisResult,
    onToken: (token: string) => void,
  ): Promise<string> {
    const toneInstruction = {
      PROFESSIONAL: 'Use a formal, structured, and professional tone.',
      CONVERSATIONAL: 'Use a warm, personal, and natural first-person tone.',
      ASSERTIVE: 'Use a confident, direct, achievement-first tone.',
    }[tone];

    const systemPrompt = `${COVER_LETTER_SYSTEM_PROMPT}\n\nTONE INSTRUCTION: ${toneInstruction}`;

    return this.streamCompletion(
      systemPrompt,
      `Job Description:\n${jd}\n\nMy Resume:\n${resumeText}\n\nCompany: ${jdAnalysis.companyName || 'Unknown'}\nRole: ${jdAnalysis.roleTitle}`,
      onToken,
    );
  }

  private async streamEmail(
    jd: string,
    resumeText: string,
    jdAnalysis: JdAnalysisResult,
    onToken: (token: string) => void,
  ): Promise<any> {
    const fullText = await this.streamCompletion(
      EMAIL_SYSTEM_PROMPT,
      `Job Description:\n${jd}\n\nMy Resume:\n${resumeText}\n\nRole: ${jdAnalysis.roleTitle}`,
      onToken,
    );

    return this.parseJson(fullText);
  }

  // ─── Section-Level Regeneration ───────────────────────────────────────────

  async regenerateSection(
    generationId: string,
    userId: string,
    section: string,
    instruction?: string,
  ): Promise<any> {
    const generation = await this.prisma.generation.findFirst({
      where: { id: generationId, userId },
    });

    if (!generation) {
      throw new BadRequestException('Generation not found');
    }

    const prompt = `Section to regenerate: ${section}\n${instruction ? `Additional instruction: ${instruction}\n` : ''}` +
      `Job Description:\n${generation.jobDescription}\n\nOriginal Resume:\n${generation.resumeText}`;

    const result = await this.callAI(SECTION_REGENERATION_PROMPT, prompt);
    return { section, content: result };
  }

  // ─── Follow-up Email ──────────────────────────────────────────────────────

  async generateFollowUpEmail(applicationId: string, userId: string): Promise<{ subject: string; body: string }> {
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, userId },
      include: { generation: { select: { jobDescription: true } } },
    });

    if (!application) {
      throw new BadRequestException('Application not found');
    }

    const prompt = `Company: ${application.companyName}\nRole: ${application.roleTitle}\nApplied on: ${application.appliedAt.toDateString()}\n${
      application.generation?.jobDescription
        ? `\nOriginal Job Description:\n${application.generation.jobDescription}`
        : ''
    }`;

    const result = await this.callAI(FOLLOW_UP_EMAIL_PROMPT, prompt);
    return this.parseJson<{ subject: string; body: string }>(result);
  }

  // ─── Interview Prep ───────────────────────────────────────────────────────

  async generateInterviewQuestions(generationId: string, userId: string): Promise<any> {
    const generation = await this.prisma.generation.findFirst({
      where: { id: generationId, userId },
    });

    if (!generation) {
      throw new BadRequestException('Generation not found');
    }

    const prompt = `Job Description:\n${generation.jobDescription}\n\nCandidate Resume:\n${generation.resumeText}`;
    const result = await this.callAI(INTERVIEW_QUESTIONS_PROMPT, prompt);
    return this.parseJson(result);
  }

  // ─── LinkedIn Optimizer ───────────────────────────────────────────────────

  async optimizeLinkedIn(generationId: string, userId: string): Promise<any> {
    const generation = await this.prisma.generation.findFirst({
      where: { id: generationId, userId },
    });

    if (!generation) {
      throw new BadRequestException('Generation not found');
    }

    const prompt = `Job Description:\n${generation.jobDescription}\n\nResume:\n${generation.resumeText}`;
    const result = await this.callAI(LINKEDIN_OPTIMIZER_PROMPT, prompt);
    return this.parseJson(result);
  }

  // ─── Feedback ────────────────────────────────────────────────────────────

  async submitFeedback(
    generationId: string,
    userId: string,
    type: 'resume' | 'coverLetter' | 'email',
    rating: 1 | -1,
    note?: string,
  ): Promise<void> {
    const generation = await this.prisma.generation.findFirst({
      where: { id: generationId, userId },
    });

    if (!generation) {
      throw new BadRequestException('Generation not found');
    }

    await this.prisma.generation.update({
      where: { id: generationId },
      data: {
        resumeRating: type === 'resume' ? rating : generation.resumeRating,
        coverLetterRating: type === 'coverLetter' ? rating : generation.coverLetterRating,
        emailRating: type === 'email' ? rating : generation.emailRating,
        feedbackNote: note || generation.feedbackNote,
      },
    });
  }

  // ─── ATS Checker (Public Tool) ────────────────────────────────────────────

  async checkAts(jobDescription: string, resumeText: string): Promise<{
    score: number;
    matchedKeywords: string[];
    missingKeywords: string[];
    label: string;
  }> {
    const prompt = `Analyze the ATS keyword match between this job description and resume.

Job Description:
${jobDescription}

Resume:
${resumeText}

Return JSON: { "matchedKeywords": [...], "missingKeywords": [...] }`;

    const result = await this.callAI(
      'You are an ATS keyword analysis expert. Return only valid JSON.',
      prompt,
    );

    const parsed = this.parseJson<{ matchedKeywords: string[]; missingKeywords: string[] }>(result);
    const total = parsed.matchedKeywords.length + parsed.missingKeywords.length;
    const score = total > 0 ? Math.round((parsed.matchedKeywords.length / total) * 100) : 0;

    return {
      score,
      matchedKeywords: parsed.matchedKeywords,
      missingKeywords: parsed.missingKeywords,
      label: score >= 80 ? 'Strong Match' : score >= 60 ? 'Good Match' : 'Needs Improvement',
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private async streamCompletion(
    systemPrompt: string,
    userMessage: string,
    onToken: (token: string) => void,
    model?: string,
  ): Promise<string> {
    const stream = await this.openai.chat.completions.create({
      model: model || this.defaultModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      stream: true,
      temperature: 0.7,
      max_tokens: 4096,
    });

    let fullText = '';

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content || '';
      if (token) {
        fullText += token;
        onToken(token);
      }
    }

    return fullText;
  }

  private async callAI(systemPrompt: string, userMessage: string, model?: string): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: model || this.defaultModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      stream: false,
      temperature: 0.3,
      max_tokens: 4096,
    });

    return response.choices[0]?.message?.content || '';
  }

  private parseJson<T>(text: string): T {
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) ||
                        text.match(/(\{[\s\S]*\})/);

      const jsonStr = jsonMatch ? jsonMatch[1] : text.trim();
      return JSON.parse(jsonStr) as T;
    } catch {
      this.logger.warn('Failed to parse AI JSON response', text.substring(0, 200));
      throw new InternalServerErrorException('AI returned an unexpected format. Please try again.');
    }
  }
}
