-- Supabase setup for Beechland Farms

-- 1. Enable uuid generation support
create extension if not exists "pgcrypto";

-- 2. Create tables
create table if not exists farms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists fields (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  name text not null,
  crop text not null,
  created_at timestamptz not null default now()
);

create table if not exists field_images (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  field_id uuid not null references fields(id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

-- 3. Enable row-level security and create public policies
alter table farms enable row level security;
alter table fields enable row level security;
alter table field_images enable row level security;

create policy public_select_farms on farms for select using (true);
create policy public_insert_farms on farms for insert with check (true);

create policy public_select_fields on fields for select using (true);
create policy public_insert_fields on fields for insert with check (true);

create policy public_select_field_images on field_images for select using (true);
create policy public_insert_field_images on field_images for insert with check (true);

-- 4. Create a public storage bucket for field images
-- Note: Supabase may require you to create the bucket manually in the Storage UI.
-- If you want, use the SQL editor for the tables and policies, then create the bucket later.
