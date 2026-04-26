import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface PrismaKnownError {
  code: string;
  message: string;
  meta?: { target?: string[] };
}

function isPrismaKnownError(err: unknown): err is PrismaKnownError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as any).code === 'string' &&
    (err as any).code.startsWith('P')
  );
}

function isPrismaValidationError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    err?.constructor?.name === 'PrismaClientValidationError'
  );
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let details: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'string' ? res : (res as any).message || message;
      details = typeof res === 'object' ? (res as any).errors : undefined;
    } else if (isPrismaKnownError(exception)) {
      switch (exception.code) {
        case 'P2002':
          status = HttpStatus.CONFLICT;
          message = `A record with this ${exception.meta?.target?.join(', ')} already exists.`;
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = 'Record not found.';
          break;
        case 'P2003':
          status = HttpStatus.BAD_REQUEST;
          message = 'Foreign key constraint failed.';
          break;
        default:
          this.logger.error(`Prisma error ${exception.code}`, exception.message);
      }
    } else if (isPrismaValidationError(exception)) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Invalid data provided.';
    } else {
      this.logger.error('Unhandled exception', exception);
    }

    response.status(status).json({
      statusCode: status,
      message,
      ...(details && { errors: details }),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
