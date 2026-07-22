const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;

async function callClaude(prompt: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content?.[0]?.text ?? '';
}

export async function suggestCaption(topic: string): Promise<string> {
  const text = await callClaude(
    `Write one short, natural Instagram caption (max 2 sentences, no hashtags) for a post about: ${topic}. ` +
      `Return only the caption text, nothing else.`
  );
  return text.trim();
}

export async function suggestHashtags(topic: string): Promise<string[]> {
  const text = await callClaude(
    `Suggest 8 niche, relevant Instagram hashtags (no # symbol, lowercase, no spaces) for a post about: ${topic}. ` +
      `Return only a comma-separated list, nothing else.`
  );
  return text
    .split(',')
    .map((t) => t.trim().replace(/^#/, ''))
    .filter(Boolean)
    .slice(0, 8);
}
