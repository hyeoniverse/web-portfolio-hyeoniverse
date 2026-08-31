"use client";

// ── 가벼운 리치 메모 (이벤트 내용) ──
// contentEditable 기반 — 기본 서식(굵게·기울임·제목·목록) + 이미지 첨부 + @ 이벤트 멘션.
// HTML 문자열로 저장. 멘션은 <a class="cal-event-mention" data-event-id> 인라인 칩.

import React, { useRef } from "react";
import { createPortal } from "react-dom";
import { Bold, Italic, Underline, Strikethrough, Heading3, List, ListOrdered, Image as ImageIcon, Loader2, CalendarDays, Bookmark } from "@/components/icons";
import { showToast } from "@/stores/toastStore";
import DatePickerPopover from "@/components/ui/DatePicker/DatePickerPopover";
import { formatDateValue } from "../dateUtils";
import styles from "./RichMemo.module.css";
import Pressable from "@/components/ui/Pressable";

type MentionItem = { id: string; title: string };
type MentionStage = "type" | "event" | "date";
const pad2 = (n: number) => String(n).padStart(2, "0");

export default function RichMemo({ value, onChange, placeholder, language = "ko", onImageUpload, mentionEvents }: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  language?: string;
  onImageUpload?: (file: File) => Promise<string>;
  /** @ 멘션 대상 이벤트 (같은 달력, self 제외) */
  mentionEvents?: MentionItem[];
}) {
  const t = (ko: string, en: string) => (language === "ko" ? ko : en);
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [empty, setEmpty] = React.useState(!value);

  // @ 멘션 메뉴 상태 — stage: type(날짜/이벤트 선택) → event(이벤트 검색) | date(날짜 선택)
  const [menu, setMenu] = React.useState<{ query: string; top: number; left: number; stage: MentionStage } | null>(null);
  const [menuIdx, setMenuIdx] = React.useState(0);

  // 최초 1회만 초기값 주입 (contentEditable 은 uncontrolled — value 변화로 커서 초기화 방지)
  const inited = useRef(false);
  React.useEffect(() => {
    if (ref.current && !inited.current) { ref.current.innerHTML = value || ""; inited.current = true; setEmpty(!ref.current.textContent?.trim() && !ref.current.querySelector("img, .cal-event-mention, .cal-date-mention")); }
  }, [value]);

  // 서식 활성 상태 — 버튼 on/off 표시 + 커서 위치 서식 반영 (선택 없이도 토글되는 typing state)
  const [active, setActive] = React.useState({ bold: false, italic: false, underline: false, strike: false, heading: false });
  const queryState = (c: string) => { try { return document.queryCommandState(c); } catch { return false; } };
  const refreshActive = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !el.contains(sel.anchorNode)) return; // 에디터 밖 선택이면 유지
    let block = "";
    try { block = (document.queryCommandValue("formatBlock") || "").toString().toLowerCase(); } catch { /* noop */ }
    setActive({
      bold: queryState("bold"),
      italic: queryState("italic"),
      underline: queryState("underline"),
      strike: queryState("strikeThrough"),
      heading: block === "h3",
    });
  }, []);

  // 커서/선택이 바뀔 때마다 활성 상태 갱신
  React.useEffect(() => {
    const handler = () => refreshActive();
    document.addEventListener("selectionchange", handler);
    return () => document.removeEventListener("selectionchange", handler);
  }, [refreshActive]);

  const emit = () => {
    const el = ref.current;
    if (!el) return;
    setEmpty(!el.textContent?.trim() && !el.querySelector("img, .cal-event-mention, .cal-date-mention"));
    onChange(el.innerHTML);
  };
  const cmd = (c: string, arg?: string) => { ref.current?.focus(); document.execCommand(c, false, arg); emit(); refreshActive(); };
  // 제목 토글 — 이미 h3 이면 일반 문단으로 되돌림
  const heading = () => {
    ref.current?.focus();
    let block = "";
    try { block = (document.queryCommandValue("formatBlock") || "").toString().toLowerCase(); } catch { /* noop */ }
    document.execCommand("formatBlock", false, block === "h3" ? "div" : "h3");
    emit();
    refreshActive();
  };

  // ── @ 멘션 컨텍스트 감지 (caret 앞 텍스트에서 @query) ──
  const mentionCtx = (): { node: Text; start: number; end: number; query: string } | null => {
    const sel = window.getSelection();
    if (!sel || !sel.isCollapsed || sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return null;
    if (!ref.current || !ref.current.contains(node)) return null;
    const text = node.textContent || "";
    const offset = range.startOffset;
    const before = text.slice(0, offset);
    const m = before.match(/@([^\s@]{0,40})$/);
    if (!m) return null;
    // @ 앞이 문자/숫자면 이메일 등으로 보고 무시 (공백/시작/괄호 뒤에서만)
    const atPos = offset - m[0].length;
    const prev = atPos > 0 ? before[atPos - 1] : "";
    if (prev && /[\w가-힣]/.test(prev)) return null;
    return { node: node as Text, start: atPos, end: offset, query: m[1] };
  };

  const filtered = React.useMemo(() => {
    if (!menu || !mentionEvents) return [] as MentionItem[];
    const q = menu.query.trim().toLowerCase();
    return mentionEvents.filter((e) => !q || (e.title || "").toLowerCase().includes(q)).slice(0, 6);
  }, [menu, mentionEvents]);

  const syncMenu = () => {
    const ctx = mentionCtx();
    if (!ctx) { setMenu(null); return; }
    const sel = window.getSelection();
    const r = sel?.getRangeAt(0).cloneRange();
    let top = 0, left = 0;
    if (r) {
      const rect = r.getBoundingClientRect();
      top = rect.bottom || rect.top; left = rect.left;
      if (!top && ref.current) { const er = ref.current.getBoundingClientRect(); top = er.top; left = er.left; }
    }
    setMenu((prev) => {
      // 항상 type(날짜/이벤트 선택)부터 — stage 는 chooser 버튼으로만 전환. 열려있으면 기존 stage 유지.
      const stage: MentionStage = prev ? prev.stage : "type";
      return { query: ctx.query, top, left, stage };
    });
    setMenuIdx(0);
  };

  const insertMention = (ev: MentionItem) => {
    const ctx = mentionCtx();
    if (!ctx) { setMenu(null); return; }
    const range = document.createRange();
    range.setStart(ctx.node, ctx.start);
    range.setEnd(ctx.node, ctx.end);
    range.deleteContents();
    const a = document.createElement("a");
    a.className = "cal-event-mention";
    a.setAttribute("data-event-id", ev.id);
    a.setAttribute("contenteditable", "false");
    a.textContent = `@${ev.title || t("제목 없음", "Untitled")}`;
    range.insertNode(a);
    const space = document.createTextNode(" ");
    a.after(space);
    const sel = window.getSelection();
    if (sel) { const nr = document.createRange(); nr.setStartAfter(space); nr.collapse(true); sel.removeAllRanges(); sel.addRange(nr); }
    setMenu(null);
    emit();
  };

  const insertDateMention = (y: string, mo: string, da: string) => {
    const ctx = mentionCtx();
    if (!ctx) { setMenu(null); return; }
    const dateStr = `${y}-${mo}-${da}`;
    const range = document.createRange();
    range.setStart(ctx.node, ctx.start);
    range.setEnd(ctx.node, ctx.end);
    range.deleteContents();
    const span = document.createElement("span");
    span.className = "cal-date-mention";
    span.setAttribute("data-date", dateStr);
    span.setAttribute("contenteditable", "false");
    span.textContent = `📅 ${formatDateValue(dateStr, null, language)}`;
    range.insertNode(span);
    const spaceNode = document.createTextNode(" ");
    span.after(spaceNode);
    const sel = window.getSelection();
    if (sel) { const nr = document.createRange(); nr.setStartAfter(spaceNode); nr.collapse(true); sel.removeAllRanges(); sel.addRange(nr); }
    setMenu(null);
    emit();
  };

  const onEditableInput = () => { emit(); syncMenu(); };
  const onEditableKeyDown = (e: React.KeyboardEvent) => {
    if (!menu) return;
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setMenu(null); return; }
    if (menu.stage !== "event" || filtered.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setMenuIdx((i) => (i + 1) % filtered.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setMenuIdx((i) => (i - 1 + filtered.length) % filtered.length); }
    else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insertMention(filtered[Math.min(menuIdx, filtered.length - 1)]); }
  };

  const onPickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !onImageUpload) return;
    setUploading(true);
    try {
      const url = await onImageUpload(file);
      ref.current?.focus();
      document.execCommand("insertHTML", false, `<img src="${url}" alt="" />`);
      emit();
    } catch {
      showToast(t("이미지 업로드에 실패했습니다", "Image upload failed"), "error");
    } finally { setUploading(false); }
  };

  return (
    <div className={styles.memo}>
      <div className={styles.toolbar} onMouseDown={(e) => e.preventDefault()}>
        <Pressable className={`${styles.tbBtn}${active.bold ? ` ${styles.tbBtnOn}` : ""}`} aria-pressed={active.bold} onClick={() => cmd("bold")} aria-label={t("굵게", "Bold")}><Bold size={14} /></Pressable>
        <Pressable className={`${styles.tbBtn}${active.italic ? ` ${styles.tbBtnOn}` : ""}`} aria-pressed={active.italic} onClick={() => cmd("italic")} aria-label={t("기울임", "Italic")}><Italic size={14} /></Pressable>
        <Pressable className={`${styles.tbBtn}${active.underline ? ` ${styles.tbBtnOn}` : ""}`} aria-pressed={active.underline} onClick={() => cmd("underline")} aria-label={t("밑줄", "Underline")}><Underline size={14} /></Pressable>
        <Pressable className={`${styles.tbBtn}${active.strike ? ` ${styles.tbBtnOn}` : ""}`} aria-pressed={active.strike} onClick={() => cmd("strikeThrough")} aria-label={t("취소선", "Strikethrough")}><Strikethrough size={14} /></Pressable>
        <Pressable className={`${styles.tbBtn}${active.heading ? ` ${styles.tbBtnOn}` : ""}`} aria-pressed={active.heading} onClick={heading} aria-label={t("제목", "Heading")}><Heading3 size={14} /></Pressable>
        <span className={styles.sep} />
        <Pressable className={styles.tbBtn} onClick={() => cmd("insertUnorderedList")} aria-label={t("글머리 목록", "Bullet list")}><List size={14} /></Pressable>
        <Pressable className={styles.tbBtn} onClick={() => cmd("insertOrderedList")} aria-label={t("번호 목록", "Numbered list")}><ListOrdered size={14} /></Pressable>
        {onImageUpload && <>
          <span className={styles.sep} />
          <Pressable className={styles.tbBtn} disabled={uploading} onClick={() => fileRef.current?.click()} aria-label={t("이미지", "Image")}>
            {uploading ? <Loader2 size={14} className={styles.spin} /> : <ImageIcon size={14} />}
          </Pressable>
        </>}
      </div>
      <div
        ref={ref}
        className={`${styles.editable}${empty ? ` ${styles.editableEmpty}` : ""}`}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={onEditableInput}
        onKeyDown={onEditableKeyDown}
        onBlur={() => { emit(); setTimeout(() => setMenu(null), 150); }}
      />
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickImage} />

      {menu && createPortal(
        <div className={styles.mentionMenu} style={{ position: "fixed", top: menu.top + 4, left: menu.left }} onMouseDown={(e) => e.preventDefault()}>
          {menu.stage === "type" ? (
            <>
              <Pressable className={styles.mentionItem} onClick={() => setMenu((m) => (m ? { ...m, stage: "date" } : m))}>
                <CalendarDays size={14} className={styles.mentionIcon} />{t("날짜(시간)", "Date (time)")}
              </Pressable>
              <Pressable className={styles.mentionItem} onClick={() => setMenu((m) => (m ? { ...m, stage: "event" } : m))}>
                <Bookmark size={14} className={styles.mentionIcon} />{t("이벤트", "Event")}
              </Pressable>
            </>
          ) : menu.stage === "date" ? (
            <div className={styles.mentionDate}>
              <DatePickerPopover
              portal
                inline
                year={String(new Date().getFullYear())}
                month={pad2(new Date().getMonth() + 1)}
                day={pad2(new Date().getDate())}
                format="date"
                onSelect={insertDateMention}
                onClose={() => setMenu(null)}
              />
            </div>
          ) : filtered.length > 0 ? (
            filtered.map((ev, i) => (
              <Pressable
                key={ev.id}
                className={`${styles.mentionItem}${i === menuIdx ? ` ${styles.mentionItemOn}` : ""}`}
                onMouseEnter={() => setMenuIdx(i)}
                onClick={() => insertMention(ev)}
              >
                @{ev.title || t("제목 없음", "Untitled")}
              </Pressable>
            ))
          ) : (
            <div className={styles.mentionEmpty}>{t("이벤트 없음", "No events")}</div>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}
