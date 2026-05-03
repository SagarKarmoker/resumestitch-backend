export interface ParsedResume {
  text: string;
  confidence: number;
  warning?: string;
}

export interface CreateBaseResumeDto {
  name: string;
}