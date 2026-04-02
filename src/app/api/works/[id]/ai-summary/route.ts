import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateSummary, AiSummaryError } from "@/lib/api/aiSummaryProviders";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/works/[id]/ai-summary — AI 자동 요약 생성 (ko + en)
export async function POST(request: Request, context: RouteContext) {
  try {
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
    const { ko, en } = await generateSummary(promptText, "works/ai-summary");
    await admin.from("works").update({ summary_ko: ko, summary_en: en }).eq("id", id);
    return NextResponse.json({ summary_ko: ko, summary_en: en });
  } catch (e) {
    if (e instanceof AiSummaryError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
  } catch (outerError) {
    console.error("[works/ai-summary] OUTER ERROR:", outerError);
    return NextResponse.json({ error: String(outerError) }, { status: 500 });
  }
}
