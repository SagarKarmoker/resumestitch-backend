import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ParseResumeDto {
  // No body fields — file only (upload via multipart/form-data)
}

export class SaveResumeDto {
  @ApiProperty({ example: 'Software Engineer Resume 2024', description: 'Name for the saved resume' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}

export class RenameResumeDto {
  @ApiProperty({ example: 'Updated Resume', description: 'New name for the resume' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}