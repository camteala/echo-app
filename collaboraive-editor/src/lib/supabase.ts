// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase URL or Anon Key in environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
 
 
  auth: {
    persistSession: true,
    autoRefreshToken: true
  },
  realtime: {
    params: {
      eventsPerSecond: 5  // Reduced from 10 to avoid rate limiting
    }
  },
  global: {
    headers: {
      'apikey': supabaseAnonKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Client-Info': 'collaborative-editor'
    },
    fetch: (url, options) => {
      return fetch(url, {
        ...options,
        credentials: 'same-origin'
      })
    }
  }
});

