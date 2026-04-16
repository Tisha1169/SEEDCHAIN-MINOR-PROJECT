# SeedChain Platform

## Overview

SeedChain is a full-stack SaaS platform for tracking potato seed supply chains. Built as a pnpm monorepo with a React + Vite frontend and Express API server.

## Architecture

- **Frontend**: React + Vite at `/` (port from `$PORT` env)
- **Backend**: Express API server on port 8080
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: HMAC token-based (localStorage tokens)
- **Vite proxy**: `/api/*` → `http://localhost:8080`

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **UI**: React + Tailwind CSS + shadcn/ui, lime-green palette (#8FD14F)

## Key Packages

- `artifacts/seedchain` — React + Vite frontend
- `artifacts/api-server` — Express API server
- `lib/db` — Drizzle schema + PostgreSQL connection
- `lib/api-spec` — OpenAPI spec + Zod codegen
- `lib/api-client-react` — Generated React Query hooks

## Auth Setup

The frontend must call `setAuthTokenGetter(() => localStorage.getItem("token"))` at startup (in `main.tsx`) for all API calls to include the Bearer token.

## Demo Credentials

- Admin: admin@seedchain.io / admin123
- Farmer (Rajesh): rajesh@farmer.com / farmer123
- Farmer (Priya): priya@farmer.com / farmer123
- Storage: storage@coolstore.com / storage123
- Logistics: driver@fastlogistics.com / logistics123
- Buyer: buyer@greenmart.com / buyer123

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Role-Based Routing

- `/farmer` — Farmer dashboard (batches, harvests, marketplace)
- `/storage` — Cold storage dashboard (inventory, incoming/outgoing)
- `/logistics` — Logistics dashboard (deliveries, tracking)
- `/buyer` — Buyer dashboard (marketplace, orders)
- `/admin` — Admin dashboard (users, batches, storage)

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
