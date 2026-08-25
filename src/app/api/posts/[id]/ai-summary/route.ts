import { NextResponse } from "next/server";
import { requirePostAccess, policyBlocked } from "@/lib/api/requirePostAccess";
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

  /* 편집기에서만 부르는 경로인데 인증이 없었다. 누구나 임의의 id 로 유료 AI 호출을 돌리고
     (force:true 는 캐시 단축도 우회한다) 요약을 남의 글에 덮어쓸 수 있었다. */
  const { supabase, error: accessError } = await requirePostAccess("posts", id);
  if (accessError) return accessError;

  const { data: post } = await supabase
    .from("posts")
    .select("title, content, content_en, summary_ko, summary_en")
    .eq("id", id)
    .single();

  if (!post) {
    return policyBlocked();   // 존재·권한은 requirePostAccess 가 확인했다
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
    await supabase.from("posts").update({ summary_ko: ko, summary_en: en }).eq("id", id);
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
