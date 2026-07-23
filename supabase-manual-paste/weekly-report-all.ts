// Paste into Supabase Dashboard -> Edge Functions -> Deploy a new function ->
// Via Editor -> name it "weekly-report-all". Triggered weekly by pg_cron.
// TODO: this only gathers report data -- actually emailing it needs Resend
// wired in before Premium ships.

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

const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization') ?? '';
  if (authHeader !== `Bearer ${SERVICE_ROLE_KEY}`) return json({ error: 'Unauthorized' }, 401);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, SERVICE_ROLE_KEY);
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, ig_username')
    .eq('instagram_connected', true)
    .eq('plan', 'premium');

  for (const p of profiles ?? []) {
    const { data: insights } = await admin
      .from('insights')
      .select('*')
      .eq('user_id', p.id)
      .maybeSingle();
    // TODO: render `insights` into an HTML/PDF email and send via Resend.
    console.log(`Weekly report ready for @${p.ig_username}`, Boolean(insights));
  }

  return json({ ok: true, count: profiles?.length ?? 0 });
});
