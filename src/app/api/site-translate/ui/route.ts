import { jsonError } from "@/lib/api/response";
import { getSiteConfig } from "@/lib/getSiteConfig";
import { normalizeTranslationLang } from "@/lib/translationLanguages";
import { createMissLimiter } from "@/lib/api/contentTranslate";
import { SITE_UI_SOURCE_ID } from "@/lib/api/siteTranslate";
import { serveSiteUiKeys } from "@/lib/api/siteUiTranslate";
import { parseSiteUiKeys, siteUiSource } from "@/lib/siteTranslation";
import en from "@/locales/en.json";

/* 한 화면의 글(많아야 수백 개)을 잘게 나눠 나란히 보낸다 */
export const maxDuration = 60;

/* 화면마다 한 번씩 물으므로 요청 수 상한은 넉넉히 — 캐시에 있는 글은 세지 않아, 한 언어의 비용은 사전 크기를 넘지 않는다 */
const takeMiss = createMissLimiter(30, 300);
const texts = new Map(siteUiSource(en));

/**
 * POST /api/site-translate/ui  { lang, keys }
 *
 * 사이트 전체 "다른 언어로 보기"의 화면 글 — 지금 화면이 찾은 열쇠(keys)의 번역만 돌려준다(사전을 통째로 번역하지 않는다).
 * 캐시(content_translations, source_type 'site_ui', 문장마다 원문 해시)에 있으면 그것, 없는 것만 번역해 캐시에 더한다.
 * 관리자 사전은 /api/admin/site-translate-ui 가 따로 번역한다.
 * 공급자를 부를 때만 IP 당 상한을 센다. 자리표시({{n}}) · 태그가 깨진 글은 failed 로 돌려준다(화면은 그 글만 영어).
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const lang = normalizeTranslationLang(body.lang);
  const keys = parseSiteUiKeys(body.keys, texts);
  if (!lang || !keys.length) return jsonError("Invalid request", 400);

  const config = await getSiteConfig();
  if (config?.translation?.enabled === false) {
    return jsonError("Translation disabled", 503, { code: "TRANSLATION_NOT_CONFIGURED" });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  return serveSiteUiKeys({
    texts, keys, sourceId: SITE_UI_SOURCE_ID, lang, config,
    tag: `[site-translate ui ${lang}]`, onMiss: () => takeMiss(ip),
  });
}
