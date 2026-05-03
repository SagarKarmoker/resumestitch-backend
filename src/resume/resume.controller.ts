import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ResumeService } from './resume.service';
import { User } from '../generated/prisma';
import { ParseResumeDto, SaveResumeDto, RenameResumeDto } from './dto/resume.dto';

const MAX_PDF_SIZE = 5 * 1024 * 1024; // 5 MB

@ApiTags('resume')
@Controller('resume')
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  /**
   * Parse a PDF resume (authenticated)
   */
  @Post('parse')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Parse a PDF resume and extract text' })
  @ApiConsumes('multipart/form-data')
  @HttpCode(HttpStatus.OK)
  async parsePdf(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_PDF_SIZE }),
          new FileTypeValidator({ fileType: 'application/pdf' }),
        ],
      }),
    )
    file: any,
  ) {
    return this.resumeService.parsePdf(file.buffer);
  }

  /**
   * Save a base resume to the vault (authenticated users only)
   */
  @Post('save')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save a PDF resume to the base resume vault' })
  @ApiConsumes('multipart/form-data')
  async saveResume(
    @CurrentUser() user: User,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_PDF_SIZE }),
          new FileTypeValidator({ fileType: 'application/pdf' }),
        ],
      }),
    )
    file: any,
    @Body() body: SaveResumeDto,
  ) {
    return this.resumeService.saveBaseResume(
      user,
      body.name,
      file.buffer,
      file.originalname,
      file.mimetype,
    );
  }

  /**
   * List all saved base resumes for the current user
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all saved base resumes' })
  async listResumes(@CurrentUser() user: User) {
    return this.resumeService.listBaseResumes(user.id);
  }

  /**
   * Get a single base resume's extracted text
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a base resume by ID' })
  async getResume(@Param('id') id: string, @CurrentUser() user: User) {
    return this.resumeService.getBaseResume(id, user.id);
  }

  /**
   * Rename a saved base resume
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rename a base resume' })
  async renameResume(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() body: RenameResumeDto,
  ) {
    return this.resumeService.renameBaseResume(id, user.id, body.name);
  }

  /**
   * Delete a saved base resume
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a base resume' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteResume(@Param('id') id: string, @CurrentUser() user: User) {
    await this.resumeService.deleteBaseResume(id, user.id);
  }
}
