import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteConfig } from "@/lib/getSiteConfig";
import {
  type Provider,
  buildProviderList,
  translateWithFallback,
} from "@/lib/api/translationProviders";

const MAX_LENGTH = 2000;

/**
 * POST /api/translate — 댓글 번역 (공개 경로, 댓글의 "번역" 버튼이 호출)
 *
 * 예전에는 본문 텍스트를 그대로 받았다. 로그인 없이 부를 수 있는 경로라, 임의의 문자열을
 * 유료 번역 API 로 무제한 흘려보낼 수 있는 열린 프록시였다(길이 상한만 있었다).
 *
 * 지금은 번역할 댓글을 id 로 지정하고 본문은 서버가 DB 에서 읽는다. 호출자가 내용을 정할 수
 * 없으므로, 남용하더라도 이 사이트에 실제로 달린 댓글을 번역하는 범위를 넘지 못한다.
 * 인증을 요구할 수는 없다 — 방문자가 쓰는 기능이다.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    commentId?: string;
    source?: "posts" | "works";
    targetLang?: "ko" | "en";
  } | null;

  const commentId = typeof body?.commentId === "string" ? body.commentId : "";
  const targetLang = body?.targetLang === "ko" || body?.targetLang === "en" ? body.targetLang : null;
  const table = body?.source === "works" ? "work_comments" : "comments";

  if (!commentId || !targetLang) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: row } = await admin
    .from(table)
    .select("content, is_deleted")
    .eq("id", commentId)
    .maybeSingle<{ content: string | null; is_deleted: boolean }>();

  // 삭제된 댓글은 목록에서도 본문이 비워져 나간다 — 번역 경로로 되살아나면 안 된다.
  if (!row || row.is_deleted) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  const text = (row.content ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  const config = await getSiteConfig();
  const primary: Provider = (config?.translation?.provider as Provider) ?? "deepl";
  const sourceLang = targetLang === "ko" ? "en" : "ko";
  const providerList = buildProviderList(primary, config?.translation?.fallback);

  const result = await translateWithFallback(
    providerList, [text.slice(0, MAX_LENGTH)], sourceLang, targetLang, "[translate]",
  );

  if ("error" in result) {
    const status = result.error.includes("not configured") ? 503 : 502;
    return NextResponse.json({ error: result.error }, { status });
  }

  // 단건 번역 — 결과가 비어 있으면 (failedIndices 에 0 이 있으면) 502 로 처리
  if (result.failedIndices.includes(0)) {
    return NextResponse.json({ error: "Translation failed" }, { status: 502 });
  }

  return NextResponse.json({ translation: result.translations[0] });
}
