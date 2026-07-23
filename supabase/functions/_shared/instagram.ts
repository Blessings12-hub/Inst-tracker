const GRAPH = 'https://graph.instagram.com/v22.0';

/**
 * Step 1 of Instagram's own OAuth flow (not Facebook's): exchange the
 * ?code= from the redirect for a short-lived token.
 * Note: Instagram sometimes appends "#_" to the code param -- strip it.
 */
export async function exchangeCodeForToken(opts: {
  code: string;
  redirectUri: string;
  appId: string;
  appSecret: string;
}): Promise<string> {
  const cleanCode = opts.code.replace(/#_$/, '');

  const form = new URLSearchParams();
  form.set('client_id', opts.appId);
  form.set('client_secret', opts.appSecret);
  form.set('grant_type', 'authorization_code');
  form.set('redirect_uri', opts.redirectUri);
  form.set('code', cleanCode);

  const res = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    body: form,
  });
  const data = await res.json();
  if (data.error_message) throw new Error(data.error_message);
  return data.access_token as string; // short-lived
}

/** Step 2: exchange the short-lived token for a long-lived one (~60 days). */
export async function getLongLivedToken(opts: {
  shortLivedToken: string;
  appSecret: string;
}): Promise<string> {
  const url = new URL('https://graph.instagram.com/access_token');
  url.searchParams.set('grant_type', 'ig_exchange_token');
  url.searchParams.set('client_secret', opts.appSecret);
  url.searchParams.set('access_token', opts.shortLivedToken);

  const res = await fetch(url.toString());
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.access_token as string;
}

/**
 * The Instagram user id + profile come straight from /me -- no Facebook
 * Page lookup needed at all with this login path.
 */
export async function getIgProfile(accessToken: string) {
  const res = await fetch(
    `${GRAPH}/me?fields=user_id,username,account_type,followers_count,follows_count,media_count&access_token=${accessToken}`
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data;
}

export async function getAccountInsights(
  igUserId: string,
  accessToken: string,
  range: { since?: string; until?: string } = {}
) {
  const url = new URL(`${GRAPH}/${igUserId}/insights`);
  url.searchParams.set('metric', 'reach,impressions,profile_views,follower_count');
  url.searchParams.set('period', 'day');
  if (range.since) url.searchParams.set('since', range.since);
  if (range.until) url.searchParams.set('until', range.until);
  url.searchParams.set('access_token', accessToken);

  const res = await fetch(url.toString());
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.data;
}

export async function getRecentMediaWithInsights(
  igUserId: string,
  accessToken: string,
  limit = 30
) {
  const mediaRes = await fetch(
    `${GRAPH}/${igUserId}/media?fields=id,caption,timestamp,like_count,comments_count,media_type&limit=${limit}&access_token=${accessToken}`
  );
  const mediaData = await mediaRes.json();
  if (mediaData.error) throw new Error(mediaData.error.message);

  const withInsights = await Promise.all(
    (mediaData.data || []).map(async (post: any) => {
      const insightsRes = await fetch(
        `${GRAPH}/${post.id}/insights?metric=reach,saved&access_token=${accessToken}`
      );
      const insightsData = await insightsRes.json();
      return { ...post, insights: insightsData.data ?? [] };
    })
  );

  return withInsights;
}

export async function getComments(mediaId: string, accessToken: string) {
  const res = await fetch(
    `${GRAPH}/${mediaId}/comments?fields=username,timestamp&access_token=${accessToken}`
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.data ?? [];
}
