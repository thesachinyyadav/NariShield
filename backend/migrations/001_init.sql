create extension if not exists "pgcrypto";

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  role_name text not null unique
);

create table if not exists user_roles (
  user_id uuid not null references users(id),
  role_id uuid not null references roles(id),
  primary key (user_id, role_id)
);

create table if not exists devices (
  id uuid primary key default gen_random_uuid(),
  external_device_id text not null unique,
  assigned_user_id uuid references users(id),
  created_at timestamptz not null default now()
);

create table if not exists device_heartbeats (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references devices(id),
  battery_level int not null check (battery_level between 0 and 100),
  is_online boolean not null,
  lat double precision,
  lon double precision,
  observed_at timestamptz not null default now()
);

create table if not exists incidents (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references devices(id),
  status text not null check (status in ('triggered','acknowledged','dispatched','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists incident_events (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references incidents(id),
  event_type text not null,
  source_timestamp timestamptz,
  signature text,
  created_at timestamptz not null default now()
);

create table if not exists evidence_files (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references incidents(id),
  storage_key text not null,
  mime_type text not null,
  size_bytes bigint not null,
  sha256_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  action text not null,
  incident_id uuid references incidents(id),
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists outbox_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  payload jsonb not null,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_incidents_status_created_at on incidents (status, created_at desc);
create index if not exists idx_device_heartbeats_device_observed_at on device_heartbeats (device_id, observed_at desc);
create index if not exists idx_audit_logs_incident_created_at on audit_logs (incident_id, created_at desc);
