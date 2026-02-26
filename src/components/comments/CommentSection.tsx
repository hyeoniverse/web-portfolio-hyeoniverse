"use client";

import { useState, useEffect, useCallback } from "react";
import type { Comment } from "@/types/post";
import { useLanguage } from "@/providers/LanguageProvider";
import CommentForm from "./CommentForm";
import CommentItem from "./CommentItem";
import styles from "./CommentSection.module.css";

interface CommentSectionProps {
  /** "post" | "work" */
  commentType: "post" | "work";
  /** post_id 또는 work_id */
  targetId: string;
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

  return roots;
}

export default function CommentSection({ commentType, targetId }: CommentSectionProps) {
  const { t } = useLanguage();
  const [comments, setComments] = useState<Comment[]>([]);
  const apiBase = commentType === "work" ? "/api/work-comments" : "/api/comments";
  const paramKey = commentType === "work" ? "work_id" : "post_id";

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

  return (
    <div className={styles.section}>
      <h2 className={styles.heading}>
        {t("comments.heading")}
        {comments.length > 0 && (
          <span className={styles.count}>({comments.length})</span>
        )}
      </h2>

      <CommentForm
        commentType={commentType}
        targetId={targetId}
        onSubmit={fetchComments}
      />

      {tree.length > 0 ? (
        <div className={styles.list}>
          {tree.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              commentType={commentType}
              targetId={targetId}
              likedMap={likedMap}
              likeCountMap={likeCountMap}
              onRefresh={fetchComments}
            />
          ))}
        </div>
      ) : (
        <p className={styles.empty}>{t("comments.empty")}</p>
      )}
    </div>
  );
}
