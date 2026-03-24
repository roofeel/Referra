# Ai Referrer

Ai Referrer is a separated frontend/backend project organized into `api` (server) and `web` (frontend).

## Demo

- Live Demo: https://referra.coolify-tinca.tonob.net/

## Project Structure

- `api/`: Backend service code (Bun + TypeScript), providing APIs and business logic.
- `web/`: Frontend app code (Vite + TypeScript), providing the user interface.
- `packages/`: Reserved shared package directory (for common types, utilities, SDKs, etc.).
- `CLAUDE.md`: Project collaboration and development conventions.

## Quick Start

### 1) Initialize the Database

The API depends on PostgreSQL and Prisma migrations in `packages/db`.

Start the local database:

```bash
docker compose up -d postgres
```

The default local connection is already configured in `packages/db/.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5434/ai_referrer?schema=public"
```

Apply existing migrations to your local development database:

```bash
cd packages/db
bun install
bun prisma migrate deploy --schema prisma/schema.prisma
bun prisma generate --schema prisma/schema.prisma
```

If you want Prisma to create a new migration while developing schema changes, use:

```bash
cd packages/db
bun prisma migrate dev --schema prisma/schema.prisma --name your_migration_name
```

### 2) Start the Backend

```bash
cd api
bun install
bun run dev
```

Default URL: `http://localhost:3000`

### 3) Start the Frontend

```bash
cd web
bun install
bun run dev
```

Default URL (Vite): usually `http://localhost:5173`

## Subdirectory Documentation

- See `api/README.md` for API details.
- See `web/README.md` for Web details.

## Separate Coolify Deployment (Nixpacks)

Create two services in Coolify from the same repository, with different Base Directories:

- API Service
  - Build Pack: `Nixpacks`
  - Base Directory: `api`
  - Port: `3000`
- Web Service
  - Build Pack: `Nixpacks`
  - Base Directory: `web`
  - Port: `3000` (the port used by `vite preview` inside the container)

This repository already includes independent build/start settings in `api/nixpacks.toml` and `web/nixpacks.toml`, and Coolify will load them automatically based on each directory.

## Google Login Setup

Create OAuth 2.0 Web Client credentials in Google Cloud Console, then set:

- `web/.env.local`
  - `VITE_GOOGLE_CLIENT_ID=your_google_web_client_id`
- `api/.env`
  - `GOOGLE_CLIENT_ID=your_google_web_client_id`
