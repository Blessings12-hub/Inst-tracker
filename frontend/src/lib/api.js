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
  const appId = import.meta.env.VITE_META_APP_ID;
  const redirectUri = import.meta.env.VITE_META_OAUTH_REDIRECT_URI;
  const scope = [
    'instagram_basic',
    'instagram_manage_insights',
    'pages_show_list',
    'pages_read_engagement',
  ].join(',');

  const params = new URLSearchParams({
    client_id: appId ?? '',
    redirect_uri: redirectUri ?? '',
    scope,
    response_type: 'code',
  });

  return `https://www.facebook.com/v22.0/dialog/oauth?${params.toString()}`;
}
