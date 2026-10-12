import { jsonError } from "@/lib/api/response";
import { getSiteConfig } from "@/lib/getSiteConfig";
import { normalizeTranslationLang } from "@/lib/translationLanguages";
import { createMissLimiter } from "@/lib/api/contentTranslate";
import { SITE_UI_SOURCE_ID } from "@/lib/api/siteTranslate";
import { serveSiteUi } from "@/lib/api/siteUiTranslate";
import { siteUiHash, siteUiSource } from "@/lib/siteTranslation";
import en from "@/locales/en.json";

/* 900 개 남짓을 몇 번에 나눠 보낸다 — 공급자 체인을 몇 번 돌 수 있다 */
export const maxDuration = 60;

const takeMiss = createMissLimiter();

/**
 * POST /api/site-translate/ui  { lang }
 *
 * 사이트 전체 "다른 언어로 보기"의 화면 글 — 방문자 사전(locales/en.json) 전체를 lang 으로 번역해 돌려준다.
 * 언어마다 한 줄(content_translations, source_type 'site_ui')로 캐시하고, 원문 해시(siteUiHash — 브라우저도 같은
 * 값을 계산한다)가 같으면 공급자를 부르지 않는다. 관리자 사전은 /api/admin/site-translate-ui 가 따로 번역한다.
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
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  return serveSiteUi({
    source, hash: siteUiHash(source), sourceId: SITE_UI_SOURCE_ID, lang, config,
    tag: `[site-translate ui ${lang}]`, onMiss: () => takeMiss(ip),
  });
}
