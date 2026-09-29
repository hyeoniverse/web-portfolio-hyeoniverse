import { requireRole } from "@/lib/api/requireRole";
import { PERM } from "@/lib/api/roles";
import { jsonOk, jsonServerError } from "@/lib/api/response";
import { createAdminClient } from "@/lib/supabase/admin";
import { LEXICON_ROW, sanitizeLexicon } from "@/lib/ttsLexicon";

/**
 * GET·PUT /api/works/tts/lexicon — 슬라이드 음성 읽기 사전(lib/ttsLexicon).
 * 음성을 만들 수 있는 사람(저자 이상)이 읽고 고친다. 사이트 전체에 하나라 site_settings 의 한 행에 둔다.
 */
export async function GET() {
  const { error: authError } = await requireRole(PERM.AUTHOR);
  if (authError) return authError;
  const { data, error } = await createAdminClient().from("site_settings").select("config").eq("id", LEXICON_ROW).maybeSingle();
  if (error) return jsonServerError(error, "GET /api/works/tts/lexicon");
  return jsonOk({ entries: sanitizeLexicon((data?.config as { entries?: unknown } | null)?.entries) });
}

export async function PUT(request: Request) {
  const { error: authError } = await requireRole(PERM.AUTHOR);
  if (authError) return authError;
  const body = await request.json().catch(() => ({}));
  const entries = sanitizeLexicon(body?.entries);
  const { error } = await createAdminClient().from("site_settings").upsert({
    id: LEXICON_ROW,
    config: { entries },
    updated_at: new Date().toISOString(),
  });
  if (error) return jsonServerError(error, "PUT /api/works/tts/lexicon");
  return jsonOk({ entries });
}
