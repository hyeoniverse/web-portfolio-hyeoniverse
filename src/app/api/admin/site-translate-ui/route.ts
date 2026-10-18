import { jsonError } from "@/lib/api/response";
import { requireAuth } from "@/lib/api/requireAuth";
import { getSiteConfig } from "@/lib/getSiteConfig";
import { normalizeTranslationLang } from "@/lib/translationLanguages";
import { createMissLimiter } from "@/lib/api/contentTranslate";
import { ADMIN_UI_SOURCE_ID } from "@/lib/api/siteTranslate";
import { serveSiteUiKeys } from "@/lib/api/siteUiTranslate";
import { parseSiteUiKeys, siteUiSource } from "@/lib/siteTranslation";
import enAdmin from "@/locales/en.admin.json";

/* 한 화면의 글(많아야 수백 개)을 잘게 나눠 나란히 보낸다 */
export const maxDuration = 60;

const takeMiss = createMissLimiter(30, 300);
const texts = new Map(siteUiSource(enAdmin));

/**
 * POST /api/admin/site-translate-ui  { lang, keys }
 *
 * 관리자 화면의 메뉴 · 라벨 · 안내 글 — 지금 화면이 찾은 관리자 사전 열쇠(keys)의 번역만 돌려준다.
 * 방문자 사전(/api/site-translate/ui)과 같은 방식, 같은 종류(site_ui)의 다른 고정 번호로 캐시한다.
 * 로그인한 사용자만 — 공급자를 부를 때만 사용자마다 상한을 센다.
 */
export async function POST(request: Request) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const lang = normalizeTranslationLang(body.lang);
  const keys = parseSiteUiKeys(body.keys, texts);
  if (!lang || !keys.length) return jsonError("Invalid request", 400);

  const config = await getSiteConfig();
  if (config?.translation?.enabled === false) {
    return jsonError("Translation disabled", 503, { code: "TRANSLATION_NOT_CONFIGURED" });
  }

  return serveSiteUiKeys({
    texts, keys, sourceId: ADMIN_UI_SOURCE_ID, lang, config,
    tag: `[site-translate admin-ui ${lang}]`, onMiss: () => takeMiss(user.id),
  });
}
