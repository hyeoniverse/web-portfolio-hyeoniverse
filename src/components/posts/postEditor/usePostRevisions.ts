"use client";

import { useCallback } from "react";
import { restoreSavedForm } from "@/utils/restoreSavedForm";
import { stripHtml } from "@/utils/htmlUtils";
import type { PostFormData } from "@/types/post";
import type { useRevisions } from "@/hooks/useRevisions";
import type { RevisionMetaGroup } from "@/components/admin/AdminEditorShell/types";

/* 리비전 — 스냅샷 복원 · 상세 로드 · 삭제 · 되돌리기.
   복원은 폼을 통째로 갈아끼우므로 상태 메시지에 시각을 함께 남겨 어느 시점으로 갔는지 보이게 한다. */
export function usePostRevisions({
  setForm,
  revisions,
  markBaseline,
  seriesList,
  snapshotMeta,
  initialFormRef,
  authorNameById,
  te,
  setStatus,
  setStatusType,
  setStatusTimestamp,
}: {
  setForm: React.Dispatch<React.SetStateAction<PostFormData>>;
  /** 부모의 useRevisions 결과 — 목록·스냅샷 로드·삭제 */
  revisions: Pick<ReturnType<typeof useRevisions<PostFormData>>, "revisions" | "loadRevisionSnapshot" | "deleteRevision">;
  /** 복원 직후 자동저장 기준선을 다시 잡는다 */
  markBaseline: () => void;
  seriesList: { id: string; title: string }[];
  snapshotMeta: (s: PostFormData, seriesList: { id: string; title: string }[], authorNames: Map<string, string>, lang: "ko" | "en") => RevisionMetaGroup[];
  initialFormRef: React.RefObject<PostFormData>;
  authorNameById: Map<string, string>;
  te: (key: string) => string;
  setStatus: (s: string) => void;
  setStatusType: (t: "info" | "success") => void;
  setStatusTimestamp: (t: number | undefined) => void;
}) {
  const handleRestoreRevision = useCallback(
    async (index: number) => {
      const rev = revisions.revisions[index];
      if (!rev) return;
      const snapshot = await revisions.loadRevisionSnapshot(rev.id);
      if (snapshot) {
        setForm((prev) => restoreSavedForm(prev, snapshot));
        // restore 직후 autosave 가 또 fire 해서 중복 revision 생성하는 거 방지
        // form 이 snapshot 으로 설정되면 baseline 도 그 값으로 정합화 — 사용자가 추가 편집 시에만 autosave
        requestAnimationFrame(() => markBaseline());
        setStatus(te("restored"));
        setStatusType("success");
        setStatusTimestamp(rev.timestamp);
      }
    },
    [revisions.revisions, revisions.loadRevisionSnapshot, markBaseline, te], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleLoadRevisionDetail = useCallback(
    async (index: number, lang: "ko" | "en") => {
      const rev = revisions.revisions[index];
      if (!rev) return null;
      const snapshot = await revisions.loadRevisionSnapshot(rev.id);
      if (!snapshot) return null;
      const s = snapshot;
      const isKo = lang === "ko";
      return {
        title: (isKo ? s.title : s.title_en) || s.title || s.title_en || "",
        excerpt: (isKo ? s.excerpt : s.excerpt_en) || "",
        content: stripHtml((isKo ? s.content : s.content_en) || ""),
        meta: snapshotMeta(s, seriesList, authorNameById, lang),
        headerLabels: { title: isKo ? "제목" : "Title", excerpt: isKo ? "요약" : "Excerpt" },
      };
    },
    [revisions, snapshotMeta, seriesList, authorNameById],
  );

  const handleDeleteRevision = useCallback(
    async (index: number) => {
      const rev = revisions.revisions[index];
      if (!rev) return false;
      return revisions.deleteRevision(rev.id);
    },
    [revisions],
  );

  const handleRevert = useCallback(() => {
    setForm(initialFormRef.current);
    setStatus(te("reverted"));
    setStatusType("info");
    setStatusTimestamp(undefined);
  }, [te]); // eslint-disable-line react-hooks/exhaustive-deps

  return { handleRestoreRevision, handleLoadRevisionDetail, handleDeleteRevision, handleRevert };
}
