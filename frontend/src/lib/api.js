import { supabase } from '../supabase.js';

// Each of these maps to a folder under /supabase/functions.
// supabase.functions.invoke() automatically attaches the signed-in user's
// JWT as the Authorization header.

export const refreshInsights = () => supabase.functions.invoke('refresh-insights');

export const suggestCaption = (topic) =>
  supabase.functions.invoke('suggest-caption', { body: { topic } });

export const suggestHashtags = (topic) =>
  supabase.functions.invoke('suggest-hashtags', { body: { topic } });

export const disconnectInstagram = () => supabase.functions.invoke('disconnect-instagram');

export function buildInstagramConnectUrl() {
  const appId = import.meta.env.VITE_INSTAGRAM_APP_ID;
  const redirectUri = import.meta.env.VITE_META_OAUTH_REDIRECT_URI;
  const scope = [
    'instagram_business_basic',
    'instagram_business_manage_insights',
    'instagram_business_manage_comments',
  ].join(',');

  const params = new URLSearchParams({
    client_id: appId ?? '',
    redirect_uri: redirectUri ?? '',
    scope,
    response_type: 'code',
  });

  // Instagram's own OAuth dialog -- not facebook.com. This is the
  // "Instagram API with Instagram Login" path: no Facebook Page required.
  return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
}
