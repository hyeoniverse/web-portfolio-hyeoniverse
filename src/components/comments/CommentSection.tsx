"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Comment } from "@/types/post";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/providers/LanguageProvider";
import T from "@/components/ui/T";
import CommentForm from "./CommentForm";
import CommentItem from "./CommentItem";
import styles from "./CommentSection.module.css";

const PAGE_SIZE = 10;

interface CommentSectionProps {
  /** "post" | "work" */
  commentType: "post" | "work";
  /** post_id 또는 work_id */
  targetId: string;
  translationEnabled?: boolean;
}

function buildTree(comments: Comment[]): Comment[] {
  const map = new Map<string, Comment>();
  const roots: Comment[] = [];

  for (const c of comments) {
    map.set(c.id, { ...c, replies: [] });
  }

  for (const c of comments) {
    const node = map.get(c.id)!;
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id)!.replies!.push(node);
    } else {
      roots.push(node);
    }
  }

  // soft-deleted + 답글 없음 + self 삭제 → 완전 숨김
  // (admin 삭제 tombstone은 답글 없어도 유지 — 모더레이션 투명성)
  function prune(nodes: Comment[]): Comment[] {
    return nodes.filter((n) => {
      n.replies = prune(n.replies ?? []);
      if (!n.is_deleted) return true;
      if (n.deleted_by === "admin") return true;
      return n.replies.length > 0;
    });
  }

  return prune(roots);
}

function collectIds(nodes: Comment[]): string[] {
  const ids: string[] = [];
  for (const n of nodes) {
    if (!n.is_deleted || n.deleted_by === "admin") ids.push(n.id);
    if (n.replies) ids.push(...collectIds(n.replies));
  }
  return ids;
}

export default function CommentSection({ commentType, targetId, translationEnabled = true }: CommentSectionProps) {
  const { language } = useLanguage();
  const [comments, setComments] = useState<Comment[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [firstCommentId, setFirstCommentId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const apiBase = commentType === "work" ? "/api/work-comments" : "/api/comments";
  const paramKey = commentType === "work" ? "work_id" : "post_id";

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setIsAdmin(!!data.session?.user);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAdmin(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [likeCountMap, setLikeCountMap] = useState<Record<string, number>>({});

  const fetchComments = useCallback(async () => {
    const res = await fetch(`${apiBase}?${paramKey}=${targetId}`);
    if (res.ok) {
      const data: Comment[] = await res.json();
      setComments(data);

      // 모든 댓글 ID로 좋아요 상태 일괄 조회
      const allIds = data.map((c) => c.id);
      if (allIds.length > 0) {
        const likeRes = await fetch(
          `/api/comment-likes?comment_type=${commentType}&comment_ids=${allIds.join(",")}`,
          { cache: "no-store" }
        );
        if (likeRes.ok) {
          const { liked, counts } = await likeRes.json();
          setLikedMap(liked ?? {});
          setLikeCountMap(counts ?? {});
        }
      }
    }
  }, [apiBase, paramKey, targetId, commentType]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const draggingRef = useRef(false);
  const dragModeRef = useRef<"add" | "remove">("add");

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleDragStart = useCallback((id: string) => {
    draggingRef.current = true;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        dragModeRef.current = "remove";
        next.delete(id);
      } else {
        dragModeRef.current = "add";
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleDragEnter = useCallback((id: string) => {
    if (!draggingRef.current) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (dragModeRef.current === "add") next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const handleDragEnd = useCallback(() => {
    draggingRef.current = false;
  }, []);

  useEffect(() => {
    if (!selectMode) return;
    const up = () => { draggingRef.current = false; };
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, [selectMode]);

  const handleBulkDelete = useCallback(async () => {
    if (selected.size === 0) return;
    setBulkDeleting(true);
    await Promise.all(
      Array.from(selected).map((id) =>
        fetch(`${apiBase}/${id}`, { method: "DELETE" })
      )
    );
    setSelected(new Set());
    setSelectMode(false);
    setBulkDeleting(false);
    fetchComments();
  }, [selected, apiBase, fetchComments]);

  const tree = buildTree(comments);
  const visibleTree = tree.slice(0, visibleCount);
  const remaining = tree.length - visibleCount;
  const allVisibleIds = selectMode ? collectIds(visibleTree) : [];
  const allSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selected.has(id));

  return (
    <div className={styles.section}>
      <div className={styles.headingRow}>
        <h2 className={styles.heading}>
          <T k="comments.heading" />
          {comments.length > 0 && (
            <span className={styles.count}>({comments.length})</span>
          )}
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-xs)", marginLeft: "auto" }}>
          {isAdmin && comments.length > 0 && (
            <>
              {selectMode && (
                <>
                  <label className={styles.selectAllLabel}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => {
                        if (allSelected) setSelected(new Set());
                        else setSelected(new Set(allVisibleIds));
                      }}
                      style={{ accentColor: "var(--bg-accent-solid)", cursor: "pointer" }}
                    />
                    <span>{language === "ko" ? "전체" : "All"}</span>
                  </label>
                  {selected.size > 0 && (
                    <button
                      type="button"
                      className={styles.bulkDeleteBtn}
                      onClick={handleBulkDelete}
                      disabled={bulkDeleting}
                    >
                      {bulkDeleting
                        ? (language === "ko" ? "삭제 중..." : "Deleting...")
                        : (language === "ko" ? `${selected.size}개 삭제` : `Delete ${selected.size}`)}
                    </button>
                  )}
                </>
              )}
              <button
                type="button"
                className={styles.selectModeBtn}
                onClick={() => { setSelectMode(!selectMode); setSelected(new Set()); }}
              >
                {selectMode ? (language === "ko" ? "취소" : "Cancel") : (language === "ko" ? "선택" : "Select")}
              </button>
            </>
          )}
          <p className={styles.disclaimer}><T k="comments.disclaimer" noTooltip /></p>
        </div>
      </div>

      {tree.length > 0 ? (
        <div className={styles.list}>
          {visibleTree.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              commentType={commentType}
              targetId={targetId}
              likedMap={likedMap}
              likeCountMap={likeCountMap}
              isAdmin={isAdmin}
              translationEnabled={translationEnabled}
              isFirstComment={comment.id === firstCommentId}
              selectMode={selectMode}
              selected={selected}
              onToggleSelect={toggleSelect}
              onDragStart={handleDragStart}
              onDragEnter={handleDragEnter}
              onDragEnd={handleDragEnd}
              onRefresh={fetchComments}
            />
          ))}
        </div>
      ) : (
        <p className={styles.empty}><T k="comments.empty" /></p>
      )}

      {remaining > 0 && (
        <button
          type="button"
          className={styles.loadMore}
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
        >
          {language === "ko"
            ? `이전 댓글 ${remaining}개 더보기`
            : `Load ${remaining} more comment${remaining > 1 ? "s" : ""}`}
        </button>
      )}

      <CommentForm
        commentType={commentType}
        targetId={targetId}
        onSubmit={(newId?: string) => {
          if (comments.length === 0 && newId) setFirstCommentId(newId);
          fetchComments();
        }}
        isFirstOnTarget={comments.length === 0}
      />

    </div>
  );
}
