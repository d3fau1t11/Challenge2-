-- ==========================================
-- Migration: multi-language narration
-- Run in the Supabase SQL editor. Safe to re-run.
-- Off-chain story layer only. Does NOT touch public.certificates.
-- ==========================================

-- 1. The narrations table.
-- One row per (story, language). A MISSING ROW is the canonical
-- representation of a missing translation — no nullable-audio ambiguity.
-- 'am' is never stored here: Amharic lives on stories.voice_url and is a
-- real recording, not a narration.
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

drop policy if exists "Allow public read access to narrations" on public.narrations;
create policy "Allow public read access to narrations"
  on public.narrations for select
  using (true);

drop policy if exists "Allow backend write to narrations" on public.narrations;
create policy "Allow backend write to narrations"
  on public.narrations for all
  using (true)
  with check (true);


-- 2. Storage: the existing bucket policies allow select and insert but NOT
-- delete. Revoking consent has to actually delete the generated MP3, not just
-- hide it, so the delete policy is required.
drop policy if exists "Backend Deletes" on storage.objects;
create policy "Backend Deletes"
  on storage.objects for delete
  using ( bucket_id = 'media' );


-- 3. Consent: add the new per-purpose key to the existing jsonb column.
-- No DDL needed. Backfill so rows written before this migration keep working.
update public.consents
set permissions = coalesce(permissions, '{}'::jsonb) || '{"translated_narration": true}'::jsonb
where not (coalesce(permissions, '{}'::jsonb) ? 'translated_narration');

-- Translated narration is a purpose that applies only to the person whose
-- WORDS are being re-voiced — the founder. Everyone else recorded in the media
-- has a different consent question (appearance), so their row is false.
update public.consents c
set permissions = c.permissions || '{"translated_narration": false}'::jsonb
from public.stories s
where s.id = c.story_id
  and c.person_name is distinct from s.founder_name;
