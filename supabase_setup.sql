-- ==========================================
-- Impact Storytelling Platform - Database Setup
-- Paste this script into your Supabase SQL Editor
-- ==========================================

-- 1. Create Certificates Table (On-Chain Mock Registry)
create table if not exists public.certificates (
  id uuid primary key,
  region text not null,
  date date not null,
  sdg text not null,
  milestone text not null,
  coverage text not null,
  hash text not null
);

-- Enable RLS (Read-only public access)
alter table public.certificates enable row level security;

create policy "Allow public read access to certificates"
  on public.certificates for select
  using (true);

create policy "Allow backend insertion to certificates"
  on public.certificates for insert
  with check (true);


-- 2. Create Stories Table (Off-Chain Narrative Registry)
create table if not exists public.stories (
  id uuid primary key,
  certificate_id uuid references public.certificates(id) on delete cascade,
  founder_name text not null,
  voice_url text not null,
  video_url text not null,
  amharic_transcript text not null,
  english_translation text not null,
  generated_story text not null,
  captions jsonb not null,
  scenes jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS (Read-only public access)
alter table public.stories enable row level security;

create policy "Allow public read access to stories"
  on public.stories for select
  using (true);

create policy "Allow backend insert/update to stories"
  on public.stories for insert
  with check (true);


-- 3. Create Consents Table (Off-Chain Privacy Controls)
create table if not exists public.consents (
  id uuid primary key,
  story_id uuid references public.stories(id) on delete cascade,
  person_name text not null,
  permissions jsonb not null,
  revoked boolean default false not null
);

-- Enable RLS (Read-only public access)
alter table public.consents enable row level security;

create policy "Allow public read access to consents"
  on public.consents for select
  using (true);

create policy "Allow backend update/insert to consents"
  on public.consents for all
  using (true)
  with check (true);


-- 4. Set Up Storage Bucket for Media (Audio/Video uploads)
-- Note: Supabase stores bucket configurations in the storage.buckets table.
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

-- Allow public read access to media files
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'media' );

-- Allow backend service uploads
create policy "Backend Uploads"
  on storage.objects for insert
  with check ( bucket_id = 'media' );
