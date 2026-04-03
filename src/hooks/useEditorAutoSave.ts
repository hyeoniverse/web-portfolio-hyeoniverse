"use client";

import { useRef, useCallback, useEffect } from "react";

interface UseEditorAutoSaveOptions {
  entityType: "post" | "work";
  entityId: string | undefined;
  /** For new entities that don't yet have a real ID */
  draftEntityId?: string;
  formRef: { current: unknown };
  saveRevision: (snapshot: unknown, title: string) => Promise<boolean>;
  getTitle: () => string;
  busyFlags: { saving: boolean; translating: boolean };
  debounceMs?: number;
  onSaved?: () => void;
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
export function useEditorAutoSave({
  entityType,
  entityId,
  draftEntityId,
  formRef,
  saveRevision,
  getTitle,
  busyFlags,
  debounceMs = 30000,
  onSaved,
}: UseEditorAutoSaveOptions) {
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const autoSaveSkip = useRef(true);
  const autoSaveBusy = useRef(false);
  const savedId = useRef<string | undefined>(entityId);
  const lastAutoSaveJson = useRef<string>(JSON.stringify(formRef.current));

  // Keep busy flag in sync
  autoSaveBusy.current = busyFlags.saving || busyFlags.translating;

  // Keep savedId in sync when entityId changes (e.g. after first save)
  useEffect(() => {
    if (entityId) savedId.current = entityId;
  }, [entityId]);

  const flushSave = useCallback(async () => {
    const current = JSON.stringify(formRef.current);
    if (!current || current === lastAutoSaveJson.current) return;
    if (autoSaveBusy.current) return;
    lastAutoSaveJson.current = current;
    const title = getTitle();
    const saved = await saveRevision(formRef.current, title || "(untitled)");
    if (saved) {
      onSaved?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveRevision, getTitle, onSaved]);

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
      const current = JSON.stringify(formRef.current);
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

    const currentFormRef = formRef;
    document.addEventListener("visibilitychange", onVisChange);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", onVisChange);
      window.removeEventListener("beforeunload", onBeforeUnload);

      // SPA navigation — keepalive fetch
      const id = savedId.current || draftEntityId;
      if (!id) return;
      const snapshot = currentFormRef.current;
      const current = JSON.stringify(snapshot);
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
      });
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
