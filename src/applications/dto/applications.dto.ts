import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicationStatus } from '@generated/prisma';

export class UpdateStatusDto {
  @ApiProperty({ 
    enum: ApplicationStatus, 
    example: 'INTERVIEW', 
    description: 'New application status' 
  })
  @IsEnum(ApplicationStatus)
  status: ApplicationStatus;
}

export class UpdateApplicationDto {
  @ApiPropertyOptional({ 
    enum: ApplicationStatus, 
    example: 'INTERVIEW', 
    description: 'Application status' 
  })
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @ApiPropertyOptional({ 
    example: 'Jane Smith', 
    description: 'Recruiter name',
    maxLength: 100 
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  recruiterName?: string;

  @ApiPropertyOptional({ 
    example: 'jane@company.com', 
    description: 'Recruiter email address' 
  })
  @IsOptional()
  @IsString()
  recruiterEmail?: string;

  @ApiPropertyOptional({ 
    example: 'Had a great phone screening, moving to technical round', 
    description: 'Notes about the application',
    maxLength: 5000 
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @ApiPropertyOptional({ 
    example: 'https://careers.company.com/jobs/123', 
    description: 'Link to original job posting or application',
    maxLength: 500 
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  applicationUrl?: string;

  @ApiPropertyOptional({ 
    example: '$120,000 - $150,000', 
    description: 'Salary range (if disclosed)' 
  })
  @IsOptional()
  @IsString()
  salary?: string;

  @ApiPropertyOptional({ 
    example: 'San Francisco, CA', 
    description: 'Job location',
    maxLength: 50 
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  location?: string;
}