import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase.js';

// Each of these maps to an exported function in /functions/index.js.
// See that file for what each one actually does against the Instagram Graph API.

export const refreshInsights = () => httpsCallable(functions, 'refreshInsights')();

export const suggestCaption = (topic) =>
  httpsCallable(functions, 'suggestCaption')({ topic });

export const suggestHashtags = (topic) =>
  httpsCallable(functions, 'suggestHashtags')({ topic });

export const disconnectInstagram = () =>
  httpsCallable(functions, 'disconnectInstagram')();

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
