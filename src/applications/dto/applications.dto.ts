import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { ApplicationStatus } from '../../generated/prisma';

export class UpdateStatusDto {
  @IsEnum(ApplicationStatus)
  status: ApplicationStatus;
}

export class UpdateApplicationDto {
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  recruiterName?: string;

  @IsOptional()
  @IsString()
  recruiterEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  applicationUrl?: string;

  @IsOptional()
  @IsString()
  salary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  location?: string;
}