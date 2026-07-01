const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash';
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

/**
 * Calls Gemini's generateContent with a JSON response schema and returns
 * the parsed object. Throws if the key is missing or the call fails.
 */
export async function geminiJSON<T>(prompt: string, schema: unknown): Promise<T> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured for this function.');
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: schema,
          temperature: 0.4,
        },
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini request failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini returned no content.');
  }
  return JSON.parse(text) as T;
}
