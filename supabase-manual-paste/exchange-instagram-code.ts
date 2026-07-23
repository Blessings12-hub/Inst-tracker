// Paste into Supabase Dashboard -> Edge Functions -> Deploy a new function ->
// Via Editor -> name it "exchange-instagram-code".
// Uses "Instagram API with Instagram Login" -- no Facebook Page needed.

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

const INSTAGRAM_APP_ID = Deno.env.get('INSTAGRAM_APP_ID')!;
const INSTAGRAM_APP_SECRET = Deno.env.get('INSTAGRAM_APP_SECRET')!;
const GRAPH = 'https://graph.instagram.com/v22.0';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { code, redirectUri } = await req.json();
    if (!code || !redirectUri) return json({ error: 'Missing code or redirectUri.' }, 400);

    // Instagram sometimes appends "#_" to the code -- strip it before use.
    const cleanCode = code.replace(/#_$/, '');

    // Step 1: short-lived token (form-encoded POST, not JSON)
    const form = new URLSearchParams();
    form.set('client_id', INSTAGRAM_APP_ID);
    form.set('client_secret', INSTAGRAM_APP_SECRET);
    form.set('grant_type', 'authorization_code');
    form.set('redirect_uri', redirectUri);
    form.set('code', cleanCode);
    const shortRes = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      body: form,
    });
    const shortData = await shortRes.json();
    if (shortData.error_message) throw new Error(shortData.error_message);

    // Step 2: long-lived token (~60 days)
    const longUrl = new URL('https://graph.instagram.com/access_token');
    longUrl.searchParams.set('grant_type', 'ig_exchange_token');
    longUrl.searchParams.set('client_secret', INSTAGRAM_APP_SECRET);
    longUrl.searchParams.set('access_token', shortData.access_token);
    const longData = await (await fetch(longUrl.toString())).json();
    if (longData.error) throw new Error(longData.error.message);
    const accessToken = longData.access_token as string;

    // Step 3: profile comes straight from /me -- no Page lookup needed
    const profile = await (
      await fetch(
        `${GRAPH}/me?fields=user_id,username,account_type,followers_count,follows_count,media_count&access_token=${accessToken}`
      )
    ).json();
    if (profile.error) throw new Error(profile.error.message);
    const igUserId = profile.user_id as string;

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const email = `ig-${igUserId}@users.insttracker.app`;

    const { data: existingProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('ig_user_id', igUserId)
      .maybeSingle();

    let uid: string;
    if (existingProfile) {
      uid = existingProfile.id;
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
      });
      if (createErr) throw createErr;
      uid = created.user.id;
    }

    await admin.from('profiles').upsert({
      id: uid,
      ig_user_id: igUserId,
      ig_username: profile.username,
      ig_account_type: profile.account_type ?? 'Business',
      followers_count: profile.followers_count,
      follows_count: profile.follows_count,
      instagram_connected: true,
    });

    await admin.from('instagram_tokens').upsert({
      user_id: uid,
      access_token: accessToken,
      token_obtained_at: new Date().toISOString(),
    });

    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });
    if (linkErr) throw linkErr;

    return json({ email, tokenHash: linkData.properties.hashed_token });
  } catch (err) {
    return json({ error: err.message ?? 'Unknown error' }, 500);
  }
});
