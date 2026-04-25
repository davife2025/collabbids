export async function generateAuctionDescription(input: {
  title: string;
  bullets: string[];
  tone?: "minimal" | "friendly" | "luxury";
}) {
  const token = process.env.HF_TOKEN;
  const model = process.env.HF_KIMI_MODEL || "moonshotai/Kimi-K2.5";
  if (!token) throw new Error("Missing HF_TOKEN");

  const tone =
    input.tone === "luxury"
      ? "premium, collectible, confident"
      : input.tone === "friendly"
        ? "warm, human, creator-first"
        : "minimal, clear, direct";

  const prompt = [
    "You write ecommerce auction listing descriptions for art prints and crafts.",
    `Tone: ${tone}.`,
    "Return ONLY the description body (no title, no markdown headings).",
    "Keep it under 120 words.",
    "",
    `Listing title: ${input.title}`,
    "Details:",
    ...input.bullets.map((b) => `- ${b}`),
  ].join("\n");

  const res = await fetch(`https://api-inference.huggingface.co/models/${encodeURIComponent(model)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: 200,
        temperature: 0.7,
        return_full_text: false,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HF error: ${res.status}`);
  }

  const json = (await res.json()) as unknown;
  // HF Inference often returns: [{ generated_text: "..." }]
  const generated =
    Array.isArray(json) && typeof json[0] === "object" && json[0] && "generated_text" in (json[0] as any)
      ? String((json[0] as any).generated_text ?? "")
      : typeof (json as any)?.generated_text === "string"
        ? String((json as any).generated_text)
        : "";

  const cleaned = generated.trim().replace(/\s+\n/g, "\n").trim();
  if (!cleaned) throw new Error("Empty AI response");
  return cleaned;
}

