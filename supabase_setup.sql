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
  founder_id text,
  founder_name text not null,
  voice_url text not null,
  video_url text not null,
  media jsonb not null default '[]'::jsonb,
  visibility text not null default 'donor_only',
  status text not null default 'READY_FOR_REVIEW',
  donor_name text,
  donor_email text,
  ai_source text not null default 'fallback',
  amharic_transcript text not null,
  english_translation text not null,
  generated_story text not null,
  captions jsonb not null,
  scenes jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
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


-- 5. Create Narrations Table (Off-Chain Translated Narration)
-- Derived, deletable data. One row per (story, language). A missing row is the
-- canonical representation of a missing translation. 'am' is never stored here:
-- Amharic is the founder's real recording on stories.voice_url.
create table if not exists public.narrations (
  id uuid primary key,
  story_id uuid references public.stories(id) on delete cascade,
  lang text not null check (lang in ('en', 'de')),
  text text not null,
  audio_url text,
  captions jsonb not null default '[]'::jsonb,
  duration numeric,
  voice_id text,
  source text not null default 'fallback',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create unique index if not exists narrations_story_lang_idx
  on public.narrations (story_id, lang);

alter table public.narrations enable row level security;

create policy "Allow public read access to narrations"
  on public.narrations for select
  using (true);

create policy "Allow backend write to narrations"
  on public.narrations for all
  using (true)
  with check (true);

-- Withdrawing narration consent must DELETE the generated MP3, not hide it,
-- so the media bucket needs a delete policy.
create policy "Backend Deletes"
  on storage.objects for delete
  using ( bucket_id = 'media' );
