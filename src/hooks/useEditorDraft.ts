"use client";

/**
 * useEditorDraft — 글자 단위 continuous draft (localStorage).
 *
 * 책임:
 *   - 매 snapshot 변경마다 localStorage 에 즉시 sync — 단, mount restore 결정이 끝난 뒤부터.
 *   - mount 시 localStorage 에 draft 가 있고 현재 snapshot 과 다르면 silent 로 applyDraft.
 *   - 실제 save 후엔 clearDraft() 로 localStorage 정리.
 *
 * Revision (DB) 와 분리:
 *   - Draft = 예상치 못한 탭 닫기 / 새로고침 복구용 (모달 없음).
 *   - Revision = 명시적 save point (별도 hook useEditorAutoSave).
 *
 * 주의 — 두 가지 race 처리:
 *   1. continuous write 가 mount restore 보다 먼저 fire 하면 draft 가 초기 DB 상태로
 *      overwrite 됨 → restoredRef 로 gate 해서 restore 결정 후에만 write.
 *   2. async fetch (related-works 등) 가 form 을 update 하는 동안 restore 결정하면
 *      fetch 가 user 의 선택을 덮어쓸 위험 → `ready` flag 로 fetch 완료 후 restore.
 */

import { useCallback, useEffect, useRef } from "react";

interface UseEditorDraftOptions<T> {
  entityType: "post" | "work";
  entityId: string | undefined;
  draftEntityId?: string;
  snapshot: T;
  applyDraft: (draft: T) => void;
  /** async 초기 fetch 끝나야 true — 그 전엔 restore + write 둘 다 skip. */
  ready: boolean;
  /** 비교에서 제외할 키. */
  ignoredKeys?: (keyof T)[];
}

function stableHash<T>(snapshot: T, ignoredKeys?: readonly (keyof T)[]): string {
  if (snapshot == null || typeof snapshot !== "object") return JSON.stringify(snapshot);
  if (!ignoredKeys?.length) return JSON.stringify(snapshot);
  const copy = { ...(snapshot as object) } as Record<string, unknown>;
  for (const k of ignoredKeys) delete copy[k as string];
  return JSON.stringify(copy);
}

export function useEditorDraft<T>({
  entityType,
  entityId,
  draftEntityId,
  snapshot,
  applyDraft,
  ready,
  ignoredKeys,
}: UseEditorDraftOptions<T>) {
  const effectiveId = entityId ?? draftEntityId;
  const key = effectiveId ? `editor-draft:${entityType}:${effectiveId}` : null;
  const restoredRef = useRef(false); // mount restore 결정 완료 여부
  const applyDraftRef = useRef(applyDraft);
  const ignoredKeysRef = useRef(ignoredKeys);

  applyDraftRef.current = applyDraft;
  ignoredKeysRef.current = ignoredKeys;

  // Mount restore — ready 가 true 가 된 뒤 한 번. write 보다 먼저 실행돼야 draft 안 덮어씀.
  useEffect(() => {
    if (!key || !ready || restoredRef.current) return;
    if (typeof window === "undefined") {
      restoredRef.current = true;
      return;
    }
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const draft = JSON.parse(raw) as T;
        const draftHash = stableHash(draft, ignoredKeysRef.current);
        const currentHash = stableHash(snapshot, ignoredKeysRef.current);
        if (draftHash !== currentHash) {
          applyDraftRef.current(draft);
        }
      }
    } catch {
      // parse error 등 — 무시
    }
    restoredRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready]);

  // Continuous write — restore 결정 끝난 뒤부터 snapshot 변경마다 localStorage sync.
  useEffect(() => {
    if (!key || !ready || !restoredRef.current) return;
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, JSON.stringify(snapshot));
    } catch {
      // QuotaExceeded 등 — 무시
    }
  }, [snapshot, key, ready]);

  /** 실제 save 성공 후 호출 — localStorage 정리 (DB 가 진실의 원천). */
  const clearDraft = useCallback(() => {
    if (!key) return;
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      // 무시
    }
  }, [key]);

  return { clearDraft };
}
