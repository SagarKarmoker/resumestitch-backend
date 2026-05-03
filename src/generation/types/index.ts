import { CoverLetterTone } from '../../generated/prisma';

export interface GeneratePackageDto {
  jobDescription: string;
  resumeText?: string;
  baseResumeId?: string;
  coverLetterTone?: CoverLetterTone;
}

export interface JdAnalysisResult {
  roleTitle: string;
  seniority: string;
  companyName: string | null;
  requiredSkills: string[];
  preferredSkills: string[];
  keyActionVerbs: string[];
  industry: string;
  tone: string;
}