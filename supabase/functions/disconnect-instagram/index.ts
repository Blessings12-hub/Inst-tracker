import { handleOptions, json } from '../_shared/cors.ts';
import { getUserIdFromRequest, supabaseAdmin } from '../_shared/supabaseAdmin.ts';

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const uid = await getUserIdFromRequest(req);
  if (!uid) return json({ error: 'Sign in first.' }, 401);

  const admin = supabaseAdmin();
  await admin.from('profiles').update({ instagram_connected: false }).eq('id', uid);
  await admin.from('instagram_tokens').delete().eq('user_id', uid);

  return json({ ok: true });
});
