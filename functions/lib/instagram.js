const fetch = require('node-fetch');

const GRAPH = 'https://graph.facebook.com/v22.0';

/**
 * Step 1 of Meta's OAuth flow: exchange the ?code= from the redirect for a
 * short-lived user access token.
 * Docs: https://developers.facebook.com/docs/instagram-platform/reference
 */
async function exchangeCodeForToken({ code, redirectUri, appId, appSecret }) {
  const url = new URL(`${GRAPH}/oauth/access_token`);
  url.searchParams.set('client_id', appId);
  url.searchParams.set('client_secret', appSecret);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('code', code);

  const res = await fetch(url.toString());
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.access_token; // short-lived
}

/** Step 2: exchange the short-lived token for a long-lived one (~60 days). */
async function getLongLivedToken({ shortLivedToken, appId, appSecret }) {
  const url = new URL(`${GRAPH}/oauth/access_token`);
  url.searchParams.set('grant_type', 'fb_exchange_token');
  url.searchParams.set('client_id', appId);
  url.searchParams.set('client_secret', appSecret);
  url.searchParams.set('fb_exchange_token', shortLivedToken);

  const res = await fetch(url.toString());
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.access_token;
}

/**
 * Instagram Business/Creator accounts are only reachable through the
 * Facebook Page they're linked to. This walks: token -> pages -> IG account.
 */
async function getInstagramAccountFromPages(accessToken) {
  const pagesRes = await fetch(
    `${GRAPH}/me/accounts?fields=id,name,instagram_business_account&access_token=${accessToken}`
  );
  const pagesData = await pagesRes.json();
  if (pagesData.error) throw new Error(pagesData.error.message);

  const pageWithIg = (pagesData.data || []).find((p) => p.instagram_business_account);
  if (!pageWithIg) {
    throw new Error(
      'No Instagram Business/Creator account found on any of your Facebook Pages. ' +
        'Make sure your Instagram account is converted to Business/Creator and linked to a Page.'
    );
  }

  return {
    igUserId: pageWithIg.instagram_business_account.id,
    pageId: pageWithIg.id,
    pageName: pageWithIg.name,
  };
}

async function getIgProfile(igUserId, accessToken) {
  const res = await fetch(
    `${GRAPH}/${igUserId}?fields=username,name,profile_picture_url,followers_count,follows_count,media_count&access_token=${accessToken}`
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data;
}

/** Account-level metrics: reach, impressions, profile_views, follower_count. */
async function getAccountInsights(igUserId, accessToken, { since, until } = {}) {
  const url = new URL(`${GRAPH}/${igUserId}/insights`);
  url.searchParams.set('metric', 'reach,impressions,profile_views,follower_count');
  url.searchParams.set('period', 'day');
  if (since) url.searchParams.set('since', since);
  if (until) url.searchParams.set('until', until);
  url.searchParams.set('access_token', accessToken);

  const res = await fetch(url.toString());
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.data;
}

/** Recent media + per-post insights, used for engagement analytics & best-time calc. */
async function getRecentMediaWithInsights(igUserId, accessToken, limit = 30) {
  const mediaRes = await fetch(
    `${GRAPH}/${igUserId}/media?fields=id,caption,timestamp,like_count,comments_count,media_type&limit=${limit}&access_token=${accessToken}`
  );
  const mediaData = await mediaRes.json();
  if (mediaData.error) throw new Error(mediaData.error.message);

  const withInsights = await Promise.all(
    (mediaData.data || []).map(async (post) => {
      const insightsRes = await fetch(
        `${GRAPH}/${post.id}/insights?metric=reach,saved&access_token=${accessToken}`
      );
      const insightsData = await insightsRes.json();
      return { ...post, insights: insightsData.data ?? [] };
    })
  );

  return withInsights;
}

/** Comments on a single post — used to build the top-commenters list. */
async function getComments(mediaId, accessToken) {
  const res = await fetch(
    `${GRAPH}/${mediaId}/comments?fields=username,timestamp&access_token=${accessToken}`
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.data ?? [];
}

module.exports = {
  exchangeCodeForToken,
  getLongLivedToken,
  getInstagramAccountFromPages,
  getIgProfile,
  getAccountInsights,
  getRecentMediaWithInsights,
  getComments,
};
