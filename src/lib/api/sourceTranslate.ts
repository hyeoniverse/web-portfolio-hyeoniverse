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
 * 덮어쓰기 전 원문은 content_translations 에 그 언어로 한 줄 남긴다 — 그때 써 넣은 글도 같이(SourceBackup).
 * 나중에 그 언어로 되돌리면 그 사이 고치지 않은 칸은 번역하지 않고 백업의 원래 글로 되살린다(restoreOrTranslate).
 */

type Config = Awaited<ReturnType<typeof getSiteConfig>>;
type Obj = Record<string, unknown>;

/** 설정 글 백업 줄의 고정 번호 */
const SETTINGS_SOURCE_ID = "00000000-0000-0000-0000-000000000004";
/** 프로필 글 백업 줄의 고정 번호 */
const PROFILE_SOURCE_ID = "00000000-0000-0000-0000-000000000005";

function providersOf(config: Config): Provider[] {
  return buildProviderList((config?.translation?.provider as Provider) ?? "deepl", config?.translation?.fallback);
}

/* 묶음 크기 · 동시에 보내는 묶음 수 — 설정 글 250여 개(약 9천 자)를 Claude 로 재 보니
   120개 · 6천 자 묶음을 하나씩 보내면 묶음 하나가 1분 가까이 걸렸고, 30개 · 2천 자로 잘라 6개씩 보내면 25초였다 */
const CHUNK_ITEMS = 30;
const CHUNK_CHARS = 2000;
const PARALLEL = 6;

/** 여러 글을 묶음으로 나눠 번역한다 — 묶음은 PARALLEL 개씩 동시에. 하나라도 못 받으면 null(덮어쓰지 않는다) */
async function translateAll(texts: string[], from: string, to: string, config: Config, tag: string, html = false): Promise<string[] | null> {
  if (!texts.length) return [];
  const out: string[] = new Array(texts.length);
  const chunks = chunkIndices(texts, CHUNK_ITEMS, CHUNK_CHARS);
  let next = 0;
  let failed = false;
  const worker = async () => {
    while (!failed && next < chunks.length) {
      const idx = chunks[next++];
      const res = await translateWithFallback(providersOf(config), idx.map((i) => texts[i]), from, to, tag, { html });
      if ("error" in res || res.failedIndices.length) { failed = true; return; }
      idx.forEach((i, n) => { out[i] = res.translations[n]; });
    }
  };
  await Promise.all(Array.from({ length: Math.min(PARALLEL, chunks.length) }, worker));
  return failed ? null : out;
}

type BackupType = "post_source" | "work_source" | "settings_source";

/**
 * 백업 한 줄(content_translations, lang = 덮어쓰기 전 언어) — 원래 글(original)과 그때 to 언어로 써 넣은 글(written).
 * 키는 설정 경로("hero.headline_ko.0") 또는 칸 이름("title" · "categories_ko.0"). 예전 줄(v 없음)은 원래 글만 있어 되살리지 않는다
 */
interface SourceBackup {
  v: 2;
  to: string;
  original: Record<string, string>;
  written: Record<string, string>;
}

async function readBackup(sourceType: BackupType, sourceId: string, lang: string): Promise<SourceBackup | null> {
  const { data } = await createAdminClient()
    .from("content_translations")
    .select("fields")
    .eq("source_type", sourceType).eq("source_id", sourceId).eq("lang", lang)
    .maybeSingle();
  const f = data?.fields as Partial<SourceBackup> | null | undefined;
  return f?.v === 2 && typeof f.to === "string" && f.original && f.written ? (f as SourceBackup) : null;
}

async function backup(sourceType: BackupType, sourceId: string, from: string, to: string, original: Record<string, string>, written: Record<string, string>) {
  const fields: SourceBackup = { v: 2, to, original, written };
  const { error } = await createAdminClient().from("content_translations").upsert({
    source_type: sourceType, source_id: sourceId, lang: from, fields, source_hash: "",
    updated_at: new Date().toISOString(),
  }, { onConflict: "source_type,source_id,lang" });
  if (error) console.error(`[source-translate ${sourceType}] backup failed`, error.message);
}

/**
 * 글 묶음(키 → 지금 글)을 from → to 로. 예전에 to 에서 from 으로 덮어쓴 백업(prior, lang = to)이 있고 그 칸이 그때
 * 써 넣은 글 그대로면(그 사이 고치지 않았으면) 번역하지 않고 백업의 원래 글로 되살린다. 나머지만 번역한다.
 * 하나라도 번역을 못 받으면 null(덮어쓰지 않는다)
 */
async function restoreOrTranslate(
  entries: [string, string][], prior: SourceBackup | null, from: string, to: string, config: Config, tag: string, html = false,
): Promise<Record<string, string> | null> {
  const out: Record<string, string> = {};
  const todo: [string, string][] = [];
  for (const [k, v] of entries) {
    const original = prior?.to === from && prior.written[k] === v ? prior.original[k] : undefined;
    if (typeof original === "string") out[k] = original;
    else todo.push([k, v]);
  }
  const translated = await translateAll(todo.map(([, v]) => v), from, to, config, tag, html);
  if (!translated) return null;
  todo.forEach(([k], i) => { out[k] = translated[i]; });
  return out;
}

/* ── 설정 글 ── */

type Path = (string | number)[];

/** about 설정 가운데 공개 화면이 읽는 것은 크레딧 문구뿐이다 — 나머지(옛 패널 글 · 소개 줄)는 #1487 로 화면에서 빠져
 *  번역해도 보이지 않고, 설정 글 글자 수의 7 할을 차지해 저장을 몇 분씩 붙잡았다 */
const unrenderedAbout = (p: Path) => p[0] === "about" && !String(p[1]).startsWith("credits");

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

/** path 에 값을 넣는다 — 중간 칸이 없으면 다음 키가 번호면 배열, 아니면 객체로 만든다.
 *  이미 있는 배열은 그대로 따라 들어간다. 배열을 객체로 갈아 끼우면 항목의 다른 칸(영어 · 링크 · 날짜)이 사라지고
 *  화면이 배열을 기대하는 곳(.join · .map)이 깨진다 */
function setAt(target: Obj, path: Path, value: unknown) {
  let cur: Obj = target;
  path.slice(0, -1).forEach((key, i) => {
    const next = cur[key as string];
    if (!next || typeof next !== "object") cur[key as string] = typeof path[i + 1] === "number" ? [] : {};
    cur = cur[key as string] as Obj;
  });
  cur[path[path.length - 1] as string] = value;
}

/**
 * 설정의 원문 글을 from → to 로 번역해 delta 에 넣는다. delta 의 배열은 통째로 덮이므로(getSiteConfig 의 병합)
 * 배열 안의 글이면 그 배열을 번역된 전체 값으로 넣는다. 성공하면 true — 실패하면 delta 를 건드리지 않는다.
 */
export async function translateConfigSource(full: Obj, delta: Obj, from: string, to: string, config: Config): Promise<boolean> {
  const items = collectKoTexts(full).filter(([p]) => !unrenderedAbout(p));
  const entries = items.map(([p, t]) => [p.join("."), t] as [string, string]);
  const prior = await readBackup("settings_source", SETTINGS_SOURCE_ID, to);
  const result = await restoreOrTranslate(entries, prior, from, to, config, `[source-translate settings ${from}→${to}]`);
  if (!result) return false;

  await backup("settings_source", SETTINGS_SOURCE_ID, from, to, Object.fromEntries(entries), result);

  const next = structuredClone(full);
  items.forEach(([p]) => setAt(next, p, result[p.join(".")]));
  const roots = new Map<string, Path>();
  for (const [p] of items) {
    const arrayAt = p.findIndex((_, n) => Array.isArray(getAt(next, p.slice(0, n + 1))));
    const root = arrayAt >= 0 ? p.slice(0, arrayAt + 1) : p;
    roots.set(root.join("."), root);
  }
  for (const root of roots.values()) setAt(delta, root, structuredClone(getAt(next, root)));
  return true;
}

/**
 * 프로필(site_settings 의 profile 행) 원문 글을 from → to 로 번역만 해 두고, 저장은 돌려준 save() 가 한다 —
 * 설정 글 번역과 동시에 돌리되, 설정 쪽이 실패하면 프로필만 바뀐 채 남지 않게. 번역에 실패하면 null.
 * 저장 형식({ data, savedDefaults } 또는 통째)을 그대로 지킨다
 */
export async function prepareProfileSource(from: string, to: string, config: Config): Promise<{ save: () => Promise<boolean> } | null> {
  const admin = createAdminClient();
  const { data: row } = await admin.from("site_settings").select("config").eq("id", "profile").maybeSingle();
  const stored = row?.config as Obj | undefined;
  if (!stored) return { save: async () => true };
  const data = (stored.data && stored.savedDefaults ? stored.data : stored) as Obj;
  const items = collectKoTexts(data);
  const entries = items.map(([p, t]) => [p.join("."), t] as [string, string]);
  const prior = await readBackup("settings_source", PROFILE_SOURCE_ID, to);
  const result = await restoreOrTranslate(entries, prior, from, to, config, `[source-translate profile ${from}→${to}]`);
  if (!result) return null;
  if (!items.length) return { save: async () => true };
  return {
    save: async () => {
      await backup("settings_source", PROFILE_SOURCE_ID, from, to, Object.fromEntries(entries), result);
      const next = structuredClone(data);
      items.forEach(([p]) => setAt(next, p, result[p.join(".")]));
      const config2 = stored.data && stored.savedDefaults ? { ...stored, data: next } : next;
      const { error } = await admin.from("site_settings").upsert({ id: "profile", config: config2, updated_at: new Date().toISOString() }, { onConflict: "id" });
      if (error) console.error("[source-translate profile] save failed", error.message);
      return !error;
    },
  };
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
  /* 칸마다 키 — 목록 칸은 항목마다("categories_ko.0") */
  const plain: [string, string][] = [
    ...textCols.map((c) => [c, row[c] as string] as [string, string]),
    ...listCols.flatMap((c) => (row[c] as string[]).map((x, i) => [`${c}.${i}`, x] as [string, string])),
  ];
  const body = typeof row[spec.html] === "string" ? (row[spec.html] as string) : "";
  const bodyEntries: [string, string][] = body.trim() ? [[spec.html, body]] : [];

  const backupType = table === "posts" ? "post_source" : "work_source";
  const prior = await readBackup(backupType, id, to);
  const [plainTr, bodyTr] = await Promise.all([
    restoreOrTranslate(plain, prior, from, to, config, tag),
    restoreOrTranslate(bodyEntries, prior, from, to, config, tag, row.content_type === "richtext"),
  ]);
  if (!plainTr || !bodyTr) return { error: "failed" };

  const patch: Obj = { source_lang: to, updated_at: new Date().toISOString() };
  /* 편집기는 version 으로 다른 저장과의 충돌을 가린다 — 덮어쓴 것도 한 번의 저장으로 센다 */
  if (typeof row.version === "number") patch.version = row.version + 1;
  textCols.forEach((c) => { patch[c] = plainTr[c]; });
  for (const c of listCols) patch[c] = (row[c] as string[]).map((_, i) => plainTr[`${c}.${i}`]);
  if (bodyEntries.length) patch[spec.html] = bodyTr[spec.html];

  await backup(backupType, id, from, to, Object.fromEntries([...plain, ...bodyEntries]), { ...plainTr, ...bodyTr });
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
