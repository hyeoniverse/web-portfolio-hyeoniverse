"use client";

import { useState, useEffect, useCallback } from "react";
import type { Comment } from "@/types/post";
import CommentForm from "./CommentForm";
import CommentItem from "./CommentItem";
import styles from "./CommentSection.module.css";

interface CommentSectionProps {
  postId: string;
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

export default function CommentSection({ postId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);

  const fetchComments = useCallback(async () => {
    const res = await fetch(`/api/comments?post_id=${postId}`);
    if (res.ok) {
      const data = await res.json();
      setComments(data);
    }
  }, [postId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const tree = buildTree(comments);

  return (
    <div className={styles.section}>
      <h2 className={styles.heading}>
        Comments
        {comments.length > 0 && (
          <span className={styles.count}>({comments.length})</span>
        )}
      </h2>

      <CommentForm postId={postId} onSubmit={fetchComments} />

      {tree.length > 0 ? (
        <div className={styles.list}>
          {tree.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              postId={postId}
              onRefresh={fetchComments}
            />
          ))}
        </div>
      ) : (
        <p className={styles.empty}>No comments yet. Be the first!</p>
      )}
    </div>
  );
}
