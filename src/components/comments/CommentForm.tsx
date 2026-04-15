"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { getCommenterId, getIdentity, getRandomIdentity } from "@/utils/commenterIdentity";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/providers/LanguageProvider";
import T from "@/components/ui/T";
import styles from "./CommentForm.module.css";

const Fireworks = dynamic(() => import("@/components/effects/Fireworks"), {
  ssr: false,
});

interface CommentFormProps {
  commentType: "post" | "work";
  targetId: string;
  parentId?: string;
  onSubmit: () => void;
  onCancel?: () => void;
  /** 해당 게시물/작품의 첫 댓글 여부 — true면 제출 성공 시 폭죽 터뜨림 */
  isFirstOnTarget?: boolean;
}

export default function CommentForm({
  commentType,
  targetId,
  parentId,
  onSubmit,
  onCancel,
  isFirstOnTarget = false,
}: CommentFormProps) {
  const { t } = useLanguage();
  const [content, setContent] = useState("");
  const [password, setPassword] = useState("");
  const [notifyEmail, setNotifyEmail] = useState("");
  const [emailNotify, setEmailNotify] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const emailJustOpened = useRef(false);
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const [confirmedEmail, setConfirmedEmail] = useState("");
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notifyEmail);
  const emailChanged = notifyEmail !== confirmedEmail;
  const [submitting, setSubmitting] = useState(false);
  const [formHint, setFormHint] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [fireworks, setFireworks] = useState(false);

  useEffect(() => {
    if (emailNotify && emailJustOpened.current) {
      emailJustOpened.current = false;
      requestAnimationFrame(() => emailInputRef.current?.focus());
    }
  }, [emailNotify]);

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
      setFormHint("");
      if (!content.trim()) { setFormHint(t("comments.hintContent")); return; }
      if (!isAdmin && !password.trim()) { setFormHint(t("comments.hintPassword")); return; }

      setSubmitting(true);
      setFormHint("");

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
          const code = data.error as string | undefined;
          const errorMap: Record<string, string> = {
            CONTENT_INVALID: "comments.hintContent",
            CONTENT_EMPTY: "comments.hintContent",
            CONTENT_TOO_LONG: "comments.hintContentTooLong",
            PASSWORD_TOO_SHORT: "comments.hintPasswordTooShort",
            PASSWORD_TOO_LONG: "comments.hintPasswordTooLong",
            EMAIL_INVALID: "comments.invalidEmail",
            EMAIL_TOO_LONG: "comments.invalidEmail",
            NICKNAME_TOO_LONG: "comments.hintNicknameTooLong",
          };
          setFormHint(t(code && errorMap[code] ? errorMap[code] : "comments.hintSubmitFailed"));
          return;
        }

        setContent("");
        setPassword("");
        setFormHint("");

        // 해당 게시물의 첫 댓글이면 폭죽 + 축하 메시지
        if (isFirstOnTarget) setFireworks(true);

        onSubmit();
      } catch {
        setFormHint(t("comments.hintNetwork"));
      } finally {
        setSubmitting(false);
      }
    },
    [apiBase, commentType, targetId, parentId, commenterId, content, password, identity, isAdmin, emailNotify, notifyEmail, onSubmit, t, isFirstOnTarget],
  );

  return (
    <>
    {fireworks && (
      <Fireworks
        trigger
        message={t("comments.firstCommentCelebration")}
        onDone={() => setFireworks(false)}
      />
    )}
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
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
            onChange={(e) => { setPassword(e.target.value); setFormHint(""); }}
            placeholder={t("comments.passwordPlaceholder")}
            maxLength={72}
          />
        </div>
      ) : null}

      <textarea
        className={styles.textarea}
        value={content}
        onChange={(e) => { setContent(e.target.value); setFormHint(""); }}
        placeholder={parentId ? t("comments.replyPlaceholder") : t("comments.placeholder")}
        rows={3}
        maxLength={2000}
      />

      {!isAdmin && (
        <div className={styles.notifyWrap}>
          <div
            className={`${styles.notifyCapsule} ${emailNotify ? styles.notifyCapsuleOpen : ""} ${emailConfirmed ? styles.notifyCapsuleConfirmed : ""}`}
            onClick={() => { if (!emailNotify) { emailJustOpened.current = true; setEmailNotify(true); } }}
            data-clickable="true"
            title={!emailNotify ? t("comments.emailNotifyTip") : undefined}
          >
            <svg className={styles.notifyIcon} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            <span className={styles.notifyConfirmedLabel}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
              {notifyEmail}
            </span>
            <input
              ref={emailInputRef}
              className={`${styles.notifyInput} ${emailConfirmed ? styles.notifyInputConfirmed : ""}`}
              type="email"
              autoComplete="off"
              value={notifyEmail}
              onChange={(e) => { setNotifyEmail(e.target.value); }}
              placeholder={t("comments.emailPlaceholder")}
              maxLength={254}
              tabIndex={emailNotify ? 0 : -1}
              readOnly={emailConfirmed}
              onClick={(e) => e.stopPropagation()}
              onBlur={() => { if (!emailConfirmed && !emailChanged && confirmedEmail && isValidEmail) setEmailConfirmed(true); }}
            />
            {emailNotify && isValidEmail && !emailConfirmed && emailChanged && (
              <>
                <span className={styles.notifyDivider} />
                <button
                  type="button"
                  className={styles.notifyCheck}
                  onClick={(e) => { e.stopPropagation(); setEmailConfirmed(true); setConfirmedEmail(notifyEmail); }}
                  tabIndex={0}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>
              </>
            )}
            {emailConfirmed ? (
              <button
                type="button"
                className={styles.notifyAction}
                onClick={(e) => {
                  e.stopPropagation();
                  setEmailConfirmed(false);
                  requestAnimationFrame(() => emailInputRef.current?.focus());
                }}
                tabIndex={0}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                </svg>
              </button>
            ) : (
              <>
                <span className={styles.notifyDivider} />
                <button
                  type="button"
                  className={styles.notifyAction}
                  onClick={(e) => {
                    e.stopPropagation();
                    setEmailNotify(false); setEmailConfirmed(false); setConfirmedEmail(""); setNotifyEmail("");
                  }}
                  tabIndex={emailNotify ? 0 : -1}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M18 6L6 18" /><path d="M6 6l12 12" />
                  </svg>
                </button>
              </>
            )}
          </div>
          {emailNotify && notifyEmail.trim() && !isValidEmail && (
            <span className={styles.notifyHint}>{t("comments.invalidEmail")}</span>
          )}
        </div>
      )}

      <div className={styles.actions}>
        {formHint && <span className={styles.formHint}>{formHint}</span>}
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
    </>
  );
}
