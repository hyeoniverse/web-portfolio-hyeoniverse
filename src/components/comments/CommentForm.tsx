"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Shuffle, Bell, CircleX, Check, Pencil, ChevronRight } from "lucide-react";
import { getCommenterId, getIdentity, getRandomIdentity, FALLBACK_AVATAR_EMOJI } from "@/utils/commenterIdentity";
import { useIsAuthenticated } from "@/hooks/useIsAuthenticated";
import { useLanguage } from "@/providers/LanguageProvider";
import T from "@/components/ui/T";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import CommentEditor from "./CommentEditor";
import styles from "./CommentForm.module.css";

const Fireworks = dynamic(() => import("@/components/effects/Fireworks"), {
  ssr: false,
});

interface CommentFormProps {
  commentType: "post" | "work";
  targetId: string;
  parentId?: string;
  onSubmit: (newId?: string) => void;
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
  // content 변경 공용 핸들러 — 입력/툴바 서식 적용 모두 여기로
  const handleContentChange = useCallback((v: string) => { setContent(v); setFormHint(""); }, []);
  const isAdmin = useIsAuthenticated({ subscribe: true });
  const [fireworks, setFireworks] = useState(false);

  useEffect(() => {
    if (emailNotify && emailJustOpened.current) {
      emailJustOpened.current = false;
      requestAnimationFrame(() => emailInputRef.current?.focus());
    }
  }, [emailNotify]);

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

        const resData = await res.json().catch(() => ({}));
        setContent("");
        setPassword("");
        setFormHint("");

        if (isFirstOnTarget) setFireworks(true);

        onSubmit(resData?.id);
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
        onDone={() => setFireworks(false)}
      />
    )}
    <form
      className={`${styles.form} ${parentId ? styles.formPlain : ""}`}
      onSubmit={handleSubmit}
      noValidate
    >
      {isAdmin ? (
        <div className={styles.adminIdentity}>
          <span className={styles.avatar} aria-hidden="true">
            {FALLBACK_AVATAR_EMOJI}
          </span>
          <span className={styles.adminBadge}>Admin</span>
        </div>
      ) : identity ? (
        <div className={styles.identityRow}>
          <div className={styles.identity}>
            <span className={styles.avatar} aria-hidden="true">
              {identity.emoji}
            </span>
            <span className={styles.identityName}>{identity.name}</span>
            <span><T k="comments.asYou" /></span>
            <Button
              variant="subtle"
              shape="circle"
              size="sm"
              icon={<Shuffle size={12} strokeWidth={2.5} />}
              onClick={() => setIdentity(getRandomIdentity(identity ?? undefined))}
              data-clickable="true"
              title={t("comments.shuffle")}
              aria-label={t("comments.shuffle")}
            />
          </div>
          {/* 폭 고정은 래퍼가 담당 — 공통 Input 자체엔 스타일 클래스를 붙이지 않는다 */}
          <div className={styles.passwordField}>
            <Input
              size="sm"
              type="password"
              clearable={false}
              value={password}
              onChange={(v) => { setPassword(v); setFormHint(""); }}
              placeholder={t("comments.passwordPlaceholder")}
              maxLength={72}
            />
          </div>
        </div>
      ) : null}

      <CommentEditor
        value={content}
        onChange={handleContentChange}
        placeholder={parentId ? t("comments.replyPlaceholder") : t("comments.placeholder")}
      />

      {!isAdmin && (
        <div className={styles.notifyWrap}>
          <div
            className={`${styles.notifyCapsule} ${emailNotify ? styles.notifyCapsuleOpen : ""} ${emailConfirmed ? styles.notifyCapsuleConfirmed : ""}`}
            onClick={() => { if (!emailNotify) { emailJustOpened.current = true; setEmailNotify(true); } }}
            data-clickable="true"
            title={!emailNotify ? t("comments.emailNotifyTip") : undefined}
          >
            <Bell className={styles.notifyIcon} size={12} />
            <span className={styles.notifyConfirmedLabel}>
              <Bell size={12} />
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
            {/* 입력값 비우기(삭제) 버튼 — 편집 모드에서 텍스트가 있을 때만 */}
            {emailNotify && !emailConfirmed && notifyEmail.length > 0 && (
              <button
                type="button"
                className={styles.notifyClear}
                onClick={(e) => {
                  e.stopPropagation();
                  setNotifyEmail("");
                  requestAnimationFrame(() => emailInputRef.current?.focus());
                }}
                tabIndex={0}
                aria-label={t("comments.emailClear")}
                title={t("comments.emailClear")}
              >
                <CircleX size={12} fill="currentColor" stroke="none" />
              </button>
            )}
            {emailNotify && isValidEmail && !emailConfirmed && emailChanged && (
              <>
                <span className={styles.notifyDivider} />
                <button
                  type="button"
                  className={styles.notifyCheck}
                  onClick={(e) => { e.stopPropagation(); setEmailConfirmed(true); setConfirmedEmail(notifyEmail); }}
                  tabIndex={0}
                >
                  <Check size={12} strokeWidth={3} />
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
                <Pencil size={14} />
              </button>
            ) : (
              <>
                <span className={styles.notifyDivider} />
                <button
                  type="button"
                  className={styles.notifyAction}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirmedEmail) {
                      // 이미 확정된 이메일이 있었고 지금은 수정 중 → 원래 확정 상태로 복귀
                      setNotifyEmail(confirmedEmail);
                      setEmailConfirmed(true);
                    } else {
                      // 확정된 이메일 없음 → 완전 닫기
                      setEmailNotify(false);
                      setNotifyEmail("");
                    }
                  }}
                  tabIndex={emailNotify ? 0 : -1}
                >
                  {/* 캡슐이 오른쪽으로 접히는 방향을 암시하는 chevron */}
                  <ChevronRight size={12} strokeWidth={2.5} />
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
        <Button type="submit" variant="primary" size="sm" disabled={submitting}>
          {submitting ? <T k="comments.posting" /> : parentId ? <T k="comments.reply" /> : <T k="comments.submit" />}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            <T k="comments.cancel" />
          </Button>
        )}
      </div>
    </form>
    </>
  );
}
