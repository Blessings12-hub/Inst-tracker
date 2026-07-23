const GRAPH = 'https://graph.facebook.com/v25.0';

/** Step 1 of Meta's OAuth flow: exchange the ?code= from the redirect for a short-lived user access token. */
export async function exchangeCodeForToken(opts: {
  code: string;
  redirectUri: string;
  appId: string;
  appSecret: string;
}): Promise<string> {
  const url = new URL(`${GRAPH}/oauth/access_token`);
  url.searchParams.set('client_id', opts.appId);
  url.searchParams.set('client_secret', opts.appSecret);
  url.searchParams.set('redirect_uri', opts.redirectUri);
  url.searchParams.set('code', opts.code);

  const res = await fetch(url.toString());
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.access_token as string; // short-lived
}

/** Step 2: exchange the short-lived token for a long-lived one (~60 days). */
export async function getLongLivedToken(opts: {
  shortLivedToken: string;
  appId: string;
  appSecret: string;
}): Promise<string> {
  const url = new URL(`${GRAPH}/oauth/access_token`);
  url.searchParams.set('grant_type', 'fb_exchange_token');
  url.searchParams.set('client_id', opts.appId);
  url.searchParams.set('client_secret', opts.appSecret);
  url.searchParams.set('fb_exchange_token', opts.shortLivedToken);

  const res = await fetch(url.toString());
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.access_token as string;
}

/**
 * Instagram Business/Creator accounts are only reachable through the
 * Facebook Page they're linked to. Walks: token -> pages -> IG account.
 * Your Facebook account must be able to perform Tasks on that Page.
 */
export async function getInstagramAccountFromPages(accessToken: string) {
  const res = await fetch(
    `${GRAPH}/me/accounts?fields=id,name,instagram_business_account&access_token=${accessToken}`
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);

  const pageWithIg = (data.data || []).find((p: any) => p.instagram_business_account);
  if (!pageWithIg) {
    throw new Error(
      'No Instagram Business/Creator account found on any of your Facebook Pages. ' +
        'Make sure your Instagram account is converted to Business/Creator, linked to a Page, ' +
        'and that your Facebook account has a role (Admin/Editor) on that Page.'
    );
  }

  return {
    igUserId: pageWithIg.instagram_business_account.id as string,
    pageId: pageWithIg.id as string,
    pageName: pageWithIg.name as string,
  };
}

export async function getIgProfile(igUserId: string, accessToken: string) {
  const res = await fetch(
    `${GRAPH}/${igUserId}?fields=username,name,followers_count,follows_count,media_count&access_token=${accessToken}`
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
