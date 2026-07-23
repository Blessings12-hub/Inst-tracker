// Paste into Supabase Dashboard -> Edge Functions -> Deploy a new function ->
// Via Editor -> name it "refresh-insights-all". Triggered daily by pg_cron
// (see the cron SQL in the setup instructions) -- not meant to be called by users.

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

const GRAPH = 'https://graph.facebook.com/v22.0';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function refreshOne(admin: ReturnType<typeof createClient>, uid: string) {
  const { data: profile } = await admin.from('profiles').select('*').eq('id', uid).single();
  const { data: tokenRow } = await admin
    .from('instagram_tokens')
    .select('access_token')
    .eq('user_id', uid)
    .single();
  if (!profile || !tokenRow) return;
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
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization') ?? '';
  if (authHeader !== `Bearer ${SERVICE_ROLE_KEY}`) return json({ error: 'Unauthorized' }, 401);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, SERVICE_ROLE_KEY);
  const { data: profiles, error } = await admin
    .from('profiles')
    .select('id')
    .eq('instagram_connected', true);
  if (error) return json({ error: error.message }, 500);

  const results = await Promise.allSettled((profiles ?? []).map((p) => refreshOne(admin, p.id)));
  const failed = results.filter((r) => r.status === 'rejected').length;

  return json({ ok: true, refreshed: results.length - failed, failed });
});
