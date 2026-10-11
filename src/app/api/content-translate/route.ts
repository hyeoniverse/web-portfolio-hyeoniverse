import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/response";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePostAccess } from "@/lib/api/requirePostAccess";
import { getSiteConfig } from "@/lib/getSiteConfig";
import { clampTitle } from "@/lib/postConstants";
import { normalizeTranslationLang } from "@/lib/translationLanguages";
import {
  CONTENT_TRANSLATION_VERSION,
  type ContentField,
  type ContentFields,
  type ContentSource,
  applyMetaTranslations,
  createMissLimiter,
  isFreshCache,
  metaPieces,
  postSource,
  sourceHash,
  workSource,
} from "@/lib/api/contentTranslate";
import type { GalleryNotes } from "@/data/projects";
import { readerNotes } from "@/lib/galleryNotes";
import { captionLines } from "@/lib/galleryCaptions";
import { isContentMissing } from "@/lib/contentLang";
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
 * 글·작업물 상세의 "다른 언어로 읽기". ko · en 이 아닌 언어(lib/translationLanguages)로 제목·요약·본문과
 * 정보 칸(AI 요약 · 시리즈 이름 · 카테고리 · 역할 · 기여 · 기술 설명 · 팀원 · 갤러리 자막 — ContentMeta)을 번역해
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
    ? "title, title_en, excerpt, excerpt_en, content, content_en, content_type, summary_ko, summary_en, series_id"
    : "title, title_en, subtitle_ko, subtitle_en, description_ko, description_en, content_ko, content_en, content_type, "
      + "summary_ko, summary_en, categories_ko, categories_en, nature_ko, nature_en, role_ko, role_en, "
      + "contributions_ko, contributions_en, tech_notes, team_members, gallery, gallery_notes";
  const access = await requirePostAccess(table, id);
  let query = admin.from(table).select(select).eq("id", id);
  if (access.error) query = query.eq("published", true).is("deleted_at", null);
  const { data: row } = await query.maybeSingle();
  if (!row) return jsonError("Not found", 404);

  /* select 문자열을 조건으로 고르면 supabase 타입이 열을 읽지 못한다 — 행은 칸 이름 → 값으로 다룬다 */
  const fieldsRow = row as unknown as Record<string, unknown>;
  let src: ContentSource | null;
  if (type === "post") {
    /* 시리즈 이름 — 공개 시리즈만(상세 화면의 시리즈 상자도 공개 시리즈만 보인다) */
    const seriesId = typeof fieldsRow.series_id === "string" ? fieldsRow.series_id : null;
    const { data: series } = seriesId
      ? await admin.from("series").select("title, title_en").eq("id", seriesId).eq("published", true).maybeSingle()
      : { data: null };
    src = postSource(fieldsRow, series as Record<string, unknown> | null);
  } else {
    src = workSource(fieldsRow, workCaptions(fieldsRow));
  }
  if (!src) return jsonError("Nothing to translate", 404);
  const hash = sourceHash(src);

  /* 저장된 번역 — 원문이 그대로면 공급자를 부르지 않는다. 표가 아직 없어도(마이그레이션 전) 번역은 된다 */
  const { data: cached } = await admin
    .from("content_translations")
    .select("fields, source_hash")
    .eq("source_type", type).eq("source_id", id).eq("lang", lang)
    .maybeSingle();
  if (cached && isFreshCache(cached, hash)) {
    return NextResponse.json({ fields: cached.fields as ContentFields, lang, cached: true });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!takeMiss(ip)) return jsonError("Too many requests", 429);

  const primary: Provider = (config?.translation?.provider as Provider) ?? "deepl";
  const providers = buildProviderList(primary, config?.translation?.fallback);
  const tag = `[content-translate ${type} ${lang}]`;

  /* 짧은 칸(제목·요약·부제목·설명)과 정보 칸의 글 조각은 평문 한 번에, 본문은 richtext 면 HTML 로 따로 —
     한 번에 보내면 제목까지 HTML 로 다뤄져 & 같은 글자가 엔티티로 돌아온다. 빈 칸은 보내지 않는다 */
  const plainKeys = (Object.keys(src.fields) as ContentField[]).filter((k) => k !== "content" && src.fields[k]);
  const pieces = metaPieces(src.meta);
  const plainTexts = [...plainKeys.map((k) => src.fields[k]!), ...pieces.map((p) => p.text)];
  const [plain, content] = await Promise.all([
    translateWithFallback(providers, plainTexts, src.lang, lang, tag),
    translateWithFallback(providers, [src.fields.content ?? ""], src.lang, lang, tag, { html: src.html }),
  ]);
  if ("error" in content || content.failedIndices.includes(0)) {
    const { status, code } = translationFailure(content.failures);
    return jsonError("Translation failed", status, { code: code === "AI_PROVIDERS_DISABLED" ? "TRANSLATION_FAILED" : code });
  }

  const fields: ContentFields = { content: content.translations[0], source: src.lang, v: CONTENT_TRANSLATION_VERSION };
  /* 짧은 칸이 실패하면 그 칸만 원문으로 둔다 — 본문 번역은 살린다. 원문이 남은 번역은 저장하지 않아 다음에 다시 시도한다 */
  let complete = true;
  plainKeys.forEach((k, i) => {
    const v = "error" in plain || plain.failedIndices.includes(i) ? "" : plain.translations[i];
    if (v) fields[k] = k === "title" ? clampTitle(v) : v;
    else { fields[k] = src.fields[k]; complete = false; }
  });
  /* 정보 칸 — 조각을 id 로 다시 모은다. 칸 안의 조각이 하나라도 빠지면 그 칸은 원문(위와 같은 규칙) */
  const pieceTr = new Map<string, string>();
  pieces.forEach((p, i) => {
    const at = plainKeys.length + i;
    if (!("error" in plain) && !plain.failedIndices.includes(at) && plain.translations[at]) pieceTr.set(p.id, plain.translations[at]);
  });
  const metaResult = applyMetaTranslations(src.meta, pieceTr);
  Object.assign(fields, metaResult.meta);
  if (!metaResult.complete) complete = false;

  if (complete) {
    const { error } = await admin.from("content_translations").upsert({
      source_type: type, source_id: id, lang, fields, source_hash: hash, provider: providers[0], updated_at: new Date().toISOString(),
    }, { onConflict: "source_type,source_id,lang" });
    if (error) console.error(tag, "cache upsert failed", error.message);
  }

  return NextResponse.json({ fields, lang, cached: false });
}

/**
 * 작업물 갤러리의 자막 줄 — 그림 주소 → 줄. 원문 언어(본문과 같은 판정)의 노트로, 읽는 화면과 같은 규칙
 * (readerNotes — 영어 노트가 빈 장은 한국어)으로 고른다. 갤러리에 없는 주소의 노트는 뺀다.
 */
function workCaptions(row: Record<string, unknown>): Record<string, string[]> {
  const gallery = Array.isArray(row.gallery) ? (row.gallery as unknown[]).filter((u): u is string => typeof u === "string") : [];
  const notes = row.gallery_notes as GalleryNotes | null | undefined;
  if (!gallery.length || !notes) return {};
  const ko = typeof row.content_ko === "string" ? row.content_ko.trim() : "";
  const en = typeof row.content_en === "string" ? row.content_en.trim() : "";
  const lang = isContentMissing(ko, en, "ko") ? "en" : "ko";
  const shown = readerNotes(notes, lang) ?? {};
  const out: Record<string, string[]> = {};
  for (const url of gallery) {
    const lines = captionLines(shown[url]);
    if (lines.length) out[url] = lines;
  }
  return out;
}
