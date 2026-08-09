"use client";

import { useState, useCallback, useMemo, useEffect, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, SmilePlus, Trash2 } from "@/components/icons";
import Popover from "@/components/ui/Popover";
import type { Comment } from "@/types/post";
import { getCommenterId, identityFromHash, FALLBACK_AVATAR_EMOJI } from "@/utils/commenterIdentity";
import { REACTION_EMOJIS } from "@/utils/commentReactions";
import { useLanguage } from "@/providers/LanguageProvider";
import T from "@/components/ui/T";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import RadioGroup from "@/components/ui/RadioGroup";
import Checkbox from "@/components/ui/Checkbox";
import { ModalConfirm } from "@/components/ui/ModalTemplates";
import { useModalStore } from "@/stores/modalStore";
import CommentEditor from "./CommentEditor";
import CommentForm from "./CommentForm";
import CommentMarkdown from "./CommentMarkdown";
import Collapsible from "@/components/ui/Collapsible";
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

/* 선택 모드에선 댓글 영역 아무 데나 클릭해도 선택되게 해뒀는데, 인터랙티브 요소 위에서는
   그 요소가 이미 자기 동작(체크박스 토글 / 버튼 클릭 / 입력 포커스)을 처리한다.
   → 여기서 드래그 선택까지 시작하면 동작이 두 번 일어나 상쇄되거나 오작동한다.

   주의점 둘:
   - 공통 Checkbox 는 native input 을 숨기고 <label> 로 감싸므로 target 이 <span> → tagName 검사로 못 잡는다.
   - 공통 Textarea 는 maxHint 가 있으면 <textarea> 가 아니라 <div contenteditable="plaintext-only"> 로
     렌더된다 → `[contenteditable="true"]` 로는 안 걸린다. 값 무관하게 속성 존재로 검사해야 한다.
   그 외에 resize 그립 오버레이 같은 내부 div 도 있어서, 요소 열거만으론 계속 샌다.
   → 폼처럼 통째로 제외해야 하는 영역은 data-no-drag-select 로 서브트리 단위로 막는다. */
/* 선택 모드에서 댓글 아무 데나 눌러도 체크되게 해놨는데, 이 안의 것들은 그 자체가 클릭 대상이라
   같이 토글되면 안 된다. img — 마크다운 이미지는 클릭하면 ImageViewer 가 열린다. */
/* 이 높이를 넘는 댓글은 접고 "더보기" 를 붙인다. 텍스트로 12줄 남짓.
   이미지 상한(420)보다 낮아서 이미지 한 장짜리 댓글도 접힌다 — 의도한 것이다.
   스레드가 길어지지 않는 쪽을 우선했고, 이미지는 어차피 클릭하면 뷰어로 전체를 본다. */
const COLLAPSE_HEIGHT = 320;

const INTERACTIVE_SELECTOR =
  'label, button, a, input, textarea, select, img, [role="button"], [contenteditable], [data-no-drag-select]';

/** 신고 사유 프리셋 — 선택 후 상세 입력 가능. "other" 는 직접 입력. */
const REPORT_REASONS: { value: string; labelKey: string }[] = [
  { value: "spam", labelKey: "comments.reportReasonSpam" },
  { value: "abuse", labelKey: "comments.reportReasonAbuse" },
  { value: "inappropriate", labelKey: "comments.reportReasonInappropriate" },
  { value: "privacy", labelKey: "comments.reportReasonPrivacy" },
  { value: "other", labelKey: "comments.reportReasonOther" },
];

interface CommentItemProps {
  comment: Comment;
  commentType: "post" | "work";
  targetId: string;
  reactionCounts?: Record<string, Record<string, number>>;
  myReactions?: Record<string, string[]>;
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
  reactionCounts,
  myReactions,
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
  const { openModal } = useModalStore();
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

  // 이모지 반응 — 부모 맵에서 seed, prop 변경 시 동기화
  const [reactions, setReactions] = useState<Record<string, number>>(reactionCounts?.[comment.id] ?? {});
  const [mine, setMine] = useState<string[]>(myReactions?.[comment.id] ?? []);
  const [reactionBusy, setReactionBusy] = useState(false);

  useEffect(() => {
    setReactions(reactionCounts?.[comment.id] ?? {});
    setMine(myReactions?.[comment.id] ?? []);
  }, [reactionCounts, myReactions, comment.id]);

  const handleReact = useCallback(async (emoji: string) => {
    if (reactionBusy) return;
    setReactionBusy(true);
    const had = mine.includes(emoji);
    const delta = had ? -1 : 1;
    // 낙관적 토글
    setMine((prev) => (had ? prev.filter((e) => e !== emoji) : [...prev, emoji]));
    setReactions((prev) => {
      const next = { ...prev };
      const n = (next[emoji] ?? 0) + delta;
      if (n <= 0) delete next[emoji]; else next[emoji] = n;
      return next;
    });
    try {
      const res = await fetch("/api/comment-reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment_type: commentType, comment_id: comment.id, emoji }),
      });
      if (res.ok) {
        const data = await res.json();
        setReactions(data.counts ?? {});
        setMine(data.mine ?? []);
      } else {
        // 실패 시 원상복구
        setMine((prev) => (had ? [...prev, emoji] : prev.filter((e) => e !== emoji)));
        setReactions((prev) => {
          const next = { ...prev };
          const n = (next[emoji] ?? 0) - delta;
          if (n <= 0) delete next[emoji]; else next[emoji] = n;
          return next;
        });
      }
    } catch {
      setMine((prev) => (had ? [...prev, emoji] : prev.filter((e) => e !== emoji)));
      setReactions((prev) => {
        const next = { ...prev };
        const n = (next[emoji] ?? 0) - delta;
        if (n <= 0) delete next[emoji]; else next[emoji] = n;
        return next;
      });
    } finally {
      setReactionBusy(false);
    }
  }, [reactionBusy, mine, commentType, comment.id]);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [editPassword, setEditPassword] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");

  // Report state
  const [showReport, setShowReport] = useState(false);
  const [reportPreset, setReportPreset] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [reporting, setReporting] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);

  const commenterId = useMemo(() => getCommenterId(), []);

  const commenterHash = comment.commenter_hash;
  const identity = useMemo(() => {
    if (commenterHash) {
      return identityFromHash(commenterHash);
    }
    return { emoji: FALLBACK_AVATAR_EMOJI, name: comment.nickname };
  }, [commenterHash, comment.nickname]);

  const dateStr = formatDateTime(comment.created_at);

  const isEdited = comment.updated_at && comment.updated_at !== comment.created_at;
  const editedDateStr = isEdited ? formatDateTime(comment.updated_at!) : null;

  const isKorean = hasKorean(comment.content);
  const targetLang = isKorean ? "en" : "ko";

  const hasReplies = !!comment.replies && comment.replies.length > 0;

  /* 완전 삭제 시 함께 사라지는 답글 수 — DB parent_id 가 ON DELETE CASCADE 라
     직계 답글뿐 아니라 그 아래 답글까지 연쇄로 지워지므로 하위 전체를 센다. */
  const replyCount = useMemo(() => {
    const count = (nodes: Comment[]): number =>
      nodes.reduce((n, c) => n + 1 + count(c.replies ?? []), 0);
    return count(comment.replies ?? []);
  }, [comment.replies]);

  /* 완전 삭제만 Modal — 삭제/신고의 inline 확인과 달리 되돌릴 수 없고
     다른 사람이 쓴 답글까지 CASCADE 로 사라진다. 목록 안 한 줄짜리 확인으로는
     경고를 안 읽고 지나칠 수 있어, 주의를 강제하는 Modal 로 무게를 맞춘다. */
  const openHardDeleteModal = useCallback(() => {
    const desc =
      replyCount > 0
        ? t("comments.hardDeleteWarnReplies")
            .replace("{n}", String(replyCount))
            .replace("{s}", replyCount === 1 ? "y" : "ies")
        : t("comments.hardDeleteWarn");

    openModal(
      <ModalConfirm
        desc={desc}
        danger
        confirmText={t("comments.confirmDelete")}
        onConfirm={async () => {
          const res = await fetch(
            `/api/${commentType === "work" ? "work-comments" : "comments"}/${comment.id}`,
            { method: "DELETE" },
          );
          if (res.ok) onRefresh();
        }}
      />,
      { header: { title: t("comments.hardDelete") }, width: "min(90vw, 420px)" },
    );
  }, [openModal, t, replyCount, commentType, comment.id, onRefresh]);

  const apiBase = commentType === "work" ? "/api/work-comments" : "/api/comments";

  // 삭제(tombstone) 댓글 복구 — 관리자만. 내용 보존형 삭제라 원문까지 되살아난다.
  const handleRestore = useCallback(async () => {
    const res = await fetch(`${apiBase}/${comment.id}/restore`, { method: "POST" });
    if (res.ok) onRefresh();
  }, [apiBase, comment.id, onRefresh]);

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
    if (reporting || !reportPreset) return;
    const detail = reportReason.trim();
    const presetLabel = t(REPORT_REASONS.find((x) => x.value === reportPreset)?.labelKey ?? "");
    // "기타" 는 직접 입력만 저장, 프리셋은 라벨(+상세)을 합성해 저장
    const reason = reportPreset === "other" ? detail : detail ? `${presetLabel} · ${detail}` : presetLabel;
    if (!reason) return;
    setReporting(true);
    try {
      const res = await fetch(`${apiBase}/${comment.id}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        setReportSubmitted(true);
        // 잠시 thank-you 메시지 보여주고 닫음
        setTimeout(() => {
          setShowReport(false);
          setReportReason("");
          setReportPreset("");
          setReportSubmitted(false);
        }, 1800);
      }
    } catch {
      // silent fail — 신고 실패해도 사용자에겐 굳이 알리지 않음
    } finally {
      setReporting(false);
    }
  }, [apiBase, comment.id, reportReason, reportPreset, reporting, t]);

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
        className={`${styles.comment} ${selectMode ? styles.commentSelectable : ""} ${selectMode && onToggleSelect && comment.deleted_by === "admin" ? styles.commentWithSelect : ""}`}
        onPointerDown={selectMode && onDragStart && comment.deleted_by === "admin" ? (e) => {
          if ((e.target as HTMLElement).closest(INTERACTIVE_SELECTOR)) return;
          e.preventDefault();
          e.stopPropagation();
          onDragStart(comment.id);
        } : undefined}
        onPointerEnter={selectMode && onDragEnter && comment.deleted_by === "admin" ? (e) => { e.stopPropagation(); onDragEnter(comment.id); } : undefined}
        onPointerUp={selectMode && onDragEnd ? (e) => { e.stopPropagation(); onDragEnd(); } : undefined}
      >
        {/* 선택 체크박스 — 일반 댓글과 동일하게 거터보다 앞선 열 */}
        {selectMode && onToggleSelect && comment.deleted_by === "admin" && (
          <div className={styles.selectCell}>
            <Checkbox
              shape="square"
              checked={selected?.has(comment.id) ?? false}
              onChange={() => onToggleSelect(comment.id)}
            />
          </div>
        )}

        {/* 거터 — 삭제된 댓글이라 아바타가 없다. 자리는 유지해야 아래 답글들의 거터/줄 위치가
            일반 댓글과 어긋나지 않으므로, 빈 칸 대신 휴지통 아이콘으로 삭제됨을 표시한다
            (빈 박스로 두면 아바타 로딩 실패처럼 보임) */}
        <div className={styles.gutter}>
          <span className={`${styles.avatar} ${styles.avatarDeleted}`} aria-hidden="true">
            <Trash2 size={14} />
          </span>
          {hasReplies && <span className={styles.threadLine} />}
        </div>

        <div className={styles.body}>
        {/* 문구(내용) 좌 / 완전 삭제(액션) 우 — 한 행.
            일반 댓글이 [본문 → 액션] 인 것처럼, tombstone 도 액션이 내용을 밀어내지 않게 한다. */}
        <div className={styles.deletedRow}>
          <p className={styles.deletedPlaceholder}>
            <T k={tombstoneKey} />
          </p>
          {isAdmin && !selectMode && (
            <span className={styles.deletedActions}>
              {/* 복구 — 내용 보존형 삭제라 원문까지 되살아난다. 모든 tombstone(관리자/작성자) 대상. */}
              <Button variant="ghost" size="sm" onClick={handleRestore}>
                <T k="comments.restore" />
              </Button>
              {/* 완전 삭제 — admin tombstone 만(되돌릴 수 없고 답글까지 CASCADE) */}
              {comment.deleted_by === "admin" && (
                <Button variant="ghost" size="sm" onClick={openHardDeleteModal}>
                  <T k="comments.hardDelete" />
                </Button>
              )}
            </span>
          )}
        </div>
        {hasReplies && (
          <div className={styles.replies}>
            {comment.replies!.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                commentType={commentType}
                targetId={targetId}
                reactionCounts={reactionCounts}
                myReactions={myReactions}
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
      className={`${styles.comment} ${isFirstComment ? styles.commentFlipIn : ""} ${selectMode ? styles.commentSelectable : ""} ${selectMode && onToggleSelect ? styles.commentWithSelect : ""}`}
      onPointerDown={selectMode && onDragStart ? (e) => {
        if ((e.target as HTMLElement).closest(INTERACTIVE_SELECTOR)) return;
        e.preventDefault();
        e.stopPropagation();
        onDragStart(comment.id);
      } : undefined}
      onPointerEnter={selectMode && onDragEnter ? (e) => { e.stopPropagation(); onDragEnter(comment.id); } : undefined}
      onPointerUp={selectMode && onDragEnd ? (e) => { e.stopPropagation(); onDragEnd(); } : undefined}
    >
      {/* 선택 체크박스 — 아바타 거터보다 앞선 별도 열. 헤더(=아바타) 높이에 맞춰 정렬 */}
      {selectMode && onToggleSelect && (
        <div className={styles.selectCell}>
          <Checkbox
            shape="square"
            checked={selected?.has(comment.id) ?? false}
            onChange={() => onToggleSelect(comment.id)}
          />
        </div>
      )}

      {/* 거터 — 아바타 + 그 아래로 흐르는 스레드 줄. 줄은 답글이 붙을 때만 (답글 목록 / 답글 폼) */}
      <div className={styles.gutter}>
        <span className={styles.avatar}>{identity.emoji}</span>
        {(hasReplies || showReply) && <span className={styles.threadLine} />}
      </div>

      <div className={styles.body}>
      <div className={styles.commentHeader}>
        {/* 아바타는 거터로, 체크박스는 그 앞 열로 빠졌고, 여기엔 텍스트 메타만 — baseline 정렬 */}
        <div className={styles.headerMeta}>
          {comment.is_admin ? (
            <span className={styles.adminBadge}>Admin</span>
          ) : (
            <span className={styles.nickname}>{identity.name}</span>
          )}
          <span className={styles.date}>{dateStr}</span>
          {isEdited && (
            <span className={styles.editedBadge}>
              (<T k="comments.edited" tooltip={editedDateStr ?? undefined} placement="top" />)
            </span>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {editing ? (
          <motion.div
            key="edit"
            className={styles.editArea}
            data-no-drag-select
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CommentEditor
              value={editContent}
              onChange={setEditContent}
            />
            <div className={styles.editActions}>
              {!isAdmin && (
                /* 폭 고정은 래퍼가 담당 — 공통 Input 엔 스타일 클래스를 붙이지 않는다 */
                <div className={styles.passwordField}>
                  <Input
                    size="sm"
                    type="password"
                    clearable={false}
                    value={editPassword}
                    onChange={setEditPassword}
                    placeholder={t("comments.password")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleEdit();
                    }}
                  />
                </div>
              )}
              <Button
                variant="primary"
                size="sm"
                onClick={handleEdit}
                disabled={editSubmitting}
              >
                {editSubmitting ? <T k="comments.editing" /> : <T k="comments.editSubmit" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditing(false);
                  setEditContent(comment.content);
                  setEditPassword("");
                  setEditError("");
                }}
              >
                <T k="comments.cancel" />
              </Button>
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
            <Collapsible
              maxHeight={COLLAPSE_HEIGHT}
              expandLabel={<T k="comments.expand" />}
              collapseLabel={<T k="comments.collapse" />}
            >
              <CommentMarkdown content={comment.content} />
            </Collapsible>

            <AnimatePresence>
              {translatedText && (
                <motion.div
                  className={styles.translatedContent}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <span className={styles.translatedLabel}>
                    <Globe size={15} />
                    <T k="comments.translatedResult" />
                  </span>
                  <Collapsible
                    maxHeight={COLLAPSE_HEIGHT}
                    expandLabel={<T k="comments.expand" />}
                    collapseLabel={<T k="comments.collapse" />}
                  >
                    <CommentMarkdown content={translatedText} />
                  </Collapsible>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={styles.commentBottom}>
        <div className={styles.reactionBar}>
          {/* 추가 버튼이 맨 앞(왼쪽) — 반응 칩은 이 버튼 오른쪽에 하나씩 붙는다 */}
          <Popover
            placement="bottom-start"
            responsive={false}
            maxHeight={false}
            contentClassName={styles.reactionPopover}
            trigger={
              <button
                type="button"
                className={styles.reactionAddBtn}
                aria-label={t("comments.addReaction")}
              >
                <SmilePlus size={14} />
              </button>
            }
          >
            {({ close }) => (
              <div className={styles.reactionPicker}>
                {REACTION_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className={`${styles.reactionPickerBtn} ${mine.includes(emoji) ? styles.reactionPickerBtnActive : ""}`}
                    onClick={() => { handleReact(emoji); close(); }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </Popover>
          {/* 칩들은 별도 그룹 — 추가 버튼과의 간격(.reactionBar gap)과 칩끼리 간격(.reactionChips gap)을 분리 */}
          <div className={styles.reactionChips}>
            {/* REACTION_EMOJIS 의 지정된 순서대로 삽입 (반응한 시각과 무관하게 항상 같은 자리) */}
            {REACTION_EMOJIS.filter((emoji) => (reactions[emoji] ?? 0) > 0).map((emoji) => (
              <button
                key={emoji}
                type="button"
                className={`${styles.reactionChip} ${mine.includes(emoji) ? styles.reactionChipActive : ""}`}
                onClick={() => handleReact(emoji)}
              >
                <span className={styles.reactionEmoji}>{emoji}</span>
                <span className={styles.reactionCount}>{reactions[emoji]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.commentActions}>
          {canTranslate && <Button
            variant="ghost"
            size="sm"
            icon={<Globe size={14} />}
            active={!!translatedText}
            loading={translating}
            onClick={handleTranslate}
            title={translatedText ? t("comments.original") : isKorean ? "Translate to English" : "한국어로 번역"}
          >
            {translatedText ? <T k="comments.original" /> : isKorean ? <T k="comments.translateToEN" /> : <T k="comments.translateToKO" />}
          </Button>}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowReply(!showReply);
              setShowDelete(false);
              setEditing(false);
            }}
          >
            <T k="comments.replyBtn" />
          </Button>
          {(!comment.is_admin || isAdmin) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditing(!editing);
                setShowReply(false);
                setShowDelete(false);
                setEditContent(comment.content);
                setEditPassword("");
              }}
            >
              <T k="comments.edit" />
            </Button>
          )}
          {(!comment.is_admin || isAdmin) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowDelete(!showDelete);
                setShowReply(false);
                setEditing(false);
                setShowReport(false);
              }}
            >
              <T k="comments.delete" />
            </Button>
          )}
          {/* 신고 — admin 본인 / admin 댓글 / 이미 삭제된 댓글 은 제외 */}
          {!isAdmin && !comment.is_admin && !comment.is_deleted && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowReport((v) => !v);
                setShowDelete(false);
                setShowReply(false);
                setEditing(false);
              }}
            >
              <T k="comments.report" />
            </Button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showDelete && (
          <motion.div
            className={styles.deleteModal}
            data-no-drag-select
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className={styles.deleteRow}>
              {!isAdmin && (
                /* 폭 고정은 래퍼가 담당 — 공통 Input 엔 스타일 클래스를 붙이지 않는다 */
                <div className={styles.passwordField}>
                  <Input
                    size="sm"
                    type="password"
                    clearable={false}
                    value={deletePassword}
                    onChange={setDeletePassword}
                    placeholder={t("comments.password")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleDelete();
                    }}
                  />
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowDelete(false);
                  setDeletePassword("");
                  setDeleteError("");
                }}
              >
                <T k="comments.cancel" />
              </Button>
              {/* loading 이 disabled 까지 처리 */}
              <Button
                variant="outline"
                tone="danger"
                size="sm"
                loading={deleting}
                onClick={handleDelete}
              >
                <T k="comments.confirmDelete" />
              </Button>
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
            data-no-drag-select
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
              <div className={styles.reportForm}>
                {/* 사유 선택(기본) — 프리셋 라디오. "기타" 는 직접 입력. */}
                <RadioGroup
                  direction="vertical"
                  value={reportPreset}
                  onChange={setReportPreset}
                  options={REPORT_REASONS.map((x) => ({ value: x.value, label: t(x.labelKey) }))}
                />
                {/* 프리셋 선택 시 상세 입력 — 프리셋이면 선택, "기타" 면 필수 사유 */}
                {reportPreset && (
                  <Input
                    size="sm"
                    type="text"
                    value={reportReason}
                    onChange={setReportReason}
                    placeholder={t(reportPreset === "other" ? "comments.reportOtherPlaceholder" : "comments.reportDetailPlaceholder")}
                    maxLength={500}
                    onKeyDown={(e) => {
                      // isComposing: 한글 조합 확정 Enter 가 제출로도 처리되는 것 방지
                      if (e.key === "Enter" && !e.nativeEvent.isComposing) handleReport();
                    }}
                  />
                )}
                <div className={styles.reportActions}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowReport(false);
                      setReportReason("");
                      setReportPreset("");
                    }}
                  >
                    <T k="comments.cancel" />
                  </Button>
                  {/* loading 이 disabled 처리 + 프리셋 미선택/기타 사유 미입력 시 비활성 */}
                  <Button
                    variant="outline"
                    tone="danger"
                    size="sm"
                    loading={reporting}
                    disabled={!reportPreset || (reportPreset === "other" && !reportReason.trim())}
                    onClick={handleReport}
                  >
                    <T k="comments.confirmReport" />
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showReply && (
          <motion.div
            className={styles.replyForm}
            data-no-drag-select
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

      {hasReplies && (
        <div className={styles.replies}>
          {comment.replies!.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              commentType={commentType}
              targetId={targetId}
              reactionCounts={reactionCounts}
              myReactions={myReactions}
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
    </div>
  );
}

export default memo(CommentItem);
