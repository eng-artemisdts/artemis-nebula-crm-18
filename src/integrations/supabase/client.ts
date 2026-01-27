import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const USE_LOCAL_EXPLICIT = 'false';
const USE_LOCAL = USE_LOCAL_EXPLICIT === undefined || USE_LOCAL_EXPLICIT === 'true';

const LOCAL_SUPABASE_URL = import.meta.env.VITE_LOCAL_SUPABASE_URL || 'http://localhost:54321';
const LOCAL_SUPABASE_KEY = import.meta.env.VITE_LOCAL_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const REMOTE_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const REMOTE_SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const SUPABASE_URL = USE_LOCAL ? LOCAL_SUPABASE_URL : REMOTE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = USE_LOCAL ? LOCAL_SUPABASE_KEY : REMOTE_SUPABASE_KEY;

if (USE_LOCAL) {
  console.log('🔵 Usando Supabase LOCAL:', LOCAL_SUPABASE_URL);
} else {
  console.log('🌐 Usando Supabase REMOTO:', REMOTE_SUPABASE_URL);
}

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error('❌ Supabase URL ou Key não configurados. Verifique as variáveis de ambiente.');
  throw new Error('Supabase configuration is missing');
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});