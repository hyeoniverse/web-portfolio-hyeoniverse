import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteConfig } from "@/lib/getSiteConfig";
import { sourceTargetOf } from "@/lib/siteLanguage";
import { chunkIndices } from "@/lib/siteTranslation";
import { type Provider, buildProviderList, translateWithFallback } from "@/lib/api/translationProviders";

/**
 * 기본 언어를 바꾸면 원문 칸(ko)을 새 언어로 번역해 덮어쓴다(#1425).
 *
 * - 설정 글: 설정을 저장할 때 한 번에(양이 적다) — translateConfigSource
 * - 글 · 작업물: 관리자가 편집 화면에 들어갈 때 그 글만 — translateRowSource
 * 덮어쓰기 전 원문은 content_translations 에 그 언어로 한 줄 남긴다(되돌릴 때 원래 글로 돌아오게).
 */

type Config = Awaited<ReturnType<typeof getSiteConfig>>;
type Obj = Record<string, unknown>;

/** 설정 글 백업 줄의 고정 번호 */
export const SETTINGS_SOURCE_ID = "00000000-0000-0000-0000-000000000004";
/** 프로필 글 백업 줄의 고정 번호 */
export const PROFILE_SOURCE_ID = "00000000-0000-0000-0000-000000000005";

function providersOf(config: Config): Provider[] {
  return buildProviderList((config?.translation?.provider as Provider) ?? "deepl", config?.translation?.fallback);
}

/** 여러 글을 묶음으로 나눠 번역한다 — 하나라도 못 받으면 null(덮어쓰지 않는다) */
async function translateAll(texts: string[], from: string, to: string, config: Config, tag: string, html = false): Promise<string[] | null> {
  if (!texts.length) return [];
  const out: string[] = new Array(texts.length);
  for (const idx of chunkIndices(texts)) {
    const res = await translateWithFallback(providersOf(config), idx.map((i) => texts[i]), from, to, tag, { html });
    if ("error" in res || res.failedIndices.length) return null;
    idx.forEach((i, n) => { out[i] = res.translations[n]; });
  }
  return out;
}

async function backup(sourceType: "post_source" | "work_source" | "settings_source", sourceId: string, lang: string, fields: Obj) {
  const { error } = await createAdminClient().from("content_translations").upsert({
    source_type: sourceType, source_id: sourceId, lang, fields, source_hash: "",
    updated_at: new Date().toISOString(),
  }, { onConflict: "source_type,source_id,lang" });
  if (error) console.error(`[source-translate ${sourceType}] backup failed`, error.message);
}

/* ── 설정 글 ── */

type Path = (string | number)[];

/** 설정에서 원문 칸(ko) 글의 자리를 모은다 — { ko, en } 묶음의 ko, x_ko 칸(글 · 글 배열) */
export function collectKoTexts(v: unknown, path: Path = [], out: [Path, string][] = [], depth = 0): [Path, string][] {
  if (depth > 10 || !v || typeof v !== "object") return out;
  if (Array.isArray(v)) {
    v.forEach((x, i) => collectKoTexts(x, [...path, i], out, depth + 1));
    return out;
  }
  const o = v as Obj;
  for (const [k, val] of Object.entries(o)) {
    const isKo = k === "ko" ? typeof o.en === "string" : k.endsWith("_ko");
    if (isKo && typeof val === "string") {
      if (val.trim()) out.push([[...path, k], val]);
    } else if (isKo && Array.isArray(val)) {
      val.forEach((x, i) => { if (typeof x === "string" && x.trim()) out.push([[...path, k, i], x]); });
    } else if (val && typeof val === "object") {
      collectKoTexts(val, [...path, k], out, depth + 1);
    }
  }
  return out;
}

function getAt(v: unknown, path: Path): unknown {
  return path.reduce<unknown>((cur, key) => (cur && typeof cur === "object" ? (cur as Obj)[key as string] : undefined), v);
}

/** delta 의 path 에 값을 넣는다 — 중간 객체가 없으면 만든다 */
function setAt(target: Obj, path: Path, value: unknown) {
  let cur: Obj = target;
  path.slice(0, -1).forEach((key) => {
    const next = cur[key as string];
    if (!next || typeof next !== "object" || Array.isArray(next)) cur[key as string] = {};
    cur = cur[key as string] as Obj;
  });
  cur[path[path.length - 1] as string] = value;
}

/**
 * 설정의 원문 글을 from → to 로 번역해 delta 에 넣는다. delta 의 배열은 통째로 덮이므로(getSiteConfig 의 병합)
 * 배열 안의 글이면 그 배열을 번역된 전체 값으로 넣는다. 성공하면 true — 실패하면 delta 를 건드리지 않는다.
 */
export async function translateConfigSource(full: Obj, delta: Obj, from: string, to: string, config: Config): Promise<boolean> {
  const items = collectKoTexts(full);
  const texts = items.map(([, t]) => t);
  const translated = await translateAll(texts, from, to, config, `[source-translate settings ${from}→${to}]`);
  if (!translated) return false;

  await backup("settings_source", SETTINGS_SOURCE_ID, from, Object.fromEntries(items.map(([p, t]) => [p.join("."), t])));

  const next = structuredClone(full);
  items.forEach(([p], i) => setAt(next, p, translated[i]));
  const roots = new Map<string, Path>();
  for (const [p] of items) {
    const arrayAt = p.findIndex((_, n) => Array.isArray(getAt(next, p.slice(0, n + 1))));
    const root = arrayAt >= 0 ? p.slice(0, arrayAt + 1) : p;
    roots.set(root.join("."), root);
  }
  for (const root of roots.values()) setAt(delta, root, structuredClone(getAt(next, root)));
  return true;
}

/** 프로필(site_settings 의 profile 행) 원문 글을 from → to 로 — 저장 형식({ data, savedDefaults } 또는 통째)을 그대로 지킨다 */
export async function translateProfileSource(from: string, to: string, config: Config): Promise<boolean> {
  const admin = createAdminClient();
  const { data: row } = await admin.from("site_settings").select("config").eq("id", "profile").maybeSingle();
  const stored = row?.config as Obj | undefined;
  if (!stored) return true;
  const data = (stored.data && stored.savedDefaults ? stored.data : stored) as Obj;
  const items = collectKoTexts(data);
  const translated = await translateAll(items.map(([, t]) => t), from, to, config, `[source-translate profile ${from}→${to}]`);
  if (!translated) return false;
  if (!items.length) return true;
  await backup("settings_source", PROFILE_SOURCE_ID, from, Object.fromEntries(items.map(([p, t]) => [p.join("."), t])));
  const next = structuredClone(data);
  items.forEach(([p], i) => setAt(next, p, translated[i]));
  const config2 = stored.data && stored.savedDefaults ? { ...stored, data: next } : next;
  const { error } = await admin.from("site_settings").upsert({ id: "profile", config: config2, updated_at: new Date().toISOString() }, { onConflict: "id" });
  if (error) console.error("[source-translate profile] save failed", error.message);
  return !error;
}

/* ── 글 · 작업물 ── */

const ROW_FIELDS = {
  posts: { text: ["title", "excerpt", "summary_ko"], list: [] as string[], html: "content" },
  works: {
    text: ["title", "subtitle_ko", "description_ko", "nature_ko", "role_ko", "overview_ko", "challenge_ko", "solution_ko", "summary_ko"],
    list: ["categories_ko"],
    html: "content_ko",
  },
} as const;

export type SourceTranslateResult = { row: Obj; translated: boolean } | { error: "not_found" | "failed" };

/**
 * 글 · 작업물 한 건의 원문 칸을 그 글의 원문 언어(source_lang, 비어 있으면 ko) → to 로 번역해 덮어쓴다.
 * 이미 to 면 그대로 돌려준다. 읽고 쓰는 것은 호출한 사용자의 클라이언트(편집 권한은 RLS · requirePostAccess)
 */
export async function translateRowSource(
  supabase: SupabaseClient, table: "posts" | "works", id: string, to: string, config: Config,
): Promise<SourceTranslateResult> {
  const { data: row } = await supabase.from(table).select("*").eq("id", id).maybeSingle();
  if (!row) return { error: "not_found" };
  const from = (typeof row.source_lang === "string" && row.source_lang) || "ko";
  if (from === to) return { row, translated: false };

  const spec = ROW_FIELDS[table];
  const tag = `[source-translate ${table} ${id} ${from}→${to}]`;
  const textCols = spec.text.filter((c) => typeof row[c] === "string" && row[c].trim());
  const listCols = spec.list.filter((c) => Array.isArray(row[c]) && row[c].length);
  const plain = [...textCols.map((c) => row[c] as string), ...listCols.flatMap((c) => row[c] as string[])];
  const body = typeof row[spec.html] === "string" ? (row[spec.html] as string) : "";

  const [plainTr, bodyTr] = await Promise.all([
    translateAll(plain, from, to, config, tag),
    body.trim() ? translateAll([body], from, to, config, tag, row.content_type === "richtext") : Promise.resolve([""]),
  ]);
  if (!plainTr || !bodyTr) return { error: "failed" };

  const original: Obj = { [spec.html]: body };
  const patch: Obj = { source_lang: to, updated_at: new Date().toISOString() };
  /* 편집기는 version 으로 다른 저장과의 충돌을 가린다 — 덮어쓴 것도 한 번의 저장으로 센다 */
  if (typeof row.version === "number") patch.version = row.version + 1;
  textCols.forEach((c, i) => { original[c] = row[c]; patch[c] = plainTr[i]; });
  let n = textCols.length;
  for (const c of listCols) {
    const list = row[c] as string[];
    original[c] = list;
    patch[c] = plainTr.slice(n, n + list.length);
    n += list.length;
  }
  if (body.trim()) patch[spec.html] = bodyTr[0];

  await backup(table === "posts" ? "post_source" : "work_source", id, from, original);
  const { data: updated, error } = await supabase.from(table).update(patch).eq("id", id).select().single();
  if (error || !updated) {
    console.error(tag, "update failed", error?.message);
    return { error: "failed" };
  }
  return { row: updated, translated: true };
}

/**
 * 지금 원문 칸(ko)을 쓰는 언어 — 글 · 작업물을 만들거나 원문 칸을 고쳐 저장할 때 source_lang 으로 남긴다.
 * ko 이면 남기지 않는다(비어 있으면 ko 로 읽는다 — source_lang 열이 아직 없는 DB 에서도 저장이 실패하지 않게).
 * 기본 언어가 en 이면 ko 칸이 원문이 아니라 남기지 않는다
 */
export async function currentSourceLang(): Promise<string | null> {
  const target = sourceTargetOf((await getSiteConfig()).metadata?.defaultLanguage);
  return target && target !== "ko" ? target : null;
}
