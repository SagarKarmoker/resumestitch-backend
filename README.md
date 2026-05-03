# ResumeForge AI Backend

NestJS REST API for AI-powered job application builder. Generates tailored resumes, cover letters, and application emails from job descriptions.

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: NestJS v11
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma v7
- **Auth**: JWT with Passport
- **AI**: OpenRouter (OpenAI-compatible)
- **Storage**: Supabase Storage (S3-compatible)

## Features

- **Resume Parsing**: Extract text from PDF resumes
- **AI Generation**: Tailored resume, cover letter, and email from job description
- **JD Analysis**: Extract company, role, skills from job postings
- **ATS Checker**: Keyword matching score between resume and JD
- **Application Tracker**: Kanban-style job application management (Career tier)
- **Referral System**: Referral codes with tier upgrades
- **Product Feedback**: In-app feedback collection

## Quick Start

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your database and API keys

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Start development server
npm run start:dev
```

API runs at `http://localhost:3001/api/v1`  
Swagger docs at `http://localhost:3001/api/docs`

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 3001) |
| `DATABASE_URL` | PostgreSQL connection (pooler) |
| `DIRECT_URL` | PostgreSQL direct connection |
| `JWT_SECRET` | Secret for JWT signing |
| `S3_ENDPOINT` | Supabase Storage endpoint |
| `S3_ACCESS_KEY_ID` | S3 access key |
| `S3_SECRET_ACCESS_KEY` | S3 secret key |
| `OPENROUTER_API_KEY` | OpenRouter API key |
| `FRONTEND_URL` | Frontend URL for CORS |

## Available Scripts

```bash
npm run start:dev        # Hot reload development
npm run build            # Compile to dist/
npm run start            # Run production build
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run database migrations
npm run prisma:studio    # Open Prisma Studio
```

## API Endpoints

| Module | Endpoints |
|--------|-----------|
| **Auth** | register, login, logout, forgot-password, reset-password, change-password |
| **Resume** | parse, save, list, get, update, delete |
| **Generation** | analyze-jd, package/stream, regenerate-section, feedback, ats-check, pdf |
| **Users** | me, preferences, dashboard, history, export |
| **Applications** | list, stats, get, update, status, follow-up |
| **Referrals** | generate, redeem, my-referrals |
| **Feedback** | create |

## Architecture

- **Modules**: auth, storage, resume, generation, users, applications, referrals, feedback, health, pdf
- **Pattern**: DTOs with class-validator for request validation
- **Auth**: Global JWT guard with `@Public()` decorator for public routes
- **Database**: Prisma v7 with separate datasource config (`prisma.config.ts`)

## Project Structure

```
src/
├── auth/           # Authentication (JWT, bcrypt)
├── storage/        # S3-compatible file storage
├── resume/         # PDF parsing and vault
├── generation/     # AI generation endpoints
├── users/          # User profile and preferences
├── applications/  # Job application tracker
├── referrals/      # Referral program
├── feedback/       # Product feedback
├── health/         # Health checks
├── pdf/            # PDF generation
└── prisma/         # Database service
```

## License

Proprietary