// Paste into Supabase Dashboard -> Edge Functions -> Deploy a new function ->
// Via Editor -> name it "refresh-insights". Called on demand by the signed-in user.

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

const GRAPH = 'https://graph.facebook.com/v25.0';

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

  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: profile } = await admin.from('profiles').select('*').eq('id', uid).single();
    const { data: tokenRow } = await admin
      .from('instagram_tokens')
      .select('access_token')
      .eq('user_id', uid)
      .single();
    if (!profile || !tokenRow) return json({ error: 'No connected Instagram account found.' }, 400);
    const accessToken = tokenRow.access_token as string;

    const accountInsightsUrl = new URL(`${GRAPH}/${profile.ig_user_id}/insights`);
    accountInsightsUrl.searchParams.set('metric', 'reach,impressions,profile_views,follower_count');
    accountInsightsUrl.searchParams.set('period', 'day');
    accountInsightsUrl.searchParams.set('access_token', accessToken);
    const accountInsights = (await (await fetch(accountInsightsUrl.toString())).json()).data;

    const mediaData = await (
      await fetch(
        `${GRAPH}/${profile.ig_user_id}/media?fields=id,timestamp,like_count,comments_count&limit=30&access_token=${accessToken}`
      )
    ).json();

    const media = await Promise.all(
      (mediaData.data || []).map(async (post: any) => {
        const insightsData = await (
          await fetch(`${GRAPH}/${post.id}/insights?metric=reach,saved&access_token=${accessToken}`)
        ).json();
        return { ...post, insights: insightsData.data ?? [] };
      })
    );

    const commentCounts = new Map<string, number>();
    for (const post of media) {
      const commentsData = await (
        await fetch(`${GRAPH}/${post.id}/comments?fields=username&access_token=${accessToken}`)
      ).json();
      for (const c of commentsData.data ?? []) {
        if (!c.username) continue;
        commentCounts.set(c.username, (commentCounts.get(c.username) ?? 0) + 1);
      }
    }
    const topCommenters = [...commentCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([username, comments]) => ({ username, comments }));

    await admin.from('insights').upsert({
      user_id: uid,
      account_insights: accountInsights,
      media: media.map((m: any) => ({
        id: m.id,
        timestamp: m.timestamp,
        likeCount: m.like_count,
        commentsCount: m.comments_count,
        insights: m.insights,
      })),
      top_commenters: topCommenters,
      refreshed_at: new Date().toISOString(),
    });

    return json({ ok: true });
  } catch (err) {
    return json({ error: err.message ?? 'Unknown error' }, 500);
  }
});
