const DEFAULT_MODEL = "claude-3-5-sonnet-latest";
const FALLBACK_MODEL = "claude-3-5-haiku-latest";

export type ProviderResponse = {
  text: string;
  responseJson: unknown;
  usageJson: unknown | null;
};

export async function runPrompt(prompt: string, modelOverride?: string): Promise<ProviderResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is required");
  }
  const requested = modelOverride || process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  const model = requested || FALLBACK_MODEL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        max_tokens: 700,
        system: "You are a helpful assistant. Follow formatting instructions exactly.",
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
      }),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      const message = payload?.error?.message || `Anthropic request failed (${res.status})`;
      console.error(`[anthropic] Error response:`, JSON.stringify(payload, null, 2));
      throw new Error(message);
    }

    const data = await res.json();
    const content = data?.content?.[0]?.text;
    if (!content) {
      throw new Error("Anthropic response missing content");
    }
    return {
      text: String(content),
      responseJson: data,
      usageJson: data?.usage ?? null,
    };
  } finally {
    clearTimeout(timeout);
  }
}
