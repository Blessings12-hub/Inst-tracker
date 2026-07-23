const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!;
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

async function callGemini(prompt: string): Promise<string> {
  const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

export async function suggestCaption(topic: string): Promise<string> {
  const text = await callGemini(
    `Write one short, natural Instagram caption (max 2 sentences, no hashtags) for a post about: ${topic}. ` +
      `Return only the caption text, nothing else.`
  );
  return text.trim();
}

export async function suggestHashtags(topic: string): Promise<string[]> {
  const text = await callGemini(
    `Suggest 8 niche, relevant Instagram hashtags (no # symbol, lowercase, no spaces) for a post about: ${topic}. ` +
      `Return only a comma-separated list, nothing else.`
  );
  return text
    .split(',')
    .map((t) => t.trim().replace(/^#/, ''))
    .filter(Boolean)
    .slice(0, 8);
}
