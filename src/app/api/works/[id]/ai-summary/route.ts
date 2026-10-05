import { NextResponse } from "next/server";
import { jsonServerError } from "@/lib/api/response";
import { requirePostAccess, policyBlocked } from "@/lib/api/requirePostAccess";
import { generateSummary, buildSummaryPrompt, AiSummaryError } from "@/lib/api/aiSummaryProviders";
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
  const apply = body.apply !== false;

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

  /* 비교에서 고른 쪽을 저장(만들지 않는다) */
  if (typeof body.summary_ko === "string" && typeof body.summary_en === "string") {
    await admin.from("works").update({ summary_ko: body.summary_ko, summary_en: body.summary_en }).eq("id", id);
    revalidatePublicWorks();
    return NextResponse.json({ summary_ko: body.summary_ko, summary_en: body.summary_en });
  }

  if (!force && work.summary_ko) {
    return NextResponse.json({ summary_ko: work.summary_ko, summary_en: work.summary_en });
  }

  const promptText = buildSummaryPrompt("work", { title: work.title, ko: work.content_ko, en: work.content_en });

  try {
    const { ko, en, failures } = await generateSummary(promptText, "works/ai-summary");
    if (apply) {
      await admin.from("works").update({ summary_ko: ko, summary_en: en }).eq("id", id);
      revalidatePublicWorks();
    }
    /* 앞 공급자가 실패해 뒤 공급자로 만들었으면 failures 에 실어 화면이 알린다. 저장하지 않았으면 현재 요약도 같이 */
    return NextResponse.json({ summary_ko: ko, summary_en: en, failures, applied: apply, current: apply ? undefined : { ko: work.summary_ko ?? "", en: work.summary_en ?? "" } });
  } catch (e) {
    if (e instanceof AiSummaryError) {
      /* 원인은 failures(공급자마다의 원인)로 — 화면이 토스트로 알리고, 설정 › 서비스 상태 패널에도 남는다 */
      const code = e.statusCode === 503 ? "AI_NOT_CONFIGURED" : e.failures.length > 0 && e.failures.every((f) => f.disabled) ? "AI_PROVIDERS_DISABLED" : "AI_SUMMARY_FAILED";
      return NextResponse.json({ error: e.message, code, failures: e.failures }, { status: e.statusCode });
    }
    throw e;
  }
  } catch (outerError) {
    console.error("[works/ai-summary] OUTER ERROR:", outerError);
    return jsonServerError(outerError, "POST /api/works/[id]/ai-summary");
  }
}
