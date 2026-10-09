import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/response";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePostAccess } from "@/lib/api/requirePostAccess";
import { getSiteConfig } from "@/lib/getSiteConfig";
import { clampTitle } from "@/lib/postConstants";
import { normalizeTranslationLang } from "@/lib/translationLanguages";
import {
  type ContentField,
  type ContentFields,
  type ContentSource,
  createMissLimiter,
  postSource,
  sourceHash,
  workSource,
} from "@/lib/api/contentTranslate";
import {
  type Provider,
  buildProviderList,
  translateWithFallback,
  translationFailure,
} from "@/lib/api/translationProviders";

/* 본문이 긴 글은 공급자 체인을 몇 번 돌 수 있다 */
export const maxDuration = 60;

const takeMiss = createMissLimiter();

/**
 * POST /api/content-translate  { type: "post" | "work", id, lang }
 *
 * 글·작업물 상세의 "다른 언어로 읽기". ko · en 이 아닌 언어(lib/translationLanguages)로 제목·요약·본문을 번역해
 * content_translations 에 저장하고 돌려준다. 같은 원문(source_hash)이면 저장된 번역을 그대로 돌려준다.
 *
 * 원문은 한국어 본문이 있으면 한국어, 없으면 영어 — 원작 언어에서 바로 옮기는 편이 영어를 거치는 것보다 낫다.
 * 공개 상세 화면이 부르는 경로라 로그인을 요구하지 않는다. 대신 비로그인 요청은 발행되고 휴지통에 없는 것만
 * (auto-translate 와 같은 규칙 — 초안이 번역을 거쳐 새지 않게). 공급자를 부르는 요청만 IP 당 상한을 둔다.
 * 실패 원인(공급자별 오류)은 싣지 않는다 — 서버 기록과 관리자 화면에 남는다.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const type = body.type === "post" || body.type === "work" ? body.type : null;
  const id = typeof body.id === "string" && /^[0-9a-f-]{36}$/i.test(body.id) ? body.id : null;
  const lang = normalizeTranslationLang(body.lang);
  if (!type || !id || !lang) return jsonError("Invalid request", 400);

  const config = await getSiteConfig();
  if (config?.translation?.enabled === false) {
    return jsonError("Translation disabled", 503, { code: "TRANSLATION_NOT_CONFIGURED" });
  }

  const admin = createAdminClient();
  const table = type === "post" ? "posts" : "works";
  const select = type === "post"
    ? "title, title_en, excerpt, excerpt_en, content, content_en, content_type"
    : "title, title_en, subtitle_ko, subtitle_en, description_ko, description_en, content_ko, content_en, content_type";
  const access = await requirePostAccess(table, id);
  let query = admin.from(table).select(select).eq("id", id);
  if (access.error) query = query.eq("published", true).is("deleted_at", null);
  const { data: row } = await query.maybeSingle();
  if (!row) return jsonError("Not found", 404);

  /* select 문자열을 조건으로 고르면 supabase 타입이 열을 읽지 못한다 — 행은 칸 이름 → 값으로 다룬다 */
  const fieldsRow = row as unknown as Record<string, unknown>;
  const src: ContentSource | null = type === "post" ? postSource(fieldsRow) : workSource(fieldsRow);
  if (!src) return jsonError("Nothing to translate", 404);
  const hash = sourceHash(src);

  /* 저장된 번역 — 원문이 그대로면 공급자를 부르지 않는다. 표가 아직 없어도(마이그레이션 전) 번역은 된다 */
  const { data: cached } = await admin
    .from("content_translations")
    .select("fields, source_hash")
    .eq("source_type", type).eq("source_id", id).eq("lang", lang)
    .maybeSingle();
  if (cached && cached.source_hash === hash) {
    return NextResponse.json({ fields: cached.fields as ContentFields, lang, cached: true });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!takeMiss(ip)) return jsonError("Too many requests", 429);

  const primary: Provider = (config?.translation?.provider as Provider) ?? "deepl";
  const providers = buildProviderList(primary, config?.translation?.fallback);
  const tag = `[content-translate ${type} ${lang}]`;

  /* 짧은 칸(제목·요약·부제목·설명)은 평문, 본문은 richtext 면 HTML 로 — 한 번에 보내면 제목까지 HTML 로
     다뤄져 & 같은 글자가 엔티티로 돌아온다. 빈 칸은 보내지 않는다 */
  const plainKeys = (Object.keys(src.fields) as ContentField[]).filter((k) => k !== "content" && src.fields[k]);
  const [plain, content] = await Promise.all([
    translateWithFallback(providers, plainKeys.map((k) => src.fields[k]!), src.lang, lang, tag),
    translateWithFallback(providers, [src.fields.content ?? ""], src.lang, lang, tag, { html: src.html }),
  ]);
  if ("error" in content || content.failedIndices.includes(0)) {
    const { status, code } = translationFailure(content.failures);
    return jsonError("Translation failed", status, { code: code === "AI_PROVIDERS_DISABLED" ? "TRANSLATION_FAILED" : code });
  }

  const fields: ContentFields = { content: content.translations[0] };
  /* 짧은 칸이 실패하면 그 칸만 원문으로 둔다 — 본문 번역은 살린다. 원문이 남은 번역은 저장하지 않아 다음에 다시 시도한다 */
  let complete = true;
  plainKeys.forEach((k, i) => {
    const v = "error" in plain || plain.failedIndices.includes(i) ? "" : plain.translations[i];
    if (v) fields[k] = k === "title" ? clampTitle(v) : v;
    else { fields[k] = src.fields[k]; complete = false; }
  });

  if (complete) {
    const { error } = await admin.from("content_translations").upsert({
      source_type: type, source_id: id, lang, fields, source_hash: hash, provider: providers[0], updated_at: new Date().toISOString(),
    }, { onConflict: "source_type,source_id,lang" });
    if (error) console.error(tag, "cache upsert failed", error.message);
  }

  return NextResponse.json({ fields, lang, cached: false });
}
