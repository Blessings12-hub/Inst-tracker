import { handleOptions, json } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { exchangeCodeForToken, getLongLivedToken, getIgProfile } from '../_shared/instagram.ts';

const INSTAGRAM_APP_ID = Deno.env.get('INSTAGRAM_APP_ID')!;
const INSTAGRAM_APP_SECRET = Deno.env.get('INSTAGRAM_APP_SECRET')!;

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const { code, redirectUri } = await req.json();
    if (!code || !redirectUri) return json({ error: 'Missing code or redirectUri.' }, 400);

    const shortLivedToken = await exchangeCodeForToken({
      code,
      redirectUri,
      appId: INSTAGRAM_APP_ID,
      appSecret: INSTAGRAM_APP_SECRET,
    });
    const longLivedToken = await getLongLivedToken({
      shortLivedToken,
      appSecret: INSTAGRAM_APP_SECRET,
    });

    const profile = await getIgProfile(longLivedToken);
    const igUserId = profile.user_id as string;

    const admin = supabaseAdmin();
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
      access_token: longLivedToken,
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
