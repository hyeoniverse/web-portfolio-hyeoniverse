"use client";

/**
 * 읽기 사전 편집기 — 설정(서비스 탭) 화면과 갤러리 음성 편집의 창이 같이 쓴다(lib/ttsLexicon).
 *
 * - 맨 위 한 줄에서 "표기 → 읽을 말"을 바로 추가한다(Enter).
 * - 목록은 글자로만 보이고, 줄을 누르면 그 자리에서 고친다(Enter 확인 · Esc 취소).
 * - 추가·수정·삭제는 곧바로 저장한다(/api/works/tts/lexicon). 저장이 실패하면 바꾸기 전으로 돌린다.
 * - 여러 줄 붙여넣기는 자리를 덜 차지하게 접어 둔다.
 */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ArrowRight, Check, ClipboardPaste, Pencil, Plus, Trash2, X } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import Pressable from "@/components/ui/Pressable";
import SearchCapsule from "@/components/ui/SearchCapsule/SearchCapsule";
import { SkeletonLine } from "@/components/ui/Skeleton";
import { showToast } from "@/stores/toastStore";
import { sendAction, tryRequest } from "@/lib/sendAction";
import { fillTemplate } from "@/utils/format";
import {
  LEXICON_FROM_MAX,
  LEXICON_MAX_ENTRIES,
  LEXICON_TO_MAX,
  mergeLexicon,
  parseLexiconLines,
  sanitizeLexicon,
  type LexiconEntry,
} from "@/lib/ttsLexicon";
import styles from "./LexiconEditor.module.css";

export default function LexiconEditor({ compact = false, footer }: {
  /** 창 안에서 쓸 때 — 목록 높이를 줄이고 검색을 빼지 않는다 */
  compact?: boolean;
  /** 맨 아래 한 줄(창의 "설정에서 관리" 바로가기 등) */
  footer?: ReactNode;
}) {
  const { t } = useLanguage();
  const tl = (key: string) => t(`admin.settings.lexicon.${key}`);
  const [entries, setEntries] = useState<LexiconEntry[] | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<{ index: number; from: string; to: string } | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [busy, setBusy] = useState(false);
  const fromRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    void tryRequest("/api/works/tts/lexicon", { method: "GET" }).then(async (res) => {
      const data = res instanceof Response ? await res.json().catch(() => ({})) : {};
      if (alive) setEntries(sanitizeLexicon(data?.entries));
    });
    return () => { alive = false; };
  }, []);

  /** 바로 저장한다 — 화면은 먼저 바꾸고, 실패하면 앞의 목록으로 돌린다 */
  const commit = async (next: LexiconEntry[], done?: string) => {
    const prev = entries;
    const clean = sanitizeLexicon(next);
    setEntries(clean);
    setBusy(true);
    const res = await sendAction("/api/works/tts/lexicon", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries: clean }),
    }, t, tl("saveFailed"));
    setBusy(false);
    if (!res) { setEntries(prev); return false; }
    if (done) showToast(done, "success");
    return true;
  };

  const list = entries ?? [];
  const exists = list.some((e) => e.from === from.trim());
  const canAdd = !!from.trim() && !!to.trim() && list.length < LEXICON_MAX_ENTRIES && !busy;
  const add = async () => {
    if (!canAdd) return;
    const ok = await commit(mergeLexicon(list, [{ from: from.trim(), to: to.trim() }]));
    if (!ok) return;
    setFrom("");
    setTo("");
    fromRef.current?.focus();
  };
  const onAddKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); void add(); }
  };

  const saveEdit = async () => {
    if (!editing) return;
    const next = list.map((e, i) => (i === editing.index ? { from: editing.from.trim(), to: editing.to.trim() } : e));
    if (await commit(next)) setEditing(null);
  };
  const onEditKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter") { e.preventDefault(); void saveEdit(); }
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setEditing(null); }
  };

  const pasted = useMemo(() => parseLexiconLines(pasteText), [pasteText]);
  const applyPaste = async () => {
    if (await commit(mergeLexicon(list, pasted), fillTemplate(tl("pasteApplied"), { n: pasted.length }))) {
      setPasteText("");
      setPasteOpen(false);
    }
  };

  const q = search.trim().toLowerCase();
  const shown = list
    .map((e, index) => ({ ...e, index }))
    .filter((e) => !q || e.from.toLowerCase().includes(q) || e.to.toLowerCase().includes(q));

  return (
    <div className={styles.editor} data-compact={compact ? "" : undefined}>
      {/* 빠른 추가 — 테두리 하나로 묶은 입력 막대(검색창과 같은 높이). 표기 · 읽을 말 · 추가 */}
      <div className={styles.addBar}>
        <Input inputRef={fromRef} value={from} onChange={(v) => setFrom(v.slice(0, LEXICON_FROM_MAX))} onKeyDown={onAddKey} placeholder={tl("fromPlaceholder")} aria-label={tl("from")} clearable={false} className={`${styles.barField} ${styles.fromField}`} />
        <ArrowRight size={14} strokeWidth={2} className={styles.arrow} aria-hidden />
        <Input value={to} onChange={(v) => setTo(v.slice(0, LEXICON_TO_MAX))} onKeyDown={onAddKey} placeholder={tl("toPlaceholder")} aria-label={tl("to")} clearable={false} className={styles.barField} />
        <Button variant="primary" size="xs" shape="capsule" className={styles.addButton} onClick={() => void add()} disabled={!canAdd} soundDisabled icon={<Plus size={12} strokeWidth={2.2} />}>
          {tl(exists ? "update" : "add")}
        </Button>
      </div>

      {/* 목록 머리 — 개수 · 검색 · 여러 줄 붙여넣기 */}
      <div className={styles.listBar}>
        <span className={styles.count}>{entries ? fillTemplate(tl("count"), { n: list.length }) : ""}</span>
        <div className={styles.search}>
          <SearchCapsule search={search} onSearchChange={setSearch} placeholder={tl("search")} align="left" />
        </div>
        <Button variant={pasteOpen ? "primary" : "ghost"} size="sm" shape="capsule" onClick={() => setPasteOpen((v) => !v)} disabled={!entries} soundDisabled icon={<ClipboardPaste size={14} strokeWidth={2} />}>
          {tl("paste")}
        </Button>
      </div>

      {pasteOpen && (
        <div className={styles.pastePanel}>
          <p className={styles.note}>{tl("pasteHint")}</p>
          <Textarea size="sm" value={pasteText} onChange={setPasteText} placeholder={tl("pastePlaceholder")} aria-label={tl("paste")} textareaClassName={styles.pasteTextarea} />
          <div className={styles.pasteFoot}>
            <span className={styles.count}>{fillTemplate(tl("pasteCount"), { n: pasted.length })}</span>
            <Button variant="primary" size="sm" shape="capsule" onClick={() => void applyPaste()} disabled={pasted.length === 0 || busy} soundDisabled>
              {tl("pasteApply")}
            </Button>
          </div>
        </div>
      )}

      {/* 목록 */}
      {entries === null ? (
        /* 불러오는 동안 — 실제 줄과 같은 모양(표기 칩 → 읽을 말) */
        <div className={styles.list} aria-hidden>
          {[88, 64, 110, 72].map((w, i) => (
            <div key={i} className={styles.skeletonRow}>
              <SkeletonLine width={`${w}px`} height="22px" className={styles.skeletonChip} />
              <SkeletonLine width="14px" height="10px" />
              <SkeletonLine width={`${w + 40}px`} />
            </div>
          ))}
        </div>
      ) : list.length === 0 ? (
        <p className={styles.empty}>{tl("empty")}</p>
      ) : shown.length === 0 ? (
        <p className={styles.empty}>{tl("noMatch")}</p>
      ) : (
        <ul className={styles.list}>
          {shown.map((e) => (
            <li key={e.from} className={styles.row} data-editing={editing?.index === e.index ? "" : undefined}>
              {editing?.index === e.index ? (
                <>
                  <Input size="sm" value={editing.from} onChange={(v) => setEditing({ ...editing, from: v.slice(0, LEXICON_FROM_MAX) })} onKeyDown={onEditKey} aria-label={tl("from")} clearable={false} className={styles.fromField} autoFocus />
                  <ArrowRight size={14} strokeWidth={2} className={styles.arrow} aria-hidden />
                  <Input size="sm" value={editing.to} onChange={(v) => setEditing({ ...editing, to: v.slice(0, LEXICON_TO_MAX) })} onKeyDown={onEditKey} aria-label={tl("to")} clearable={false} className={styles.toField} />
                  <span className={styles.rowActions} data-show="">
                    <Button variant="ghost" size="sm" shape="circle" onClick={() => void saveEdit()} disabled={!editing.from.trim() || !editing.to.trim() || busy} aria-label={tl("confirm")} title={tl("confirm")} soundDisabled icon={<Check size={14} strokeWidth={2} />} />
                    <Button variant="ghost" size="sm" shape="circle" onClick={() => setEditing(null)} aria-label={tl("cancel")} title={tl("cancel")} soundDisabled icon={<X size={14} strokeWidth={2} />} />
                  </span>
                </>
              ) : (
                <>
                  <Pressable className={styles.rowMain} onClick={() => setEditing({ index: e.index, from: e.from, to: e.to })} aria-label={`${tl("edit")}: ${e.from}`}>
                    <code className={styles.fromText}>{e.from}</code>
                    <ArrowRight size={14} strokeWidth={2} className={styles.arrow} aria-hidden />
                    <span className={styles.toText}>{e.to}</span>
                  </Pressable>
                  <span className={styles.rowActions}>
                    <Button variant="ghost" size="sm" shape="circle" onClick={() => setEditing({ index: e.index, from: e.from, to: e.to })} aria-label={tl("edit")} title={tl("edit")} soundDisabled icon={<Pencil size={14} strokeWidth={2} />} />
                    <Button variant="ghost" size="sm" shape="circle" onClick={() => void commit(list.filter((_, i) => i !== e.index))} disabled={busy} aria-label={tl("remove")} title={tl("remove")} soundDisabled icon={<Trash2 size={14} strokeWidth={2} />} />
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {footer && <div className={styles.footer}>{footer}</div>}
    </div>
  );
}
