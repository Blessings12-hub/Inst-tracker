import { supabaseAdmin } from './supabaseAdmin.ts';
import {
  getAccountInsights,
  getRecentMediaWithInsights,
  getComments,
} from './instagram.ts';

export async function refreshInsightsForUser(uid: string) {
  const admin = supabaseAdmin();

  const { data: profile } = await admin.from('profiles').select('*').eq('id', uid).single();
  const { data: tokenRow } = await admin
    .from('instagram_tokens')
    .select('access_token')
    .eq('user_id', uid)
    .single();

  if (!profile || !tokenRow) return;
  const accessToken = tokenRow.access_token as string;

  const [accountInsights, media] = await Promise.all([
    getAccountInsights(profile.ig_user_id, accessToken),
    getRecentMediaWithInsights(profile.ig_user_id, accessToken, 30),
  ]);

  const commentCounts = new Map<string, number>();
  for (const post of media) {
    const comments = await getComments(post.id, accessToken).catch(() => []);
    for (const c of comments) {
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
