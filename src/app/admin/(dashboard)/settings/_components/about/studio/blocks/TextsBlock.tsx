"use client";

import { useMemo, useState } from "react";
import tx from "./TextsBlock.module.css";
import { collectTextLeaves } from "@/app/about/_data/texts";
import { ChevronDown, RotateCcw } from "@/components/icons";
import Button from "@/components/ui/Button";
import Pressable from "@/components/ui/Pressable";
import { useLanguage } from "@/providers/LanguageProvider";
import { useL } from "../primitives";

/* ═══════════ 장 글 편집 — 코드 기본값(_data/*) 위에 고친 글만 about.texts[장] 에 남긴다 ═══════════
   한 장을 장면(카드)으로 나누고, 장면 안은 항목(질문 하나 · 카드 하나)마다 묶는다. 한 줄 = 글 하나를
   한국어 · 영어 나란히 — 번역을 맞춰 보며 고친다. 숫자 · 단위처럼 언어가 없는 칸은 한 칸.
   기본값과 같아지면 덮어쓰기를 지운다. 비운 칸은 비운 채로 남지만 페이지는 기본 글을 쓴다. */

type Lang = "ko" | "en";
type Texts = Record<string, string>;

interface Row {
  /** 언어 칸을 뺀 자리 — "items.0.q.*" */
  key: string;
  label: string;
  /** 언어별 경로 · 기본값. 언어가 없는 칸은 plain */
  ko?: { path: string; base: string };
  en?: { path: string; base: string };
  plain?: { path: string; base: string };
}

interface Group {
  /** "items.0" — 항목이 없는 줄은 "" */
  key: string;
  title: string;
  rows: Row[];
}

interface Scene {
  key: string;
  title: string;
  groups: Group[];
  count: number;
}

/* 칸 이름 — 기본값 데이터의 키를 사람이 읽는 말로. 모르는 키는 그대로 */
const FIELD_NAMES: Record<string, [string, string]> = {
  eyebrow: ["머리말", "Eyebrow"], title: ["제목", "Title"], label: ["이름", "Label"], body: ["본문", "Body"],
  note: ["덧붙임", "Note"], lead: ["소개 문장", "Lead"], before: ["앞", "Before"], accent: ["강조", "Accent"],
  after: ["뒤", "After"], value: ["값", "Value"], unit: ["단위", "Unit"], points: ["요점", "Point"],
  q: ["질문", "Question"], a: ["답", "Answer"], primary: ["주 단추", "Primary button"], secondary: ["보조 단추", "Secondary button"],
  desc: ["설명", "Description"], description: ["설명", "Description"], caption: ["캡션", "Caption"], hint: ["안내", "Hint"],
  name: ["이름", "Name"], wordmark: ["워드마크", "Wordmark"], here: ["도시를 모를 때", "Unknown city"],
  latest: ["최근 글", "Latest"], posts: ["글", "Posts"], works: ["작업물", "Works"], summary: ["요약", "Summary"],
  steps: ["단계", "Step"], items: ["항목", "Item"], reset: ["다시 단추", "Reset button"], order: ["순서", "Order"],
  why: ["이유", "Why"], tags: ["태그", "Tag"], cta: ["단추", "Button"], role: ["역할", "Role"],
};

/* 장면 이름 — 장면 데이터에 제목이 없을 때 */
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
/* 장 머리(02 — 기능 같은 머리말 · 제목) — featuresChapter · aiChapter … */
const CHAPTER_HEAD: [string, string] = ["장 머리", "Chapter heading"];

const LANG_SEG = /^(ko|en)$/;
const NUM = /^\d+$/;

/** 기본값 안의 글 하나를 관리자 화면 언어로 — 장면 · 항목 제목에 쓴다 */
function pickText(v: unknown, ui: Lang): string | null {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && "ko" in v && "en" in v) {
    const o = v as Record<Lang, unknown>;
    const s = o[ui] ?? o.ko;
    return typeof s === "string" ? s : null;
  }
  return null;
}

function titleIn(obj: unknown, ui: Lang): string | null {
  if (!obj || typeof obj !== "object") return null;
  for (const k of ["title", "label", "q", "name", "eyebrow"]) {
    const s = pickText((obj as Record<string, unknown>)[k], ui);
    if (s) return s;
  }
  return null;
}

const getAt = (root: unknown, segs: string[]) =>
  segs.reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), root);

function buildScenes(defaults: unknown, ui: Lang): Scene[] {
  const name = (k: string, dict: Record<string, [string, string]>) => dict[k]?.[ui === "ko" ? 0 : 1];
  const scenes = new Map<string, Scene>();
  for (const leaf of collectTextLeaves(defaults)) {
    const segs = leaf.path.split(".");
    const sceneKey = segs[0];
    const rest = segs.slice(1);
    const langAt = rest.findIndex((s) => LANG_SEG.test(s));
    const lang = langAt >= 0 ? (rest[langAt] as Lang) : null;
    const rowSegs = rest.map((s, i) => (i === langAt ? "*" : s));
    /* 항목 — 장면 안의 첫 번째 배열 칸까지(그 뒤의 번호는 칸 이름에 붙인다) */
    const numAt = rowSegs.findIndex((s) => NUM.test(s));
    const groupSegs = numAt >= 0 ? rowSegs.slice(0, numAt + 1) : [];
    const groupKey = groupSegs.join(".");

    let scene = scenes.get(sceneKey);
    if (!scene) {
      const data = (defaults as Record<string, unknown>)[sceneKey];
      scene = {
        key: sceneKey,
        title: (sceneKey.endsWith("Chapter") ? CHAPTER_HEAD[ui === "ko" ? 0 : 1] : name(sceneKey, SCENE_NAMES)) ?? titleIn(data, ui) ?? sceneKey,
        groups: [],
        count: 0,
      };
      scenes.set(sceneKey, scene);
    }
    let group = scene.groups.find((g) => g.key === groupKey);
    if (!group) {
      const item = groupSegs.length ? getAt((defaults as Record<string, unknown>)[sceneKey], groupSegs) : null;
      const n = groupSegs.length ? Number(groupSegs[groupSegs.length - 1]) + 1 : 0;
      const listName = groupSegs.length > 1 ? name(groupSegs[groupSegs.length - 2], FIELD_NAMES) : null;
      const itemTitle = titleIn(item, ui) ?? pickText(item, ui);
      group = {
        key: groupKey,
        title: groupSegs.length ? `${listName ?? (ui === "ko" ? "항목" : "Item")} ${n}${itemTitle ? ` — ${itemTitle}` : ""}` : "",
        rows: [],
      };
      scene.groups.push(group);
    }
    const rowKey = rowSegs.join(".");
    let row = group.rows.find((r) => r.key === rowKey);
    if (!row) {
      const labelSegs = rowSegs.slice(groupSegs.length).filter((s) => s !== "*");
      const label = labelSegs
        .map((s) => (NUM.test(s) ? String(Number(s) + 1) : name(s, FIELD_NAMES) ?? s))
        .join(" ");
      row = { key: rowKey, label: label || (ui === "ko" ? "글" : "Text") };
      group.rows.push(row);
      scene.count++;
    }
    row[lang ?? "plain"] = { path: leaf.path, base: leaf.value };
  }
  return [...scenes.values()];
}

const cellsOf = (r: Row) => [r.ko, r.en, r.plain].filter((c): c is NonNullable<typeof c> => !!c);

/** 줄이 고친 글을 갖고 있는지 */
const rowEdited = (r: Row, value: Texts) => cellsOf(r).some((c) => c.path in value);

/** 찾기 — 칸 이름 · 기본 글 · 고친 글 어디에든 들어 있으면 */
const rowMatches = (r: Row, value: Texts, q: string) =>
  !q || [r.label, ...cellsOf(r).flatMap((c) => [c.base, value[c.path] ?? ""])].some((s) => s.toLowerCase().includes(q));

export function countTextMatches(defaults: unknown, value: Texts, query: string): number {
  const q = query.trim().toLowerCase();
  return buildScenes(defaults, "ko").reduce((n, s) => n + s.groups.reduce((m, g) => m + g.rows.filter((r) => rowMatches(r, value, q)).length, 0), 0);
}

function Cell({ cell, value, onSet, lang, label }: {
  cell: { path: string; base: string }; value: Texts; onSet: (path: string, base: string, v: string) => void;
  lang?: Lang; label: string;
}) {
  const cur = value[cell.path] ?? cell.base;
  return (
    <textarea
      className={tx.input}
      rows={1}
      value={cur}
      lang={lang}
      data-edited={cell.path in value || undefined}
      placeholder={cell.base}
      aria-label={lang ? `${label} (${lang.toUpperCase()})` : label}
      onChange={(e) => onSet(cell.path, cell.base, e.target.value)}
    />
  );
}

export function TextsBlock({ defaults, value, onChange, query }: {
  /** 이 장의 기본값(ABOUT_TEXT_DEFAULTS[장]) */
  defaults: unknown;
  value: Texts;
  onChange: (v: Texts) => void;
  query: string;
}) {
  const L = useL();
  const { language } = useLanguage();
  const ui: Lang = language === "ko" ? "ko" : "en";
  const scenes = useMemo(() => buildScenes(defaults, ui), [defaults, ui]);
  const q = query.trim().toLowerCase();
  /* 펼친 장면 — 처음엔 첫 장면만. 찾는 중에는 맞는 장면을 모두 편다 */
  const [open, setOpen] = useState<Set<string>>(() => new Set(scenes[0] ? [scenes[0].key] : []));
  const toggle = (k: string) => setOpen((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  const setOne = (path: string, base: string, v: string) => {
    const next = { ...value };
    if (v === base) delete next[path];
    else next[path] = v;
    onChange(next);
  };
  const resetRow = (r: Row) => {
    const next = { ...value };
    for (const c of cellsOf(r)) delete next[c.path];
    onChange(next);
  };
  const resetScene = (s: Scene) => {
    const next = { ...value };
    for (const g of s.groups) for (const r of g.rows) for (const c of cellsOf(r)) delete next[c.path];
    onChange(next);
  };

  const visible = scenes
    .map((s) => ({ ...s, groups: s.groups.map((g) => ({ ...g, rows: g.rows.filter((r) => rowMatches(r, value, q)) })).filter((g) => g.rows.length) }))
    .filter((s) => s.groups.length);

  if (!visible.length) return <p className={tx.empty}>{L("찾는 글이 없습니다.", "No matching text.")}</p>;

  return (
    <div className={tx.scenes}>
      {visible.map((s) => {
        const isOpen = !!q || open.has(s.key);
        const edited = s.groups.reduce((n, g) => n + g.rows.filter((r) => rowEdited(r, value)).length, 0);
        const hasLangs = s.groups.some((g) => g.rows.some((r) => r.ko || r.en));
        return (
          <section key={s.key} className={tx.scene} data-open={isOpen || undefined}>
            <div className={tx.sceneHead}>
              <Pressable className={tx.sceneToggle} onClick={() => toggle(s.key)} aria-expanded={isOpen}>
                <ChevronDown size={16} className={tx.chevron} />
                <span className={tx.sceneTitle}>{s.title}</span>
                <span className={tx.sceneMeta}>
                  {L(`${s.count}칸`, `${s.count} fields`)}
                  {edited > 0 && <span className={tx.editedBadge}>{L(`${edited}곳 고침`, `${edited} edited`)}</span>}
                </span>
              </Pressable>
              {edited > 0 && (
                <Button size="sm" variant="ghost" icon={<RotateCcw size={14} />} onClick={() => resetScene(s)}>
                  {L("이 장면 기본값으로", "Reset scene")}
                </Button>
              )}
            </div>
            {isOpen && (
              <div className={tx.sceneBody}>
                {hasLangs && (
                  <div className={tx.colHead} aria-hidden>
                    <span />
                    <span>한국어</span>
                    <span>English</span>
                    <span />
                  </div>
                )}
                {s.groups.map((g) => (
                  <div key={g.key} className={tx.group}>
                    {g.title && <h4 className={tx.groupTitle}>{g.title}</h4>}
                    {g.rows.map((r) => {
                      const isEdited = rowEdited(r, value);
                      return (
                        <div key={r.key} className={tx.row} data-edited={isEdited || undefined}>
                          <span className={tx.label}>{r.label}</span>
                          {r.plain ? (
                            <div className={tx.wide}><Cell cell={r.plain} value={value} onSet={setOne} label={r.label} /></div>
                          ) : (
                            <>
                              {r.ko ? <Cell cell={r.ko} value={value} onSet={setOne} lang="ko" label={r.label} /> : <span className={tx.none}>—</span>}
                              {r.en ? <Cell cell={r.en} value={value} onSet={setOne} lang="en" label={r.label} /> : <span className={tx.none}>—</span>}
                            </>
                          )}
                          <Button className={tx.reset} variant="ghost" shape="circle" size="sm" icon={<RotateCcw size={13} />}
                            disabled={!isEdited} onClick={() => resetRow(r)}
                            aria-label={L(`${r.label} 기본값으로`, `Reset ${r.label}`)} title={L("기본값으로", "Reset to default")} />
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
