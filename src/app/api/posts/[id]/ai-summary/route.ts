import { NextResponse } from "next/server";
import { jsonServerError } from "@/lib/api/response";
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
    const { ko, en, failures } = await generateSummary(promptText, "posts/ai-summary");
    await supabase.from("posts").update({ summary_ko: ko, summary_en: en }).eq("id", id);
    /* 앞 공급자가 실패해 뒤 공급자로 만들었으면 failures 에 실어 화면이 알린다 */
    return NextResponse.json({ summary_ko: ko, summary_en: en, failures });
  } catch (e) {
    if (e instanceof AiSummaryError) {
      /* 원인은 failures(공급자마다의 원인)로 — 화면이 토스트로 알리고, 설정 › 서비스 상태 패널에도 남는다 */
      const code = e.statusCode === 503 ? "AI_NOT_CONFIGURED" : e.failures.length > 0 && e.failures.every((f) => f.disabled) ? "AI_PROVIDERS_DISABLED" : "AI_SUMMARY_FAILED";
      return NextResponse.json({ error: e.message, code, failures: e.failures }, { status: e.statusCode });
    }
    throw e;
  }
  } catch (outerError) {
    console.error("[posts/ai-summary] OUTER ERROR:", outerError);
    return jsonServerError(outerError, "POST /api/posts/[id]/ai-summary");
  }
}
