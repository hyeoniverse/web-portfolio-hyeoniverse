"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { getServerSiteLangSnapshot, getSiteLangSnapshot, subscribeSiteLang } from "@/lib/siteLang";
import {
  type ListItemFields,
  type ListItemRef,
  type ListItemType,
  listItemKey,
  selectListBatch,
} from "@/lib/siteTranslation";
import type { LocalizedText } from "@/types/common";
import type { Project } from "@/data/projects";
import type { WorkItem } from "@/data/works";

/**
 * 목록 카드(글 · 작업물 · 시리즈)의 짧은 칸 번역 — 브라우저 쪽.
 *
 * 카드는 자기 id 를 알리기만 하고(want), 저장소가 잠깐(BATCH_DELAY_MS) 모았다가 한 번에 묻는다
 * (/api/site-translate/items, 요청마다 LIST_BATCH_MAX 개까지). 받은 것 · 실패한 것은 메모리에 언어별로 둔다 —
 * 화면을 오가도 같은 카드는 다시 묻지 않는다. 실패한 항목은 원문 그대로(카드는 null 을 받는다).
 */
const BATCH_DELAY_MS = 40;

/** lang|type:id → 번역(실패는 null) */
const results = new Map<string, ListItemFields | null>();
const inflight = new Map<string, Set<string>>();
const pending = new Map<string, Map<string, ListItemRef>>();
let timer: ReturnType<typeof setTimeout> | null = null;
let version = 0;
const listeners = new Set<() => void>();

const k = (lang: string, key: string) => `${lang}|${key}`;
function emit() {
  version++;
  listeners.forEach((l) => l());
}
function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => { listeners.delete(onChange); };
}
const getVersion = () => version;
const getServerVersion = () => 0;

function want(lang: string, refs: ListItemRef[]) {
  let q = pending.get(lang);
  for (const ref of refs) {
    const key = listItemKey(ref);
    if (results.has(k(lang, key))) continue;
    if (!q) { q = new Map(); pending.set(lang, q); }
    q.set(key, ref);
  }
  if (q?.size && !timer) timer = setTimeout(flush, BATCH_DELAY_MS);
}

function flush() {
  timer = null;
  for (const [lang, q] of pending) {
    const fly = inflight.get(lang) ?? new Set<string>();
    inflight.set(lang, fly);
    const { batch, rest } = selectListBatch(q.values(), (key) => results.has(k(lang, key)), fly);
    pending.set(lang, new Map(rest.map((r) => [listItemKey(r), r])));
    if (!batch.length) continue;
    const keys = batch.map(listItemKey);
    keys.forEach((key) => fly.add(key));
    void fetch("/api/site-translate/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lang, items: batch }),
    })
      .then(async (res) => {
        const data = res.ok ? ((await res.json()) as { items?: Record<string, ListItemFields> }) : null;
        /* 429(상한) 는 기록하지 않는다 — 다음 화면에서 다시 묻는다. 그 밖의 실패는 이번 방문 동안 원문 */
        if (!data && res.status === 429) return;
        for (const key of keys) results.set(k(lang, key), data?.items?.[key] ?? null);
      })
      .catch(() => { /* 네트워크 실패 — 다음 화면에서 다시 */ })
      .finally(() => {
        keys.forEach((key) => fly.delete(key));
        emit();
        if (pending.get(lang)?.size && !timer) timer = setTimeout(flush, BATCH_DELAY_MS);
      });
  }
}

/**
 * 목록 항목들의 번역 — 언어가 걸려 있을 때만 묻는다. 돌려주는 값: 열쇠(type:id) → 번역(없으면 빠진다).
 * 서버 · 하이드레이션 때는 늘 빈 결과(화면은 ko/en 으로 먼저 그려진다).
 */
export function useListTranslations(refs: readonly ListItemRef[]): Record<string, ListItemFields> {
  const { lang } = useSyncExternalStore(subscribeSiteLang, getSiteLangSnapshot, getServerSiteLangSnapshot);
  const v = useSyncExternalStore(subscribe, getVersion, getServerVersion);
  const sig = refs.map(listItemKey).join(",");

  useEffect(() => {
    if (lang && sig) want(lang, refs as ListItemRef[]);
    // refs 는 sig 로 비교한다 — 부모가 매번 새 배열을 넘겨도 다시 묻지 않게
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, sig]);

  return useMemo(() => {
    void v;
    const out: Record<string, ListItemFields> = {};
    if (!lang || !sig) return out;
    for (const key of sig.split(",")) {
      const r = results.get(k(lang, key));
      if (r) out[key] = r;
    }
    return out;
  }, [lang, sig, v]);
}

/** 항목 하나 — 카드 한 장이 부른다(같은 화면의 카드들은 저장소가 한 요청으로 모은다) */
export function useListTranslation(type: ListItemType, id: string | null | undefined): ListItemFields | null {
  const refs = useMemo(() => (id ? [{ type, id }] : []), [type, id]);
  const map = useListTranslations(refs);
  return id ? map[listItemKey({ type, id })] ?? null : null;
}

/** 테스트용 */
export function __resetListTranslationForTest() {
  results.clear();
  inflight.clear();
  pending.clear();
  if (timer) clearTimeout(timer);
  timer = null;
  version = 0;
}

/* ── 목록 모양에 덧씌우기 ──
 * 번역된 칸은 ko · en 두 칸 모두 번역으로 덮는다(contentTranslateView 와 같은 방식) — T · pickLocalized 가
 * 어느 언어를 고르든 번역이 보이고, 카드는 번역이 있는지 몰라도 된다.
 */
const both = (v: string | undefined, fallback: LocalizedText): LocalizedText => (v ? { ko: v, en: v } : fallback);

/** 작업물 목록(/works) — 제목 · 부제목 · 설명. GitHub 저장소 칸(id 가 uuid 가 아니다)은 묻지 않는다 */
export function useTranslatedProjects(projects: Project[]): Project[] {
  const refs = useMemo(() => projects.map((p) => ({ type: "work" as const, id: p.id })), [projects]);
  const map = useListTranslations(refs);
  return useMemo(() => {
    if (!Object.keys(map).length) return projects;
    return projects.map((p) => {
      const tr = map[listItemKey({ type: "work", id: p.id })];
      return tr
        ? { ...p, title: both(tr.title, p.title), subtitle: both(tr.subtitle, p.subtitle), description: both(tr.description, p.description) }
        : p;
    });
  }, [projects, map]);
}

/** 홈 Selected Works — 작업물 · 글 칸의 제목(저장소는 그대로) */
export function useTranslatedWorkItems(works: WorkItem[]): WorkItem[] {
  const refs = useMemo(
    () => works.flatMap((w) => (w.kind === "work" || w.kind === "post" ? [{ type: w.kind, id: w.projectId }] : [])),
    [works],
  );
  const map = useListTranslations(refs);
  return useMemo(() => {
    if (!Object.keys(map).length) return works;
    return works.map((w) => {
      if (w.kind === "repo") return w;
      const tr = map[listItemKey({ type: w.kind, id: w.projectId })];
      return tr?.title ? { ...w, title: both(tr.title, w.title) } : w;
    });
  }, [works, map]);
}
