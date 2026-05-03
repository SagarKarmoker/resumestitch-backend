import { IsOptional, IsString, IsEnum, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CoverLetterTone, SeniorityLevel } from '@generated/prisma';

export class UpdatePreferencesDto {
  @ApiPropertyOptional({ enum: CoverLetterTone, example: 'PROFESSIONAL', description: 'Default tone for cover letters' })
  @IsOptional()
  @IsEnum(CoverLetterTone)
  defaultTone?: CoverLetterTone;

  @ApiPropertyOptional({ example: 'Software Engineering', description: 'Target industry for job applications' })
  @IsOptional()
  @IsString()
  targetIndustry?: string;

  @ApiPropertyOptional({ enum: SeniorityLevel, example: 'MID', description: 'User seniority level' })
  @IsOptional()
  @IsEnum(SeniorityLevel)
  seniorityLevel?: SeniorityLevel;

  @ApiPropertyOptional({ example: 'John', description: 'Preferred name for cover letters' })
  @IsOptional()
  @IsString()
  preferredName?: string;

  @ApiPropertyOptional({ example: 'john@example.com', description: 'Default contact email' })
  @IsOptional()
  @IsString()
  contactEmail?: string;

  @ApiPropertyOptional({ example: '+1234567890', description: 'Default contact phone' })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional({ example: 'https://linkedin.com/in/johndoe', description: 'LinkedIn profile URL' })
  @IsOptional()
  @IsString()
  linkedinUrl?: string;

  @ApiPropertyOptional({ example: 'https://johndoe.dev', description: 'Portfolio or personal website URL' })
  @IsOptional()
  @IsString()
  portfolioUrl?: string;

  @ApiPropertyOptional({ example: true, description: 'Enable email notifications' })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiPropertyOptional({ example: 5, description: 'Maximum number of resume versions to keep', minimum: 1, maximum: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  resumeVersionLimit?: number;
}