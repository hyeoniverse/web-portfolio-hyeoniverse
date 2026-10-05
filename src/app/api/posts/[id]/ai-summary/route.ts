import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { jsonServerError } from "@/lib/api/response";
import { requirePostAccess, policyBlocked } from "@/lib/api/requirePostAccess";
import { generateSummary, buildSummaryPrompt, AiSummaryError } from "@/lib/api/aiSummaryProviders";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** 요약을 저장하고 공개 페이지 캐시를 비운다 — 안 비우면 ISR 때문에 새 요약이 한참 뒤에야 보인다 */
async function saveSummary(supabase: NonNullable<Awaited<ReturnType<typeof requirePostAccess>>["supabase"]>, id: string, slug: string | null, ko: string, en: string) {
  await supabase.from("posts").update({ summary_ko: ko, summary_en: en }).eq("id", id);
  revalidatePath("/posts");
  if (slug) revalidatePath(`/posts/${slug}`);
}

// POST /api/posts/[id]/ai-summary — AI 자동 요약 생성 (ko + en)
//   { }                         기존 요약이 있으면 그대로, 없으면 만들어 저장(발행 뒤 자동)
//   { force: true }             새로 만들어 저장
//   { force: true, apply: false } 새로 만들되 저장하지 않고 현재 요약과 함께 돌려준다(편집기의 비교 · 선택)
//   { summary_ko, summary_en }  만들지 않고 이 값을 저장(비교에서 고른 쪽)
export async function POST(request: Request, context: RouteContext) {
  try {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const force = body.force === true;
  const apply = body.apply !== false;

  /* 편집기에서만 부르는 경로인데 인증이 없었다. 누구나 임의의 id 로 유료 AI 호출을 돌리고
     (force:true 는 캐시 단축도 우회한다) 요약을 남의 글에 덮어쓸 수 있었다. */
  const { supabase, error: accessError } = await requirePostAccess("posts", id);
  if (accessError) return accessError;

  const { data: post } = await supabase
    .from("posts")
    .select("title, slug, content, content_en, summary_ko, summary_en")
    .eq("id", id)
    .single();

  if (!post) {
    return policyBlocked();   // 존재·권한은 requirePostAccess 가 확인했다
  }

  if (typeof body.summary_ko === "string" && typeof body.summary_en === "string") {
    await saveSummary(supabase, id, post.slug, body.summary_ko, body.summary_en);
    return NextResponse.json({ summary_ko: body.summary_ko, summary_en: body.summary_en });
  }

  if (!force && post.summary_ko) {
    return NextResponse.json({ summary_ko: post.summary_ko, summary_en: post.summary_en });
  }

  const promptText = buildSummaryPrompt("post", { title: post.title, ko: post.content, en: post.content_en });

  try {
    const { ko, en, failures } = await generateSummary(promptText, "posts/ai-summary");
    if (apply) await saveSummary(supabase, id, post.slug, ko, en);
    /* 앞 공급자가 실패해 뒤 공급자로 만들었으면 failures 에 실어 화면이 알린다. 저장하지 않았으면 현재 요약도 같이 */
    return NextResponse.json({ summary_ko: ko, summary_en: en, failures, applied: apply, current: apply ? undefined : { ko: post.summary_ko ?? "", en: post.summary_en ?? "" } });
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
