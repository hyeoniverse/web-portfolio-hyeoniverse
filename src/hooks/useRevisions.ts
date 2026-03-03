"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface RevisionItem {
  id: string;
  timestamp: number;
  title: string;
}

interface UseRevisionsOptions {
  entityType: "post" | "work";
  entityId: string | undefined;
}

export function useRevisions({ entityType, entityId }: UseRevisionsOptions) {
  const [revisions, setRevisions] = useState<RevisionItem[]>([]);
  const entityIdRef = useRef(entityId);

  useEffect(() => {
    entityIdRef.current = entityId;
  }, [entityId]);

  // 마운트 시 / entityId 변경 시 리비전 로드
  useEffect(() => {
    if (!entityId) return;

    fetch(
      `/api/revisions?entity_type=${entityType}&entity_id=${entityId}&limit=50`,
    )
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setRevisions(
            data.map((r: { id: string; created_at: string; title: string }) => ({
              id: r.id,
              timestamp: new Date(r.created_at).getTime(),
              title: r.title,
            })),
          );
        }
      })
      .catch(() => {});
  }, [entityType, entityId]);

  // 리비전 저장
  const saveRevision = useCallback(
    async (snapshot: unknown, title: string) => {
      const id = entityIdRef.current;
      if (!id) return;

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
        if (!res.ok) return;
        const data = await res.json();
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
      } catch {
        // silent
      }
    },
    [entityType],
  );

  // 특정 리비전의 snapshot 로드
  const loadRevisionSnapshot = useCallback(
    async (revisionId: string): Promise<unknown | null> => {
      try {
        const res = await fetch(`/api/revisions/${revisionId}`);
        if (!res.ok) return null;
        const data = await res.json();
        return data.snapshot;
      } catch {
        return null;
      }
    },
    [],
  );

  return { revisions, saveRevision, loadRevisionSnapshot };
}
