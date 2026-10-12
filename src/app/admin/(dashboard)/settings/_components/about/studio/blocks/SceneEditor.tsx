"use client";

import { Fragment, useMemo, useState, type ReactNode } from "react";
import se from "./SceneEditor.module.css";
import { listRule } from "@/app/about/_data/texts";
import { ArrowDown, ArrowUp, ChevronDown, Copy, Plus, RotateCcw, Trash2 } from "@/components/icons";
import Button from "@/components/ui/Button";
import Pressable from "@/components/ui/Pressable";
import { deepEqual } from "@/lib/settingsDelta";
import { useLanguage } from "@/providers/LanguageProvider";
import { useL } from "../primitives";

/* ═══════════ 장 편집 — 장면(카드)마다 실제 모양 그대로 고친다 ═══════════
   장면 값은 코드 기본값(_data/*)과 같은 모양이고, 고친 장면만 about.texts[장][장면] 에 장면째 남는다.
   - 글: ko/en 이 있는 글은 한 줄에 한국어 · 영어 나란히. 숫자 · 단위처럼 언어가 없는 칸은 한 칸
   - 목록: 항목마다 위 · 아래로 옮기기 · 복제 · 삭제, 끝에 추가. 그림과 번호로 묶인 목록은 막는다(listRule)
   - 이미지 경로 · key · href 같은 글이 아닌 칸은 보이지 않고, 새 항목은 이웃 항목의 것을 물려받는다 */

type Lang = "ko" | "en";
type Obj = Record<string, unknown>;

/* 칸 이름 — 기본값 데이터의 키를 사람이 읽는 말로. 모르는 키는 그대로 */
const FIELD_NAMES: Record<string, [string, string]> = {
  eyebrow: ["머리말", "Eyebrow"], title: ["제목", "Title"], label: ["이름", "Label"], body: ["본문", "Body"],
  note: ["덧붙임", "Note"], lead: ["소개 문장", "Lead"], before: ["앞", "Before"], accent: ["강조", "Accent"],
  after: ["뒤", "After"], value: ["값", "Value"], unit: ["단위", "Unit"], points: ["요점", "Points"],
  q: ["질문", "Question"], a: ["답", "Answer"], primary: ["주 단추", "Primary button"], secondary: ["보조 단추", "Secondary button"],
  desc: ["설명", "Description"], description: ["설명", "Description"], caption: ["캡션", "Caption"], hint: ["안내", "Hint"],
  name: ["이름", "Name"], wordmark: ["워드마크", "Wordmark"], here: ["도시를 모를 때", "Unknown city"],
  latest: ["최근 글", "Latest"], posts: ["글", "Posts"], works: ["작업물", "Works"], summary: ["요약", "Summary"],
  steps: ["단계", "Steps"], items: ["항목", "Items"], reset: ["다시 단추", "Reset button"], order: ["순서", "Order"],
  why: ["이유", "Why"], tags: ["태그", "Tags"], cta: ["단추", "Button"], role: ["역할", "Role"], shots: ["화면", "Screens"],
  cards: ["카드", "Cards"], layouts: ["레이아웃", "Layouts"], acts: ["동작", "Actions"], options: ["선택지", "Options"],
  groups: ["묶음", "Groups"], weather: ["날씨 이름", "Weather names"], features: ["기능", "Features"], providers: ["공급자", "Providers"],
};
const SCENE_NAMES: Record<string, [string, string]> = {
  hero: ["첫 화면 문장", "Opening line"], toc: ["목차", "Contents"], live: ["살아 있는 정보", "Live info"],
  facts: ["한눈에 보기", "At a glance"], heroCta: ["첫 화면 단추", "Opening buttons"], trust: ["신뢰", "Trust"],
  faq: ["자주 묻는 질문", "FAQ"], finalCta: ["마지막 단추", "Final call to action"], credits: ["크레딧", "Credits"],
  adminItems: ["관리자 기능 목록", "Admin features"], stackKey: ["그래프 범례", "Graph legend"],
  erdGroups: ["테이블 묶음", "Table groups"], erdOtherGroup: ["나머지 묶음 이름", "Other group name"],
  journeyLayers: ["요청 정거장", "Request stations"], keyNotes: ["설계 메모", "Design notes"],
  groupJourneys: ["API 묶음별 요청 길", "Request journeys by API group"], decisionExtras: ["설계 결정 덧붙임", "Decision extras"],
  securityLayers: ["보안 고리", "Security rings"], designSteps: ["디자인 단계", "Design steps"],
  contrastRows: ["대비 표", "Contrast table"], guardRows: ["검사 표", "Guard table"], codeSources: ["코드 출처", "Code sources"],
  processLayers: ["만든 과정 층", "Process layers"],
};
const CHAPTER_HEAD: [string, string] = ["장 머리", "Chapter heading"];
const PLAIN_KEYS = new Set(["value", "unit", "wordmark"]);

const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);
/** { ko, en } 글 */
const isL10n = (v: unknown): v is Record<Lang, string> => isObj(v) && typeof v.ko === "string" && typeof v.en === "string";
/** { ko: {...}, en: {...} } — 언어마다 같은 모양의 묶음(첫 화면 소개 문장) */
const isL10nGroup = (v: unknown): v is Record<Lang, Obj> => isObj(v) && isObj(v.ko) && isObj(v.en) && Object.keys(v).length === 2;

/** 이 값 아래에 고칠 글이 있는가 — 없으면(이미지 · 좌표만) 그리지 않는다 */
function hasText(v: unknown, key = ""): boolean {
  if (typeof v === "string") return PLAIN_KEYS.has(key);
  if (isL10n(v) || isL10nGroup(v)) return true;
  if (Array.isArray(v)) return v.some((x) => hasText(x, key));
  if (isObj(v)) return Object.entries(v).some(([k, c]) => hasText(c, k));
  return false;
}

/** 글 칸 수 — 장면 머리의 "n칸" */
function countText(v: unknown, key = ""): number {
  if (typeof v === "string") return PLAIN_KEYS.has(key) ? 1 : 0;
  if (isL10n(v)) return 1;
  if (isL10nGroup(v)) return Object.keys(v.ko).length;
  if (Array.isArray(v)) return v.reduce((n: number, x) => n + countText(x, key), 0);
  if (isObj(v)) return Object.entries(v).reduce((n, [k, c]) => n + countText(c, k), 0);
  return 0;
}

/** 찾기 — 값 아래 어디든 글이 들어 있으면 */
function textMatches(v: unknown, q: string): boolean {
  if (!q) return true;
  if (typeof v === "string") return v.toLowerCase().includes(q);
  if (Array.isArray(v)) return v.some((x) => textMatches(x, q));
  if (isObj(v)) return Object.values(v).some((x) => textMatches(x, q));
  return false;
}

function pick(v: unknown, ui: Lang): string | null {
  if (typeof v === "string") return v;
  if (isL10n(v)) return v[ui] || v.ko;
  return null;
}
function titleOf(v: unknown, ui: Lang): string | null {
  if (isL10n(v)) return pick(v, ui);
  if (!isObj(v)) return null;
  for (const k of ["title", "label", "q", "name", "eyebrow"]) {
    const s = pick(v[k], ui);
    if (s) return s;
  }
  return null;
}

/** 새 항목 — 이웃 항목의 모양을 물려받고 글은 비운다. key · id 는 겹치지 않게 */
function blankLike(tpl: unknown, siblings: unknown[]): unknown {
  const blank = (v: unknown, key: string): unknown => {
    if (typeof v === "string") return key === "key" || key === "id" ? v : (PLAIN_KEYS.has(key) || /^(ko|en)$/.test(key) ? "" : v);
    if (Array.isArray(v)) return v.slice(0, 1).map((x) => blank(x, key));
    if (isObj(v)) return Object.fromEntries(Object.entries(v).map(([k, c]) => [k, blank(c, k)]));
    return v;
  };
  return uniqueKey(blank(tpl, ""), siblings);
}
function uniqueKey(item: unknown, siblings: unknown[]): unknown {
  if (!isObj(item)) return item;
  for (const k of ["key", "id"] as const) {
    const v = item[k];
    if (typeof v !== "string") continue;
    const taken = new Set(siblings.map((s) => (isObj(s) ? s[k] : undefined)));
    let n = 2;
    while (taken.has(`${v}-${n}`)) n++;
    return { ...item, [k]: `${v}-${n}` };
  }
  return item;
}

interface Ctx {
  ui: Lang;
  q: string;
  L: (ko: string, en: string) => string;
  name: (k: string) => string;
}

/* ── 글 한 줄 ── */
function TextInput({ value, base, onChange, label, lang }: {
  value: string; base: string | undefined; onChange: (v: string) => void; label: string; lang?: Lang;
}) {
  return (
    <textarea className={se.input} rows={1} value={value} lang={lang}
      data-edited={base !== undefined && value !== base ? "" : undefined}
      placeholder={base || (lang === "ko" ? "한국어" : lang === "en" ? "English" : "")}
      aria-label={lang ? `${label} (${lang.toUpperCase()})` : label}
      onChange={(e) => onChange(e.target.value)} />
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={se.row}>
      <span className={se.label}>{label}</span>
      {children}
    </div>
  );
}

/* ── 값 하나 — 모양에 따라 글 줄 · 묶음 · 목록으로 ── */
function Node({ value, base, onChange, path, fieldKey, ctx }: {
  value: unknown; base: unknown; onChange: (v: unknown) => void; path: string; fieldKey: string; ctx: Ctx;
}): ReactNode {
  const label = ctx.name(fieldKey);
  if (typeof value === "string") {
    if (!PLAIN_KEYS.has(fieldKey)) return null;
    if (ctx.q && !textMatches(value, ctx.q) && !label.toLowerCase().includes(ctx.q)) return null;
    return (
      <Row label={label}>
        <div className={se.wide}><TextInput value={value} base={typeof base === "string" ? base : undefined} onChange={onChange} label={label} /></div>
      </Row>
    );
  }
  if (isL10n(value)) {
    if (ctx.q && !textMatches(value, ctx.q) && !label.toLowerCase().includes(ctx.q)) return null;
    const b = isL10n(base) ? base : undefined;
    return (
      <Row label={label}>
        <TextInput value={value.ko} base={b?.ko} onChange={(v) => onChange({ ...value, ko: v })} label={label} lang="ko" />
        <TextInput value={value.en} base={b?.en} onChange={(v) => onChange({ ...value, en: v })} label={label} lang="en" />
      </Row>
    );
  }
  if (isL10nGroup(value)) {
    const b = isL10nGroup(base) ? base : undefined;
    return (
      <>
        {Object.keys(value.ko).map((k) => {
          const ko = value.ko[k], en = value.en[k];
          if (typeof ko !== "string" || typeof en !== "string") return null;
          const l = `${label} · ${ctx.name(k)}`;
          if (ctx.q && !`${ko} ${en} ${l}`.toLowerCase().includes(ctx.q)) return null;
          return (
            <Row key={k} label={l}>
              <TextInput value={ko} base={b?.ko[k] as string | undefined} onChange={(v) => onChange({ ...value, ko: { ...value.ko, [k]: v } })} label={l} lang="ko" />
              <TextInput value={en} base={b?.en[k] as string | undefined} onChange={(v) => onChange({ ...value, en: { ...value.en, [k]: v } })} label={l} lang="en" />
            </Row>
          );
        })}
      </>
    );
  }
  if (Array.isArray(value)) {
    if (!hasText(value, fieldKey)) return null;
    return <ListNode value={value} base={Array.isArray(base) ? base : []} onChange={onChange} path={path} fieldKey={fieldKey} ctx={ctx} />;
  }
  if (isObj(value)) {
    const b = isObj(base) ? base : {};
    /* 이름 붙은 묶음(API 묶음별 요청 길 · 설계 결정 덧붙임) — 칸마다 카드로 */
    const entries = Object.entries(value);
    const isMap = entries.length > 1 && entries.every(([k, c]) => isObj(c) && !isL10n(c) && !isL10nGroup(c) && !FIELD_NAMES[k]);
    if (isMap) {
      return (
        <div className={se.list}>
          {entries.map(([k, c]) => {
            if (!hasText(c) || (ctx.q && !textMatches(c, ctx.q))) return null;
            return (
              <div key={k} className={se.item}>
                <div className={se.itemHead}>
                  <span className={se.itemTitle}>{titleOf(c, ctx.ui) ?? k}</span>
                  <span className={se.itemKey}>{k}</span>
                </div>
                <Node value={c} base={b[k]} path={`${path}.${k}`} fieldKey="" ctx={ctx} onChange={(v) => onChange({ ...value, [k]: v })} />
              </div>
            );
          })}
        </div>
      );
    }
    return (
      <>
        {Object.entries(value).map(([k, c]) => (
          <Fragment key={k}>
            <Node value={c} base={b[k]} path={`${path}.${k}`} fieldKey={k} ctx={ctx}
              onChange={(v) => onChange({ ...value, [k]: v })} />
          </Fragment>
        ))}
      </>
    );
  }
  return null;
}

/* ── 목록 ── */
function ListNode({ value, base, onChange, path, fieldKey, ctx }: {
  value: unknown[]; base: unknown[]; onChange: (v: unknown[]) => void; path: string; fieldKey: string; ctx: Ctx;
}) {
  const { L } = ctx;
  const rule = listRule(path);
  const canMove = rule !== "locked";
  const canResize = rule === "free";
  const label = ctx.name(fieldKey);
  const set = (i: number, v: unknown) => onChange(value.map((x, j) => (j === i ? v : x)));
  const move = (i: number, d: -1 | 1) => {
    const n = [...value];
    [n[i], n[i + d]] = [n[i + d], n[i]];
    onChange(n);
  };
  const dup = (i: number) => onChange([...value.slice(0, i + 1), uniqueKey(structuredClone(value[i]), value), ...value.slice(i + 1)]);
  const remove = (i: number) => onChange(value.filter((_, j) => j !== i));
  const add = () => onChange([...value, blankLike(value[value.length - 1] ?? base[base.length - 1], value)]);
  /* 기본값의 같은 항목 — 고친 칸 표시용. 옮긴 뒤에도 따라가게 key · href 로 찾고, 없으면 같은 자리 */
  const baseOf = (it: unknown, i: number) => {
    const id = isObj(it) ? (it.key ?? it.href) : undefined;
    return (id !== undefined && base.find((b) => isObj(b) && (b.key ?? b.href) === id)) || base[i];
  };
  const simple = value.every((x) => isL10n(x));

  const tools = (i: number) => (
    <span className={se.tools}>
      {canMove && (
        <>
          <Button size="sm" variant="ghost" shape="circle" icon={<ArrowUp size={13} />} disabled={i === 0} onClick={() => move(i, -1)} aria-label={L("위로", "Move up")} title={L("위로", "Move up")} />
          <Button size="sm" variant="ghost" shape="circle" icon={<ArrowDown size={13} />} disabled={i === value.length - 1} onClick={() => move(i, 1)} aria-label={L("아래로", "Move down")} title={L("아래로", "Move down")} />
        </>
      )}
      {canResize && (
        <>
          <Button size="sm" variant="ghost" shape="circle" icon={<Copy size={13} />} onClick={() => dup(i)} aria-label={L("복제", "Duplicate")} title={L("복제", "Duplicate")} />
          <Button size="sm" variant="ghost" shape="circle" icon={<Trash2 size={13} />} disabled={value.length <= 1} onClick={() => remove(i)} aria-label={L("삭제", "Delete")} title={L("삭제", "Delete")} />
        </>
      )}
    </span>
  );

  return (
    <div className={se.list}>
      <div className={se.listHead}>
        <span className={se.listTitle}>{label}</span>
        <span className={se.listMeta}>
          {L(`${value.length}개`, `${value.length}`)}
          {rule === "locked" && ` · ${L("그림과 묶여 개수 · 순서 고정", "count and order fixed")}`}
          {rule === "fixed" && ` · ${L("순서만 바꿀 수 있음", "reorder only")}`}
        </span>
      </div>
      {value.map((it, i) => {
        if (ctx.q && !textMatches(it, ctx.q)) return null;
        const b = baseOf(it, i);
        if (simple) {
          return (
            <div key={i} className={se.simpleItem}>
              <span className={se.label}>{i + 1}</span>
              <TextInput value={(it as Record<Lang, string>).ko} base={isL10n(b) ? b.ko : undefined} onChange={(v) => set(i, { ...(it as Obj), ko: v })} label={`${label} ${i + 1}`} lang="ko" />
              <TextInput value={(it as Record<Lang, string>).en} base={isL10n(b) ? b.en : undefined} onChange={(v) => set(i, { ...(it as Obj), en: v })} label={`${label} ${i + 1}`} lang="en" />
              {tools(i)}
            </div>
          );
        }
        if (!hasText(it, fieldKey)) return null;
        const t = titleOf(it, ctx.ui);
        return (
          <div key={i} className={se.item}>
            <div className={se.itemHead}>
              <span className={se.itemNo}>{i + 1}</span>
              <span className={se.itemTitle}>{t || L("(제목 없음)", "(untitled)")}</span>
              {tools(i)}
            </div>
            <Node value={it} base={b} onChange={(v) => set(i, v)} path={`${path}.${i}`} fieldKey="" ctx={ctx} />
          </div>
        );
      })}
      {canResize && (
        <Button size="sm" variant="outline" icon={<Plus size={14} />} onClick={add} className={se.add}>
          {L(`${label} 추가`, `Add ${label.toLowerCase()}`)}
        </Button>
      )}
    </div>
  );
}

/** 장 하나 — 장면 카드들 */
export function SceneEditor({ chapter, defaults, value, onChange, query }: {
  /** 장 이름(about.texts 의 키) — 목록 규칙(listRule)의 경로 앞머리 */
  chapter: string;
  /** 이 장의 기본값(ABOUT_TEXT_DEFAULTS[장]) — 장면 이름 → 값 */
  defaults: Record<string, unknown>;
  /** 이 장에서 고친 장면들(about.texts[장]) */
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
  query: string;
}) {
  const L = useL();
  const { language } = useLanguage();
  const ui: Lang = language === "ko" ? "ko" : "en";
  const q = query.trim().toLowerCase();
  const ctx: Ctx = useMemo(() => ({
    ui, q, L,
    name: (k: string) => (k ? (FIELD_NAMES[k] ?? SCENE_NAMES[k])?.[ui === "ko" ? 0 : 1] ?? k : L("글", "Text")),
  }), [ui, q, L]);
  const scenes = Object.keys(defaults).filter((k) => hasText(defaults[k], k));
  const [open, setOpen] = useState<Set<string>>(() => new Set(scenes.slice(0, 1)));
  const toggle = (k: string) => setOpen((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  const setScene = (k: string, v: unknown) => {
    const next = { ...value };
    if (deepEqual(v, defaults[k])) delete next[k];
    else next[k] = v;
    onChange(next);
  };

  const shown = scenes.filter((k) => !q || textMatches(value[k] ?? defaults[k], q));
  if (!shown.length) return <p className={se.empty}>{L("찾는 글이 없습니다.", "No matching text.")}</p>;

  return (
    <div className={se.scenes}>
      {shown.map((k) => {
        const cur = value[k] ?? defaults[k];
        const edited = k in value;
        const isOpen = !!q || open.has(k);
        const title = (k.endsWith("Chapter") ? CHAPTER_HEAD[ui === "ko" ? 0 : 1] : SCENE_NAMES[k]?.[ui === "ko" ? 0 : 1]) ?? titleOf(defaults[k], ui) ?? k;
        return (
          <section key={k} className={se.scene} data-open={isOpen || undefined}>
            <div className={se.sceneHead}>
              <Pressable className={se.sceneToggle} onClick={() => toggle(k)} aria-expanded={isOpen}>
                <ChevronDown size={16} className={se.chevron} />
                <span className={se.sceneTitle}>{title}</span>
                <span className={se.sceneMeta}>
                  {L(`${countText(cur, k)}칸`, `${countText(cur, k)} fields`)}
                  {edited && <span className={se.editedBadge}>{L("고침", "Edited")}</span>}
                </span>
              </Pressable>
              {edited && (
                <Button size="sm" variant="ghost" icon={<RotateCcw size={14} />} onClick={() => setScene(k, defaults[k])}>
                  {L("기본값으로", "Reset")}
                </Button>
              )}
            </div>
            {isOpen && (
              <div className={se.sceneBody}>
                <div className={se.colHead} aria-hidden>
                  <span />
                  <span>한국어</span>
                  <span>English</span>
                </div>
                <Node value={cur} base={defaults[k]} onChange={(v) => setScene(k, v)} path={`${chapter}.${k}`} fieldKey={k} ctx={ctx} />
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

/** 찾기 — 이 장에서 글이 맞는 장면 수(왼쪽 목록의 숫자) */
export function countSceneMatches(defaults: Record<string, unknown>, value: Record<string, unknown>, query: string): number {
  const q = query.trim().toLowerCase();
  return Object.keys(defaults).filter((k) => hasText(defaults[k], k) && textMatches(value[k] ?? defaults[k], q)).length;
}
