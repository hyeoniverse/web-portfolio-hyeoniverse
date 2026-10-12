import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/response";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteConfig } from "@/lib/getSiteConfig";
import { normalizeTranslationLang } from "@/lib/translationLanguages";
import { createMissLimiter } from "@/lib/api/contentTranslate";
import { SITE_UI_SOURCE_ID } from "@/lib/api/siteTranslate";
import { assembleSiteUi, chunkIndices, sanitizeSiteUi, siteUiHash, siteUiSource } from "@/lib/siteTranslation";
import { type Provider, buildProviderList, translateWithFallback, translationFailure } from "@/lib/api/translationProviders";
import en from "@/locales/en.json";

/* 900 개 남짓을 몇 번에 나눠 보낸다 — 공급자 체인을 몇 번 돌 수 있다 */
export const maxDuration = 60;

const takeMiss = createMissLimiter();
/* 한 번에 나란히 보내는 묶음 수 — 공급자의 동시 요청 제한에 걸리지 않을 만큼 */
const PARALLEL = 3;

/**
 * POST /api/site-translate/ui  { lang }
 *
 * 사이트 전체 "다른 언어로 보기"의 화면 글 — 방문자 사전(locales/en.json) 전체를 lang 으로 번역해 돌려준다.
 * 언어마다 한 줄(content_translations, source_type 'site_ui')로 캐시하고, 원문 해시(siteUiHash — 브라우저도 같은
 * 값을 계산한다)가 같으면 공급자를 부르지 않는다. 관리자 사전은 번역하지 않는다.
 *
 * 처음 그 언어를 고른 방문자 한 사람만 번역 비용을 낸다 — 캐시에 없을 때만 IP 당 상한을 센다(한 번).
 * 자리표시({{n}}) · 태그가 깨진 글은 빼고 돌려준다(화면은 그 글만 영어). 다 받지 못하면 캐시하지 않는다(complete:false).
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const lang = normalizeTranslationLang(body.lang);
  if (!lang) return jsonError("Invalid request", 400);

  const config = await getSiteConfig();
  if (config?.translation?.enabled === false) {
    return jsonError("Translation disabled", 503, { code: "TRANSLATION_NOT_CONFIGURED" });
  }

  const source = siteUiSource(en);
  const hash = siteUiHash(source);
  const admin = createAdminClient();
  const tag = `[site-translate ui ${lang}]`;

  const { data: cached } = await admin
    .from("content_translations")
    .select("fields, source_hash")
    .eq("source_type", "site_ui").eq("source_id", SITE_UI_SOURCE_ID).eq("lang", lang)
    .maybeSingle();
  if (cached?.source_hash === hash) {
    const strings = sanitizeSiteUi(source, (cached.fields as { strings?: unknown } | null)?.strings);
    return NextResponse.json({ lang, hash, strings, complete: Object.keys(strings).length === source.length, cached: true });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!takeMiss(ip)) return jsonError("Too many requests", 429);

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
    return jsonError("Translation failed", status, { code: code === "AI_PROVIDERS_DISABLED" ? "TRANSLATION_FAILED" : code });
  }
  if (complete) {
    const { error } = await admin.from("content_translations").upsert({
      source_type: "site_ui", source_id: SITE_UI_SOURCE_ID, lang, fields: { strings }, source_hash: hash,
      provider: providers[0], updated_at: new Date().toISOString(),
    }, { onConflict: "source_type,source_id,lang" });
    if (error) console.error(tag, "cache upsert failed", error.message);
  } else {
    console.warn(tag, `partial: ${Object.keys(strings).length}/${source.length}`);
  }
  return NextResponse.json({ lang, hash, strings, complete, cached: false });
}
