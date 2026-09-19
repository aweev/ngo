# NGO OS - Migration Guide: Go API to Next.js + Supabase

This guide covers the migration from the Golang API to a full Next.js fullstack application with Supabase.

## Overview

### Before (Current Architecture)
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js Web   │────▶│   Golang API    │────▶│   PostgreSQL    │
│   (Frontend)    │     │   (Backend)     │     │   (Database)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                              │
                        ┌─────┴─────┐
                        │           │
                   ┌────▼────┐ ┌───▼────┐
                   │  Redis  │ │ MinIO  │
                   └─────────┘ └────────┘
```

### After (Target Architecture)
```
┌─────────────────────────────────────────────────────────────────┐
│                        Next.js Fullstack                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Frontend   │  │  API Routes  │  │   Server Actions     │  │
│  │  (React)     │  │  (Route      │  │   (Mutations)        │  │
│  │              │  │   Handlers)  │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                        ┌─────▼─────┐
                        │  Supabase  │
                        │            │
                   ┌────┴────┐ ┌────┴────┐
                   │   DB    │ │ Storage │
                   │ (PgSQL) │ │(Files)  │
                   └─────────┘ └─────────┘
```

## What's Changed

### Removed
- ❌ Golang API (`apps/api`)
- ❌ Redis dependency (Supabase handles caching)
- ❌ MinIO dependency (Supabase Storage)
- ❌ Temporal dependency (can be replaced with pg-boss or similar)
- ❌ next-auth (replaced with Supabase Auth)

### Added
- ✅ Supabase (Database + Auth + Storage + Realtime)
- ✅ Server Actions for data mutations
- ✅ Route Handlers for API endpoints
- ✅ Row Level Security (RLS) for data protection
- ✅ Multi-tenant architecture with organizations

### Preserved
- ✅ Next.js 16 with React 19
- ✅ next-intl for internationalization (en, de, fr, es, ar)
- ✅ Tailwind CSS 4 + Radix UI components
- ✅ PWA support
- ✅ All public-facing pages (about, programs, stories, etc.)

## Setup Instructions

### 1. Install Dependencies

```bash
cd apps/web
npm install
```

### 2. Set Up Supabase

Follow the [Supabase Setup Guide](./supabase/README.md) to:
1. Create a Supabase project
2. Get your API keys
3. Run the database migrations

### 3. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials.

### 4. Run the Application

```bash
npm run dev
```

## Key Concepts

### Multi-Tenancy

The application uses a multi-tenant architecture where:
- Each organization is isolated
- Users belong to one or more organizations
- Data access is controlled by Row Level Security (RLS)

### Authentication

Authentication is handled by Supabase Auth:
- Email/password authentication
- OAuth providers (Google, GitHub, etc.)
- Session management via cookies
- Automatic session refresh

### Authorization

Authorization is handled at two levels:
1. **Database Level**: RLS policies ensure users can only access their organization's data
2. **Application Level**: Server actions check user roles before performing operations

### Server Actions

All data mutations use Server Actions:
```typescript
// Example: Creating a worker
'use server';

export async function createWorker(input: WorkerInsert) {
    const supabase = await createSupabaseServerClient();
    
    // RLS ensures user can only insert into their organization
    const { data, error } = await supabase
        .from('workers')
        .insert(input)
        .select()
        .single();
    
    return { data, error };
}
```

### Internationalization

The application supports 5 languages:
- English (en)
- German (de)
- French (fr)
- Spanish (es)
- Arabic (ar) - with RTL support

Translation files are in `messages/` directory.
