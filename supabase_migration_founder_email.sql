-- SQL Migration: Add founder_email column to stories table
-- Run this in your Supabase SQL Editor:

ALTER TABLE public.stories 
ADD COLUMN IF NOT EXISTS founder_email TEXT;
