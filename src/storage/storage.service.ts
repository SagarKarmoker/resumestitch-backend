import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface UploadResult {
  key: string;
  bucket: string;
  size: number;
  contentType: string;
  url: string;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client;
  private readonly resumesBucket: string;
  private readonly outputsBucket: string;
  private readonly endpoint: string;

  constructor(private readonly config: ConfigService) {
    this.endpoint = config.get<string>('S3_ENDPOINT');
    this.resumesBucket = config.get<string>('S3_BUCKET_RESUMES', 'resumes');
    this.outputsBucket = config.get<string>('S3_BUCKET_OUTPUTS', 'outputs');

    this.s3Client = new S3Client({
      forcePathStyle: true,
      region: config.get<string>('S3_REGION', 'ap-southeast-1'),
      endpoint: this.endpoint,
      credentials: {
        accessKeyId: config.get<string>('S3_ACCESS_KEY_ID'),
        secretAccessKey: config.get<string>('S3_SECRET_ACCESS_KEY'),
      },
    });
  }

  /**
   * Upload a resume PDF to Supabase Storage
   */
  async uploadResume(
    userId: string,
    fileName: string,
    buffer: Buffer,
    contentType: string = 'application/pdf',
  ): Promise<UploadResult> {
    const key = `${userId}/${Date.now()}_${fileName}`;
    return this.upload(this.resumesBucket, key, buffer, contentType);
  }

  /**
   * Upload a generated output PDF (resume, cover letter, email)
   */
  async uploadOutput(
    userId: string,
    generationId: string,
    type: 'resume' | 'cover-letter' | 'email',
    buffer: Buffer,
  ): Promise<UploadResult> {
    const key = `${userId}/${generationId}/${type}.pdf`;
    return this.upload(this.outputsBucket, key, buffer, 'application/pdf');
  }

  private async upload(
    bucket: string,
    key: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<UploadResult> {
    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
          ContentLength: buffer.length,
        }),
      );

      const url = `${this.endpoint}/${bucket}/${key}`;

      this.logger.log(`Uploaded ${key} to bucket ${bucket}`);

      return {
        key,
        bucket,
        size: buffer.length,
        contentType,
        url,
      };
    } catch (error) {
      this.logger.error(`Upload failed for ${key}`, error);
      throw new InternalServerErrorException('File upload failed');
    }
  }

  /**
   * Generate a short-lived presigned URL for downloading a private file
   */
  async getPresignedUrl(bucket: string, key: string, expiresIn = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({ Bucket: bucket, Key: key });
      return getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      this.logger.error(`Failed to generate presigned URL for ${key}`, error);
      throw new InternalServerErrorException('Could not generate download URL');
    }
  }

  async getResumeUrl(key: string, expiresIn = 3600): Promise<string> {
    return this.getPresignedUrl(this.resumesBucket, key, expiresIn);
  }

  async getOutputUrl(key: string, expiresIn = 3600): Promise<string> {
    return this.getPresignedUrl(this.outputsBucket, key, expiresIn);
  }

  /**
   * Download a file's buffer from storage
   */
  async download(bucket: string, key: string): Promise<Buffer> {
    try {
      const response = await this.s3Client.send(
        new GetObjectCommand({ Bucket: bucket, Key: key }),
      );

      const stream = response.Body as NodeJS.ReadableStream;
      const chunks: Buffer[] = [];

      return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });
    } catch (error) {
      this.logger.error(`Download failed for ${key}`, error);
      throw new InternalServerErrorException('File download failed');
    }
  }

  /**
   * Delete a file from storage
   */
  async delete(bucket: string, key: string): Promise<void> {
    try {
      await this.s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
      this.logger.log(`Deleted ${key} from bucket ${bucket}`);
    } catch (error) {
      this.logger.warn(`Failed to delete ${key}`, error);
    }
  }

  async deleteResume(key: string): Promise<void> {
    return this.delete(this.resumesBucket, key);
  }

  async deleteOutput(key: string): Promise<void> {
    return this.delete(this.outputsBucket, key);
  }

  /**
   * Check if a file exists in storage
   */
  async exists(bucket: string, key: string): Promise<boolean> {
    try {
      await this.s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }
}
