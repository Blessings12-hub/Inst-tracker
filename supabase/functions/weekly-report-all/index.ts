import { handleOptions, json } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

// TODO: this only gathers the report data -- actually emailing it needs
// Resend wired in (see README "Billing & email" section) before Premium ships.
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const authHeader = req.headers.get('Authorization') ?? '';
  if (authHeader !== `Bearer ${SERVICE_ROLE_KEY}`) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const admin = supabaseAdmin();
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
