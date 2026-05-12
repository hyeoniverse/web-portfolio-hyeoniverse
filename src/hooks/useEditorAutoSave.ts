"use client";

import { useRef, useCallback, useEffect } from "react";

interface UseEditorAutoSaveOptions<T> {
  entityType: "post" | "work";
  entityId: string | undefined;
  /** For new entities that don't yet have a real ID */
  draftEntityId?: string;
  formRef: { current: T };
  saveRevision: (snapshot: T, title: string) => Promise<boolean>;
  getTitle: () => string;
  busyFlags: { saving: boolean; translating: boolean };
  debounceMs?: number;
  onSaved?: () => void;
  /** Top-level field names whose changes should NOT trigger autosave (still saved in snapshot). */
  ignoredFields?: string[];
}

/**
 * Shared auto-save logic for PostEditor and WorkEditor.
 *
 * Handles:
 * - 30s debounce timer on form changes
 * - Skip first change (initial mount)
 * - JSON comparison to avoid duplicate saves
 * - Save on visibility change (document.hidden)
 * - Save on beforeunload via navigator.sendBeacon
 * - Save on SPA navigation (cleanup fetch with keepalive)
 */
export function useEditorAutoSave<T>({
  entityType,
  entityId,
  draftEntityId,
  formRef,
  saveRevision,
  getTitle,
  busyFlags,
  debounceMs = 30000,
  onSaved,
  ignoredFields,
}: UseEditorAutoSaveOptions<T>) {
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const autoSaveSkip = useRef(true);
  const autoSaveBusy = useRef(false);
  const savedId = useRef<string | undefined>(entityId);

  /** Stable JSON of the snapshot with ignored fields stripped — used for dirty comparison only.
      Full snapshot (including ignored fields) is still what gets persisted. */
  const comparableJson = useCallback(
    (snapshot: unknown) => {
      if (!ignoredFields?.length || typeof snapshot !== "object" || snapshot === null) {
        return JSON.stringify(snapshot);
      }
      const copy: Record<string, unknown> = { ...(snapshot as Record<string, unknown>) };
      for (const f of ignoredFields) delete copy[f];
      return JSON.stringify(copy);
    },
    [ignoredFields],
  );

  const lastAutoSaveJson = useRef<string>(comparableJson(formRef.current));

  // Keep busy flag in sync
  autoSaveBusy.current = busyFlags.saving || busyFlags.translating;

  // Keep savedId in sync when entityId changes (e.g. after first save)
  useEffect(() => {
    if (entityId) savedId.current = entityId;
  }, [entityId]);

  const flushSave = useCallback(async () => {
    const current = comparableJson(formRef.current);
    if (!current || current === lastAutoSaveJson.current) return;
    if (autoSaveBusy.current) return;
    lastAutoSaveJson.current = current;
    const title = getTitle();
    const saved = await saveRevision(formRef.current, title || "(untitled)");
    if (saved) {
      onSaved?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveRevision, getTitle, onSaved, comparableJson]);

  /** Debounce effect — must be triggered by passing `form` as a dep from the caller via a wrapper useEffect */
  const scheduleAutoSave = useCallback(() => {
    if (autoSaveSkip.current) {
      autoSaveSkip.current = false;
      return;
    }
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(flushSave, debounceMs);
  }, [flushSave, debounceMs]);

  /** Save on leave: visibility change + beforeunload + SPA nav (cleanup) */
  useEffect(() => {
    const onVisChange = () => {
      if (document.hidden) flushSave();
    };

    const onBeforeUnload = () => {
      const id = savedId.current || draftEntityId;
      if (!id) return;
      const current = comparableJson(formRef.current);
      if (!current || current === lastAutoSaveJson.current) return;
      const body = JSON.stringify({
        entity_type: entityType,
        entity_id: id,
        snapshot: formRef.current,
        title: getTitle() || "(untitled)",
      });
      navigator.sendBeacon(
        "/api/revisions",
        new Blob([body], { type: "application/json" }),
      );
    };

    document.addEventListener("visibilitychange", onVisChange);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", onVisChange);
      window.removeEventListener("beforeunload", onBeforeUnload);

      // SPA navigation — keepalive fetch (best-effort; ignore errors)
      const id = savedId.current || draftEntityId;
      if (!id) return;
      // cleanup 시점에 최신 form 을 읽고 싶음 — react-hooks/exhaustive-deps 의
      // "ref 가 effect 사이에 바뀔 수 있다" 경고는 의도된 동작이라 suppress
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const snapshot = formRef.current;
      const current = comparableJson(snapshot);
      if (!current || current === lastAutoSaveJson.current) return;
      fetch("/api/revisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity_type: entityType,
          entity_id: id,
          snapshot,
          title: getTitle() || "(untitled)",
        }),
        keepalive: true,
      }).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flushSave]);

  return {
    savedId,
    flushSave,
    autoSaveSkip,
    lastAutoSaveJson,
    scheduleAutoSave,
  };
}
