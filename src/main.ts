import 'reflect-metadata';
import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  const port = process.env.PORT || 3001;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const supbaseUrl = process.env.S3_ENDPOINT!

  // CORS
  app.enableCors({
    origin: [frontendUrl, 'http://localhost:3000', supbaseUrl],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Validation pipe — enforce DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger API docs
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('ResumeForge AI API')
      .setDescription('Backend API for AI-powered job application builder. Provides endpoints for resume management, AI-powered job application generation, and application tracking.')
      .setVersion('1.0.0')
      .addServer(`http://localhost:${port}`, 'Local Development')
      .addServer(process.env.FRONTEND_URL || 'http://localhost:5173', 'Frontend')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token from Supabase Auth. Format: Bearer <token>',
        },
        'JWT-auth',
      )
      .addTag('auth', 'Authentication (login, register, password reset)')
      .addTag('users', 'User profile and preferences management')
      .addTag('resume', 'Resume upload, extraction, and vault management')
      .addTag('generation', 'AI-powered job application generation')
      .addTag('applications', 'Job application tracker (Career tier)')
      .addTag('referrals', 'Referral program and tracking')
      .addTag('feedback', 'Product feedback submission')
      .addTag('storage', 'S3-compatible file storage operations')
      .addTag('health', 'Health check and system status')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tryItOutEnabled: true,
        displayRequestDuration: true,
      },
      customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info .title { font-size: 2.5em }
        .swagger-ui .info .description { font-size: 1.1em; line-height: 1.6; }
      `,
      customSiteTitle: 'ResumeForge AI API Docs',
    });
  }

  await app.listen(port);
  console.log(`🚀 ResumeForge API running on http://localhost:${port}/api/v1`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
