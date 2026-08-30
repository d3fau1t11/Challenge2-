import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "https://ncabpaxhcnckaqdqhszz.supabase.co";

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jYWJwYXhoY25ja2FxZHFoc3p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5OTQ5OTAsImV4cCI6MjEwMzU3MDk5MH0.UZhTkqMrppwLtQZW9_xoMcypuQGRzp1dupOSEYYTWGw";

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
