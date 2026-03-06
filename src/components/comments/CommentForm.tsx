"use client";

import { useState, useCallback, useMemo } from "react";
import { getCommenterId, getIdentity } from "@/utils/commenterIdentity";
import { useLanguage } from "@/providers/LanguageProvider";
import T from "@/components/ui/T";
import styles from "./CommentForm.module.css";

interface CommentFormProps {
  commentType: "post" | "work";
  targetId: string;
  parentId?: string;
  onSubmit: () => void;
  onCancel?: () => void;
}

export default function CommentForm({
  commentType,
  targetId,
  parentId,
  onSubmit,
  onCancel,
}: CommentFormProps) {
  const { t } = useLanguage();
  const [content, setContent] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const commenterId = useMemo(() => getCommenterId(), []);
  const identity = useMemo(
    () => getIdentity(commenterId, targetId),
    [commenterId, targetId],
  );

  const apiBase = commentType === "work" ? "/api/work-comments" : "/api/comments";

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!content.trim() || !password.trim()) return;

      setSubmitting(true);
      setError("");

      try {
        const body: Record<string, string | undefined> = {
          commenter_id: commenterId,
          parent_id: parentId,
          content: content.trim(),
          password: password.trim(),
        };

        if (commentType === "work") {
          body.work_id = targetId;
        } else {
          body.post_id = targetId;
        }

        const res = await fetch(apiBase, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "Failed to post comment");
          return;
        }

        setContent("");
        setPassword("");
        onSubmit();
      } catch {
        setError("Network error");
      } finally {
        setSubmitting(false);
      }
    },
    [apiBase, commentType, targetId, parentId, commenterId, content, password, onSubmit],
  );

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.identityRow}>
        <div className={styles.identity}>
          <span className={styles.identityEmoji}>{identity.emoji}</span>
          <span className={styles.identityName}>{identity.name}</span>
          <span><T k="comments.asYou" /></span>
        </div>
        <input
          className={styles.passwordInput}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t("comments.passwordPlaceholder")}
          maxLength={72}
          required
        />
      </div>

      <textarea
        className={styles.textarea}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={parentId ? t("comments.replyPlaceholder") : t("comments.placeholder")}
        rows={3}
        maxLength={2000}
        required
      />

      {error && <span className={styles.error}>{error}</span>}

      <div className={styles.actions}>
        <button
          type="submit"
          className={styles.submitBtn}
          disabled={submitting}
        >
          {submitting ? <T k="comments.posting" /> : parentId ? <T k="comments.reply" /> : <T k="comments.submit" />}
        </button>
        {onCancel && (
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onCancel}
          >
            <T k="comments.cancel" />
          </button>
        )}
      </div>
    </form>
  );
}
