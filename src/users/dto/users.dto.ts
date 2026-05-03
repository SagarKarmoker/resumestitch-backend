import { IsOptional, IsString, IsEnum, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { CoverLetterTone, SeniorityLevel } from '../../generated/prisma';

export class UpdatePreferencesDto {
  @IsOptional()
  @IsEnum(CoverLetterTone)
  defaultTone?: CoverLetterTone;

  @IsOptional()
  @IsString()
  targetIndustry?: string;

  @IsOptional()
  @IsEnum(SeniorityLevel)
  seniorityLevel?: SeniorityLevel;

  @IsOptional()
  @IsString()
  preferredName?: string;

  @IsOptional()
  @IsString()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  linkedinUrl?: string;

  @IsOptional()
  @IsString()
  portfolioUrl?: string;

  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  resumeVersionLimit?: number;
}