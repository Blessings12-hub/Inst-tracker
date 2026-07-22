import { createClient } from '@supabase/supabase-js';

// Fill these from Supabase Dashboard -> Project Settings -> API.
// Copy .env.example to .env.local and set the VITE_ prefixed values there.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
