"use client";

// ── 블록 공통 액션 메뉴 (복제 / 이동 / 내용 제거 / 삭제) ──
// 여러 블록의 floating bar "⋯" popover 에서 공용. 공통 MenuItem/MenuDivider 로 다른 popover 와 스타일 통일.
import { CopyPlus, ArrowUp, ArrowDown, Eraser, Trash2 } from "@/components/icons";
import { MenuItem, MenuDivider } from "@/components/ui/Popover";
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
  const run = (on?: () => void) => () => { on?.(); close(); };
  const hasMove = actions.onDuplicate || actions.onMoveUp || actions.onMoveDown;
  const hasDestructive = actions.onClear || actions.onDelete;

  return (
    <div onMouseDown={(e) => e.preventDefault()}>
      {actions.onDuplicate && <MenuItem icon={<CopyPlus size={15} strokeWidth={1.75} />} label={L("복제", "Duplicate")} onClick={run(actions.onDuplicate)} />}
      {actions.onMoveUp && <MenuItem icon={<ArrowUp size={15} strokeWidth={1.75} />} label={L("위로 이동", "Move up")} onClick={run(actions.onMoveUp)} />}
      {actions.onMoveDown && <MenuItem icon={<ArrowDown size={15} strokeWidth={1.75} />} label={L("아래로 이동", "Move down")} onClick={run(actions.onMoveDown)} />}
      {hasMove && hasDestructive && <MenuDivider />}
      {actions.onClear && <MenuItem icon={<Eraser size={15} strokeWidth={1.75} />} label={L("내용 제거", "Clear content")} onClick={run(actions.onClear)} />}
      {actions.onDelete && <MenuItem icon={<Trash2 size={15} strokeWidth={1.75} />} className={styles.blockToolsDanger} label={L("삭제", "Delete")} onClick={run(actions.onDelete)} />}
    </div>
  );
}
