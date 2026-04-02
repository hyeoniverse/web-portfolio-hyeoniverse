import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateSummary, AiSummaryError } from "@/lib/api/aiSummaryProviders";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/posts/[id]/ai-summary — AI 자동 요약 생성 (ko + en)
export async function POST(request: Request, context: RouteContext) {
  try {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const force = body.force === true;

  const admin = createAdminClient();

  const { data: post } = await admin
    .from("posts")
    .select("title, content, content_en, summary_ko, summary_en")
    .eq("id", id)
    .single();

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  if (!force && post.summary_ko) {
    return NextResponse.json({ summary_ko: post.summary_ko, summary_en: post.summary_en });
  }

  const contentKo = (post.content || "").slice(0, 3000);
  const contentEn = (post.content_en || "").slice(0, 3000);

  const promptText = `Summarize the following blog post in 2-3 concise sentences each for Korean and English.

Rules:
- Return ONLY a JSON object with keys "ko" and "en".
- Each summary must be 2-3 sentences, capturing the main points.
- Korean summary must be in natural Korean.
- English summary must be in natural English.
- No markdown formatting, headers, or bullet points. Plain text only.
- Keep each under 200 characters.

Korean content:
${contentKo}

English content (if available):
${contentEn}`;

  try {
    const { ko, en } = await generateSummary(promptText, "posts/ai-summary");
    await admin.from("posts").update({ summary_ko: ko, summary_en: en }).eq("id", id);
    return NextResponse.json({ summary_ko: ko, summary_en: en });
  } catch (e) {
    if (e instanceof AiSummaryError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
  } catch (outerError) {
    console.error("[posts/ai-summary] OUTER ERROR:", outerError);
    return NextResponse.json({ error: String(outerError) }, { status: 500 });
  }
}
