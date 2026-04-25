# CollabBids

Monorepo for the CollabBids creator-auctions platform.

## Apps

- `apps/web`: Next.js (App Router) + Tailwind
- `apps/api`: Express + TypeScript REST API
- `packages/shared`: shared types/schemas

## Local development

Prereqs: Node.js 20+ recommended (this repo works with Node 22).

1. Install dependencies:

   `npm install`

2. Run dev servers:

   `npm run dev`

## Environment variables

Each app has its own `.env.example`. Copy to `.env.local` (web) / `.env` (api) and fill values.
