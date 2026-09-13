import { NextResponse } from "next/server";
import { jsonServerError } from "@/lib/api/response";
import { requirePostAccess, policyBlocked } from "@/lib/api/requirePostAccess";
import { generateSummary, AiSummaryError } from "@/lib/api/aiSummaryProviders";
import { revalidatePublicWorks } from "@/lib/api/revalidateWorks";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/works/[id]/ai-summary — AI 자동 요약 생성 (ko + en)
export async function POST(request: Request, context: RouteContext) {
  try {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const force = body.force === true;

  /* posts 쪽과 같은 문제 — 편집기 전용인데 인증이 없어 유료 AI 호출이 열려 있었다. */
  const { supabase: admin, error: accessError } = await requirePostAccess("works", id);
  if (accessError) return accessError;

  const { data: work } = await admin
    .from("works")
    .select("title, content_ko, content_en, summary_ko, summary_en")
    .eq("id", id)
    .single();

  if (!work) {
    return policyBlocked();   // 존재·권한은 requirePostAccess 가 확인했다
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
    revalidatePublicWorks();
    return NextResponse.json({ summary_ko: ko, summary_en: en });
  } catch (e) {
    if (e instanceof AiSummaryError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
  } catch (outerError) {
    console.error("[works/ai-summary] OUTER ERROR:", outerError);
    return jsonServerError(outerError, "POST /api/works/[id]/ai-summary");
  }
}
