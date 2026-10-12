import type { getSiteConfig } from "@/lib/getSiteConfig";
import { ADMIN_UI_SOURCE_ID, SITE_UI_SOURCE_ID } from "@/lib/api/siteTranslate";
import { readCachedSiteUi, translateSiteUi } from "@/lib/api/siteUiTranslate";
import { adminUiHash, siteUiHash, siteUiSource } from "@/lib/siteTranslation";
import { isForeignSiteLanguage, normalizeSiteLanguage } from "@/lib/siteLanguage";
import en from "@/locales/en.json";
import enAdmin from "@/locales/en.admin.json";

/**
 * 사이트 기본 언어(ko · en 밖)의 화면 글 사전(#1406).
 *
 * 기본 언어를 바꾸면 설정 저장 때 방문자 사전 · 관리자 사전을 그 언어로 미리 번역해 캐시해 둔다(prewarm).
 * 서버는 그 번역을 기본 사전으로 읽어 첫 화면부터 그 언어로 그린다(read). 첫 방문자가 번역 비용을 내지 않는다.
 */
function dicts() {
  const site = siteUiSource(en);
  const admin = siteUiSource(enAdmin);
  return [
    { source: site, hash: siteUiHash(site), sourceId: SITE_UI_SOURCE_ID, name: "ui" },
    { source: admin, hash: adminUiHash(admin), sourceId: ADMIN_UI_SOURCE_ID, name: "admin-ui" },
  ] as const;
}

/** 설정 저장 뒤 — 기본 언어가 ko · en 밖이면 두 사전을 번역해 캐시한다. 이미 캐시에 있으면 공급자를 부르지 않는다 */
export async function prewarmDefaultLangUi(config: Awaited<ReturnType<typeof getSiteConfig>>): Promise<void> {
  const code = config?.metadata?.defaultLanguage;
  if (!isForeignSiteLanguage(code) || config?.translation?.enabled === false) return;
  const lang = normalizeSiteLanguage(code);
  for (const d of dicts()) {
    const res = await translateSiteUi({ ...d, lang, config, tag: `[default-lang ${d.name} ${lang}]` });
    if ("error" in res) console.error(`[default-lang ${d.name} ${lang}]`, res.error.message);
  }
}

/** 서버 렌더 — 기본 언어 방문자 사전의 캐시된 번역. ko · en 이거나 아직 번역이 없으면 null */
export async function readDefaultLangUi(code: unknown): Promise<Record<string, string> | null> {
  if (!isForeignSiteLanguage(code)) return null;
  const [site] = dicts();
  try {
    return await readCachedSiteUi({ ...site, lang: normalizeSiteLanguage(code) });
  } catch {
    return null;
  }
}
