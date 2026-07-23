// Paste into Supabase Dashboard -> Edge Functions -> Deploy a new function ->
// Via Editor -> name it "suggest-hashtags".

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

  const { topic } = await req.json();
  if (!topic) return json({ error: 'Missing topic.' }, 400);

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: `Suggest 8 niche, relevant Instagram hashtags (no # symbol, lowercase, no spaces) for a post about: ${topic}. Return only a comma-separated list, nothing else.`,
          },
        ],
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    const text = data.content?.[0]?.text ?? '';
    const hashtags = text
      .split(',')
      .map((t: string) => t.trim().replace(/^#/, ''))
      .filter(Boolean)
      .slice(0, 8);
    return json({ hashtags });
  } catch (err) {
    return json({ error: err.message ?? 'Unknown error' }, 500);
  }
});
