import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Define types
export interface Certificate {
  id: string;
  region: string;
  date: string;
  sdg: string;
  milestone: string;
  coverage: string;
  hash: string;
}

export interface MediaItem {
  url: string;
  type: "video" | "image";
}

export type StoryVisibility = "public" | "donor_only" | "private";
export type StoryStatus = "DRAFT" | "PROCESSING" | "READY_FOR_REVIEW" | "APPROVED" | "PUBLISHED" | "REVOKED";

export interface Story {
  id: string;
  certificate_id: string;
  founder_id?: string;
  founder_name: string;
  voice_url: string;
  video_url: string;
  media: MediaItem[];
  visibility?: StoryVisibility;
  status?: StoryStatus;
  donor_name?: string;
  donor_email?: string;
  ai_source: "live" | "fallback";
  amharic_transcript: string;
  english_translation: string;
  generated_story: string;
  captions: Array<{ start: number; end: number; text: string }>;
  scenes: Array<{ start: number; end: number; description: string; importance: string }>;
  created_at: string;
  updated_at?: string;
}


export interface Consent {
  id: string;
  story_id: string;
  person_name: string;
  permissions: {
    funder_page: boolean;
    public_page: boolean;
    social_media: boolean;
    sharing: boolean;
    // Re-voicing the founder's words in another language. Optional on the type
    // so rows written before the narration migration still typecheck; read it
    // defensively everywhere as `!== false`.
    translated_narration?: boolean;
  };
  revoked: boolean;
}

/**
 * Off-chain, derived, deletable. One row per (story, language).
 * A MISSING ROW is the canonical representation of a missing translation.
 * `lang` is never 'am' — Amharic is Dawit's real recording on stories.voice_url,
 * not a narration.
 */
export interface Narration {
  id: string;
  story_id: string;
  lang: "en" | "de";
  text: string;
  audio_url: string | null;
  captions: Array<{ start: number; end: number; text: string }>;
  duration: number | null;
  voice_id: string | null;
  source: "live" | "fallback";
  created_at: string;
}

// Check environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const isSupabaseConfigured = !!(supabaseUrl && supabaseServiceKey);
const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseServiceKey!)
  : null;

// Local fallback database file
const LOCAL_DB_PATH = path.join(process.cwd(), 'db.json');
const LOCAL_UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

interface LocalSchema {
  certificates: Certificate[];
  stories: Story[];
  consents: Consent[];
  narrations: Narration[];
}

function emptyDb(): LocalSchema {
  return { certificates: [], stories: [], consents: [], narrations: [] };
}

function readLocalDb(): LocalSchema {
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    const defaultDb = emptyDb();
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(defaultDb, null, 2), 'utf-8');
    return defaultDb;
  }
  try {
    const raw = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
    const data = JSON.parse(raw) as Partial<LocalSchema>;

    // Default every collection so an older db.json on someone's laptop
    // does not crash after this migration.
    data.certificates ??= [];
    data.stories ??= [];
    data.consents ??= [];
    data.narrations ??= [];

    return data as LocalSchema;
  } catch (e) {
    console.error('Error reading local JSON DB, resetting:', e);
    const defaultDb = emptyDb();
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(defaultDb, null, 2), 'utf-8');
    return defaultDb;
  }
}

function writeLocalDb(data: LocalSchema) {
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// Generate standard UUID-like string for local fallback
function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const db = {
  isSupabase: () => isSupabaseConfigured,

  init: async () => {
    if (isSupabaseConfigured) {
      console.log('Using Supabase database.');
      // In production, tables should be pre-created via migration.
      // We assume Supabase tables are set up.
    } else {
      console.log('Supabase not configured. Using local JSON fallback database:', LOCAL_DB_PATH);
      if (!fs.existsSync(LOCAL_UPLOAD_DIR)) {
        fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
      }
      readLocalDb(); // Ensure db.json exists
    }
  },

  // --- CERTIFICATES ---
  getCertificate: async (id: string): Promise<Certificate | null> => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .eq('id', id)
        .single();
      if (error) {
        console.error('Error fetching certificate from Supabase:', error);
        return null;
      }
      return data;
    } else {
      const data = readLocalDb();
      return data.certificates.find((c) => c.id === id) || null;
    }
  },

  createCertificate: async (cert: Omit<Certificate, 'id'>): Promise<Certificate> => {
    const id = generateUuid();
    const newCert: Certificate = { id, ...cert };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('certificates')
        .insert(newCert)
        .select()
        .single();
      if (error) {
        console.error('Error inserting certificate to Supabase:', error);
        throw error;
      }
      return data;
    } else {
      const data = readLocalDb();
      data.certificates.push(newCert);
      writeLocalDb(data);
      return newCert;
    }
  },

  // --- STORIES ---
  getStory: async (id: string): Promise<Story | null> => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .eq('id', id)
        .single();
      if (error) {
        console.error('Error fetching story from Supabase:', error);
        return null;
      }
      return data;
    } else {
      const data = readLocalDb();
      return data.stories.find((s) => s.id === id) || null;
    }
  },

  getStoryByCertificateId: async (certId: string): Promise<Story | null> => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .eq('certificate_id', certId)
        .single();
      if (error) {
        console.error('Error fetching story by certId from Supabase:', error);
        return null;
      }
      return data;
    } else {
      const data = readLocalDb();
      return data.stories.find((s) => s.certificate_id === certId) || null;
    }
  },

  createStory: async (story: Omit<Story, 'id' | 'created_at'>): Promise<Story> => {
    const id = generateUuid();
    const created_at = new Date().toISOString();
    const newStory: Story = {
      id,
      created_at,
      status: story.status || "READY_FOR_REVIEW",
      visibility: story.visibility || "donor_only",
      ...story,
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('stories')
        .insert(newStory)
        .select()
        .single();
      if (error) {
        console.error('Error inserting story to Supabase:', error);
        throw error;
      }
      return data;
    } else {
      const data = readLocalDb();
      data.stories.push(newStory);
      writeLocalDb(data);
      return newStory;
    }
  },

  getAllStories: async (): Promise<Story[]> => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching all stories from Supabase:', error);
        return [];
      }
      return data || [];
    } else {
      const data = readLocalDb();
      return [...data.stories].reverse();
    }
  },

  getStoriesByFounder: async (founderId: string): Promise<Story[]> => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .or(`founder_id.eq.${founderId},founder_name.ilike.%${founderId}%`)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching founder stories from Supabase:', error);
        return db.getAllStories();
      }
      return data || [];
    } else {
      const data = readLocalDb();
      return data.stories.filter(
        (s) => s.founder_id === founderId || s.founder_name.toLowerCase().includes(founderId.toLowerCase())
      );
    }
  },

  updateStory: async (id: string, updates: Partial<Story>): Promise<Story | null> => {
    const updated_at = new Date().toISOString();
    const payload = { ...updates, updated_at };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('stories')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) {
        console.error('Error updating story on Supabase:', error);
        return null;
      }
      return data;
    } else {
      const data = readLocalDb();
      const idx = data.stories.findIndex((s) => s.id === id);
      if (idx !== -1) {
        data.stories[idx] = { ...data.stories[idx], ...payload };
        writeLocalDb(data);
        return data.stories[idx];
      }
      return null;
    }
  },

  revokeStory: async (id: string): Promise<boolean> => {
    const result = await db.updateStory(id, { status: "REVOKED" });
    if (result) {
      // Also delete derived multi-language MP3 narrations for privacy
      await db.deleteNarrations(id);
      return true;
    }
    return false;
  },


  // --- CONSENT ---
  getConsentForStory: async (storyId: string): Promise<Consent[]> => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('consents')
        .select('*')
        .eq('story_id', storyId);
      if (error) {
        console.error('Error fetching consents from Supabase:', error);
        return [];
      }
      return data || [];
    } else {
      const data = readLocalDb();
      return data.consents.filter((c) => c.story_id === storyId);
    }
  },

  getConsentById: async (id: string): Promise<Consent | null> => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('consents')
        .select('*')
        .eq('id', id)
        .single();
      if (error) {
        console.error('Error fetching consent by id from Supabase:', error);
        return null;
      }
      return data;
    } else {
      const data = readLocalDb();
      return data.consents.find((c) => c.id === id) || null;
    }
  },

  createConsent: async (consent: Omit<Consent, 'id'>): Promise<Consent> => {
    const id = generateUuid();
    const newConsent: Consent = { id, ...consent };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('consents')
        .insert(newConsent)
        .select()
        .single();
      if (error) {
        console.error('Error inserting consent to Supabase:', error);
        throw error;
      }
      return data;
    } else {
      const data = readLocalDb();
      data.consents.push(newConsent);
      writeLocalDb(data);
      return newConsent;
    }
  },

  updateConsent: async (
    id: string,
    revoked: boolean,
    permissions: Consent["permissions"]
  ): Promise<Consent | null> => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('consents')
        .update({ revoked, permissions })
        .eq('id', id)
        .select()
        .single();
      if (error) {
        console.error('Error updating consent on Supabase:', error);
        return null;
      }
      return data;
    } else {
      const data = readLocalDb();
      const idx = data.consents.findIndex((c) => c.id === id);
      if (idx !== -1) {
        data.consents[idx].revoked = revoked;
        data.consents[idx].permissions = permissions;
        writeLocalDb(data);
        return data.consents[idx];
      }
      return null;
    }
  },

  // --- NARRATIONS (off-chain, derived, deletable) ---
  getNarrations: async (storyId: string): Promise<Narration[]> => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('narrations')
        .select('*')
        .eq('story_id', storyId);
      if (error) {
        console.error('Error fetching narrations from Supabase:', error);
        return [];
      }
      return data || [];
    } else {
      const data = readLocalDb();
      return data.narrations.filter((n) => n.story_id === storyId);
    }
  },

  getNarration: async (storyId: string, lang: "en" | "de"): Promise<Narration | null> => {
    const rows = await db.getNarrations(storyId);
    return rows.find((n) => n.lang === lang) || null;
  },

  upsertNarration: async (row: Omit<Narration, 'id' | 'created_at'>): Promise<Narration> => {
    if (isSupabaseConfigured && supabase) {
      const existing = await db.getNarration(row.story_id, row.lang);
      const payload: Narration = {
        id: existing?.id || generateUuid(),
        created_at: existing?.created_at || new Date().toISOString(),
        ...row,
      };

      const { data, error } = await supabase
        .from('narrations')
        .upsert(payload, { onConflict: 'story_id,lang' })
        .select()
        .single();

      if (error) {
        console.error('Error upserting narration to Supabase:', error);
        throw error;
      }
      return data;
    } else {
      // No real upsert on the JSON path: delete then insert.
      const data = readLocalDb();
      const existing = data.narrations.find(
        (n) => n.story_id === row.story_id && n.lang === row.lang
      );
      data.narrations = data.narrations.filter(
        (n) => !(n.story_id === row.story_id && n.lang === row.lang)
      );
      const payload: Narration = {
        id: existing?.id || generateUuid(),
        created_at: existing?.created_at || new Date().toISOString(),
        ...row,
      };
      data.narrations.push(payload);
      writeLocalDb(data);
      return payload;
    }
  },

  /**
   * Deletes the narration rows AND the generated MP3 objects.
   * This is real deletion, not gating — the synthetic audio is derived data
   * with no evidentiary value, so nothing is lost by destroying it.
   */
  deleteNarrations: async (storyId: string): Promise<number> => {
    const rows = await db.getNarrations(storyId);

    // Files first, so a row is never left pointing at a deleted object.
    // A failed file delete must not block the row delete.
    for (const row of rows) {
      if (row.audio_url) {
        await db.deleteMediaByUrl(row.audio_url);
      }
    }

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('narrations').delete().eq('story_id', storyId);
      if (error) {
        console.error('Error deleting narrations from Supabase:', error);
        return 0;
      }
    } else {
      const data = readLocalDb();
      data.narrations = data.narrations.filter((n) => n.story_id !== storyId);
      writeLocalDb(data);
    }

    console.log(`Deleted ${rows.length} narration row(s) and their audio for story ${storyId}`);
    return rows.length;
  },

  // --- MEDIA STORAGE ---
  uploadMedia: async (fileName: string, fileBuffer: Buffer, mimeType: string): Promise<string> => {
    const safeFileName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    if (isSupabaseConfigured && supabase) {
      // Bucket name must be "media" and be pre-created/public
      const { error } = await supabase.storage
        .from('media')
        .upload(safeFileName, fileBuffer, {
          contentType: mimeType,
          cacheControl: '3600',
          upsert: true,
        });

      if (error) {
        console.error('Error uploading to Supabase Storage:', error);
        throw error;
      }

      const { data: publicUrlData } = supabase.storage
        .from('media')
        .getPublicUrl(safeFileName);

      return publicUrlData.publicUrl;
    } else {
      // Local write
      if (!fs.existsSync(LOCAL_UPLOAD_DIR)) {
        fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
      }
      const filePath = path.join(LOCAL_UPLOAD_DIR, safeFileName);
      fs.writeFileSync(filePath, fileBuffer);

      // Return relative web URL
      return `/uploads/${safeFileName}`;
    }
  },

  /**
   * Removes a stored object given its public URL. The object key is the last
   * path segment. Never throws: a failed file delete must not block the consent
   * update that triggered it — the consent write is the more important one.
   */
  deleteMediaByUrl: async (url: string): Promise<boolean> => {
    try {
      const key = decodeURIComponent(url.split('?')[0].split('/').filter(Boolean).pop() || '');
      if (!key) return false;

      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.storage.from('media').remove([key]);
        if (error) {
          console.error('Error removing object from Supabase Storage:', error);
          return false;
        }
      } else {
        const filePath = path.join(LOCAL_UPLOAD_DIR, key);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }

      console.log(`Deleted media object: ${key}`);
      return true;
    } catch (e) {
      console.error('deleteMediaByUrl failed (continuing anyway):', e);
      return false;
    }
  },
};
