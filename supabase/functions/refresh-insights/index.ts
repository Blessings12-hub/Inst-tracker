import { handleOptions, json } from '../_shared/cors.ts';
import { getUserIdFromRequest } from '../_shared/supabaseAdmin.ts';
import { refreshInsightsForUser } from '../_shared/refreshInsights.ts';

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const uid = await getUserIdFromRequest(req);
  if (!uid) return json({ error: 'Sign in first.' }, 401);

  try {
    await refreshInsightsForUser(uid);
    return json({ ok: true });
  } catch (err) {
    return json({ error: err.message ?? 'Unknown error' }, 500);
  }
});
