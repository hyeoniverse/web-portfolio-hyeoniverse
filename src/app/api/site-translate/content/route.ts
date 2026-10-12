import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/response";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteConfig } from "@/lib/getSiteConfig";
import { normalizeTranslationLang } from "@/lib/translationLanguages";
import { createMissLimiter } from "@/lib/api/contentTranslate";
import { SITE_CONTENT_SOURCE_ID } from "@/lib/api/siteTranslate";
import { acceptContentString, siteContentHash, siteContentSource, sourceLangOf } from "@/lib/siteContent";
import { chunkIndices } from "@/lib/siteTranslation";
import { type Provider, buildProviderList, translateWithFallback, translationFailure } from "@/lib/api/translationProviders";

export const maxDuration = 60;

const takeMiss = createMissLimiter();
const PARALLEL = 3;

/**
 * POST /api/site-translate/content  { lang }
 *
 * 사이트 내용 글(lib/siteContent — 홈 글 · 글/작업물 카테고리 · 태그)을 lang 으로. 응답 { strings: { 원문 → 번역 } }.
 * 언어마다 한 줄(content_translations, source_type 'site_ui', source_id SITE_CONTENT_SOURCE_ID)로 캐시한다.
 * 원문 목록이 바뀌면(새 태그 · 설정 수정) 이미 번역한 글은 그대로 두고 새로 생긴 글만 번역해 더한다.
 * 일부만 받았으면 받은 것만 저장하고 해시를 비워 둔다 — 다음 요청이 빠진 글만 다시 번역한다.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const lang = normalizeTranslationLang(body.lang);
  if (!lang) return jsonError("Invalid request", 400);

  const config = await getSiteConfig();
  if (config?.translation?.enabled === false) {
    return jsonError("Translation disabled", 503, { code: "TRANSLATION_NOT_CONFIGURED" });
  }

  const admin = createAdminClient();
  const tag = `[site-translate content ${lang}]`;

  /* 원문 — 공개된 글의 태그 · 공개 작업물의 영어 카테고리 + 설정 글 */
  const [postsRes, worksRes] = await Promise.all([
    admin.from("posts").select("tags").eq("published", true).is("deleted_at", null),
    admin.from("works").select("categories_en").eq("published", true).is("deleted_at", null),
  ]);
  const source = siteContentSource(config as unknown as Record<string, unknown>, {
    tags: (postsRes.data ?? []).flatMap((r) => (Array.isArray(r.tags) ? (r.tags as string[]) : [])),
    workCategories: (worksRes.data ?? []).flatMap((r) => (Array.isArray(r.categories_en) ? (r.categories_en as string[]) : [])),
  });
  const hash = siteContentHash(source);
  if (!source.length) return NextResponse.json({ lang, hash, strings: {}, complete: true, cached: true });

  const { data: cached } = await admin
    .from("content_translations")
    .select("fields, source_hash")
    .eq("source_type", "site_ui").eq("source_id", SITE_CONTENT_SOURCE_ID).eq("lang", lang)
    .maybeSingle();
  const prev = ((cached?.fields as { strings?: Record<string, unknown> } | null)?.strings ?? {}) as Record<string, unknown>;
  const strings: Record<string, string> = {};
  for (const s of source) {
    const v = acceptContentString(s, prev[s]);
    if (v) strings[s] = v;
  }
  const missing = source.filter((s) => !strings[s]);
  if (cached?.source_hash === hash || !missing.length) {
    return NextResponse.json({ lang, hash, strings, complete: !missing.length, cached: true });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!takeMiss(ip)) return NextResponse.json({ lang, hash, strings, complete: false, cached: true, rateLimited: true });

  const primary: Provider = (config?.translation?.provider as Provider) ?? "deepl";
  const providers = buildProviderList(primary, config?.translation?.fallback);
  const failures: Parameters<typeof translationFailure>[0] = [];
  let failed = 0;

  /* 원문 언어(한국어 · 영어)마다 나눠 보낸다 */
  for (const from of ["en", "ko"] as const) {
    const texts = missing.filter((s) => sourceLangOf(s) === from);
    if (!texts.length) continue;
    const chunks = chunkIndices(texts);
    for (let i = 0; i < chunks.length; i += PARALLEL) {
      await Promise.all(chunks.slice(i, i + PARALLEL).map(async (idx) => {
        const res = await translateWithFallback(providers, idx.map((j) => texts[j]), from, lang, tag);
        if ("error" in res) {
          failed += idx.length;
          failures.push(...(res.failures ?? []));
          return;
        }
        const bad = new Set(res.failedIndices);
        idx.forEach((j, n) => {
          const v = bad.has(n) ? null : acceptContentString(texts[j], res.translations[n]);
          if (v) strings[texts[j]] = v;
          else failed++;
        });
      }));
    }
  }

  const complete = failed === 0;
  if (!complete && Object.keys(strings).length === Object.keys(prev).length) {
    const { status, code } = translationFailure(failures);
    return jsonError("Translation failed", status, { code: code === "AI_PROVIDERS_DISABLED" ? "TRANSLATION_FAILED" : code });
  }
  const { error } = await admin.from("content_translations").upsert({
    source_type: "site_ui", source_id: SITE_CONTENT_SOURCE_ID, lang, fields: { strings }, source_hash: complete ? hash : "",
    provider: providers[0], updated_at: new Date().toISOString(),
  }, { onConflict: "source_type,source_id,lang" });
  if (error) console.error(tag, "cache upsert failed", error.message);
  if (!complete) console.warn(tag, `partial: ${Object.keys(strings).length}/${source.length}`);
  return NextResponse.json({ lang, hash, strings, complete, cached: false });
}
