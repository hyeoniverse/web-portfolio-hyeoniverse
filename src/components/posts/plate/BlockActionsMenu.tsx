"use client";

// ── 블록 공통 액션 메뉴 (복제 / 이동 / 내용 제거 / 삭제) ──
// 여러 블록의 floating bar "⋯" popover 에서 공용으로 쓴다. 필요한 액션만 넘기면 그 항목만 렌더.
import { CopyPlus, ArrowUp, ArrowDown, Eraser, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import styles from "../RichTextEditor.module.css";

export interface BlockActions {
  onDuplicate?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  /** 블록은 유지하고 내용만 비움 */
  onClear?: () => void;
  onDelete?: () => void;
}

export default function BlockActionsMenu({
  close, language, actions,
}: {
  close: () => void;
  language: string;
  actions: BlockActions;
}) {
  const ko = language === "ko";
  const L = (k: string, e: string) => (ko ? k : e);
  const item = (on: (() => void) | undefined, icon: ReactNode, label: string, danger = false) =>
    on ? (
      <button
        type="button"
        className={danger ? `${styles.codeMenuItem} ${styles.codeMenuDanger}` : styles.codeMenuItem}
        onClick={() => { on(); close(); }}
      >
        {icon} {label}
      </button>
    ) : null;

  const hasMove = actions.onDuplicate || actions.onMoveUp || actions.onMoveDown;
  const hasDestructive = actions.onClear || actions.onDelete;

  return (
    <div className={styles.codeMenu}>
      {item(actions.onDuplicate, <CopyPlus size={14} />, L("복제", "Duplicate"))}
      {item(actions.onMoveUp, <ArrowUp size={14} />, L("위로 이동", "Move up"))}
      {item(actions.onMoveDown, <ArrowDown size={14} />, L("아래로 이동", "Move down"))}
      {hasMove && hasDestructive && <div className={styles.codeMenuDivider} />}
      {item(actions.onClear, <Eraser size={14} />, L("내용 제거", "Clear content"))}
      {item(actions.onDelete, <Trash2 size={14} />, L("삭제", "Delete"), true)}
    </div>
  );
}
