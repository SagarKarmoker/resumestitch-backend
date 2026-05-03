import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class CreateProductFeedbackDto {
  @ApiProperty({
    description: 'Free-form feedback',
    example: 'Love the ATS tab — PDF export would help.',
    minLength: 5,
    maxLength: 5000,
  })
  @IsString()
  @Length(5, 5000, { message: 'Message must be between 5 and 5000 characters' })
  message!: string;

  @ApiPropertyOptional({ description: 'Optional category slug', enum: ['general', 'idea', 'bug', 'ui', 'billing', 'other'] })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  @Matches(/^[a-z0-9_-]+$/i, { message: 'category must be alphanumeric' })
  category?: string;

  @ApiPropertyOptional({
    description: 'Client pathname when feedback was submitted (e.g. /app/studio)',
    example: '/app/studio',
  })
  @IsOptional()
  @IsString()
  @Length(0, 2048)
  pageUrl?: string;
}
