"use client";

import { useState, useCallback, useMemo, useEffect, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Globe } from "lucide-react";
import type { Comment } from "@/types/post";
import { getCommenterId, identityFromHash } from "@/utils/commenterIdentity";
import { formatCount } from "@/utils/format";
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
  translationEnabled?: boolean;
  isFirstComment?: boolean;
  selectMode?: boolean;
  selected?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onDragStart?: (id: string) => void;
  onDragEnter?: (id: string) => void;
  onDragEnd?: () => void;
  onRefresh: () => void;
}

function CommentItem({
  comment,
  commentType,
  targetId,
  likedMap,
  likeCountMap,
  isAdmin = false,
  translationEnabled = true,
  isFirstComment = false,
  selectMode = false,
  selected,
  onToggleSelect,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onRefresh,
}: CommentItemProps) {
  const { t } = useLanguage();
  const [showReply, setShowReply] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [flipped, setFlipped] = useState(isFirstComment);
  const [slotOpen, setSlotOpen] = useState(false);

  useEffect(() => {
    if (!isFirstComment) return;
    requestAnimationFrame(() => requestAnimationFrame(() => setSlotOpen(true)));
    const timer = setTimeout(() => setFlipped(false), 2000);
    return () => clearTimeout(timer);
  }, [isFirstComment]);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  // 503 응답에서 set — translationEnabled prop 변화에 의존하지 않게 분리
  const [translateServiceUnavailable, setTranslateServiceUnavailable] = useState(false);
  // render 시 prop + 런타임 상태 모두 반영
  const canTranslate = translationEnabled && !translateServiceUnavailable;
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

  // Report state
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reporting, setReporting] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);

  const commenterId = useMemo(() => getCommenterId(), []);

  const commenterHash = comment.commenter_hash;
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

  const handleReport = useCallback(async () => {
    if (reporting) return;
    setReporting(true);
    try {
      const res = await fetch(`${apiBase}/${comment.id}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reportReason.trim() }),
      });
      if (res.ok) {
        setReportSubmitted(true);
        // 잠시 thank-you 메시지 보여주고 닫음
        setTimeout(() => {
          setShowReport(false);
          setReportReason("");
          setReportSubmitted(false);
        }, 1800);
      }
    } catch {
      // silent fail — 신고 실패해도 사용자에겐 굳이 알리지 않음
    } finally {
      setReporting(false);
    }
  }, [apiBase, comment.id, reportReason, reporting]);

  const handleEdit = useCallback(async () => {
    if (!editContent.trim()) return;
    if (!isAdmin && !editPassword.trim()) {
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
          commenter_id: isAdmin ? undefined : commenterId,
          target_id: targetId,
          content: editContent.trim(),
          password: isAdmin ? undefined : (editPassword || undefined),
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
  }, [apiBase, comment.id, commenterId, targetId, editContent, editPassword, onRefresh, t, isAdmin]);

  // soft-deleted 댓글 — placeholder만 표시 (삭제 주체에 따라 문구 분기)
  if (comment.is_deleted) {
    const tombstoneKey =
      comment.deleted_by === "admin"
        ? "comments.deletedCommentByAdmin"
        : "comments.deletedComment";
    return (
      <div
        className={`${styles.comment} ${selectMode ? styles.commentSelectable : ""}`}
        onPointerDown={selectMode && onDragStart && comment.deleted_by === "admin" ? (e) => {
          if ((e.target as HTMLElement).tagName === "INPUT") return;
          e.preventDefault();
          e.stopPropagation();
          onDragStart(comment.id);
        } : undefined}
        onPointerEnter={selectMode && onDragEnter && comment.deleted_by === "admin" ? (e) => { e.stopPropagation(); onDragEnter(comment.id); } : undefined}
        onPointerUp={selectMode && onDragEnd ? (e) => { e.stopPropagation(); onDragEnd(); } : undefined}
      >
        <div className={styles.deletedPlaceholder} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)" }}>
            {selectMode && onToggleSelect && comment.deleted_by === "admin" && (
              <input
                type="checkbox"
                checked={selected?.has(comment.id) ?? false}
                onChange={() => onToggleSelect(comment.id)}
                style={{ accentColor: "var(--bg-accent-solid)", cursor: "pointer" }}
              />
            )}
            <T k={tombstoneKey} />
          </span>
          {isAdmin && comment.deleted_by === "admin" && !selectMode && (
            <button
              type="button"
              className={styles.deleteBtn}
              onClick={() => setShowDelete(!showDelete)}
            >
              <T k="comments.hardDelete" />
            </button>
          )}
        </div>
        <AnimatePresence>
          {isAdmin && showDelete && comment.deleted_by === "admin" && (
            <motion.div
              className={styles.deleteModal}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className={styles.deleteRow}>
                <button
                  type="button"
                  className={styles.deleteConfirm}
                  onClick={async () => {
                    const res = await fetch(`/api/${commentType === "work" ? "work-comments" : "comments"}/${comment.id}`, { method: "DELETE" });
                    if (res.ok) onRefresh();
                  }}
                >
                  <T k="comments.confirmDelete" />
                </button>
                <button
                  type="button"
                  className={styles.deleteCancel}
                  onClick={() => setShowDelete(false)}
                >
                  <T k="comments.cancel" />
                </button>
              </div>
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
                selectMode={selectMode}
                selected={selected}
                onToggleSelect={onToggleSelect}
                onDragStart={onDragStart}
                onDragEnter={onDragEnter}
                onDragEnd={onDragEnd}
                onRefresh={onRefresh}
                translationEnabled={translationEnabled}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (isFirstComment && flipped) {
    return (
      <div className={`${styles.flipSlot} ${slotOpen ? styles.flipSlotOpen : ""}`}>
        <div className={styles.flipContainer}>
          <div className={styles.flipCard}>
            <span className={styles.flipLine} />
            <p className={styles.flipText}><span className={styles.flipStar}>✦</span> {t("comments.firstCommentCelebration")} <span className={styles.flipStar}>✦</span></p>
            <span className={styles.flipLine} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${styles.comment} ${isFirstComment ? styles.commentFlipIn : ""} ${selectMode ? styles.commentSelectable : ""}`}
      onPointerDown={selectMode && onDragStart ? (e) => {
        if ((e.target as HTMLElement).tagName === "INPUT") return;
        e.preventDefault();
        e.stopPropagation();
        onDragStart(comment.id);
      } : undefined}
      onPointerEnter={selectMode && onDragEnter ? (e) => { e.stopPropagation(); onDragEnter(comment.id); } : undefined}
      onPointerUp={selectMode && onDragEnd ? (e) => { e.stopPropagation(); onDragEnd(); } : undefined}
    >
      <div className={styles.commentHeader}>
        {selectMode && onToggleSelect && (
          <input
            type="checkbox"
            checked={selected?.has(comment.id) ?? false}
            onChange={() => onToggleSelect(comment.id)}
            style={{ accentColor: "var(--bg-accent-solid)", cursor: "pointer" }}
          />
        )}
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
          <span className={styles.editedBadge}>
            (<T k="comments.edited" tooltip={editedDateStr ?? undefined} placement="top" />)
          </span>
        )}
        <span className={styles.headerSpacer} />
        <button
          type="button"
          className={`${styles.likeBtn} ${liked ? styles.likeBtnLiked : ""}`}
          onClick={handleLike}
        >
          {likeCount > 0 && <span className={styles.likeCount}>{formatCount(likeCount)}</span>}
          <Heart size={12} fill={liked ? "currentColor" : "none"} />
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
              {!isAdmin && (
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
              )}
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
        {canTranslate && <button
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
              <Globe size={13} />
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
              setShowReport(false);
            }}
          >
            <T k="comments.delete" />
          </button>
        )}
        {/* 신고 — admin 본인 / admin 댓글 / 이미 삭제된 댓글 은 제외 */}
        {!isAdmin && !comment.is_admin && !comment.is_deleted && (
          <button
            type="button"
            className={styles.reportBtn}
            onClick={() => {
              setShowReport((v) => !v);
              setShowDelete(false);
              setShowReply(false);
              setEditing(false);
            }}
          >
            <T k="comments.report" />
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
        {showReport && (
          <motion.div
            className={styles.reportModal}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {reportSubmitted ? (
              <p className={styles.reportThanks}>
                <T k="comments.reportThanks" />
              </p>
            ) : (
              <div className={styles.reportRow}>
                <input
                  className={styles.reportInput}
                  type="text"
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder={t("comments.reportPlaceholder")}
                  maxLength={500}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleReport();
                  }}
                />
                <button
                  type="button"
                  className={styles.reportConfirm}
                  onClick={handleReport}
                  disabled={reporting}
                >
                  {reporting ? (
                    <LoadingDots />
                  ) : (
                    <T k="comments.confirmReport" />
                  )}
                </button>
                <button
                  type="button"
                  className={styles.reportCancel}
                  onClick={() => {
                    setShowReport(false);
                    setReportReason("");
                  }}
                >
                  <T k="comments.cancel" />
                </button>
              </div>
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
              selectMode={selectMode}
              selected={selected}
              onToggleSelect={onToggleSelect}
              onDragStart={onDragStart}
              onDragEnter={onDragEnter}
              onDragEnd={onDragEnd}
              onRefresh={onRefresh}
              translationEnabled={translationEnabled}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(CommentItem);
