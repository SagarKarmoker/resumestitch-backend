import { IsString, IsOptional, IsEnum, MinLength, MaxLength, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CoverLetterTone } from '@generated/prisma';

export class GeneratePackageDto {
  @ApiProperty({ 
    example: 'We are looking for a Senior Software Engineer to join our team...', 
    description: 'Full job description text (min 50, max 15000 chars)',
    minLength: 50,
    maxLength: 15000
  })
  @IsString()
  @MinLength(50)
  @MaxLength(15000)
  jobDescription: string;

  @ApiPropertyOptional({ 
    example: 'John Doe\nSoftware Engineer\nExperience: 5 years...', 
    description: 'Resume text content (if not using baseResumeId)',
    maxLength: 15000
  })
  @IsOptional()
  @IsString()
  @MaxLength(15000)
  resumeText?: string;

  @ApiPropertyOptional({ 
    example: '123e4567-e89b-12d3-a456-426614174000', 
    description: 'ID of a previously saved base resume' 
  })
  @IsOptional()
  @IsString()
  baseResumeId?: string;

  @ApiPropertyOptional({ 
    enum: CoverLetterTone, 
    example: 'PROFESSIONAL', 
    description: 'Tone for the generated cover letter' 
  })
  @IsOptional()
  @IsEnum(CoverLetterTone)
  coverLetterTone?: CoverLetterTone;
}

export class RegenerateSectionDto {
  @ApiProperty({ 
    enum: ['resume', 'coverLetter', 'email', 'summary'], 
    example: 'coverLetter', 
    description: 'Section to regenerate' 
  })
  @IsString()
  section: string;

  @ApiPropertyOptional({ 
    example: 'Make it more formal', 
    description: 'Custom instruction for regeneration' 
  })
  @IsOptional()
  @IsString()
  instruction?: string;
}

export class FeedbackDto {
  @ApiProperty({ 
    enum: ['resume', 'coverLetter', 'email'], 
    example: 'coverLetter', 
    description: 'Which output to rate' 
  })
  @IsIn(['resume', 'coverLetter', 'email'])
  type: 'resume' | 'coverLetter' | 'email';

  @ApiProperty({ 
    enum: [1, -1], 
    example: 1, 
    description: 'Rating: 1 = thumbs up, -1 = thumbs down' 
  })
  @IsIn([1, -1])
  rating: 1 | -1;

  @ApiPropertyOptional({ 
    example: 'Great keyword optimization!', 
    description: 'Optional feedback note' 
  })
  @IsOptional()
  @IsString()
  note?: string;
}

export class JdAnalysisDto {
  @ApiProperty({ 
    example: 'We are looking for a Senior Software Engineer with React and Node.js experience...', 
    description: 'Job description to analyze',
    minLength: 20,
    maxLength: 15000
  })
  @IsString()
  @MinLength(20)
  @MaxLength(15000)
  jobDescription: string;
}

export class AtsCheckDto {
  @ApiProperty({ 
    example: 'We are looking for a Senior Software Engineer with React and Node.js experience...', 
    description: 'Job description for ATS matching',
    minLength: 20,
    maxLength: 15000
  })
  @IsString()
  @MinLength(20)
  @MaxLength(15000)
  jobDescription: string;

  @ApiProperty({ 
    example: 'John Doe\nSoftware Engineer\n5 years experience with React...', 
    description: 'Resume text to check against JD',
    minLength: 20,
    maxLength: 15000
  })
  @IsString()
  @MinLength(20)
  @MaxLength(15000)
  resumeText: string;
}