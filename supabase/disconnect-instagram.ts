// Paste into Supabase Dashboard -> Edge Functions -> Deploy a new function ->
// Via Editor -> name it "disconnect-instagram".

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function getUid(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);
  const { data, error } = await client.auth.getUser(authHeader.replace('Bearer ', ''));
  if (error || !data.user) return null;
  return data.user.id;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const uid = await getUid(req);
  if (!uid) return json({ error: 'Sign in first.' }, 401);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  await admin.from('profiles').update({ instagram_connected: false }).eq('id', uid);
  await admin.from('instagram_tokens').delete().eq('user_id', uid);

  return json({ ok: true });
});
