import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/response";
import type { ApiErrorCode } from "@/lib/apiError";
import { createAdminClient } from "@/lib/supabase/admin";
import type { getSiteConfig } from "@/lib/getSiteConfig";
import { assembleSiteUi, chunkIndices, sanitizeSiteUi, type SiteUiSource } from "@/lib/siteTranslation";
import { type Provider, buildProviderList, translateWithFallback, translationFailure } from "@/lib/api/translationProviders";

/* 한 번에 나란히 보내는 묶음 수 — 공급자의 동시 요청 제한에 걸리지 않을 만큼 */
const PARALLEL = 3;

/**
 * 사전 한 벌(화면 글 · 관리자 화면 글)을 lang 으로 번역해 응답으로 — 방문자 사전(/api/site-translate/ui)과
 * 관리자 사전(/api/admin/site-translate-ui)이 같이 쓴다. 언어마다 한 줄(content_translations, source_type 'site_ui',
 * 사전마다 다른 source_id)로 캐시하고, 해시가 같으면 공급자를 부르지 않는다.
 * onMiss 는 캐시에 없을 때만 부른다(요청 상한) — false 면 429.
 */
interface SiteUiOpts {
  source: SiteUiSource;
  hash: string;
  sourceId: string;
  lang: string;
  config: Awaited<ReturnType<typeof getSiteConfig>>;
  tag: string;
  onMiss?: () => boolean;
}

type SiteUiResult =
  | { strings: Record<string, string>; complete: boolean; cached: boolean }
  | { error: { status: NonNullable<Parameters<typeof jsonError>[1]>; code?: ApiErrorCode; message: string } };

/** 캐시에 있는 번역만 읽는다(공급자를 부르지 않는다) — 해시가 다르면(사전이 바뀌었으면) null */
export async function readCachedSiteUi(opts: Pick<SiteUiOpts, "source" | "hash" | "sourceId" | "lang">): Promise<Record<string, string> | null> {
  const { source, hash, sourceId, lang } = opts;
  const { data: cached } = await createAdminClient()
    .from("content_translations")
    .select("fields, source_hash")
    .eq("source_type", "site_ui").eq("source_id", sourceId).eq("lang", lang)
    .maybeSingle();
  if (cached?.source_hash !== hash) return null;
  const strings = sanitizeSiteUi(source, (cached.fields as { strings?: unknown } | null)?.strings);
  return Object.keys(strings).length ? strings : null;
}

export async function serveSiteUi(opts: SiteUiOpts): Promise<NextResponse> {
  const res = await translateSiteUi(opts);
  if ("error" in res) return jsonError(res.error.message, res.error.status, res.error.code ? { code: res.error.code } : undefined);
  return NextResponse.json({ lang: opts.lang, hash: opts.hash, ...res });
}

/** 사전 한 벌을 번역한다 — 캐시에 있으면 그것, 없으면 공급자를 불러 다 받았을 때 캐시한다 */
export async function translateSiteUi(opts: SiteUiOpts): Promise<SiteUiResult> {
  const { source, hash, sourceId, lang, config, tag, onMiss } = opts;
  const admin = createAdminClient();

  const { data: cached } = await admin
    .from("content_translations")
    .select("fields, source_hash")
    .eq("source_type", "site_ui").eq("source_id", sourceId).eq("lang", lang)
    .maybeSingle();
  if (cached?.source_hash === hash) {
    const strings = sanitizeSiteUi(source, (cached.fields as { strings?: unknown } | null)?.strings);
    return { strings, complete: Object.keys(strings).length === source.length, cached: true };
  }

  if (onMiss && !onMiss()) return { error: { status: 429, message: "Too many requests" } };

  const primary: Provider = (config?.translation?.provider as Provider) ?? "deepl";
  const providers = buildProviderList(primary, config?.translation?.fallback);
  const texts = source.map(([, text]) => text);
  const translations: (string | undefined)[] = new Array(texts.length);
  const failed: number[] = [];
  const failures: Parameters<typeof translationFailure>[0] = [];

  /* 묶음을 PARALLEL 개씩 — 실패한 묶음은 그 자리만 빈다(나머지는 살린다) */
  const chunks = chunkIndices(texts);
  for (let i = 0; i < chunks.length; i += PARALLEL) {
    await Promise.all(chunks.slice(i, i + PARALLEL).map(async (idx) => {
      const res = await translateWithFallback(providers, idx.map((j) => texts[j]), "en", lang, tag);
      if ("error" in res) {
        failed.push(...idx);
        failures.push(...(res.failures ?? []));
        return;
      }
      const bad = new Set(res.failedIndices);
      idx.forEach((j, n) => { if (bad.has(n)) failed.push(j); else translations[j] = res.translations[n]; });
    }));
  }

  const { strings, complete } = assembleSiteUi(source, translations, failed);
  if (!Object.keys(strings).length) {
    const { status, code } = translationFailure(failures);
    return { error: { status, code: code === "AI_PROVIDERS_DISABLED" ? "TRANSLATION_FAILED" : code, message: "Translation failed" } };
  }
  if (complete) {
    const { error } = await admin.from("content_translations").upsert({
      source_type: "site_ui", source_id: sourceId, lang, fields: { strings }, source_hash: hash,
      provider: providers[0], updated_at: new Date().toISOString(),
    }, { onConflict: "source_type,source_id,lang" });
    if (error) console.error(tag, "cache upsert failed", error.message);
  } else {
    console.warn(tag, `partial: ${Object.keys(strings).length}/${source.length}`);
  }
  return { strings, complete, cached: false };
}
