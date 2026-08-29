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

export interface Story {
  id: string;
  certificate_id: string;
  founder_name: string;
  voice_url: string;
  video_url: string;
  amharic_transcript: string;
  english_translation: string;
  generated_story: string;
  captions: Array<{ start: number; end: number; text: string }>;
  scenes: Array<{ start: number; end: number; description: string; importance: string }>;
  created_at: string;
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
  };
  revoked: boolean;
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
}

function readLocalDb(): LocalSchema {
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    const defaultDb: LocalSchema = { certificates: [], stories: [], consents: [] };
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(defaultDb, null, 2), 'utf-8');
    return defaultDb;
  }
  try {
    const data = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    console.error('Error reading local JSON DB, resetting:', e);
    const defaultDb: LocalSchema = { certificates: [], stories: [], consents: [] };
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
    const newStory: Story = { id, created_at, ...story };

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

  updateConsent: async (id: string, revoked: boolean, permissions: any): Promise<Consent | null> => {
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

  // --- MEDIA STORAGE ---
  uploadMedia: async (fileName: string, fileBuffer: Buffer, mimeType: string): Promise<string> => {
    const safeFileName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    if (isSupabaseConfigured && supabase) {
      // Bucket name must be "media" and be pre-created/public
      const { data, error } = await supabase.storage
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
};
