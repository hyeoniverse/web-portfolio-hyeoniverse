"use client";

/**
 * useEditorAutoSave — 단순화 재작성.
 *
 * 책임:
 *   1. snapshot 변경 → debounce 후 POST /api/revisions
 *   2. 페이지 이탈 (visibility / beforeunload / SPA cleanup) → sendBeacon 으로 마지막 저장
 *   3. 변경이 너무 작으면 (minCharDiff 미만) skip — "유의미한 단위" 만 revision
 *   4. 동시 fire 방지 (mutex) — race 로 인한 중복 revision 차단
 *   5. baseline 명시적 갱신 (markBaseline) — restore / async-load 직후 사용
 *
 * 호출 패턴:
 *   const { markBaseline, flush, lastSavedAt } = useEditorAutoSave({
 *     entityType, entityId, snapshot: form, getTitle, ignoredKeys, block,
 *   });
 *   - snapshot 이 form 자체. 매 render 마다 hook 이 자체 dirty check.
 *   - markBaseline() 을 restore / async-load 직후 호출.
 *   - flush() 는 명시적 즉시 저장.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useSyncRef } from "@/hooks/useSyncRef";

interface UseAutosaveOptions<T> {
  entityType: "post" | "work";
  /** Real entity ID. undefined 면 draftEntityId 로 fallback (새 글 임시 저장용). */
  entityId: string | undefined;
  /** New 글 일 때 사용할 임시 ID (e.g. "draft-new-post"). */
  draftEntityId?: string;
  /** 현재 form 상태 (매 render 마다 새 값). dep tracking 자동. */
  snapshot: T;
  getTitle: () => string;
  /** In-app save callback (useRevisions.saveRevision). debounce save 가 호출 — list state 동기화 위해.
   *  Leave save (beforeunload/cleanup) 는 sendBeacon 으로 직접 (list 동기화 불필요 — 어차피 떠남). */
  saveRevision: (snapshot: T, title: string) => Promise<boolean>;
  /** baseline 비교에서 제외할 키 (저장은 됨, dirty 판정만 제외). */
  ignoredKeys?: (keyof T)[];
  /** Debounce window — 마지막 편집 후 N ms 멈추면 save. Default 3s (60s 는 자동저장 체감이 안 남). */
  debounceMs?: number;
  /** baseline 대비 글자수 차이가 이거 미만이면 save skip — typo / 한두 글자 변경 무시. Default 10. */
  minCharDiff?: number;
  /** true 면 save 차단 (실제 publish / translate 진행 중 등). */
  block?: boolean;
  onSaved?: (savedAt: Date) => void;
}

function computeHash<T>(snapshot: T, ignoredKeys?: readonly (keyof T)[]): string {
  if (snapshot == null || typeof snapshot !== "object") return JSON.stringify(snapshot);
  if (!ignoredKeys?.length) return JSON.stringify(snapshot);
  const copy = { ...(snapshot as object) } as Record<string, unknown>;
  for (const k of ignoredKeys) delete copy[k as string];
  return JSON.stringify(copy);
}

export function useEditorAutoSave<T>({
  entityType,
  entityId,
  draftEntityId,
  snapshot,
  getTitle,
  saveRevision,
  ignoredKeys,
  debounceMs = 3_000,
  minCharDiff = 10,
  block = false,
  onSaved,
}: UseAutosaveOptions<T>) {
  // baseline = 마지막으로 "저장된 상태" 의 hash. null 이면 아직 초기화 안 됨.
  const baselineRef = useRef<string | null>(null);
  const savingRef = useRef(false); // mutex
  const blockRef = useRef(block);
  const snapshotRef = useRef(snapshot);
  const onSavedRef = useRef(onSaved);
  const getTitleRef = useRef(getTitle);
  const saveRevisionRef = useRef(saveRevision);
  const ignoredKeysRef = useRef(ignoredKeys);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  /* 사용자가 이 화면에서 무언가 했는가(키 입력·포인터·붙여넣기·끌어 놓기·IME 조합).
     하기 전의 스냅샷 변경은 편집이 아니라 불러오기 끝의 자동 변경이다 — 본문 편집기가 저장된 HTML 을
     자기 형식으로 다듬어 올리는 것(빈 문단 줄 높이, 글과 한 문단에 섞인 이미지 분리 등)이 그렇다.
     그런 변경은 기준에 흡수해 리비전을 만들지 않는다. 예전에는 작업물 편집 화면을 열기만 해도 3초 뒤
     리비전이 생겼고, 리비전 50개 상한에 걸린 작업물은 가장 오래된 리비전이 하나씩 밀려났다(#837). */
  const userActedRef = useRef(false);
  useEffect(() => {
    const mark = () => { userActedRef.current = true; };
    const events = ["keydown", "pointerdown", "paste", "drop", "compositionstart", "beforeinput"] as const;
    for (const e of events) document.addEventListener(e, mark, true);
    return () => { for (const e of events) document.removeEventListener(e, mark, true); };
  }, []);

  // ref sync — 매 render
  useSyncRef(blockRef, block);
  useSyncRef(snapshotRef, snapshot);
  useSyncRef(onSavedRef, onSaved);
  useSyncRef(getTitleRef, getTitle);
  useSyncRef(saveRevisionRef, saveRevision);
  useSyncRef(ignoredKeysRef, ignoredKeys);

  const effectiveId = entityId ?? draftEntityId;

  /** baseline 을 현재 snapshot 으로 정합화. restore / async-load 직후 호출. */
  const markBaseline = useCallback(() => {
    baselineRef.current = computeHash(snapshotRef.current, ignoredKeysRef.current);
  }, []);

  /** 명시적 즉시 저장. minor change 도 저장 (사용자 의도). */
  const flush = useCallback(async (): Promise<boolean> => {
    if (savingRef.current || blockRef.current || !effectiveId) return false;
    const current = computeHash(snapshotRef.current, ignoredKeysRef.current);
    if (baselineRef.current !== null && current === baselineRef.current) return false;
    savingRef.current = true;
    try {
      const ok = await saveRevisionRef.current(
        snapshotRef.current,
        getTitleRef.current() || "(untitled)",
      );
      if (!ok) return false;
      baselineRef.current = current;
      const now = new Date();
      setLastSavedAt(now);
      onSavedRef.current?.(now);
      return true;
    } catch {
      return false;
    } finally {
      savingRef.current = false;
    }
  }, [effectiveId]);

  /** baseline 대비 변경이 충분한가? 총 "길이" 차이만 보면 같은 길이 편집(코드 내용 교체·탭 라벨 변경 등)을
   *  0 으로 오판해 자동저장을 건너뛴다 → 공통 접두/접미를 제외한 "실제 바뀐 구간" 크기로 판정한다.
   *  (삽입/삭제/같은길이 교체 모두 정확. 특수블록 수정이 저장에서 누락되던 원인.) */
  const isMeaningfulDiff = useCallback((current: string): boolean => {
    const base = baselineRef.current;
    if (base === null) return false;
    if (current === base) return false;
    const a = current, b = base;
    const min = Math.min(a.length, b.length);
    let p = 0;
    while (p < min && a[p] === b[p]) p++;
    let s = 0;
    while (s < min - p && a[a.length - 1 - s] === b[b.length - 1 - s]) s++;
    const changed = Math.max(a.length, b.length) - p - s;
    return changed >= minCharDiff;
  }, [minCharDiff]);

  // Initial baseline — entityId 가 처음 valid 해질 때 한 번
  useEffect(() => {
    if (effectiveId && baselineRef.current === null) {
      baselineRef.current = computeHash(snapshotRef.current, ignoredKeysRef.current);
    }
  }, [effectiveId]);

  // Debounced save — snapshot 변경 시 N ms 후 save (유의미한 diff 일 때만)
  useEffect(() => {
    if (!effectiveId || baselineRef.current === null) return;
    const current = computeHash(snapshot, ignoredKeysRef.current);
    if (current === baselineRef.current) return;
    // 사용자가 아직 아무것도 하지 않았다 — 불러오기 끝의 자동 변경이므로 기준으로 삼는다
    if (!userActedRef.current) { baselineRef.current = current; return; }
    if (!isMeaningfulDiff(current)) return; // 변경 너무 작음

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => { flush(); }, debounceMs);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [snapshot, effectiveId, debounceMs, flush, isMeaningfulDiff]);

  // Leave handlers — visibility / beforeunload / SPA cleanup
  useEffect(() => {
    if (!effectiveId) return;
    const id = effectiveId;

    /** sendBeacon 으로 즉시 save (sync; fetch 와 달리 unload 중에도 보장).
     *  변경 있으면 무조건 저장 — leave 시점은 minCharDiff 무시 (마지막 내용 하나는 보존).
     *  debounce 만 임계값 적용 (background 저장 — 너무 잦은 revision 방지). */
    const beaconSave = () => {
      if (savingRef.current) return; // mutex
      // 아무것도 하지 않고 떠나면 저장할 편집이 없다(불러오기 끝의 자동 변경뿐)
      if (!userActedRef.current) return;
      const current = computeHash(snapshotRef.current, ignoredKeysRef.current);
      if (baselineRef.current !== null && current === baselineRef.current) return;
      // baseline 미리 갱신 — 같은 인스턴스 내 다른 leave handler 가 또 POST 못 하게
      baselineRef.current = current;
      const body = JSON.stringify({
        entity_type: entityType,
        entity_id: id,
        snapshot: snapshotRef.current,
        title: getTitleRef.current() || "(untitled)",
      });
      navigator.sendBeacon("/api/revisions", new Blob([body], { type: "application/json" }));
    };

    const onVisChange = () => { if (document.hidden) beaconSave(); };
    const onBeforeUnload = () => beaconSave();

    document.addEventListener("visibilitychange", onVisChange);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVisChange);
      window.removeEventListener("beforeunload", onBeforeUnload);
      // unmount 후에도 debounce timer 가 따로 fire 하는 거 차단
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      // SPA navigation cleanup — 변경 있으면 무조건 저장 (마지막 내용 보존)
      beaconSave();
    };
  }, [entityType, effectiveId]);

  return {
    lastSavedAt,
    markBaseline,
    flush,
  };
}
