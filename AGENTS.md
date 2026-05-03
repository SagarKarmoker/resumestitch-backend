# AGENTS.md

## Dev Commands

```bash
npm run start:dev      # Hot reload dev server (port 3001)
npm run build          # Compile TypeScript to dist/
npm run start          # Run production build
npm run prisma:generate  # Generate Prisma client to src/generated/prisma
npm run prisma:migrate   # Run database migrations
npm run prisma:studio    # Open Prisma Studio UI
```

## Key Config

- **Database**: Prisma v7 with separate `prisma.config.ts` — requires both `DATABASE_URL` (pooler) and `DIRECT_URL` (direct connection)
- **API**: Prefix `api/v1`, Swagger at `/api/docs` (dev mode only)
- **Auth**: Global JWT guard — use `@Public()` decorator on controllers/methods to allow public access
- **Port**: 3001 (configured in `.env`)
- **CORS**: Whitelisted origins from `FRONTEND_URL` env + Supabase storage endpoint

## Architecture

- **Prisma client**: Generated to `src/generated/prisma/` (not node_modules), import via `@generated/prisma` or relative path
- **Modules**: auth, storage, resume, generation, users, applications, referrals, feedback, health
- **DTO pattern**: Use class-validator with ValidationPipe (whitelist enabled)

## Common Gotchas

- After modifying `prisma/schema.prisma`, run `npm run prisma:generate` then rebuild
- Prisma v7 needs both `DATABASE_URL` and `DIRECT_URL` in `.env` (pooler vs direct)
- JWT secret must match Supabase auth configuration for token validation
- S3 storage uses Supabase Storage (S3-compatible) — bucket names: `resumes`, `outputs`