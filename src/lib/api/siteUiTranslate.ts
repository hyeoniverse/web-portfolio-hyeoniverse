import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/response";
import type { ApiErrorCode } from "@/lib/apiError";
import { createAdminClient } from "@/lib/supabase/admin";
import type { getSiteConfig } from "@/lib/getSiteConfig";
import { acceptSiteString, chunkIndices, siteUiSrcOf, validSiteUi, type SiteUiCache } from "@/lib/siteTranslation";
import { type Provider, buildProviderList, translateWithFallback, translationFailure } from "@/lib/api/translationProviders";

/* 묶음 크기 · 동시에 보내는 묶음 수 — 큰 묶음(120개 · 6천 자)은 하나가 1분 가까이 걸려,
   잘게 잘라 나란히 보낸다(sourceTranslate 와 같은 값) */
const CHUNK_ITEMS = 30;
const CHUNK_CHARS = 2000;
const PARALLEL = 6;

/**
 * 화면 글(방문자 사전 · 관리자 사전)을 열쇠 단위로 번역한다 — 방문자 사전(/api/site-translate/ui)과
 * 관리자 사전(/api/admin/site-translate-ui)이 같이 쓴다. 언어마다 한 줄(content_translations, source_type 'site_ui',
 * 사전마다 다른 source_id)에 문장마다 번역과 원문 해시를 둔다(SiteUiCache).
 * 물은 열쇠 가운데 캐시에 없거나 원문이 바뀐 것만 공급자에 보내고, 받은 것은 그때그때 캐시에 더한다.
 * onMiss 는 공급자를 부를 때만 부른다(요청 상한) — false 면 429.
 */
interface SiteUiOpts {
  /** 사전의 열쇠 → 영어 원문 */
  texts: ReadonlyMap<string, string>;
  sourceId: string;
  lang: string;
  config: Awaited<ReturnType<typeof getSiteConfig>>;
  tag: string;
  onMiss?: () => boolean;
}

type SiteUiError = { status: NonNullable<Parameters<typeof jsonError>[1]>; code?: ApiErrorCode; message: string };
type SiteUiResult = { strings: Record<string, string>; failed: string[] } | { error: SiteUiError };

async function readRow(sourceId: string, lang: string): Promise<unknown> {
  const { data } = await createAdminClient()
    .from("content_translations")
    .select("fields")
    .eq("source_type", "site_ui").eq("source_id", sourceId).eq("lang", lang)
    .maybeSingle();
  return data?.fields ?? null;
}

/** 캐시에 있는 번역만 읽는다(공급자를 부르지 않는다) — 지금 원문과 맞는 문장만. 하나도 없으면 null */
export async function readCachedSiteUi(opts: Pick<SiteUiOpts, "texts" | "sourceId" | "lang">): Promise<Record<string, string> | null> {
  const strings = validSiteUi(opts.texts, await readRow(opts.sourceId, opts.lang));
  return Object.keys(strings).length ? strings : null;
}

/**
 * 열쇠들의 번역 — 캐시에 있으면 그것, 없는 것만 번역해 캐시에 더한다.
 * 자리표시 · 태그가 깨진 번역과 공급자가 빠뜨린 자리는 failed 로 돌려준다(화면은 그 글만 영어).
 */
export async function translateSiteUiKeys(opts: SiteUiOpts & { keys: string[] }): Promise<SiteUiResult> {
  const { texts, keys, sourceId, lang, config, tag, onMiss } = opts;
  const cached = validSiteUi(texts, await readRow(sourceId, lang));
  const hit: Record<string, string> = {};
  const miss: string[] = [];
  for (const k of keys) {
    if (!texts.has(k)) continue;
    if (cached[k]) hit[k] = cached[k];
    else miss.push(k);
  }
  if (!miss.length) return { strings: hit, failed: [] };
  if (onMiss && !onMiss()) return { error: { status: 429, message: "Too many requests" } };

  const providers = buildProviderList((config?.translation?.provider as Provider) ?? "deepl", config?.translation?.fallback);
  const sources = miss.map((k) => texts.get(k) as string);
  const got: Record<string, string> = {};
  const failures: Parameters<typeof translationFailure>[0] = [];
  const chunks = chunkIndices(sources, CHUNK_ITEMS, CHUNK_CHARS);
  let next = 0;
  const worker = async () => {
    while (next < chunks.length) {
      const idx = chunks[next++];
      const res = await translateWithFallback(providers, idx.map((i) => sources[i]), "en", lang, tag);
      if ("error" in res) { failures.push(...(res.failures ?? [])); continue; }
      const bad = new Set(res.failedIndices);
      idx.forEach((i, n) => {
        const v = bad.has(n) ? null : acceptSiteString(sources[i], res.translations[n]);
        if (v) got[miss[i]] = v;
      });
    }
  };
  await Promise.all(Array.from({ length: Math.min(PARALLEL, chunks.length) }, worker));

  const gotKeys = Object.keys(got);
  if (!gotKeys.length && !Object.keys(hit).length) {
    const { status, code } = translationFailure(failures);
    return { error: { status, code: code === "AI_PROVIDERS_DISABLED" ? "TRANSLATION_FAILED" : code, message: "Translation failed" } };
  }
  if (gotKeys.length) {
    /* 번역하는 동안 다른 요청이 더한 문장을 지우지 않게 — 쓰기 직전에 다시 읽어 그 위에 얹는다 */
    const fresh = await readRow(sourceId, lang);
    const base = validSiteUi(texts, fresh);
    const merged: SiteUiCache = {
      strings: { ...base, ...got },
      src: siteUiSrcOf(texts, [...Object.keys(base), ...gotKeys]),
    };
    const { error } = await createAdminClient().from("content_translations").upsert({
      source_type: "site_ui", source_id: sourceId, lang, fields: merged, source_hash: "per-key",
      provider: providers[0], updated_at: new Date().toISOString(),
    }, { onConflict: "source_type,source_id,lang" });
    if (error) console.error(tag, "cache upsert failed", error.message);
  }
  return { strings: { ...hit, ...got }, failed: miss.filter((k) => !got[k]) };
}

export async function serveSiteUiKeys(opts: SiteUiOpts & { keys: string[] }): Promise<NextResponse> {
  const res = await translateSiteUiKeys(opts);
  if ("error" in res) return jsonError(res.error.message, res.error.status, res.error.code ? { code: res.error.code } : undefined);
  return NextResponse.json({ lang: opts.lang, ...res });
}
