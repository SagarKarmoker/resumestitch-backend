import { IsString, IsOptional, IsEnum, MinLength, MaxLength, IsIn } from 'class-validator';
import { CoverLetterTone } from '../../generated/prisma';

export class GeneratePackageDto {
  @IsString()
  @MinLength(50)
  @MaxLength(15000)
  jobDescription: string;

  @IsOptional()
  @IsString()
  @MaxLength(15000)
  resumeText?: string;

  @IsOptional()
  @IsString()
  baseResumeId?: string;

  @IsOptional()
  @IsEnum(CoverLetterTone)
  coverLetterTone?: CoverLetterTone;
}

export class RegenerateSectionDto {
  @IsString()
  section: string;

  @IsOptional()
  @IsString()
  instruction?: string;
}

export class FeedbackDto {
  @IsIn(['resume', 'coverLetter', 'email'])
  type: 'resume' | 'coverLetter' | 'email';

  @IsIn([1, -1])
  rating: 1 | -1;

  @IsOptional()
  @IsString()
  note?: string;
}

export class JdAnalysisDto {
  @IsString()
  @MinLength(20)
  @MaxLength(15000)
  jobDescription: string;
}

export class AtsCheckDto {
  @IsString()
  @MinLength(20)
  @MaxLength(15000)
  jobDescription: string;

  @IsString()
  @MinLength(20)
  @MaxLength(15000)
  resumeText: string;
}