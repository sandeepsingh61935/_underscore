-- Server-side auth audit trail for the auth-audit Edge ingest.
-- Writes use the service role (bypasses RLS); owners can read their own rows.
-- Retention: 90 days (mirror the on-device cap); purge job out of scope.

create table if not exists public.auth_audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  action text not null check (action in ('LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'TOKEN_REFRESH')),
  provider text,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.auth_audit_events enable row level security;

drop policy if exists "owner read" on public.auth_audit_events;
create policy "owner read" on public.auth_audit_events
  for select using (auth.uid() = user_id);

create index if not exists auth_audit_events_user_time
  on public.auth_audit_events (user_id, created_at desc);
