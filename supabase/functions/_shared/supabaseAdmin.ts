import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically by
// the Supabase platform for every Edge Function -- no manual secret needed.
export function supabaseAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

/** Resolves the calling user's id from the request's Authorization JWT. */
export async function getUserIdFromRequest(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;
  const jwt = authHeader.replace('Bearer ', '');

  const client = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!
  );
  const { data, error } = await client.auth.getUser(jwt);
  if (error || !data.user) return null;
  return data.user.id;
}
