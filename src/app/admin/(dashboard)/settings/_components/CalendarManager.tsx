"use client";

// ── 공유 달력 관리 (settings > 달력 관리 탭) ──
// 게시물/프로젝트 블록이 calendarId 로 참조하는 공유 달력 목록. 이름 변경 · 삭제.
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { CalendarDays, Pencil, Trash2, Check, X, RotateCcw, ChevronDown } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import { useModalStore } from "@/stores/modalStore";
import { ModalConfirm } from "@/components/ui/ModalTemplates";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import SearchCapsule from "@/components/ui/SearchCapsule/SearchCapsule";
import { SkeletonLine } from "@/components/ui/Skeleton";
import { type CalendarListItem, listCalendars, renameCalendar, deleteCalendar, restoreCalendar, purgeCalendar } from "@/components/posts/plate/calendar/calendarApi";
import { showToast } from "@/stores/toastStore";
import { monthTitle, relTimeLabel } from "@/components/posts/plate/calendar/model";
import { getTrashDaysLeft } from "@/utils/trash";
import settings from "../Settings.module.css";
import styles from "./CalendarManager.module.css";
import EmptyState from "@/components/ui/EmptyState";
import Pressable from "@/components/ui/Pressable";

// 무거운 캘린더 뷰 스택 — 클릭 시 모달 미리보기에서만 필요하므로 지연 로드.
// (settings 초기 번들에서 제외 → Turbopack chunk 안정화 + 초기 로드 경량화)
const ReaderCalendar = dynamic(() => import("@/components/posts/plate/ReaderCalendar"), {
  ssr: false,
  loading: () => <SkeletonLine />,
});

export default function CalendarManager() {
  const { language } = useLanguage();
  const ko = language === "ko";
  const t = (k: string, e: string) => (ko ? k : e);
  const openModal = useModalStore((s) => s.openModal);
  const searchParams = useSearchParams();
  const targetId = searchParams.get("calendar");

  const [items, setItems] = useState<CalendarListItem[] | null>(null);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [trash, setTrash] = useState<CalendarListItem[] | null>(null);
  const [trashOpen, setTrashOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const didScrollRef = useRef(false);

  const reloadActive = () => listCalendars().then(setItems);
  const reloadTrash = () => listCalendars(true).then(setTrash);

  useEffect(() => {
    let cancelled = false;
    listCalendars().then((list) => { if (!cancelled) setItems(list); });
    return () => { cancelled = true; };
  }, []);

  // deep-link ?calendar=ID → 하이라이트 + 스크롤 (picker '달력 관리' 버튼에서 진입)
  useEffect(() => {
    if (!targetId || !items || didScrollRef.current) return;
    if (!items.some((x) => x.id === targetId)) return;
    didScrollRef.current = true;
    const raf = requestAnimationFrame(() => {
      setFocusId(targetId);
      rowRefs.current.get(targetId)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    const tid = setTimeout(() => setFocusId(null), 2000);
    return () => { cancelAnimationFrame(raf); clearTimeout(tid); };
  }, [targetId, items]);

  const filtered = useMemo(() => {
    if (!items) return null;
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) =>
      (it.title || "").toLowerCase().includes(q) || monthTitle(it.month, language).toLowerCase().includes(q));
  }, [items, search, language]);

  const badge = (month: string): { mon: string; year: string } | null => {
    const [y, m] = month.split("-").map(Number);
    if (!y || !m) return null;
    return { mon: ko ? `${m}월` : new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short" }), year: String(y) };
  };

  const startEdit = (it: CalendarListItem) => { setEditingId(it.id); setDraftTitle(it.title || ""); };
  const cancelEdit = () => { setEditingId(null); setDraftTitle(""); };
  const saveEdit = async (id: string) => {
    const title = draftTitle.trim();
    setSavingId(id);
    const ok = await renameCalendar(id, title);
    setSavingId(null);
    /* 달력 API 는 성공 여부만 돌려주고 라우트도 사유 코드를 싣지 않아 동작별 문구로 알린다(#868) */
    if (!ok) { showToast(t("달력 이름을 바꾸지 못했습니다.", "Couldn’t rename the calendar."), "error"); return; }
    setItems((prev) => (prev ? prev.map((x) => (x.id === id ? { ...x, title } : x)) : prev));
    cancelEdit();
  };

  const calLabel = (it: CalendarListItem) => it.title || (it.month ? monthTitle(it.month, language) : t("제목 없음", "Untitled"));

  // 삭제 = 휴지통으로 이동 (soft delete, 30일 후 자동 영구삭제)
  const confirmDelete = (it: CalendarListItem) => {
    openModal(
      <ModalConfirm
        desc={t(
          `"${calLabel(it)}" 달력을 휴지통으로 옮길까요? 이 달력을 불러온 블록은 "연결 끊김"으로 표시되고, 30일 안에 복구하면 자동으로 다시 연결됩니다.`,
          `Move "${calLabel(it)}" to trash? Blocks that loaded it will show "disconnected"; restore within 30 days to reconnect automatically.`,
        )}
        confirmText={t("휴지통으로", "Move to trash")}
        danger
        onConfirm={async () => {
          const ok = await deleteCalendar(it.id);
          if (!ok) { showToast(t("달력을 휴지통으로 옮기지 못했습니다.", "Couldn’t move the calendar to trash."), "error"); return; }
          setItems((prev) => (prev ? prev.filter((x) => x.id !== it.id) : prev));
          if (trashOpen) reloadTrash();
        }}
      />,
      { id: "cal-mgr-delete", header: { title: t("달력 삭제", "Delete calendar") }, closeButton: true, width: "min(460px, 92vw)" },
    );
  };

  // 휴지통 토글 — 처음 열 때 로드
  const toggleTrash = () => { if (!trashOpen && trash === null) reloadTrash(); setTrashOpen((v) => !v); };

  const handleRestore = async (id: string) => {
    setBusyId(id);
    const ok = await restoreCalendar(id);
    setBusyId(null);
    if (!ok) { showToast(t("달력을 복구하지 못했습니다.", "Couldn’t restore the calendar."), "error"); return; }
    setTrash((prev) => (prev ? prev.filter((x) => x.id !== id) : prev));
    reloadActive();
  };

  const confirmPurge = (it: CalendarListItem) => {
    openModal(
      <ModalConfirm
        desc={t(
          `"${calLabel(it)}" 달력을 영구 삭제할까요? 되돌릴 수 없고, 이 달력을 불러온 블록은 영구히 "삭제됨" 상태가 됩니다.`,
          `Permanently delete "${calLabel(it)}"? This cannot be undone; blocks that loaded it stay "deleted".`,
        )}
        confirmText={t("영구 삭제", "Delete forever")}
        danger
        onConfirm={async () => {
          const ok = await purgeCalendar(it.id);
          if (!ok) { showToast(t("달력을 영구 삭제하지 못했습니다.", "Couldn’t delete the calendar permanently."), "error"); return; }
          setTrash((prev) => (prev ? prev.filter((x) => x.id !== it.id) : prev));
        }}
      />,
      { id: "cal-mgr-purge", header: { title: t("영구 삭제", "Delete forever") }, closeButton: true, width: "min(460px, 92vw)" },
    );
  };

  // 달력 클릭 → 내용 미리보기 (읽기전용 ReaderCalendar)
  const openPreview = (it: CalendarListItem) => {
    const label = it.title || (it.month ? monthTitle(it.month, language) : t("제목 없음", "Untitled"));
    openModal(
      <div className={styles.previewWrap}>
        <ReaderCalendar calendarId={it.id} language={language} />
      </div>,
      { id: "cal-mgr-preview", header: { title: label, icon: <CalendarDays size={16} /> }, closeButton: true, width: "min(980px, 96vw)" },
    );
  };

  return (
    <section className={settings.section}>
      <div className={styles.wrap}>
        <div className={styles.headRow}>
          <h2 className={settings.sectionTitle}>{t("달력 관리", "Calendars")}</h2>
          {items && <span className={styles.headCount}>{items.length}</span>}
          <div className={styles.headSearch}>
            <SearchCapsule search={search} onSearchChange={setSearch} placeholder={t("제목·월 검색", "Search title or month")} align="left" />
          </div>
        </div>
        <p className={settings.sectionHint}>
          {t(
            "게시물·프로젝트 블록이 공유하는 달력입니다. 여기서 이름을 바꾸거나 삭제하면 이 달력을 불러온 모든 게시물에 반영됩니다.",
            "Calendars shared across post/project blocks. Renaming or deleting here affects every post that loaded it.",
          )}
        </p>

        {filtered === null ? (
          <div className={styles.list}>
            {[0, 1, 2].map((i) => (
              <div key={i} className={styles.row}><SkeletonLine width="55%" height={14} /></div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState pad="sm">{search ? t("검색 결과가 없습니다", "No results") : t("저장된 달력이 없습니다", "No calendars yet")}</EmptyState>
        ) : (
          <div className={styles.list}>
            {filtered.map((it) => {
              const b = badge(it.month);
              const isEditing = editingId === it.id;
              const titleText = it.title || (it.month ? monthTitle(it.month, language) : t("제목 없음", "Untitled"));
              const rel = relTimeLabel(it.updatedAt, language);
              const meta = [
                t(`이벤트 ${it.eventCount}개`, `${it.eventCount} events`),
                rel && t(`${rel} 수정`, `updated ${rel}`),
              ].filter(Boolean).join("  ·  ");
              return (
                <div
                  key={it.id}
                  ref={(el) => { if (el) rowRefs.current.set(it.id, el); else rowRefs.current.delete(it.id); }}
                  className={`${styles.row}${focusId === it.id ? ` ${styles.rowFocus}` : ""}`}
                >
                  <span className={styles.rowDate} aria-hidden>
                    {b ? <><span className={styles.rowMon}>{b.mon}</span><span className={styles.rowYear}>{b.year}</span></> : <CalendarDays size={18} />}
                  </span>
                  {isEditing ? (
                    <div className={styles.renameForm}>
                      <Input
                        value={draftTitle}
                        onChange={setDraftTitle}
                        size="sm"
                        autoFocus
                        className={styles.renameInput}
                        placeholder={t("달력 이름", "Calendar name")}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); saveEdit(it.id); }
                          else if (e.key === "Escape") { e.preventDefault(); cancelEdit(); }
                        }}
                      />
                      <Button variant="ghost" shape="circle" size="xs" loading={savingId === it.id} icon={<Check size={15} />} onClick={() => saveEdit(it.id)} aria-label={t("저장", "Save")} soundDisabled />
                      <Button variant="ghost" shape="circle" size="xs" icon={<X size={15} />} onClick={cancelEdit} aria-label={t("취소", "Cancel")} soundDisabled />
                    </div>
                  ) : (
                    <>
                      <div
                        className={styles.rowMain}
                        role="button"
                        tabIndex={0}
                        title={t("클릭해서 내용 보기", "Click to preview")}
                        onClick={() => openPreview(it)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openPreview(it); } }}
                      >
                        <span className={`${styles.rowTitle}${it.title ? "" : ` ${styles.rowTitleMuted}`}`}>{titleText}</span>
                        <span className={styles.rowMeta}>{meta}</span>
                      </div>
                      <div className={styles.rowActions}>
                        <Button variant="ghost" shape="circle" size="xs" icon={<Pencil size={14} />} onClick={() => startEdit(it)} aria-label={t("이름 변경", "Rename")} soundDisabled />
                        <Button variant="ghost" shape="circle" size="xs" tone="danger" icon={<Trash2 size={14} />} onClick={() => confirmDelete(it)} aria-label={t("삭제", "Delete")} soundDisabled />
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── 휴지통 (soft delete · 30일 후 자동 영구삭제) ── */}
        <div className={styles.trashSection}>
          <Pressable className={styles.trashHead} onClick={toggleTrash} aria-expanded={trashOpen}>
            <Trash2 size={14} />
            <span className={styles.trashTitle}>{t("휴지통", "Trash")}</span>
            {trash && trash.length > 0 && <span className={styles.trashCount}>{trash.length}</span>}
            <span className={styles.trashHint}>{t("30일 후 자동 삭제", "auto-deleted after 30 days")}</span>
            <ChevronDown size={15} className={`${styles.trashChev}${trashOpen ? ` ${styles.trashChevOpen}` : ""}`} />
          </Pressable>
          {trashOpen && (
            <div className={styles.trashBody}>
              {trash === null ? (
                <div className={styles.row}><SkeletonLine width="45%" height={12} /></div>
              ) : trash.length === 0 ? (
                <EmptyState pad="sm">{t("휴지통이 비었습니다", "Trash is empty")}</EmptyState>
              ) : (
                trash.map((it) => {
                  const b = badge(it.month);
                  const daysLeft = getTrashDaysLeft(it.deletedAt ?? "", it.purgeAfter);
                  return (
                    <div key={it.id} className={styles.row}>
                      <span className={styles.rowDate} aria-hidden>
                        {b ? <><span className={styles.rowMon}>{b.mon}</span><span className={styles.rowYear}>{b.year}</span></> : <CalendarDays size={18} />}
                      </span>
                      <div className={styles.rowMain}>
                        <span className={styles.rowTitle}>{calLabel(it)}</span>
                        <span className={`${styles.rowMeta}${daysLeft <= 7 ? ` ${styles.trashSoon}` : ""}`}>
                          {t(`${daysLeft}일 후 자동 삭제`, `deleted in ${daysLeft}d`)}
                        </span>
                      </div>
                      <div className={styles.rowActions}>
                        <Button variant="ghost" shape="capsule" size="xs" icon={<RotateCcw size={13} />} loading={busyId === it.id} onClick={() => handleRestore(it.id)} soundDisabled>{t("복구", "Restore")}</Button>
                        <Button variant="ghost" shape="circle" size="xs" tone="danger" icon={<Trash2 size={14} />} onClick={() => confirmPurge(it)} aria-label={t("영구 삭제", "Delete forever")} soundDisabled />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
