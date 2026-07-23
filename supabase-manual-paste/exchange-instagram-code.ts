// Paste into Supabase Dashboard -> Edge Functions -> Deploy a new function ->
// Via Editor -> name it "exchange-instagram-code".
// Uses Facebook Login for Business -> Page -> linked Instagram account.

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

const META_APP_ID = Deno.env.get('META_APP_ID')!;
const META_APP_SECRET = Deno.env.get('META_APP_SECRET')!;
const GRAPH = 'https://graph.facebook.com/v25.0';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { code, redirectUri } = await req.json();
    if (!code || !redirectUri) return json({ error: 'Missing code or redirectUri.' }, 400);

    // Step 1: short-lived token
    const shortUrl = new URL(`${GRAPH}/oauth/access_token`);
    shortUrl.searchParams.set('client_id', META_APP_ID);
    shortUrl.searchParams.set('client_secret', META_APP_SECRET);
    shortUrl.searchParams.set('redirect_uri', redirectUri);
    shortUrl.searchParams.set('code', code);
    const shortData = await (await fetch(shortUrl.toString())).json();
    if (shortData.error) throw new Error(shortData.error.message);

    // Step 2: long-lived token (~60 days)
    const longUrl = new URL(`${GRAPH}/oauth/access_token`);
    longUrl.searchParams.set('grant_type', 'fb_exchange_token');
    longUrl.searchParams.set('client_id', META_APP_ID);
    longUrl.searchParams.set('client_secret', META_APP_SECRET);
    longUrl.searchParams.set('fb_exchange_token', shortData.access_token);
    const longData = await (await fetch(longUrl.toString())).json();
    if (longData.error) throw new Error(longData.error.message);
    const accessToken = longData.access_token as string;

    // Step 3: find the Instagram account linked to one of this user's Pages
    const pagesData = await (
      await fetch(`${GRAPH}/me/accounts?fields=id,name,instagram_business_account&access_token=${accessToken}`)
    ).json();
    if (pagesData.error) throw new Error(pagesData.error.message);
    const pageWithIg = (pagesData.data || []).find((p: any) => p.instagram_business_account);
    if (!pageWithIg) {
      throw new Error(
        'No Instagram Business/Creator account found on any of your Facebook Pages. ' +
          'Make sure your account has a role (Admin/Editor) on the linked Page.'
      );
    }
    const igUserId = pageWithIg.instagram_business_account.id as string;
    const pageId = pageWithIg.id as string;

    const profile = await (
      await fetch(
        `${GRAPH}/${igUserId}?fields=username,name,followers_count,follows_count,media_count&access_token=${accessToken}`
      )
    ).json();
    if (profile.error) throw new Error(profile.error.message);

    // Step 4: create/find the matching Supabase auth user
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
      ig_account_type: 'Business',
      page_id: pageId,
      followers_count: profile.followers_count,
      follows_count: profile.follows_count,
      instagram_connected: true,
    });

    await admin.from('instagram_tokens').upsert({
      user_id: uid,
      access_token: accessToken,
      token_obtained_at: new Date().toISOString(),
    });

    // Step 5: mint a session -- no email is actually sent, we just need the token_hash
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
