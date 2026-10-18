import type { getSiteConfig } from "@/lib/getSiteConfig";
import { SITE_UI_SOURCE_ID } from "@/lib/api/siteTranslate";
import { readCachedSiteUi, translateSiteUiKeys } from "@/lib/api/siteUiTranslate";
import { siteUiSource } from "@/lib/siteTranslation";
import { isForeignSiteLanguage, normalizeSiteLanguage } from "@/lib/siteLanguage";
import en from "@/locales/en.json";

/**
 * 사이트 기본 언어(ko · en 밖)의 화면 글 사전(#1406).
 *
 * 기본 언어를 바꾸면 설정 저장 뒤 방문자 사전을 그 언어로 미리 번역해 캐시해 둔다(prewarm) — 첫 방문자가 영어를 보지 않게.
 * 관리자 사전은 미리 번역하지 않는다 — 관리 화면은 보는 화면의 글만 그때 번역한다(lib/siteLang).
 * 서버는 캐시에 있는 만큼 그 언어로 그린다(read). 아직 없는 문장은 영어로 그려지고, 브라우저가 그 문장만 물어 채운다.
 */
const texts = new Map(siteUiSource(en));

/** 설정 저장 뒤 — 기본 언어가 ko · en 밖이면 방문자 사전을 번역해 캐시한다. 이미 캐시에 있는 문장은 공급자를 부르지 않는다 */
export async function prewarmDefaultLangUi(config: Awaited<ReturnType<typeof getSiteConfig>>): Promise<void> {
  const code = config?.metadata?.defaultLanguage;
  if (!isForeignSiteLanguage(code) || config?.translation?.enabled === false) return;
  const lang = normalizeSiteLanguage(code);
  const tag = `[default-lang ui ${lang}]`;
  const res = await translateSiteUiKeys({ texts, keys: [...texts.keys()], sourceId: SITE_UI_SOURCE_ID, lang, config, tag });
  if ("error" in res) console.error(tag, res.error.message);
}

/** 서버 렌더 — 기본 언어 방문자 사전의 캐시된 번역(있는 만큼). ko · en 이거나 하나도 없으면 null */
export async function readDefaultLangUi(code: unknown): Promise<Record<string, string> | null> {
  if (!isForeignSiteLanguage(code)) return null;
  try {
    return await readCachedSiteUi({ texts, sourceId: SITE_UI_SOURCE_ID, lang: normalizeSiteLanguage(code) });
  } catch {
    return null;
  }
}
