"use client";

import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MoreHorizontal, ArrowUpDown, Download, ChevronRight, ArrowUpToLine, ArrowDownToLine } from "lucide-react";
import Popover, { MenuItem, MenuItemTrailing, MenuDivider } from "@/components/ui/Popover";
import styles from "./RowActionsMenu.module.css";

interface RowActionsMenuLabels {
  menuTitle?: string;
  move?: string;
  moveCurrent?: string;
  moveToTop?: string;
  moveToBottom?: string;
  apply?: string;
  export?: string;
}

interface RowActionsMenuProps {
  /** 위치 이동 콜백 — undefined 면 Move 액션 숨김 */
  onMove?: (newOrder: number) => void | Promise<void>;
  currentOrder?: number;
  totalCount?: number;
  /** export 콜백 — undefined 면 Export 액션 숨김 */
  onExport?: () => void | Promise<void>;
  labels?: RowActionsMenuLabels;
}

/** Move 입력 UI body — 현재/전체 + 맨앞/맨뒤 + 위치 입력. */
function MovePanelBody({
  currentOrder,
  totalCount,
  labels,
  pos,
  setPos,
  apply,
}: {
  currentOrder: number;
  totalCount: number;
  labels: RowActionsMenuLabels;
  pos: string;
  setPos: (s: string) => void;
  apply: (n: number) => void;
}) {
  return (
    <div className={styles.moveBody}>
      <div className={styles.meta}>
        {labels.moveCurrent ?? "현재 위치"}: <strong>{currentOrder}</strong>{" / "}{totalCount}
      </div>
      <div className={styles.quickRow}>
        <button type="button" className={styles.quickBtn} onClick={() => apply(1)}>
          <ArrowUpToLine size={12} />
          {labels.moveToTop ?? "맨 앞"}
        </button>
        <button type="button" className={styles.quickBtn} onClick={() => apply(totalCount || 1)}>
          <ArrowDownToLine size={12} />
          {labels.moveToBottom ?? "맨 뒤"}
        </button>
      </div>
      <div className={styles.posRow}>
        <input
          type="number"
          min={1}
          max={totalCount || 1}
          value={pos}
          onChange={(e) => setPos(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const n = parseInt(pos, 10);
              if (!Number.isNaN(n)) apply(n);
            }
          }}
          className={styles.posInput}
          autoFocus
        />
        <button
          type="button"
          className={styles.applyBtn}
          onClick={() => {
            const n = parseInt(pos, 10);
            if (!Number.isNaN(n)) apply(n);
          }}
        >
          {labels.apply ?? "적용"}
        </button>
      </div>
    </div>
  );
}

/** 단일 아이콘 버튼 (kebab 없이) — Popover 의 trigger 또는 standalone 으로 재사용 */
function IconTriggerButton({
  icon,
  title,
  active,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className={`${styles.trigger} ${active ? styles.triggerOpen : ""}`}
      title={title}
      aria-label={title}
      onClick={onClick}
    >
      {icon}
    </button>
  );
}

export default function RowActionsMenu({
  onMove,
  currentOrder = 0,
  totalCount = 0,
  onExport,
  labels = {},
}: RowActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [pos, setPos] = useState(String(currentOrder));

  const hasMove = !!onMove && totalCount > 0;
  const hasExport = !!onExport;
  const count = (hasMove ? 1 : 0) + (hasExport ? 1 : 0);
  if (count === 0) return null;

  const apply = async (target: number) => {
    if (!onMove) return;
    const clamped = Math.max(1, Math.min(target, totalCount || 1));
    setOpen(false);
    if (clamped === currentOrder) return;
    await onMove(clamped);
  };

  // ── 액션 1개 + Export 만: kebab/popover 없이 바로 노출 ──
  if (count === 1 && hasExport) {
    return (
      <IconTriggerButton
        icon={<Download size={14} />}
        title={labels.export ?? ".md 내보내기"}
        onClick={() => onExport?.()}
      />
    );
  }

  // ── 액션 1개 + Move 만: trigger = Move 아이콘, popover 내용 = Move 입력 UI 직행 ──
  if (count === 1 && hasMove) {
    return (
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) setPos(String(currentOrder));
        }}
        placement="bottom-end"
        contentClassName={styles.body}
        sheetTitle={labels.move ?? "이동"}
        trigger={
          <IconTriggerButton
            icon={<ArrowUpDown size={14} />}
            title={labels.move ?? "이동"}
            active={open}
          />
        }
      >
        {() => (
          <MovePanelBody
            currentOrder={currentOrder}
            totalCount={totalCount}
            labels={labels}
            pos={pos}
            setPos={setPos}
            apply={apply}
          />
        )}
      </Popover>
    );
  }

  // ── 액션 2개 이상: kebab + menu (Move 항목 inline 펼침) ──
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setMoveOpen(false);
          setPos(String(currentOrder));
        }
      }}
      placement="bottom-end"
      contentClassName={styles.body}
      sheetTitle={labels.menuTitle ?? "동작"}
      trigger={
        <IconTriggerButton
          icon={<MoreHorizontal size={16} />}
          title={labels.menuTitle ?? "동작"}
          active={open}
        />
      }
    >
      {({ close }) => (
        <>
          {hasMove && (
            <MenuItem
              icon={<ArrowUpDown size={14} />}
              label={labels.move ?? "이동"}
              active={moveOpen}
              ariaExpanded={moveOpen}
              onClick={() => setMoveOpen((v) => !v)}
              trailing={<MenuItemTrailing open={moveOpen}><ChevronRight size={14} /></MenuItemTrailing>}
            />
          )}
          <AnimatePresence initial={false}>
            {hasMove && moveOpen && (
              <motion.div
                key="move-panel"
                className={styles.movePanel}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{
                  height: { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
                  opacity: { duration: 0.2, ease: "easeOut" },
                }}
              >
                <motion.div
                  initial={{ y: -6 }}
                  animate={{ y: 0 }}
                  exit={{ y: -6 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                >
                  <MovePanelBody
                    currentOrder={currentOrder}
                    totalCount={totalCount}
                    labels={labels}
                    pos={pos}
                    setPos={setPos}
                    apply={apply}
                  />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          {hasMove && hasExport && <MenuDivider />}
          {hasExport && (
            <MenuItem
              icon={<Download size={14} />}
              label={labels.export ?? ".md 내보내기"}
              onClick={() => { onExport?.(); close(); }}
            />
          )}
        </>
      )}
    </Popover>
  );
}
