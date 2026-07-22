import { handleOptions, json } from '../_shared/cors.ts';
import { getUserIdFromRequest } from '../_shared/supabaseAdmin.ts';
import { suggestHashtags } from '../_shared/ai.ts';

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  const uid = await getUserIdFromRequest(req);
  if (!uid) return json({ error: 'Sign in first.' }, 401);

  const { topic } = await req.json();
  if (!topic) return json({ error: 'Missing topic.' }, 400);

  try {
    const hashtags = await suggestHashtags(topic);
    return json({ hashtags });
  } catch (err) {
    return json({ error: err.message ?? 'Unknown error' }, 500);
  }
});
