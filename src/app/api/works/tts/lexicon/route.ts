import { requireRole } from "@/lib/api/requireRole";
import { PERM } from "@/lib/api/roles";
import { jsonOk, jsonServerError } from "@/lib/api/response";
import { createAdminClient } from "@/lib/supabase/admin";
import { LEXICON_ROW, isLexiconLang, lexiconOf, sanitizeLexicon, withLexicon, type LexiconConfig } from "@/lib/ttsLexicon";

/**
 * GET·PUT /api/works/tts/lexicon — 슬라이드 음성 읽기 사전(lib/ttsLexicon).
 * 음성을 만들 수 있는 사람(저자 이상)이 읽고 고친다. 사이트 전체에 하나라 site_settings 의 한 행에 둔다.
 * 사전은 대본 언어(lang=ko|en, 없으면 ko)마다 따로다 — PUT 은 그 언어의 사전만 바꾸고 다른 언어는 그대로 둔다.
 */
async function readConfig() {
  return createAdminClient().from("site_settings").select("config").eq("id", LEXICON_ROW).maybeSingle();
}

export async function GET(request: Request) {
  const { error: authError } = await requireRole(PERM.AUTHOR);
  if (authError) return authError;
  const param = new URL(request.url).searchParams.get("lang");
  const lang = isLexiconLang(param) ? param : "ko";
  const { data, error } = await readConfig();
  if (error) return jsonServerError(error, "GET /api/works/tts/lexicon");
  return jsonOk({ lang, entries: lexiconOf(data?.config as LexiconConfig | null, lang) });
}

export async function PUT(request: Request) {
  const { error: authError } = await requireRole(PERM.AUTHOR);
  if (authError) return authError;
  const body = await request.json().catch(() => ({}));
  const lang = isLexiconLang(body?.lang) ? body.lang : "ko";
  const entries = sanitizeLexicon(body?.entries);
  const { data, error: readError } = await readConfig();
  if (readError) return jsonServerError(readError, "PUT /api/works/tts/lexicon");
  const { error } = await createAdminClient().from("site_settings").upsert({
    id: LEXICON_ROW,
    config: withLexicon(data?.config as LexiconConfig | null, lang, entries),
    updated_at: new Date().toISOString(),
  });
  if (error) return jsonServerError(error, "PUT /api/works/tts/lexicon");
  return jsonOk({ lang, entries });
}
