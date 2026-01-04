const DEFAULT_MODEL = "gpt-4o-mini";

export type ProviderResponse = {
  text: string;
  responseJson: unknown;
  usageJson: unknown | null;
};

export async function runPrompt(prompt: string, modelOverride?: string): Promise<ProviderResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required");
  }
  const model = modelOverride || process.env.OPENAI_MODEL || DEFAULT_MODEL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "You are a helpful assistant. Follow formatting instructions exactly." },
          { role: "user", content: prompt },
        ],
        temperature: 0,
      }),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      const message = payload?.error?.message || `OpenAI request failed (${res.status})`;
      throw new Error(message);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI response missing content");
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
