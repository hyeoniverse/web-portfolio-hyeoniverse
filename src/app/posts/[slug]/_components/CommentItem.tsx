"use client";

import { useState, useCallback } from "react";
import type { Comment } from "@/types/post";
import CommentForm from "./CommentForm";
import styles from "./CommentItem.module.css";

interface CommentItemProps {
  comment: Comment;
  postId: string;
  onRefresh: () => void;
}

export default function CommentItem({
  comment,
  postId,
  onRefresh,
}: CommentItemProps) {
  const [showReply, setShowReply] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const date = new Date(comment.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const handleDelete = useCallback(async () => {
    if (!deletePassword) return;
    setDeleting(true);
    setDeleteError("");

    try {
      const res = await fetch(`/api/comments/${comment.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });

      if (!res.ok) {
        const data = await res.json();
        setDeleteError(data.error ?? "Failed to delete");
        return;
      }

      setShowDelete(false);
      onRefresh();
    } catch {
      setDeleteError("Network error");
    } finally {
      setDeleting(false);
    }
  }, [comment.id, deletePassword, onRefresh]);

  return (
    <div className={styles.comment}>
      <div className={styles.commentHeader}>
        <span className={styles.nickname}>{comment.nickname}</span>
        {comment.is_admin && <span className={styles.adminBadge}>Admin</span>}
        <span className={styles.date}>{date}</span>
      </div>

      <div className={styles.content}>{comment.content}</div>

      <div className={styles.commentActions}>
        <button
          type="button"
          className={styles.actionBtn}
          onClick={() => {
            setShowReply(!showReply);
            setShowDelete(false);
          }}
        >
          Reply
        </button>
        <button
          type="button"
          className={styles.deleteBtn}
          onClick={() => {
            setShowDelete(!showDelete);
            setShowReply(false);
          }}
        >
          Delete
        </button>
      </div>

      {showDelete && (
        <div className={styles.deleteModal}>
          <input
            className={styles.deleteInput}
            type="password"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            placeholder="Password"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleDelete();
            }}
          />
          <button
            type="button"
            className={styles.deleteConfirm}
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "..." : "Confirm"}
          </button>
          <button
            type="button"
            className={styles.deleteCancel}
            onClick={() => {
              setShowDelete(false);
              setDeletePassword("");
              setDeleteError("");
            }}
          >
            Cancel
          </button>
          {deleteError && (
            <span className={styles.deleteError}>{deleteError}</span>
          )}
        </div>
      )}

      {showReply && (
        <div className={styles.replyForm}>
          <CommentForm
            postId={postId}
            parentId={comment.id}
            onSubmit={() => {
              setShowReply(false);
              onRefresh();
            }}
            onCancel={() => setShowReply(false)}
          />
        </div>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <div className={styles.replies}>
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              postId={postId}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}
