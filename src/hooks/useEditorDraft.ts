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
import { useSyncRef } from "@/hooks/useSyncRef";

interface UseEditorDraftOptions<T> {
  entityType: "post" | "work";
  entityId: string | undefined;
  draftEntityId?: string;
  snapshot: T;
  applyDraft: (draft: T) => void;
  /** 로컬 초기 로드(related-works 등) 끝나야 true — localStorage 복원 + pristine baseline 캡처 시점. */
  ready: boolean;
  /** 서버 revision 로드(serverDraft) 끝나야 true — 서버(cross-device) 복원 시점.
   *  ready 보다 늦을 수 있어 분리: 이 대기 중 사용자가 편집하면 서버 draft 로 덮지 않는다(클로버 방지). */
  serverReady?: boolean;
  /** 비교에서 제외할 키. */
  ignoredKeys?: (keyof T)[];
  /** 서버에 저장된 가장 최근 draft 스냅샷(cross-device). 사용자가 로드 후 아직 편집 안 했을 때만(pristine)
   *  적용 → 다른 기기/브라우저에서도 이어서 편집. localStorage 는 절대 끄지 않음(로컬 백업). */
  serverDraft?: { snapshot: T; savedAt: number } | null;
}

/** localStorage draft 봉투 — 타임스탬프로 서버 draft 와 신선도 비교. 구(舊) 형식(raw snapshot)은
 *  savedAt=0(가장 오래됨)으로 취급해 서버가 있으면 서버가 이김. */
interface DraftEnvelope<T> {
  __d: 1;
  t: number;
  s: T;
}

function readLocalDraft<T>(key: string): { data: T; savedAt: number } | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && (parsed as DraftEnvelope<T>).__d === 1) {
      const env = parsed as DraftEnvelope<T>;
      return { data: env.s, savedAt: typeof env.t === "number" ? env.t : 0 };
    }
    return { data: parsed as T, savedAt: 0 }; // legacy raw
  } catch {
    return null;
  }
}

function stableHash<T>(snapshot: T, ignoredKeys?: readonly (keyof T)[]): string {
  if (snapshot == null || typeof snapshot !== "object") return JSON.stringify(snapshot);
  if (!ignoredKeys?.length) return JSON.stringify(snapshot);
  const copy = { ...(snapshot as object) } as Record<string, unknown>;
  for (const k of ignoredKeys) delete copy[k as string];
  return JSON.stringify(copy);
}

/** editor draft localStorage 키 — writer/reader 공용 (형식 드리프트 방지) */
export function draftKey(entityType: string, id: string): string {
  return `editor-draft:${entityType}:${id}`;
}

export function useEditorDraft<T>({
  entityType,
  entityId,
  draftEntityId,
  snapshot,
  applyDraft,
  ready,
  serverReady = true,
  ignoredKeys,
  serverDraft,
}: UseEditorDraftOptions<T>) {
  const effectiveId = entityId ?? draftEntityId;
  const key = effectiveId ? draftKey(entityType, effectiveId) : null;
  const serverDraftRef = useRef(serverDraft);
  useSyncRef(serverDraftRef, serverDraft);
  const restoredRef = useRef(false); // localStorage 복원 결정 완료 여부(= write 활성화)
  const serverDoneRef = useRef(false); // 서버 복원 결정 완료 여부
  // 로드 직후(복원 반영 후) 내용 해시 = pristine baseline. 서버 복원 전에 이것과 달라졌으면
  // "사용자가 편집함" → 서버 draft 로 덮지 않는다(편집 클로버 방지).
  const loadedHashRef = useRef<string | null>(null);
  // 마지막으로 draft 에 반영된(또는 로드된) 내용 해시. write 가 "이것과 다를 때만" 저장 →
  // mount 커밋에서 restore 전의 stale(빈 DB) snapshot 으로 draft 를 덮어쓰는 race 를 막는다.
  const lastSnapshotHashRef = useRef<string | null>(null);
  const applyDraftRef = useRef(applyDraft);
  const ignoredKeysRef = useRef(ignoredKeys);

  useSyncRef(applyDraftRef, applyDraft);
  useSyncRef(ignoredKeysRef, ignoredKeys);

  // ── 1단계: localStorage 복원 + pristine baseline 캡처 (ready=로컬로드 완료 시 한 번) ──
  // write 보다 먼저 실행돼야 draft 안 덮어씀. 여기서 잡은 loadedHashRef 가 이후 "사용자 편집 여부" 기준.
  useEffect(() => {
    if (!key || !ready || restoredRef.current) return;
    if (typeof window === "undefined") { restoredRef.current = true; return; }
    const currentHash = stableHash(snapshot, ignoredKeysRef.current);
    const local = readLocalDraft<T>(key);
    if (local && stableHash(local.data, ignoredKeysRef.current) !== currentHash) {
      applyDraftRef.current(local.data);
      const h = stableHash(local.data, ignoredKeysRef.current);
      loadedHashRef.current = h;
      lastSnapshotHashRef.current = h; // 복원본 = write baseline
    } else {
      loadedHashRef.current = currentHash;
      lastSnapshotHashRef.current = currentHash; // stale write 방지
    }
    restoredRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready]);

  // ── 2단계: 서버(cross-device) 복원 — serverReady 후 한 번. 단, 로드 후 사용자가 편집했으면 skip ──
  // (편집 클로버 방지: 서버 draft 는 항상 "지금 편집분"보다 오래됐을 수 있어, pristine 일 때만 덮어쓴다.)
  useEffect(() => {
    if (!key || !ready || !serverReady || !restoredRef.current || serverDoneRef.current) return;
    if (typeof window === "undefined") return;
    serverDoneRef.current = true;
    const sd = serverDraftRef.current;
    if (!sd) return;
    const currentHash = stableHash(snapshot, ignoredKeysRef.current);
    if (currentHash !== loadedHashRef.current) return; // 사용자가 이미 편집함 → 서버로 덮지 않음
    const serverHash = stableHash(sd.snapshot, ignoredKeysRef.current);
    if (serverHash === currentHash) return; // 서버가 현재와 동일 → 복원 불필요
    // 로컬 draft 가 현재(=복원본)와 같고 서버보다 최신이면 로컬 유지(같은 기기 최신 편집 우선).
    const local = readLocalDraft<T>(key);
    if (local && stableHash(local.data, ignoredKeysRef.current) === currentHash && local.savedAt >= sd.savedAt) return;
    applyDraftRef.current(sd.snapshot);
    loadedHashRef.current = serverHash;
    lastSnapshotHashRef.current = serverHash;
  }, [key, ready, serverReady, snapshot]);

  // Continuous write — restore 결정 끝난 뒤부터 snapshot 변경마다 localStorage sync.
  useEffect(() => {
    if (!key || !ready || !restoredRef.current) return;
    if (typeof window === "undefined") return;
    // "로드된 내용 그대로"면 저장하지 않음 — mount 커밋에서 restore 전 stale(빈 DB) snapshot 으로
    // draft 를 덮어쓰는 race 방지. 사용자가 실제로 편집해 내용이 달라졌을 때만 write.
    const h = stableHash(snapshot, ignoredKeysRef.current);
    if (h === lastSnapshotHashRef.current) return;
    try {
      const env: DraftEnvelope<T> = { __d: 1, t: Date.now(), s: snapshot };
      window.localStorage.setItem(key, JSON.stringify(env));
      lastSnapshotHashRef.current = h;
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
