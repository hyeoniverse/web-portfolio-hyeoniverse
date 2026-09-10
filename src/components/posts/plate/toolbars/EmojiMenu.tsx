"use client";

// ── Emoji Menu (:) ──
// 노션식 ":키워드" 인라인 이모지 검색. 커서 앞 텍스트에서 :word 패턴을 찾아 @emoji-mart/data
// 로 검색, floating 메뉴로 보여주고 선택 시 이모지(유니코드 문자)를 텍스트로 삽입한다.
// (텍스트 삽입이라 markdown round-trip 도 그대로 보존)

import * as React from "react";
import { useDepsChanged } from "@/hooks/useDepsChanged";
import { createPortal } from "react-dom";
import { useEditorRef, useEditorSelector, useEditorId, useEventEditorValue } from "platejs/react";
import { useVirtualFloating, offset, flip, shift } from "@platejs/floating";
import emojiData from "@emoji-mart/data";
import EmojiPicker from "@/components/ui/EmojiPicker";
import { _emojiPickerTrigger, _imageUploadFn } from "../utils";
import styles from "../../RichTextEditor.module.css";
import Pressable from "@/components/ui/Pressable";

/* eslint-disable @typescript-eslint/no-explicit-any */

type EmojiHit = { id: string; native: string; name: string };

const EMOJIS: Record<string, any> = (emojiData as any).emojis ?? {};
const ZERO_WIDTH = /[﻿​-‍]/g;
const MAX = 10;

function searchEmojis(query: string): EmojiHit[] {
  const q = query.toLowerCase();
  const starts: EmojiHit[] = [];
  const includes: EmojiHit[] = [];
  for (const id in EMOJIS) {
    const e = EMOJIS[id];
    const native = e?.skins?.[0]?.native;
    if (!native) continue;
    const name = (e.name as string) || id;
    const hay = [id, name.toLowerCase(), ...((e.keywords as string[]) || [])];
    if (id.startsWith(q) || name.toLowerCase().startsWith(q)) {
      starts.push({ id, native, name });
    } else if (hay.some((h) => h.includes(q))) {
      includes.push({ id, native, name });
    }
    if (starts.length >= MAX) break;
  }
  return [...starts, ...includes].slice(0, MAX);
}

function caretRect(): DOMRect {
  if (typeof window === "undefined") return new DOMRect();
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    const r = range.getBoundingClientRect();
    if (r && (r.width || r.height)) return r;
    const rects = range.getClientRects();
    if (rects.length) return rects[0] as DOMRect;
    const node = range.startContainer;
    const el = node.nodeType === 3 ? node.parentElement : (node as Element);
    if (el) return el.getBoundingClientRect();
  }
  return new DOMRect();
}

export default function EmojiMenu() {
  const editor = useEditorRef();
  const [activeIdx, setActiveIdx] = React.useState(0);

  // 커서 앞 텍스트의 마지막 ":word" 토큰 추출 (글자로 시작하는 1자 이상).
  // 커서가 있는 텍스트 leaf 에서 커서 앞부분만 직접 읽는다(api.string(range) 는 버전에 따라 불안정).
  const query = useEditorSelector((ed: any) => {
    try {
      if (!ed.api.isCollapsed() || !ed.selection) return null;
      const focus = ed.selection.focus;
      const leaf = ed.api.node(focus.path);
      const text = typeof leaf?.[0]?.text === "string" ? (leaf[0].text as string) : "";
      const before = text.slice(0, focus.offset).replace(ZERO_WIDTH, "");
      // :키워드(글자 시작) 또는 콜론만(:). 콜론만은 앞이 시작/공백일 때만 → "Note:"·"3:30" 오탐 방지.
      const m = /:([a-z][a-z0-9_+-]*)?$/i.exec(before);
      if (!m) return null;
      if (m[1]) return m[1]; // 키워드 있으면 항상
      const prev = before[before.length - 2]; // 콜론 바로 앞 글자
      return prev === undefined || /\s/.test(prev) ? "" : null;
    } catch {
      return null;
    }
  }, []);

  // ── 인라인 키워드 검색(:word) — 빠른 인라인 리스트 ──
  const keyword = query != null && query.length > 0 ? query : null;
  const [dismissed, setDismissed] = React.useState<string | null>(null);
  const items = React.useMemo(() => (keyword ? searchEmojis(keyword) : []), [keyword]);
  // 에디터 포커스가 이 에디터에 있을 때만 열림 — 바깥 클릭 시 blur → 자동 닫힘 (SlashMenu 와 동일 패턴)
  const focused = useEditorId() === useEventEditorValue("focus");
  const open = keyword != null && keyword !== dismissed && items.length > 0 && focused;

  const { refs, style, update } = useVirtualFloating({
    open,
    getBoundingClientRect: caretRect,
    strategy: "fixed",
    placement: "bottom-start",
    middleware: [offset(6), flip({ padding: 12 }), shift({ padding: 12 })],
  });

  React.useEffect(() => { if (open) update?.(); }, [open, keyword, update]);
  const keywordChanged = useDepsChanged([keyword]);
  if (keywordChanged) setActiveIdx(0);
  // 화살표로 active 항목이 스크롤 밖으로 나가면 자동으로 보이게 스크롤
  React.useEffect(() => {
    if (!open) return;
    document.querySelector<HTMLElement>(`[data-emoji-nav="${activeIdx}"]`)?.scrollIntoView({ block: "nearest" });
  }, [activeIdx, open]);

  const run = React.useCallback((hit: EmojiHit) => {
    if (keyword == null) return;
    // ":keyword" 삭제 후 이모지 삽입
    editor.tf.delete({ unit: "character", reverse: true, distance: keyword.length + 1 });
    editor.tf.insertText(hit.native);
    setTimeout(() => editor.tf.focus(), 0);
  }, [editor, keyword]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); e.stopPropagation(); setActiveIdx((i) => (i + 1) % items.length); }
      else if (e.key === "ArrowUp") { e.preventDefault(); e.stopPropagation(); setActiveIdx((i) => (i - 1 + items.length) % items.length); }
      else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); e.stopPropagation(); run(items[activeIdx] ?? items[0]); }
      else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setDismissed(keyword); }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, items, activeIdx, run, keyword]);

  // ── 콜론만(:) 또는 슬래시 "이모지" 명령 → 공통 EmojiPicker ──
  const [manualPicker, setManualPicker] = React.useState(false);
  const [pickerDismissed, setPickerDismissed] = React.useState(false);
  const colonOnly = query === "";
  // 열릴 때 caret 위치를 1회 캡처해 고정(피커가 포커스를 가져가도 위치 안정)
  const pickerAnchor = React.useRef<DOMRect | null>(null);
  React.useEffect(() => {
    // 슬래시 트리거 시점(caret 이 확실히 제자리)에서 앵커를 동기 캡처
    _emojiPickerTrigger.current = () => { pickerAnchor.current = caretRect(); setPickerDismissed(false); setManualPicker(true); };
    return () => { _emojiPickerTrigger.current = null; };
  }, []);
  // 콜론 벗어나면 dismiss 리셋
  const colonOnlyChanged = useDepsChanged([colonOnly]);
  if (colonOnlyChanged && !colonOnly) setPickerDismissed(false);
  const pickerOpen = (colonOnly && !pickerDismissed) || manualPicker;
  React.useEffect(() => {
    if (pickerOpen) { if (!pickerAnchor.current) pickerAnchor.current = caretRect(); } // 콜론만: caret(=":") 위치 캡처
    else pickerAnchor.current = null;
  }, [pickerOpen]);
  const insertPicked = React.useCallback((val: string) => {
    if (colonOnly && !manualPicker) editor.tf.delete({ unit: "character", reverse: true, distance: 1 }); // ":" 제거
    editor.tf.insertText(val);
    setManualPicker(false);
    setTimeout(() => editor.tf.focus(), 0);
  }, [editor, colonOnly, manualPicker]);
  const closePicker = React.useCallback(() => {
    setManualPicker(false);
    if (colonOnly) setPickerDismissed(true);
  }, [colonOnly]);

  const inlineMenu = open
    ? createPortal(
        // eslint-disable-next-line react-hooks/refs
        <div ref={refs.setFloating} className={styles.slashMenu} style={style} onMouseDown={(e) => e.preventDefault()}>
          {items.map((hit, i) => (
            <Pressable noTapScale
              key={hit.id}
              data-emoji-nav={i}
              className={`${styles.slashItem} ${i === activeIdx ? styles.slashItemActive : ""}`}
              onMouseEnter={() => setActiveIdx(i)}
              onClick={() => run(hit)}
            >
              <span className={styles.emojiNative}>{hit.native}</span>
              <span className={styles.emojiName}>{hit.name}</span>
            </Pressable>
          ))}
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      {inlineMenu}
      <EmojiPicker
        open={pickerOpen}
        onClose={closePicker}
        onSelect={insertPicked}
        getAnchorRect={() => pickerAnchor.current}
        onImageUpload={_imageUploadFn.current ?? undefined}
      />
    </>
  );
}
