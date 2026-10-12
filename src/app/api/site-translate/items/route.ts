import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/response";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteConfig } from "@/lib/getSiteConfig";
import { clampTitle } from "@/lib/postConstants";
import { normalizeTranslationLang } from "@/lib/translationLanguages";
import { createMissLimiter } from "@/lib/api/contentTranslate";
import {
  LIST_META_SELECT,
  type ListMetaSource,
  listMetaHash,
  listMetaSource,
  metaSourceType,
} from "@/lib/api/siteTranslate";
import { type ListItemFields, type ListItemRef, type ListItemType, listItemKey, parseListItems } from "@/lib/siteTranslation";
import { type Provider, buildProviderList, translateWithFallback } from "@/lib/api/translationProviders";

export const maxDuration = 30;

/* 목록은 화면마다 한 번씩 부른다 — 상세보다 넉넉히. 캐시에 없는 항목이 하나라도 있는 요청만 센다 */
const takeMiss = createMissLimiter(20, 120);

const TABLE: Record<ListItemType, "posts" | "works" | "series"> = { post: "posts", work: "works", series: "series" };

/**
 * POST /api/site-translate/items  { lang, items: [{ type: "post" | "work" | "series", id }] }
 *
 * 목록 카드의 짧은 칸(제목 · 요약 · 부제목 · 설명)만 lang 으로 — 본문은 번역하지 않는다.
 * 항목마다 content_translations 한 줄(source_type 'post_meta' · 'work_meta' · 'series_meta')로 캐시하고,
 * 캐시에 없는 항목만 한 번의 평문 요청으로 모아 공급자에 보낸다. 한 요청에 LIST_BATCH_MAX 개까지.
 * 발행되고 휴지통에 없는 것만(공개 목록에 보이는 것). 번역하지 못한 칸은 빼고 돌려준다(카드는 원문).
 *
 * 응답: { items: { "post:<id>": { title, excerpt } … } }
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const lang = normalizeTranslationLang(body.lang);
  const refs = parseListItems(body.items);
  if (!lang || refs.length === 0) return jsonError("Invalid request", 400);

  const config = await getSiteConfig();
  if (config?.translation?.enabled === false) {
    return jsonError("Translation disabled", 503, { code: "TRANSLATION_NOT_CONFIGURED" });
  }

  const admin = createAdminClient();
  const tag = `[site-translate items ${lang}]`;

  /* 원문 — 종류마다 한 번에. 공개된 것만 */
  const sources = new Map<string, { ref: ListItemRef; src: ListMetaSource; hash: string }>();
  for (const type of ["post", "work", "series"] as const) {
    const ids = refs.filter((r) => r.type === type).map((r) => r.id);
    if (!ids.length) continue;
    let q = admin.from(TABLE[type]).select(LIST_META_SELECT[type]).in("id", ids).eq("published", true);
    if (type !== "series") q = q.is("deleted_at", null);
    const { data } = await q;
    for (const row of (data ?? []) as unknown as Record<string, unknown>[]) {
      const ref = { type, id: String(row.id).toLowerCase() };
      const src = listMetaSource(type, row);
      if (src) sources.set(listItemKey(ref), { ref, src, hash: listMetaHash(src) });
    }
  }
  if (!sources.size) return NextResponse.json({ lang, items: {} });

  /* 캐시 — 원문 해시가 같은 줄만 */
  const items: Record<string, ListItemFields> = {};
  const { data: cachedRows } = await admin
    .from("content_translations")
    .select("source_type, source_id, fields, source_hash")
    .in("source_type", ["post_meta", "work_meta", "series_meta"])
    .in("source_id", [...sources.values()].map((s) => s.ref.id))
    .eq("lang", lang);
  for (const row of cachedRows ?? []) {
    const type = String(row.source_type).replace(/_meta$/, "") as ListItemType;
    const key = listItemKey({ type, id: String(row.source_id) });
    const s = sources.get(key);
    if (s && row.source_hash === s.hash) items[key] = row.fields as ListItemFields;
  }

  const misses = [...sources.entries()].filter(([key]) => !items[key]);
  if (!misses.length) return NextResponse.json({ lang, items, cached: true });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  /* 상한이면 캐시에 있던 것만 — 나머지 카드는 원문 */
  if (!takeMiss(ip)) {
    return Object.keys(items).length
      ? NextResponse.json({ lang, items, partial: true })
      : jsonError("Too many requests", 429);
  }

  /* 캐시에 없는 항목의 칸을 원문 언어별로 모아 평문 한 번씩(원문 언어가 둘이면 두 번) */
  const primary: Provider = (config?.translation?.provider as Provider) ?? "deepl";
  const providers = buildProviderList(primary, config?.translation?.fallback);
  const rows: { source_type: string; source_id: string; lang: string; fields: ListItemFields; source_hash: string; provider: Provider; updated_at: string }[] = [];
  for (const srcLang of ["ko", "en"] as const) {
    const group = misses.filter(([, s]) => s.src.lang === srcLang);
    const slots: { key: string; field: keyof ListItemFields; text: string }[] = [];
    for (const [key, s] of group) {
      for (const [field, text] of Object.entries(s.src.fields) as [keyof ListItemFields, string][]) slots.push({ key, field, text });
    }
    if (!slots.length) continue;
    const res = await translateWithFallback(providers, slots.map((x) => x.text), srcLang, lang, tag);
    if ("error" in res) continue;
    const bad = new Set(res.failedIndices);
    const got = new Map<string, ListItemFields>();
    slots.forEach((x, i) => {
      const v = bad.has(i) ? "" : res.translations[i]?.trim();
      if (!v) return;
      const f = got.get(x.key) ?? {};
      f[x.field] = x.field === "title" ? clampTitle(v) : v;
      got.set(x.key, f);
    });
    for (const [key, s] of group) {
      const f = got.get(key);
      if (!f) continue;
      items[key] = f;
      /* 칸이 다 번역된 항목만 저장한다 — 빠진 칸은 다음에 다시 */
      if (Object.keys(f).length === Object.keys(s.src.fields).length) {
        rows.push({
          source_type: metaSourceType(s.ref.type), source_id: s.ref.id, lang, fields: f, source_hash: s.hash,
          provider: providers[0], updated_at: new Date().toISOString(),
        });
      }
    }
  }
  if (rows.length) {
    const { error } = await admin.from("content_translations").upsert(rows, { onConflict: "source_type,source_id,lang" });
    if (error) console.error(tag, "cache upsert failed", error.message);
  }
  return NextResponse.json({ lang, items, cached: false });
}
