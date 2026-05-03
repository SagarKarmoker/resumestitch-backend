import { Module } from '@nestjs/common';
import { GenerationController } from './generation.controller';
import { GenerationService } from './generation.service';
import { ResumeModule } from '../resume/resume.module';
import { PdfModule } from '../pdf/pdf.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [ResumeModule, PdfModule, StorageModule],
  controllers: [GenerationController],
  providers: [GenerationService],
  exports: [GenerationService],
})
export class GenerationModule {}
