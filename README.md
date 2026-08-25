# Privacy Bro

Privacy Bro is a Next.js privacy governance dashboard for PDP compliance workflows, including RoPA, DPIA, TIA, LIA, breach reporting, self-assessment, FAQ knowledge center, and the Global Privacy Regulatory Map.

## Getting Started

Install dependencies and start the local development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Common Commands

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Database

The app uses Supabase/Postgres with Drizzle migrations.

```bash
npm run db:push
npm run db:seed
```

Environment variables are documented in `.env.example`.

## Windows Offline Edition

The app can also run as a Windows desktop application with an embedded local
database and local file storage. In this mode, it does not require Supabase or
internet access for core workflows such as RoPA, DPIA, TIA, LIA, breach reports,
self-assessment, FAQ data, uploads, and exports.

Development desktop mode:

```bash
npm run desktop:dev
```

Build a packaged Windows app folder:

```bash
npm run desktop:pack
```

Build a Windows installer:

```bash
npm run desktop:dist
```

Offline data is stored under the Windows application data folder when packaged.
For development, it is stored in `.privacy-bro-offline`.

Notes:
- AI FAQ still requires an external provider key and internet access. Without a
  key, the rest of the desktop app remains usable offline.
- External legal reference links only open when internet access is available.

## Deployment

Production is deployed on Vercel and served through the configured custom domain.
