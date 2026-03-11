"use client";

import { useState, useCallback, useMemo, useEffect, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Comment } from "@/types/post";
import { getCommenterId, identityFromHash } from "@/utils/commenterIdentity";
import { useLanguage } from "@/providers/LanguageProvider";
import T from "@/components/ui/T";
import LoadingDots from "@/components/ui/LoadingDots";
import CommentForm from "./CommentForm";
import styles from "./CommentItem.module.css";

function hasKorean(text: string): boolean {
  return /[\uac00-\ud7af]/.test(text);
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }) + " " + d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

interface CommentItemProps {
  comment: Comment;
  commentType: "post" | "work";
  targetId: string;
  likedMap?: Record<string, boolean>;
  likeCountMap?: Record<string, number>;
  isAdmin?: boolean;
  onRefresh: () => void;
}

function CommentItem({
  comment,
  commentType,
  targetId,
  likedMap,
  likeCountMap,
  isAdmin = false,
  onRefresh,
}: CommentItemProps) {
  const { t } = useLanguage();
  const [showReply, setShowReply] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [translateServiceUnavailable, setTranslateServiceUnavailable] = useState(false);
  const [liked, setLiked] = useState(likedMap?.[comment.id] ?? false);
  const [likeCount, setLikeCount] = useState(likeCountMap?.[comment.id] ?? 0);

  useEffect(() => {
    if (likedMap && comment.id in likedMap) {
      setLiked(likedMap[comment.id]);
    }
    if (likeCountMap && comment.id in likeCountMap) {
      setLikeCount(likeCountMap[comment.id]);
    }
  }, [likedMap, likeCountMap, comment.id]);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [editPassword, setEditPassword] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");

  const commenterId = useMemo(() => getCommenterId(), []);

  const commenterHash = (comment as unknown as Record<string, unknown>).commenter_hash as string | undefined;
  const identity = useMemo(() => {
    if (commenterHash) {
      return identityFromHash(commenterHash);
    }
    return { emoji: "\u{1F464}", name: comment.nickname };
  }, [commenterHash, comment.nickname]);

  const dateStr = formatDateTime(comment.created_at);

  const isEdited = comment.updated_at && comment.updated_at !== comment.created_at;
  const editedDateStr = isEdited ? formatDateTime(comment.updated_at!) : null;

  const isKorean = hasKorean(comment.content);
  const targetLang = isKorean ? "en" : "ko";

  const apiBase = commentType === "work" ? "/api/work-comments" : "/api/comments";

  const handleTranslate = useCallback(async () => {
    if (translatedText !== null) {
      setTranslatedText(null);
      return;
    }

    setTranslating(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: comment.content, targetLang }),
      });
      if (res.ok) {
        const data = await res.json();
        setTranslatedText(data.translation);
      } else if (res.status === 503) {
        setTranslateServiceUnavailable(true);
      } else {
        setTranslatedText("⚠ Translation failed. Please try again.");
      }
    } catch {
      setTranslatedText("⚠ Translation failed. Please try again.");
    } finally {
      setTranslating(false);
    }
  }, [comment.content, targetLang, translatedText]);

  const handleLike = useCallback(async () => {
    try {
      const res = await fetch("/api/comment-likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment_type: commentType,
          comment_id: comment.id,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setLiked(data.liked);
        setLikeCount(data.count);
      }
    } catch {
      // silent fail
    }
  }, [commentType, comment.id]);

  const handleDelete = useCallback(async () => {
    if (!isAdmin && !deletePassword.trim()) {
      setDeleteError(t("comments.passwordRequired"));
      return;
    }
    setDeleting(true);
    setDeleteError("");

    try {
      const res = await fetch(`${apiBase}/${comment.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commenter_id: isAdmin ? undefined : commenterId,
          target_id: targetId,
          password: isAdmin ? undefined : (deletePassword || undefined),
        }),
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
  }, [apiBase, comment.id, commenterId, targetId, deletePassword, isAdmin, onRefresh, t]);

  const handleEdit = useCallback(async () => {
    if (!editContent.trim()) return;
    if (!editPassword.trim()) {
      setEditError(t("comments.passwordRequired"));
      return;
    }
    setEditSubmitting(true);
    setEditError("");

    try {
      const res = await fetch(apiBase, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: comment.id,
          commenter_id: commenterId,
          target_id: targetId,
          content: editContent.trim(),
          password: editPassword || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setEditError(data.error ?? "Failed to edit");
        return;
      }

      setEditing(false);
      setEditPassword("");
      onRefresh();
    } catch {
      setEditError("Network error");
    } finally {
      setEditSubmitting(false);
    }
  }, [apiBase, comment.id, commenterId, targetId, editContent, editPassword, onRefresh, t]);

  // soft-deleted 댓글 — placeholder만 표시
  if (comment.is_deleted) {
    return (
      <div className={styles.comment}>
        <p className={styles.deletedPlaceholder}>
          <T k="comments.deletedComment" />
        </p>
        {comment.replies && comment.replies.length > 0 && (
          <div className={styles.replies}>
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                commentType={commentType}
                targetId={targetId}
                likedMap={likedMap}
                likeCountMap={likeCountMap}
                isAdmin={isAdmin}
                onRefresh={onRefresh}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.comment}>
      <div className={styles.commentHeader}>
        {comment.is_admin ? (
          <span className={styles.adminBadge}>Admin</span>
        ) : (
          <>
            <span className={styles.avatar}>{identity.emoji}</span>
            <span className={styles.nickname}>{identity.name}</span>
          </>
        )}
        <span className={styles.date}>{dateStr}</span>
        {isEdited && (
          <span className={styles.editedBadge} title={editedDateStr ?? ""}>
            (<T k="comments.edited" />)
          </span>
        )}
        <span className={styles.headerSpacer} />
        <button
          type="button"
          className={`${styles.likeBtn} ${liked ? styles.likeBtnLiked : ""}`}
          onClick={handleLike}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          {likeCount > 0 && <span className={styles.likeCount}>{likeCount}</span>}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {editing ? (
          <motion.div
            key="edit"
            className={styles.editArea}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <textarea
              className={styles.editTextarea}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={3}
            />
            <div className={styles.editActions}>
              <input
                className={styles.deleteInput}
                type="password"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder={t("comments.password")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleEdit();
                }}
              />
              <button
                type="button"
                className={styles.editSubmitBtn}
                onClick={handleEdit}
                disabled={editSubmitting}
              >
                {editSubmitting ? <T k="comments.editing" /> : <T k="comments.editSubmit" />}
              </button>
              <button
                type="button"
                className={styles.editCancelBtn}
                onClick={() => {
                  setEditing(false);
                  setEditContent(comment.content);
                  setEditPassword("");
                  setEditError("");
                }}
              >
                <T k="comments.cancel" />
              </button>
            </div>
            {editError && <span className={styles.editError}>{editError}</span>}
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className={styles.content}>{comment.content}</div>

            <AnimatePresence>
              {translatedText && (
                <motion.div
                  className={styles.translatedContent}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {translatedText}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={styles.commentActions}>
        {!translateServiceUnavailable && <button
          type="button"
          className={`${styles.translateBtn} ${translatedText ? styles.translateBtnActive : ""}`}
          onClick={handleTranslate}
          disabled={translating}
          title={translatedText ? t("comments.original") : isKorean ? "Translate to English" : "한국어로 번역"}
        >
          {translating ? (
            <LoadingDots />
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              {translatedText ? <T k="comments.original" /> : isKorean ? <T k="comments.translateToEN" /> : <T k="comments.translateToKO" />}
            </>
          )}
        </button>}
        <button
          type="button"
          className={styles.actionBtn}
          onClick={() => {
            setShowReply(!showReply);
            setShowDelete(false);
            setEditing(false);
          }}
        >
          <T k="comments.replyBtn" />
        </button>
        {(!comment.is_admin || isAdmin) && (
          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => {
              setEditing(!editing);
              setShowReply(false);
              setShowDelete(false);
              setEditContent(comment.content);
              setEditPassword("");
            }}
          >
            <T k="comments.edit" />
          </button>
        )}
        {(!comment.is_admin || isAdmin) && (
          <button
            type="button"
            className={styles.deleteBtn}
            onClick={() => {
              setShowDelete(!showDelete);
              setShowReply(false);
              setEditing(false);
            }}
          >
            <T k="comments.delete" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showDelete && (
          <motion.div
            className={styles.deleteModal}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className={styles.deleteRow}>
              {!isAdmin && (
                <input
                  className={styles.deleteInput}
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder={t("comments.password")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleDelete();
                  }}
                />
              )}
              <button
                type="button"
                className={styles.deleteConfirm}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <motion.span
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                  >
                    <T k="comments.deleting" />
                  </motion.span>
                ) : (
                  <T k="comments.confirmDelete" />
                )}
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
                <T k="comments.cancel" />
              </button>
            </div>
            {deleteError && (
              <span className={styles.deleteError}>{deleteError}</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showReply && (
          <motion.div
            className={styles.replyForm}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CommentForm
              commentType={commentType}
              targetId={targetId}
              parentId={comment.id}
              onSubmit={() => {
                setShowReply(false);
                onRefresh();
              }}
              onCancel={() => setShowReply(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {comment.replies && comment.replies.length > 0 && (
        <div className={styles.replies}>
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              commentType={commentType}
              targetId={targetId}
              likedMap={likedMap}
              likeCountMap={likeCountMap}
              isAdmin={isAdmin}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(CommentItem);
