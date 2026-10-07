"use client";

/**
 * 읽기 사전 편집기 — 설정(서비스 탭) 화면과 갤러리 음성 편집의 창이 같이 쓴다(lib/ttsLexicon).
 *
 * - 맨 위 한 줄에서 "표기 → 읽을 말"을 바로 추가한다(Enter).
 * - 목록은 글자로만 보이고, 줄을 누르면 그 자리에서 고친다(Enter 확인 · Esc 취소).
 * - 추가·수정·삭제는 곧바로 저장한다(/api/works/tts/lexicon). 저장이 실패하면 바꾸기 전으로 돌린다.
 * - 여러 줄 붙여넣기는 자리를 덜 차지하게 접어 둔다.
 * - 목록은 한 쪽에 PAGE_SIZE 개씩 — 검색어 · 사전을 바꾸면 첫 쪽으로.
 * - 사전은 대본 언어(한국어·영어)마다 따로다. 위의 KO/EN 으로 고칠 사전을 바꾼다.
 */
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, ClipboardPaste, Pencil, Plus, Trash2, X } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import Tooltip from "@/components/ui/Tooltip";
import Pressable from "@/components/ui/Pressable";
import SearchCapsule from "@/components/ui/SearchCapsule/SearchCapsule";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Pagination from "@/components/ui/Pagination";
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
  type LexiconLang,
} from "@/lib/ttsLexicon";
import styles from "./LexiconEditor.module.css";

/** 한 쪽에 보일 항목 수 */
const PAGE_SIZE = 10;

export default function LexiconEditor({ compact = false, initialLang = "ko", footer, onCountChange }: {
  /** 창 안에서 쓸 때 — 목록 높이를 줄이고 검색을 빼지 않는다 */
  compact?: boolean;
  /** 처음 열 사전 — 갤러리 음성 편집은 편집 언어로 연다 */
  initialLang?: LexiconLang;
  /** 맨 아래 한 줄(창의 "설정에서 관리" 바로가기 등) */
  footer?: ReactNode;
  /** 사전 항목 수가 바뀌면(불러옴 · 추가 · 삭제) — 설정의 접힌 머리가 지금 개수를 보인다 */
  onCountChange?: (lang: LexiconLang, count: number) => void;
}) {
  const { t } = useLanguage();
  const tl = (key: string) => t(`admin.settings.lexicon.${key}`);
  const [lang, setLang] = useState<LexiconLang>(initialLang);
  const [entries, setEntries] = useState<LexiconEntry[] | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<{ index: number; from: string; to: string } | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const fromRef = useRef<HTMLInputElement>(null);
  /* 열 머리 글을 입력의 이름으로 잇는 id */
  const idBase = useId();
  /* 움직임 줄이기를 켠 사람에게는 붙여넣기 칸을 바로 열고 닫는다 */
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    let alive = true;
    void tryRequest(`/api/works/tts/lexicon?lang=${lang}`, { method: "GET" }).then(async (res) => {
      const data = res instanceof Response ? await res.json().catch(() => ({})) : {};
      if (alive) setEntries(sanitizeLexicon(data?.entries));
    });
    return () => { alive = false; };
  }, [lang]);

  /** 바로 저장한다 — 화면은 먼저 바꾸고, 실패하면 앞의 목록으로 돌린다 */
  const commit = async (next: LexiconEntry[], done?: string) => {
    const prev = entries;
    const clean = sanitizeLexicon(next);
    setEntries(clean);
    setBusy(true);
    const res = await sendAction("/api/works/tts/lexicon", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lang, entries: clean }),
    }, t, tl("saveFailed"));
    setBusy(false);
    if (!res) { setEntries(prev); return false; }
    if (done) showToast(done, "success");
    return true;
  };

  /* 개수 알림 — 불러오는 중(null)은 알리지 않는다 */
  useEffect(() => {
    if (entries) onCountChange?.(lang, entries.length);
  }, [entries, lang, onCountChange]);

  const list = entries ?? [];
  const exists = list.some((e) => e.from === from.trim());
  const canAdd = !!from.trim() && !!to.trim() && list.length < LEXICON_MAX_ENTRIES && !busy;
  const add = async () => {
    if (!canAdd) return;
    const next = mergeLexicon(list, [{ from: from.trim(), to: to.trim() }]);
    const ok = await commit(next);
    if (!ok) return;
    /* 추가 · 바꾼 항목이 보이게 — 검색을 풀고 그 항목이 있는 쪽으로 */
    const at = sanitizeLexicon(next).findIndex((e) => e.from === from.trim());
    setSearch("");
    setPage(at >= 0 ? Math.floor(at / PAGE_SIZE) + 1 : 1);
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
  const matched = list
    .map((e, index) => ({ ...e, index }))
    .filter((e) => !q || e.from.toLowerCase().includes(q) || e.to.toLowerCase().includes(q));
  /* 쪽 나누기 — 지우다 마지막 쪽이 비면 앞 쪽으로 당긴다 */
  const totalPages = Math.max(1, Math.ceil(matched.length / PAGE_SIZE));
  const curPage = Math.min(page, totalPages);
  const shown = matched.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE);

  const switchLang = (v: LexiconLang) => {
    if (busy || v === lang) return;
    /* 다른 사전을 불러오는 동안은 비워 둔다(불러오는 모양) — 앞 사전의 목록을 고치지 않게 */
    setEntries(null);
    setEditing(null);
    setLang(v);
    setPage(1);
  };

  return (
    <div className={styles.editor} data-compact={compact ? "" : undefined}>
      {/* 도구 줄 — 고칠 사전(KO/EN, 대본 언어마다 따로) · 검색. 여러 줄 붙여넣기는 추가 칸 바로 위(칸 이름 줄 끝) */}
      <div className={styles.toolbar}>
        <SegmentedControl<LexiconLang>
          items={[{ value: "ko", label: tl("langKo") }, { value: "en", label: tl("langEn") }]}
          value={lang}
          onChange={switchLang}
          className={styles.langSwitch}
        />
        <div className={styles.search}>
          <SearchCapsule search={search} onSearchChange={(v) => { setSearch(v); setPage(1); }} placeholder={tl("search")} align="left" className={styles.searchCapsule} />
        </div>
      </div>

      {/* 표 하나 — 열 머리(칸 이름) · 추가 줄 · 항목 줄 · 꼬리(개수 · 쪽 이동) */}
      <div className={styles.table}>
        <div className={styles.head}>
          <span id={`${idBase}-from`}>{tl("from")}</span>
          <span />
          <span id={`${idBase}-to`}>{tl("to")}</span>
          {/* 여러 줄 붙여넣기 — 한 줄씩 넣는 추가 칸 바로 위. 라벨과 같은 작은 글자 단추 */}
          <Pressable className={styles.pasteToggle} onClick={() => setPasteOpen((v) => !v)} disabled={!entries} aria-expanded={pasteOpen} data-open={pasteOpen ? "" : undefined} soundDisabled>
            <ClipboardPaste size={12} strokeWidth={2} aria-hidden />
            {tl("paste")}
          </Pressable>
        </div>

        {/* 여러 줄 붙여넣기 — 단추 바로 아래, 추가 칸 위에서 열린다 */}
        <AnimatePresence initial={false}>
          {pasteOpen && (
            <motion.div
              key="paste"
              className={styles.pasteCollapse}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className={styles.pastePanel}>
              <Textarea size="sm" value={pasteText} onChange={setPasteText} placeholder={tl("pastePlaceholder")} aria-label={tl("paste")} textareaClassName={styles.pasteTextarea} autoFocus />
              {/* 안내는 작은 글자로 아래에 · 알아본 개수 · 취소 / 목록에 넣기 */}
              <div className={styles.pasteFoot}>
                <p className={styles.note}>
                  {tl("pasteHint")}
                  {" "}
                  <span className={styles.pasteCount}>{fillTemplate(tl("pasteCount"), { n: pasted.length })}</span>
                </p>
                <div className={styles.pasteActions}>
                  <Button variant="ghost" shape="capsule" onClick={() => { setPasteOpen(false); setPasteText(""); }} soundDisabled>
                    {tl("cancel")}
                  </Button>
                  <Button variant="primary" shape="capsule" onClick={() => void applyPaste()} disabled={pasted.length === 0 || busy} soundDisabled>
                    {tl("pasteApply")}
                  </Button>
                </div>
              </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 빠른 추가 — 표기 → 읽을 말 · 추가(Enter). 테두리 없이 옅은 바탕의 칸(초점이 오면 테두리). 칸 이름은 위 열 머리 */}
        <div className={styles.addRow}>
          <Input inputRef={fromRef} value={from} onChange={(v) => setFrom(v.slice(0, LEXICON_FROM_MAX))} onKeyDown={onAddKey} placeholder={tl("fromPlaceholder")} aria-labelledby={`${idBase}-from`} clearable={false} className={`${styles.addField} ${styles.fromField}`} />
          <span className={styles.addArrow} aria-hidden><ArrowRight size={14} strokeWidth={2} className={styles.arrow} /></span>
          <Input value={to} onChange={(v) => setTo(v.slice(0, LEXICON_TO_MAX))} onKeyDown={onAddKey} placeholder={tl(lang === "en" ? "toPlaceholderEn" : "toPlaceholder")} aria-labelledby={`${idBase}-to`} clearable={false} className={styles.addField} />
          <Button variant="primary" shape="capsule" className={styles.addBtn} onClick={() => void add()} disabled={!canAdd} soundDisabled icon={<Plus size={14} strokeWidth={2} />}>
            {tl(exists ? "update" : "add")}
          </Button>
        </div>

        {entries === null ? (
          /* 불러오는 동안 — 실제 줄과 같은 모양 */
          <div className={styles.list} aria-hidden>
            {[88, 64, 110, 72].map((w, i) => (
              <div key={i} className={styles.skeletonRow}>
                <SkeletonLine width={`${w}px`} height="20px" className={styles.skeletonChip} />
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
                    <Input value={editing.from} onChange={(v) => setEditing({ ...editing, from: v.slice(0, LEXICON_FROM_MAX) })} onKeyDown={onEditKey} aria-label={tl("from")} clearable={false} className={styles.fromField} autoFocus />
                    <ArrowRight size={14} strokeWidth={2} className={styles.arrow} aria-hidden />
                    <Input value={editing.to} onChange={(v) => setEditing({ ...editing, to: v.slice(0, LEXICON_TO_MAX) })} onKeyDown={onEditKey} aria-label={tl("to")} clearable={false} />
                    <span className={styles.rowActions} data-show="">
                      <Tooltip content={tl("confirm")}><Button variant="ghost" shape="circle" onClick={() => void saveEdit()} disabled={!editing.from.trim() || !editing.to.trim() || busy} aria-label={tl("confirm")} soundDisabled icon={<Check size={14} strokeWidth={2} />} /></Tooltip>
                      <Tooltip content={tl("cancel")}><Button variant="ghost" shape="circle" onClick={() => setEditing(null)} aria-label={tl("cancel")} soundDisabled icon={<X size={14} strokeWidth={2} />} /></Tooltip>
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
                      <Tooltip content={tl("edit")}><Button variant="ghost" shape="circle" onClick={() => setEditing({ index: e.index, from: e.from, to: e.to })} aria-label={tl("edit")} soundDisabled icon={<Pencil size={14} strokeWidth={2} />} /></Tooltip>
                      <Tooltip content={tl("remove")}><Button variant="ghost" shape="circle" onClick={() => void commit(list.filter((_, i) => i !== e.index))} disabled={busy} aria-label={tl("remove")} soundDisabled icon={<Trash2 size={14} strokeWidth={2} />} /></Tooltip>
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* 꼬리 — 개수(왼쪽) · 쪽 이동(가운데, 한 쪽을 넘을 때만) */}
        <div className={styles.foot}>
          <span className={styles.count}>{entries ? fillTemplate(tl("count"), { n: q ? matched.length : list.length }) : ""}</span>
          {totalPages > 1 && (
            <Pagination page={curPage} totalPages={totalPages} onChange={(n) => { setPage(n); setEditing(null); }} showJump={false} className={styles.pager} />
          )}
        </div>
      </div>

      {footer && <div className={styles.footer}>{footer}</div>}
    </div>
  );
}
