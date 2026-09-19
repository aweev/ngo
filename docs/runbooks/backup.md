# Backup & restore runbook

## What matters
- Postgres (Supabase): donations, form_submissions, content, RLS policies.
- Storage buckets (media library). Stripe is source of truth for money —
  reconcile via Dashboard + `stripe_events` on mismatch.
- Infra volumes (`pgdata`, `redisdata`, `miniodata`) for local/dev only.

## Backup
- Supabase: enable Point-In-Time Recovery + daily backups in project settings.
  Before risky migrations: `supabase db dump --linked -f backup-$(date +%F).sql`.
- Local compose: `docker compose exec postgres pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup.sql`.

## Restore
1. Restore to a **preview branch** first, run `pnpm verify` + smoke tests.
2. Webhook `unmatched:true` logs after restore = donation rows missing —
   reconcile manually from Stripe events (never fabricate rows).
3. Test restores quarterly; record RTO/RPO decisions here.
