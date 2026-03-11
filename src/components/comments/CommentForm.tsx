"use client";

import { useState, useCallback, useEffect } from "react";
import { getCommenterId, getIdentity, getRandomIdentity } from "@/utils/commenterIdentity";
import { createClient } from "@/lib/supabase/client";
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
  const [notifyEmail, setNotifyEmail] = useState("");
  const [emailNotify, setEmailNotify] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

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

  const [commenterId, setCommenterId] = useState("");
  const [identity, setIdentity] = useState<{ emoji: string; name: string } | null>(null);

  useEffect(() => {
    const id = getCommenterId();
    setCommenterId(id);
    setIdentity(getIdentity(id, targetId));
  }, [targetId]);

  const apiBase = commentType === "work" ? "/api/work-comments" : "/api/comments";

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!content.trim()) return;
      if (!isAdmin && !password.trim()) return;

      setSubmitting(true);
      setError("");

      try {
        const body: Record<string, string | boolean | undefined> = {
          commenter_id: isAdmin ? undefined : commenterId,
          parent_id: parentId,
          nickname: isAdmin ? undefined : `${identity?.emoji} ${identity?.name}`,
          content: content.trim(),
          password: isAdmin ? undefined : password.trim(),
          is_admin: isAdmin || undefined,
        };

        if (!isAdmin && emailNotify && notifyEmail.trim()) {
          body.notify_email = notifyEmail.trim();
        }

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
    [apiBase, commentType, targetId, parentId, commenterId, content, password, identity, isAdmin, emailNotify, notifyEmail, onSubmit],
  );

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {isAdmin ? (
        <div className={styles.adminIdentity}>
          <span className={styles.adminBadge}>Admin</span>
        </div>
      ) : identity ? (
        <div className={styles.identityRow}>
          <div className={styles.identity}>
            <span className={styles.identityEmoji}>{identity.emoji}</span>
            <span className={styles.identityName}>{identity.name}</span>
            <span><T k="comments.asYou" /></span>
            <button
              type="button"
              className={styles.shuffleBtn}
              onClick={() => setIdentity(getRandomIdentity(identity ?? undefined))}
              data-clickable="true"
              title={t("comments.shuffle")}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22" />
                <path d="m18 2 4 4-4 4" />
                <path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2" />
                <path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8" />
                <path d="m18 14 4 4-4 4" />
              </svg>
            </button>
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
      ) : null}

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
        {!isAdmin && (
          <div className={styles.emailNotify}>
            <button
              type="button"
              className={`${styles.notifyToggle} ${emailNotify ? styles.notifyToggleOn : ""}`}
              onClick={() => setEmailNotify(!emailNotify)}
              data-clickable="true"
              title={t("comments.emailNotifyTip")}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </button>
            {emailNotify && (
              <input
                className={styles.emailInput}
                type="email"
                value={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.value)}
                placeholder={t("comments.emailPlaceholder")}
                maxLength={254}
              />
            )}
          </div>
        )}
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
