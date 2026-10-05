import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePostAccess } from "@/lib/api/requirePostAccess";
import { jsonError } from "@/lib/api/response";
import { generateSummary, buildSummaryPrompt, toStored, AiSummaryError } from "@/lib/api/aiSummaryProviders";
import { storedSummaryHash, summaryHash } from "@/lib/ai/summary";

/**
 * posts · works 의 AI 요약 라우트가 같이 쓰는 처리 — 둘은 표 이름 · 본문 칸 · 캐시 비우기만 다르다.
 *
 * 요청 모양
 *   { }                            발행 뒤 자동. 요약이 있고 본문 해시가 같으면 그대로, 없거나 본문이 바뀌었으면 만들어 저장
 *   { force: true }                새로 만들어 저장
 *   { force: true, apply: false }  새로 만들되 저장하지 않고 현재 요약과 함께 돌려준다(편집기의 비교 · 선택)
 *   { summary_ko, summary_en }     만들지 않고 이 값을 저장(비교에서 고른 쪽)
 *   { public: true }               방문자가 공개 상세에서 "AI 요약 만들기"를 눌렀다 — 로그인 없이, 발행된 글이고
 *                                  요약이 비어 있을 때만 한 번 만든다. 동시에 눌러도 먼저 저장된 것이 남는다
 *
 * 저장값은 JSON 문자열({tldr, points, hash}) — lib/ai/summary. 예전 줄글도 그대로 읽힌다.
 */
export interface SummaryTable {
  table: "posts" | "works";
  kind: "post" | "work";
  /** 본문 칸 이름 */
  koColumn: "content" | "content_ko";
  /** 저장 뒤 공개 캐시 비우기 */
  revalidate: (row: { slug?: string | null }) => void;
  logPrefix: string;
}

const PUBLIC_WINDOW_MS = 60 * 1000;
const publicHits = new Map<string, number>();
/** 공개 요청의 IP 당 분당 1회 — 같은 사람이 연타해도 공급자 호출은 한 번 */
function publicRateLimited(ip: string): boolean {
  const now = Date.now();
  for (const [k, t] of publicHits) if (now - t > PUBLIC_WINDOW_MS) publicHits.delete(k);
  if (publicHits.has(ip)) return true;
  publicHits.set(ip, now);
  return false;
}

export async function handleSummaryRequest(request: Request, id: string, t: SummaryTable): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const isPublic = body.public === true;
  const force = body.force === true;
  const apply = body.apply !== false;
  const select = `title, slug, ${t.koColumn}, content_en, summary_ko, summary_en, published, deleted_at`;

  if (isPublic) {
    /* 방문자 — 발행된 글의 빈 요약만, 분당 1회 */
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (publicRateLimited(ip)) return jsonError("Too many requests", 429);
    const admin = createAdminClient();
    const { data: row } = await admin.from(t.table).select(select).eq("id", id).eq("published", true).is("deleted_at", null).single();
    if (!row) return jsonError("Not found", 404);
    const r = row as unknown as Record<string, string | null>;
    if (r.summary_ko) return NextResponse.json({ summary_ko: r.summary_ko, summary_en: r.summary_en });
    try {
      const { ko, en } = await generateSummary(buildSummaryPrompt(t.kind, { title: r.title, ko: r[t.koColumn], en: r.content_en }), t.logPrefix);
      const hash = summaryHash(r[t.koColumn], r.content_en);
      const stored = { summary_ko: toStored(ko, hash), summary_en: toStored(en, hash) };
      /* 비어 있는 행에만 — 그 사이 다른 사람(또는 작성자)이 채웠으면 그쪽을 남긴다 */
      const { data: saved } = await admin.from(t.table).update(stored).eq("id", id).is("summary_ko", null).select("summary_ko, summary_en").maybeSingle();
      if (!saved) {
        const { data: again } = await admin.from(t.table).select("summary_ko, summary_en").eq("id", id).single();
        if (again?.summary_ko) return NextResponse.json(again);
        /* null 이 아니라 빈 문자열이었던 행 — 그냥 덮는다 */
        await admin.from(t.table).update(stored).eq("id", id);
      }
      t.revalidate(r);
      return NextResponse.json(stored);
    } catch (e) {
      if (e instanceof AiSummaryError) return NextResponse.json({ error: "AI summary unavailable", code: "AI_SUMMARY_FAILED" }, { status: e.statusCode });
      throw e;
    }
  }

  /* 편집기 — 글의 권한이 있어야 한다. 예전엔 인증이 없어 누구나 임의 id 로 유료 호출을 돌리고 남의 글 요약을 덮을 수 있었다 */
  const { supabase, error: accessError } = await requirePostAccess(t.table, id);
  if (accessError) return accessError;
  const { data: row } = await supabase.from(t.table).select(select).eq("id", id).single();
  if (!row) return jsonError("Not found", 404);
  const r = row as unknown as Record<string, string | null>;
  const save = async (ko: string, en: string) => {
    await supabase.from(t.table).update({ summary_ko: ko, summary_en: en }).eq("id", id);
    t.revalidate(r);
  };

  if (typeof body.summary_ko === "string" && typeof body.summary_en === "string") {
    await save(body.summary_ko, body.summary_en);
    return NextResponse.json({ summary_ko: body.summary_ko, summary_en: body.summary_en });
  }

  const hash = summaryHash(r[t.koColumn], r.content_en);
  /* 자동(발행 뒤): 요약이 있고 그때의 본문 해시가 지금과 같으면 다시 만들지 않는다. 예전 줄글(해시 없음)은 본문이 바뀌었는지
     알 수 없어 그대로 둔다 — 작성자가 다시 만들기를 누르면 새 모양으로 바뀐다 */
  if (!force && r.summary_ko) {
    const prev = storedSummaryHash(r.summary_ko);
    if (!prev || prev === hash) return NextResponse.json({ summary_ko: r.summary_ko, summary_en: r.summary_en, reused: true });
  }

  try {
    const { ko, en, failures } = await generateSummary(
      buildSummaryPrompt(t.kind, { title: r.title, ko: r[t.koColumn], en: r.content_en }),
      t.logPrefix,
      { temperature: force && !apply ? 0.7 : 0.2 },
    );
    const stored = { summary_ko: toStored(ko, hash), summary_en: toStored(en, hash) };
    if (apply) await save(stored.summary_ko, stored.summary_en);
    /* 앞 공급자가 실패해 뒤 공급자로 만들었으면 failures 에 실어 화면이 알린다. 저장하지 않았으면 현재 요약도 같이 */
    return NextResponse.json({ ...stored, failures, applied: apply, current: apply ? undefined : { ko: r.summary_ko ?? "", en: r.summary_en ?? "" } });
  } catch (e) {
    if (e instanceof AiSummaryError) {
      /* 원인은 failures(공급자마다의 원인)로 — 화면이 토스트로 알리고, 설정 › 서비스 상태 패널에도 남는다 */
      const code = e.statusCode === 503 ? "AI_NOT_CONFIGURED" : e.failures.length > 0 && e.failures.every((f) => f.disabled) ? "AI_PROVIDERS_DISABLED" : "AI_SUMMARY_FAILED";
      return NextResponse.json({ error: e.message, code, failures: e.failures }, { status: e.statusCode });
    }
    throw e;
  }
}
