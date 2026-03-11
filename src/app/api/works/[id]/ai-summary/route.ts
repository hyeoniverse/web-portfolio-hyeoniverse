import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSecret } from "@/lib/getSecret";
import { getSiteConfig } from "@/lib/getSiteConfig";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/works/[id]/ai-summary — AI 자동 요약 생성 (ko + en)
export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const force = body.force === true;

  const admin = createAdminClient();

  const { data: work } = await admin
    .from("works")
    .select("title, content_ko, content_en, summary_ko, summary_en")
    .eq("id", id)
    .single();

  if (!work) {
    return NextResponse.json({ error: "Work not found" }, { status: 404 });
  }

  if (!force && work.summary_ko) {
    return NextResponse.json({ summary_ko: work.summary_ko, summary_en: work.summary_en });
  }

  const config = await getSiteConfig();
  const provider = config?.aiSummary?.provider ?? "gemini";

  const contentKo = (work.content_ko || "").slice(0, 3000);
  const contentEn = (work.content_en || "").slice(0, 3000);

  const promptText = `Summarize the following portfolio work description in 2-3 concise sentences each for Korean and English.

Rules:
- Return ONLY a JSON object with keys "ko" and "en".
- Each summary must be 2-3 sentences, capturing the project's purpose and key achievements.
- Korean summary must be in natural Korean.
- English summary must be in natural English.
- No markdown formatting, headers, or bullet points. Plain text only.
- Keep each under 200 characters.

Korean content:
${contentKo}

English content (if available):
${contentEn}`;

  try {
    let summaryKo = "";
    let summaryEn = "";

    if (provider === "openai") {
      const apiKey = await getSecret("OPENAI_API_KEY");
      if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 503 });

      const res = await fetch(OPENAI_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: promptText }],
          temperature: 0.2,
          response_format: { type: "json_object" },
        }),
      });
      if (!res.ok) return NextResponse.json({ error: `OpenAI error: ${res.status}` }, { status: 502 });
      const data = await res.json();
      const parsed: { ko?: string; en?: string } = JSON.parse(data?.choices?.[0]?.message?.content ?? "{}");
      summaryKo = parsed.ko ?? "";
      summaryEn = parsed.en ?? "";
    } else if (provider === "claude") {
      const apiKey = await getSecret("ANTHROPIC_API_KEY");
      if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 503 });

      const res = await fetch(CLAUDE_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          messages: [{ role: "user", content: promptText }],
        }),
      });
      if (!res.ok) return NextResponse.json({ error: `Claude error: ${res.status}` }, { status: 502 });
      const data = await res.json();
      const parsed: { ko?: string; en?: string } = JSON.parse(data?.content?.[0]?.text ?? "{}");
      summaryKo = parsed.ko ?? "";
      summaryEn = parsed.en ?? "";
    } else {
      // gemini (default)
      const apiKey = await getSecret("GEMINI_API_KEY");
      if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 503 });

      const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
        }),
      });
      if (!res.ok) return NextResponse.json({ error: `Gemini error: ${res.status}` }, { status: 502 });
      const data = await res.json();
      const parsed: { ko?: string; en?: string } = JSON.parse(
        data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}"
      );
      summaryKo = parsed.ko ?? "";
      summaryEn = parsed.en ?? "";
    }

    await admin.from("works").update({ summary_ko: summaryKo, summary_en: summaryEn }).eq("id", id);
    return NextResponse.json({ summary_ko: summaryKo, summary_en: summaryEn });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
