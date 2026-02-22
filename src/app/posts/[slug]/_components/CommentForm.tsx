"use client";

import { useState, useCallback } from "react";
import styles from "./CommentForm.module.css";

interface CommentFormProps {
  postId: string;
  parentId?: string;
  onSubmit: () => void;
  onCancel?: () => void;
}

export default function CommentForm({
  postId,
  parentId,
  onSubmit,
  onCancel,
}: CommentFormProps) {
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!nickname.trim() || !password || !content.trim()) return;

      setSubmitting(true);
      setError("");

      try {
        const res = await fetch("/api/comments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            post_id: postId,
            parent_id: parentId,
            nickname: nickname.trim(),
            password,
            content: content.trim(),
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "Failed to post comment");
          return;
        }

        setNickname("");
        setPassword("");
        setContent("");
        onSubmit();
      } catch {
        setError("Network error");
      } finally {
        setSubmitting(false);
      }
    },
    [postId, parentId, nickname, password, content, onSubmit]
  );

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.row}>
        <input
          className={styles.input}
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Nickname"
          maxLength={20}
          required
        />
        <input
          className={styles.input}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password (for deletion)"
          maxLength={50}
          required
        />
      </div>

      <textarea
        className={styles.textarea}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={parentId ? "Write a reply..." : "Write a comment..."}
        rows={3}
        required
      />

      {error && <span className={styles.error}>{error}</span>}

      <div className={styles.actions}>
        <button
          type="submit"
          className={styles.submitBtn}
          disabled={submitting}
        >
          {submitting ? "Posting..." : parentId ? "Reply" : "Comment"}
        </button>
        {onCancel && (
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
