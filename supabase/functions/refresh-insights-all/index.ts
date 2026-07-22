import { handleOptions, json } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { refreshInsightsForUser } from '../_shared/refreshInsights.ts';

// Triggered by pg_cron (see README "Scheduling" section) -- guard it with
// the service role key so it can't be hit by anyone else.
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const authHeader = req.headers.get('Authorization') ?? '';
  if (authHeader !== `Bearer ${SERVICE_ROLE_KEY}`) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const admin = supabaseAdmin();
  const { data: profiles, error } = await admin
    .from('profiles')
    .select('id')
    .eq('instagram_connected', true);

  if (error) return json({ error: error.message }, 500);

  const results = await Promise.allSettled(
    (profiles ?? []).map((p) => refreshInsightsForUser(p.id))
  );
  const failed = results.filter((r) => r.status === 'rejected').length;

  return json({ ok: true, refreshed: results.length - failed, failed });
});
