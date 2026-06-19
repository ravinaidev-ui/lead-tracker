import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient => {
  if (!_supabase) {
    let url = import.meta.env.VITE_SUPABASE_URL;
    let key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    // Auto-sanitize trailing slashes, whitespaces, and wrapping quotes
    if (url) {
      url = url.trim().replace(/^['"]|['"]$/g, '');
      if (url.endsWith('/')) {
        url = url.slice(0, -1);
      }
      if (url.endsWith('/rest/v1')) {
        url = url.slice(0, -8);
      }
      if (url.endsWith('/')) {
        url = url.slice(0, -1);
      }
    }
    if (key) {
      key = key.trim().replace(/^['"]|['"]$/g, '');
    }
    
    if (!url || !key) {
      console.error('Supabase configuration missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables.');
      throw new Error('Supabase configuration missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables.');
    }
    
    _supabase = createClient(url, key);
  }
  return _supabase;
};

export const isSupabaseConfigured = (): boolean => {
  let url = import.meta.env.VITE_SUPABASE_URL;
  let key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  
  url = url.trim().replace(/^['"]|['"]$/g, '');
  key = key.trim().replace(/^['"]|['"]$/g, '');
  
  return !!(url && key && !url.includes('your-project-id') && !key.includes('your-anon-key'));
};

// Auth helpers
export const loginWithEmail = async (email: string, password: string) => {
  const client = getSupabase();
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
};

export const signUpUser = async (email: string, password: string, metadata: any) => {
  const client = getSupabase();
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  });
  if (error) throw error;
  return data;
};

export const logout = async () => {
  const client = getSupabase();
  const { error } = await client.auth.signOut();
  if (error) throw error;
};
