import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class ParseResumeDto {
  // No body fields — file only
}

export class SaveResumeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}

export class RenameResumeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}