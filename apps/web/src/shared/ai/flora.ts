const DEFAULT_FLORA_MODEL = process.env.FLORA_MODEL ?? process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

function extractGeminiText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const data = payload as Record<string, unknown>;
  const candidates = data.candidates;
  if (!Array.isArray(candidates)) return null;

  const parts: string[] = [];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue;
    const content = (candidate as { content?: unknown }).content;
    if (!content || typeof content !== "object") continue;
    const contentParts = (content as { parts?: unknown }).parts;
    if (!Array.isArray(contentParts)) continue;

    for (const part of contentParts) {
      if (!part || typeof part !== "object") continue;
      const text = (part as { text?: unknown }).text;
      if (typeof text === "string" && text.trim().length > 0) {
        parts.push(text.trim());
      }
    }
  }

  if (parts.length === 0) return null;
  return parts.join("\n\n");
}

export async function runFloraText(params: {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim() ?? process.env.GOOGLE_API_KEY?.trim();
  if (!apiKey) return null;

  const model = DEFAULT_FLORA_MODEL.trim();
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: {
      "x-goog-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: params.systemPrompt }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: params.userPrompt }],
        },
      ],
      generation_config: {
        temperature: params.temperature ?? 0.2,
        maxOutputTokens: params.maxOutputTokens ?? 800,
      },
    }),
  });

  if (!response.ok) return null;
  const payload = (await response.json().catch(() => null)) as unknown;
  return extractGeminiText(payload);
}
