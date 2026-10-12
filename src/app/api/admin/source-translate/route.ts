import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/response";
import { requirePostAccess } from "@/lib/api/requirePostAccess";
import { getSiteConfig } from "@/lib/getSiteConfig";
import { translateRowSource } from "@/lib/api/sourceTranslate";
import { sourceTargetOf } from "@/lib/siteLanguage";

/* 본문이 긴 글은 공급자 체인을 여러 번 돈다 */
export const maxDuration = 120;

/**
 * POST /api/admin/source-translate  { type: "post" | "work", id }
 *
 * 편집 화면에 들어갈 때 — 글 · 작업물의 원문 칸(ko 자리)이 지금 기본 언어가 아니면 그 글만 새 언어로 번역해
 * 덮어쓰고 고친 행을 돌려준다(#1425). 이미 기본 언어면 그대로 돌려준다. 덮어쓰기 전 원문은 content_translations 에 남긴다.
 * 편집 권한이 있는 사용자만(requirePostAccess).
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { type?: unknown; id?: unknown };
  const table = body.type === "post" ? "posts" : body.type === "work" ? "works" : null;
  const id = typeof body.id === "string" ? body.id : "";
  if (!table || !id) return jsonError("Invalid request", 400);

  const access = await requirePostAccess(table, id);
  if ("error" in access) return access.error;

  const config = await getSiteConfig();
  const target = sourceTargetOf(config.metadata?.defaultLanguage);
  if (!target || config.translation?.enabled === false) return NextResponse.json({ translated: false });

  const res = await translateRowSource(access.supabase, table, id, target, config);
  if ("error" in res) {
    return res.error === "not_found"
      ? jsonError("Not found", 404)
      : jsonError("원문을 기본 언어로 번역하지 못했습니다.", 502, { code: "TRANSLATION_FAILED" });
  }
  return NextResponse.json({ translated: res.translated, row: res.row });
}
