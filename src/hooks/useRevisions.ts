"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface RevisionItem {
  id: string;
  timestamp: number;
  title: string;
  dismissed?: boolean;
}

interface UseRevisionsOptions {
  entityType: "post" | "work";
  entityId: string | undefined;
}

export function useRevisions<T>({ entityType, entityId }: UseRevisionsOptions) {
  const [revisions, setRevisions] = useState<RevisionItem[]>([]);
  // 가장 최근 non-dismissed snapshot — list fetch 와 함께 한 round-trip 으로 받아옴 (modal 빠르게 띄우기)
  const [latestUndismissedSnapshot, setLatestUndismissedSnapshot] = useState<{ id: string; snapshot: T } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const entityIdRef = useRef(entityId);
  const lastSnapshotHash = useRef<string>("");

  useEffect(() => {
    entityIdRef.current = entityId;
  }, [entityId]);

  // 마운트 시 / entityId 변경 시 리비전 로드
  useEffect(() => {
    if (!entityId) { setLoaded(true); return; }
    setLoaded(false);

    fetch(
      `/api/revisions?entity_type=${entityType}&entity_id=${entityId}&limit=50&with_latest_snapshot=1`,
    )
      .then((r) => (r.ok ? r.json() : { revisions: [], latestUndismissed: null }))
      .then((data) => {
        const list = Array.isArray(data?.revisions) ? data.revisions : [];
        setRevisions(
          list.map((r: { id: string; created_at: string; title: string; dismissed?: boolean }) => ({
            id: r.id,
            timestamp: new Date(r.created_at).getTime(),
            title: r.title,
            dismissed: r.dismissed,
          })),
        );
        setLatestUndismissedSnapshot(
          data?.latestUndismissed ? { id: data.latestUndismissed.id, snapshot: data.latestUndismissed.snapshot as T } : null,
        );
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [entityType, entityId]);

  // 리비전 저장 (변경 사항 있을 때만)
  const saveRevision = useCallback(
    async (snapshot: T, title: string): Promise<boolean> => {
      const id = entityIdRef.current;
      if (!id) return false;

      // 이전 snapshot과 동일하면 저장 안 함
      const hash = JSON.stringify(snapshot);
      if (hash === lastSnapshotHash.current) return false;
      lastSnapshotHash.current = hash;

      try {
        const res = await fetch("/api/revisions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entity_type: entityType,
            entity_id: id,
            snapshot,
            title,
          }),
        });
        if (!res.ok) return false;
        const data = await res.json();
        if (data.skipped) return false; // 직전 리비전과 동일 — 새로 추가하지 않음
        setRevisions((prev) =>
          [
            {
              id: data.id,
              timestamp: new Date(data.created_at).getTime(),
              title,
            },
            ...prev,
          ].slice(0, 50),
        );
        return true;
      } catch {
        return false;
      }
    },
    [entityType],
  );

  // 특정 리비전의 snapshot 로드
  const loadRevisionSnapshot = useCallback(
    async (revisionId: string): Promise<T | null> => {
      try {
        const res = await fetch(`/api/revisions/${revisionId}`);
        if (!res.ok) return null;
        const data = await res.json();
        return data.snapshot as T;
      } catch {
        return null;
      }
    },
    [],
  );

  // 리비전 삭제
  const deleteRevision = useCallback(
    async (revisionId: string) => {
      try {
        const res = await fetch(`/api/revisions/${revisionId}`, {
          method: "DELETE",
        });
        if (!res.ok) return false;
        setRevisions((prev) => prev.filter((r) => r.id !== revisionId));
        return true;
      } catch {
        return false;
      }
    },
    [],
  );

  // 리비전 거절 (dismissed 마킹)
  const dismissRevision = useCallback(
    async (revisionId: string) => {
      try {
        const res = await fetch(`/api/revisions/${revisionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dismissed: true }),
        });
        if (!res.ok) return false;
        setRevisions((prev) => prev.map((r) => r.id === revisionId ? { ...r, dismissed: true } : r));
        return true;
      } catch {
        return false;
      }
    },
    [],
  );

  return { revisions, loaded, latestUndismissedSnapshot, saveRevision, loadRevisionSnapshot, deleteRevision, dismissRevision };
}
