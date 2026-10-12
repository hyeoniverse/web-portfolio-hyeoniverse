import { jsonError } from "@/lib/api/response";
import { requireAuth } from "@/lib/api/requireAuth";
import { getSiteConfig } from "@/lib/getSiteConfig";
import { normalizeTranslationLang } from "@/lib/translationLanguages";
import { createMissLimiter } from "@/lib/api/contentTranslate";
import { ADMIN_UI_SOURCE_ID } from "@/lib/api/siteTranslate";
import { serveSiteUi } from "@/lib/api/siteUiTranslate";
import { adminUiHash, siteUiSource } from "@/lib/siteTranslation";
import enAdmin from "@/locales/en.admin.json";

/* 2,000 개 남짓 — 공급자 체인을 여러 번 돈다 */
export const maxDuration = 120;

const takeMiss = createMissLimiter();

/**
 * POST /api/admin/site-translate-ui  { lang }
 *
 * 관리자 화면의 메뉴 · 라벨 · 안내 글 — 관리자 사전(locales/en.admin.json)을 lang 으로 번역해 돌려준다.
 * 방문자 사전(/api/site-translate/ui)과 같은 방식, 같은 종류(site_ui)의 다른 고정 번호로 캐시한다.
 * 로그인한 사용자만 — 번역 비용은 그 언어를 처음 고른 관리자 한 사람이 낸다.
 */
export async function POST(request: Request) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const lang = normalizeTranslationLang(body.lang);
  if (!lang) return jsonError("Invalid request", 400);

  const config = await getSiteConfig();
  if (config?.translation?.enabled === false) {
    return jsonError("Translation disabled", 503, { code: "TRANSLATION_NOT_CONFIGURED" });
  }

  const source = siteUiSource(enAdmin);
  return serveSiteUi({
    source, hash: adminUiHash(source), sourceId: ADMIN_UI_SOURCE_ID, lang, config,
    tag: `[site-translate admin-ui ${lang}]`, onMiss: () => takeMiss(user.id),
  });
}
