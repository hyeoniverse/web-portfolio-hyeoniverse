"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Comment } from "@/types/post";
import { useIsAuthenticated } from "@/hooks/useIsAuthenticated";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { AnimatePresence, motion } from "framer-motion";

import T from "@/components/ui/T";
import Button from "@/components/ui/Button";
import SortControl from "@/components/ui/SortControl";
import Checkbox from "@/components/ui/Checkbox";
import CommentForm from "./CommentForm";
import CommentItem from "./CommentItem";
import styles from "./CommentSection.module.css";

// 등록순 = created_at 오름차순(등록된 순서), 반응순 = 이모지 합계 desc. reverse 버튼으로 결과 뒤집음.
type CommentSort = "registered" | "reactions";

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

// 루트 댓글 정렬 (답글은 항상 시간순 유지). reactions 는 reactionCounts 의 이모지 합계로.
// reversed=true 면 최종 결과를 뒤집음 (등록순↔등록역순, 반응순↔반응오름차순).
function sortRoots(
  roots: Comment[],
  sortBy: CommentSort,
  reactionCounts: Record<string, Record<string, number>>,
  reversed: boolean,
): Comment[] {
  const arr = [...roots];
  if (sortBy === "reactions") {
    const sum = (id: string) =>
      Object.values(reactionCounts[id] ?? {}).reduce((acc, n) => acc + n, 0);
    arr.sort((a, b) => sum(b.id) - sum(a.id) || b.created_at.localeCompare(a.created_at));
  } else {
    // 등록순 — created_at 오름차순 (등록된 순서)
    arr.sort((a, b) => a.created_at.localeCompare(b.created_at));
  }
  if (reversed) arr.reverse();
  return arr;
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
  const inputTop = useSiteConfig().comments?.systemInputPosition === "top";
  const [comments, setComments] = useState<Comment[]>([]);
  const isAdmin = useIsAuthenticated({ subscribe: true });
  const [firstCommentId, setFirstCommentId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [sortBy, setSortBy] = useState<CommentSort>("registered");
  const [reversed, setReversed] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const apiBase = commentType === "work" ? "/api/work-comments" : "/api/comments";
  const paramKey = commentType === "work" ? "work_id" : "post_id";

  // 이모지 반응 — counts: { [commentId]: { [emoji]: number } }, mine: { [commentId]: emoji[] }
  const [reactionCounts, setReactionCounts] = useState<Record<string, Record<string, number>>>({});
  const [myReactions, setMyReactions] = useState<Record<string, string[]>>({});

  const fetchComments = useCallback(async () => {
    const res = await fetch(`${apiBase}?${paramKey}=${targetId}`);
    if (res.ok) {
      const data: Comment[] = await res.json();
      setComments(data);

      // 모든 댓글 ID로 이모지 반응 상태 일괄 조회
      const allIds = data.map((c) => c.id);
      if (allIds.length > 0) {
        const idsParam = allIds.join(",");
        const reactionRes = await fetch(
          `/api/comment-reactions?comment_type=${commentType}&comment_ids=${idsParam}`,
          { cache: "no-store" },
        );
        if (reactionRes.ok) {
          const { counts, mine } = await reactionRes.json();
          setReactionCounts(counts ?? {});
          setMyReactions(mine ?? {});
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

  const tree = sortRoots(buildTree(comments), sortBy, reactionCounts, reversed);
  const visibleTree = tree.slice(0, visibleCount);
  const remaining = tree.length - visibleCount;
  const allVisibleIds = selectMode ? collectIds(visibleTree) : [];
  const allSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selected.has(id));

  // 입력 폼 — systemInputPosition 에 따라 리스트 위/아래에 배치.
  // 감싸는 래퍼 없음 — 입력 박스(보더 + 2xl)는 CommentForm 이 자기 `.box` 로 직접 그린다.
  // 여기서 감싸면 폼의 아바타 거터까지 박스 안에 들어가 댓글 본문 컬럼과의 정렬이 깨진다.
  const commentForm = (
    <CommentForm
      commentType={commentType}
      targetId={targetId}
      onSubmit={(newId?: string) => {
        if (comments.length === 0 && newId) setFirstCommentId(newId);
        fetchComments();
      }}
      isFirstOnTarget={comments.length === 0}
    />
  );

  return (
    <div className={styles.section}>
      <div className="tw:flex tw:items-center tw:justify-between tw:gap-md">
        <div className="tw:flex tw:items-center tw:gap-sm">
          <h2 className={styles.heading}>
            <T k="comments.heading" />
            {comments.length > 0 && (
              <span className={styles.count}>({comments.length})</span>
            )}
          </h2>
          {/* 정렬은 댓글 개수와 무관하게 항상 노출.
              공통 SortControl — 달력 블록 툴바와 같은 pill 규격.
              내부 상태는 reversed(boolean) 그대로 두고 방향만 매핑한다 — 정렬 의미는 안 바꾼다. */}
          <SortControl<CommentSort>
            value={sortBy}
            onChange={setSortBy}
            options={[
              { value: "registered", label: language === "ko" ? "등록순" : "Registered" },
              { value: "reactions", label: language === "ko" ? "반응순" : "Most reactions" },
            ]}
            dir={reversed ? "desc" : "asc"}
            onDirChange={(d) => setReversed(d === "desc")}
          />
        </div>
        <div className={styles.headingRight}>
          <p className={styles.disclaimer}><T k="comments.disclaimer" noTooltip /></p>
          {isAdmin && comments.length > 0 && (
            /* subtle = border light (outline 은 border strong) — 역순 토글과 동일 이유 */
            <Button
              variant="subtle"
              size="xs"
              shape="capsule"
              onClick={() => { setSelectMode(!selectMode); setSelected(new Set()); }}
            >
              {selectMode ? (language === "ko" ? "취소" : "Cancel") : (language === "ko" ? "선택" : "Select")}
            </Button>
          )}
        </div>
      </div>

      {inputTop && commentForm}

      {tree.length > 0 ? (
        <div className={styles.list}>
          {/* 선택 모드 헤더 — 전체 선택 + 일괄삭제. 선택 대상(리스트) 바로 위에 붙여 맥락을 맞춤.
              슬롯(높이 애니메이션) / 내용(패딩) 을 분리해야 접힐 때 패딩까지 같이 사라진다 */}
          <AnimatePresence initial={false}>
            {isAdmin && selectMode && (
              <motion.div
                className={styles.listHeaderSlot}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className={styles.listHeader}>
                  <Checkbox
                    shape="square"
                    checked={allSelected}
                    onChange={(next) => setSelected(next ? new Set(allVisibleIds) : new Set())}
                    label={language === "ko" ? "전체" : "All"}
                  />
                  {selected.size > 0 && (
                    /* loading 이 disabled 까지 처리. wave 는 글자 자체가 인디케이터라 너비가 안 튄다 */
                    <Button
                      variant="outline"
                      tone="danger"
                      size="xs"
                      shape="capsule"
                      loading={bulkDeleting}
                      loadingVariant="wave"
                      onClick={handleBulkDelete}
                    >
                      {language === "ko" ? `${selected.size}개 삭제` : `Delete ${selected.size}`}
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {visibleTree.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              commentType={commentType}
              targetId={targetId}
              reactionCounts={reactionCounts}
              myReactions={myReactions}
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
        /* 가운데 정렬은 래퍼가 담당 — Button 자체엔 배치 클래스를 붙이지 않는다 */
        <div className="tw:flex tw:justify-center">
          <Button
            variant="outline"
            size="sm"
            shape="capsule"
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          >
            {language === "ko"
              ? `댓글 ${remaining}개 더보기`
              : `Load ${remaining} more comment${remaining > 1 ? "s" : ""}`}
          </Button>
        </div>
      )}

      {!inputTop && commentForm}

    </div>
  );
}
