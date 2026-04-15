"use client";

import { useState, useEffect, useCallback } from "react";
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

export default function CommentSection({ commentType, targetId, translationEnabled = true }: CommentSectionProps) {
  const { language } = useLanguage();
  const [comments, setComments] = useState<Comment[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
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

  const tree = buildTree(comments);
  const visibleTree = tree.slice(0, visibleCount);
  const remaining = tree.length - visibleCount;

  return (
    <div className={styles.section}>
      <div className={styles.headingRow}>
        <h2 className={styles.heading}>
          <T k="comments.heading" />
          {comments.length > 0 && (
            <span className={styles.count}>({comments.length})</span>
          )}
        </h2>
        <p className={styles.disclaimer}><T k="comments.disclaimer" noTooltip /></p>
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
        onSubmit={fetchComments}
      />

    </div>
  );
}
