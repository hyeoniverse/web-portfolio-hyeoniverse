"use client";

// ── 공유 달력 불러오기 picker (연결형) ──
import React, { useEffect, useState } from "react";
import { CalendarPlus, CalendarDays, Settings, Check, Trash2, Loader2, RotateCcw, ChevronDown } from "lucide-react";
import { useModalStore } from "@/stores/modalStore";
import Button from "@/components/ui/Button";
import { type CalendarListItem, listCalendars, deleteCalendar, restoreCalendar } from "./calendarApi";
import { monthTitle, relTimeLabel } from "./model";
import { getTrashDaysLeft } from "@/utils/trash";
import styles from "./Calendar.module.css";

export default function CalendarPickerModal({
  modalId, currentId, language, onPick, onRestore, onCreateNew, onManage,
}: {
  modalId: string;
  currentId?: string;
  language: string;
  onPick: (id: string) => void;
  /** 휴지통에서 복구 → 복구 후 이 블록에 연결(같은 id 여도 재연결). */
  onRestore: (id: string) => void;
  onCreateNew: () => void;
  onManage: () => void;
}) {
  const t = (ko: string, en: string) => (language === "ko" ? ko : en);
  const ko = language === "ko";
  const closeModal = useModalStore((s) => s.closeModal);
  const [items, setItems] = useState<CalendarListItem[] | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // 휴지통 — 접힘 섹션. 복구는 명시적 버튼으로만(실수 복구 방지).
  const [trash, setTrash] = useState<CalendarListItem[] | null>(null);
  const [trashOpen, setTrashOpen] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listCalendars().then((list) => { if (!cancelled) setItems(list); });
    listCalendars(true).then((list) => { if (!cancelled) setTrash(list); });
    return () => { cancelled = true; };
  }, []);

  const close = () => closeModal(modalId);

  const doRestore = async (id: string) => {
    setRestoringId(id);
    const ok = await restoreCalendar(id);
    setRestoringId(null);
    if (ok) { onRestore(id); close(); } // 복구 후 이 블록에 자동 연결
  };

  const doDelete = async (id: string) => {
    setDeletingId(id);
    // 휴지통으로 이동(soft delete). 복구는 설정의 달력 관리에서. 참조 블록은 "연결 끊김"으로 표시됨.
    const ok = await deleteCalendar(id);
    setDeletingId(null);
    setConfirmId(null);
    if (ok) setItems((prev) => (prev ? prev.filter((x) => x.id !== id) : prev));
  };

  // "YYYY-MM" → 날짜 뱃지 (월 / 연도). 없으면 null.
  const badge = (month: string): { mon: string; year: string } | null => {
    const [y, m] = month.split("-").map(Number);
    if (!y || !m) return null;
    return { mon: ko ? `${m}월` : new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short" }), year: String(y) };
  };

  return (
    <div className={styles.pickerModal}>
      <div className={styles.pickerActions}>
        <button type="button" className={styles.pickerNew} onClick={() => { onCreateNew(); close(); }}>
          <CalendarPlus size={15} />{t("새 달력 만들기", "New calendar")}
        </button>
        <button type="button" className={styles.pickerManage} onClick={() => { onManage(); close(); }}>
          <Settings size={14} />{t("달력 관리", "Manage")}
        </button>
      </div>

      <div className={styles.pickerList}>
        {items === null && <div className={styles.pickerEmpty}>{t("불러오는 중…", "Loading…")}</div>}
        {items?.length === 0 && <div className={styles.pickerEmpty}>{t("저장된 달력이 없습니다", "No saved calendars")}</div>}
        {items?.map((it) => {
          const on = currentId === it.id;
          const confirming = confirmId === it.id;
          const b = badge(it.month);
          const title = it.title || (it.month ? monthTitle(it.month, language) : t("제목 없음", "Untitled"));
          const rel = relTimeLabel(it.updatedAt, language);
          const meta = [t(`이벤트 ${it.eventCount}개`, `${it.eventCount} events`), rel].filter(Boolean).join("  ·  ");
          return (
            <div
              key={it.id}
              role="button"
              tabIndex={confirming ? -1 : 0}
              aria-current={on ? "true" : undefined}
              className={`${styles.pickerItem}${on ? ` ${styles.pickerItemOn}` : ""}${confirming ? ` ${styles.pickerItemConfirming}` : ""}`}
              onClick={() => { if (confirming) return; onPick(it.id); close(); }}
              onKeyDown={(e) => { if (!confirming && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onPick(it.id); close(); } }}
            >
              <span className={styles.pickerItemDate} aria-hidden>
                {b ? <><span className={styles.pickerItemMon}>{b.mon}</span><span className={styles.pickerItemYear}>{b.year}</span></> : <CalendarDays size={16} />}
              </span>
              <span className={styles.pickerItemMain}>
                <span className={styles.pickerItemTitle}>{title}</span>
                <span className={styles.pickerItemMeta}>{meta}</span>
              </span>

              {confirming ? (
                <span className={styles.pickerConfirm}>
                  <span className={styles.pickerConfirmText}>{t("삭제할까요?", "Delete?")}</span>
                  <button
                    type="button"
                    className={styles.pickerConfirmYes}
                    disabled={deletingId === it.id}
                    onClick={(e) => { e.stopPropagation(); doDelete(it.id); }}
                  >
                    {deletingId === it.id ? <Loader2 size={13} className={styles.pickerSpin} /> : t("삭제", "Delete")}
                  </button>
                  <button type="button" className={styles.pickerConfirmNo} onClick={(e) => { e.stopPropagation(); setConfirmId(null); }}>
                    {t("취소", "Cancel")}
                  </button>
                </span>
              ) : (
                <span className={styles.pickerItemEnd}>
                  {on && <Check size={15} className={styles.pickerItemCheck} />}
                  <button
                    type="button"
                    className={styles.pickerItemDel}
                    aria-label={t("삭제", "Delete")}
                    title={t("삭제", "Delete")}
                    onClick={(e) => { e.stopPropagation(); setConfirmId(it.id); }}
                  >
                    <Trash2 size={14} />
                  </button>
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* 휴지통 — 접힘. 복구는 명시적 버튼(클릭=연결 아님). 남은 일수 표시. */}
      {trash && trash.length > 0 && (
        <div className={styles.pickerTrash}>
          <button
            type="button"
            className={styles.pickerTrashHead}
            aria-expanded={trashOpen}
            onClick={() => setTrashOpen((o) => !o)}
          >
            <Trash2 size={13} />
            <span>{t("휴지통", "Trash")}</span>
            <span className={styles.pickerTrashCount}>{trash.length}</span>
            <ChevronDown size={14} className={`${styles.pickerTrashChev}${trashOpen ? ` ${styles.pickerTrashChevOpen}` : ""}`} />
          </button>
          {trashOpen && (
            <div className={styles.pickerTrashBody}>
              {trash.map((it) => {
                const b = badge(it.month);
                const title = it.title || (it.month ? monthTitle(it.month, language) : t("제목 없음", "Untitled"));
                const days = it.deletedAt ? getTrashDaysLeft(it.deletedAt, it.purgeAfter) : null;
                return (
                  <div key={it.id} className={styles.pickerTrashItem}>
                    <span className={styles.pickerItemDate} aria-hidden>
                      {b ? <><span className={styles.pickerItemMon}>{b.mon}</span><span className={styles.pickerItemYear}>{b.year}</span></> : <CalendarDays size={16} />}
                    </span>
                    <span className={styles.pickerItemMain}>
                      <span className={styles.pickerItemTitle}>{title}</span>
                      <span className={styles.pickerItemMeta}>
                        {t(`이벤트 ${it.eventCount}개`, `${it.eventCount} events`)}
                        {days != null && <>{"  ·  "}<span className={days <= 3 ? styles.pickerTrashSoon : undefined}>{t(`${days}일 후 영구삭제`, `${days}d left`)}</span></>}
                      </span>
                    </span>
                    <Button
                      variant="ghost"
                      size="xs"
                      soundDisabled
                      icon={restoringId === it.id ? <Loader2 size={13} className={styles.pickerSpin} /> : <RotateCcw size={13} />}
                      disabled={restoringId === it.id}
                      onClick={() => doRestore(it.id)}
                    >
                      {t("복구", "Restore")}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
