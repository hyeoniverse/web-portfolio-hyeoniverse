import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/response";
import { requireAuth } from "@/lib/api/requireAuth";
import { getSiteConfig } from "@/lib/getSiteConfig";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeTranslationLang } from "@/lib/translationLanguages";
import { createMissLimiter } from "@/lib/api/contentTranslate";
import { type Provider, buildProviderList, translateWithFallback } from "@/lib/api/translationProviders";
import { ADMIN_TEXTS_MAX, ADMIN_TEXT_MAX_CHARS, adminTextSourceLang } from "@/lib/adminTextsShared";

export const maxDuration = 30;

const takeMiss = createMissLimiter();

const hashOf = (text: string) => createHash("sha256").update(text).digest("hex").slice(0, 32);
const uuidOf = (h: string) => `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;

/**
 * POST /api/admin/site-translate-texts  { lang, texts }
 *
 * 관리자 화면의 정해진 시스템 글(알림 제목 · 본문처럼 서버가 만들어 저장한 글) — 사전에 없어 화면 글 번역(admin-ui)이 닿지 않는다.
 * 글 하나 × 언어 한 줄(content_translations, source_type 'admin_text')로 캐시한다. 로그인한 사용자만.
 * 응답은 { translations: {원문 → 번역} } — 번역하지 못한 글은 빠진다(화면은 원문).
 */
export async function POST(request: Request) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const lang = normalizeTranslationLang(body.lang);
  const texts = Array.isArray(body.texts)
    ? [...new Set(body.texts.filter((s): s is string => typeof s === "string" && !!s.trim() && s.length <= ADMIN_TEXT_MAX_CHARS))].slice(0, ADMIN_TEXTS_MAX)
    : [];
  if (!lang || !texts.length) return jsonError("Invalid request", 400);

  const config = await getSiteConfig();
  if (config?.translation?.enabled === false) {
    return jsonError("Translation disabled", 503, { code: "TRANSLATION_NOT_CONFIGURED" });
  }

  const admin = createAdminClient();
  const ids = new Map(texts.map((t) => [t, uuidOf(hashOf(t))]));
  const { data: rows } = await admin
    .from("content_translations")
    .select("source_id, fields")
    .eq("source_type", "admin_text").eq("lang", lang)
    .in("source_id", [...ids.values()]);
  const byId = new Map((rows ?? []).map((r) => [r.source_id as string, (r.fields as { text?: unknown } | null)?.text]));

  const out: Record<string, string> = {};
  const missing: string[] = [];
  for (const t of texts) {
    const hit = byId.get(ids.get(t)!);
    if (typeof hit === "string" && hit) out[t] = hit;
    else missing.push(t);
  }
  if (!missing.length) return NextResponse.json({ lang, translations: out });
  if (!takeMiss(user.id)) return NextResponse.json({ lang, translations: out, rateLimited: true });

  const primary: Provider = (config?.translation?.provider as Provider) ?? "deepl";
  const providers = buildProviderList(primary, config?.translation?.fallback);
  const tag = `[site-translate admin-text ${lang}]`;
  const upserts: Record<string, unknown>[] = [];
  /* 원문 언어(ko · en)마다 한 번에 — 고른 언어가 원문과 같으면 그대로 둔다 */
  for (const src of ["ko", "en"] as const) {
    const group = missing.filter((t) => adminTextSourceLang(t) === src);
    if (!group.length || src === lang) continue;
    const res = await translateWithFallback(providers, group, src, lang, tag);
    if ("error" in res) continue;
    const bad = new Set(res.failedIndices);
    group.forEach((t, i) => {
      const v = res.translations[i]?.trim();
      if (bad.has(i) || !v) return;
      out[t] = v;
      upserts.push({
        source_type: "admin_text", source_id: ids.get(t), lang, fields: { text: v }, source_hash: hashOf(t),
        provider: providers[0], updated_at: new Date().toISOString(),
      });
    });
  }
  if (upserts.length) {
    const { error } = await admin.from("content_translations").upsert(upserts, { onConflict: "source_type,source_id,lang" });
    if (error) console.error(tag, "cache upsert failed", error.message);
  }
  return NextResponse.json({ lang, translations: out });
}
