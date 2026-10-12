"use client";

import { useMemo } from "react";
import css from "../../AboutStudio.module.css";
import tx from "./TextsBlock.module.css";
import { collectTextLeaves } from "@/app/about/_data/texts";
import { RotateCcw } from "@/components/icons";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import { type Language } from "@/types";
import { useL } from "../primitives";

/* ═══════════ 장 글 — 코드 기본값(_data/*) 위에 고친 글만 about.texts[장] 에 남긴다 ═══════════
   칸은 기본값의 모양을 그대로 따른다: ko/en 이 있는 글은 지금 고치는 언어의 칸만, 숫자 · 단위처럼
   언어가 없는 칸은 늘 보인다. 기본값과 같아지면 덮어쓰기를 지운다(저장할 것이 남지 않게).
   비운 칸은 비운 채로 남지만 페이지는 기본 글을 쓴다(applyAboutTexts 가 빈 글을 건너뛴다). */

interface Field {
  /** 장 안의 경로 — "faq.items.0.q.ko" */
  path: string;
  label: string;
  base: string;
}

/** "faq.items.0.q.ko" → "faq › 1 › q" — 언어 칸과 배열의 items 는 이름에서 뺀다 */
function labelOf(path: string): string {
  return path
    .split(".")
    .filter((seg, i, all) => !(i === all.length - 1 && (seg === "ko" || seg === "en")))
    .map((seg) => (/^\d+$/.test(seg) ? String(Number(seg) + 1) : seg))
    .join(" › ");
}

export function TextsBlock({ defaults, value, onChange, lang, query }: {
  /** 이 장의 기본값(ABOUT_TEXT_DEFAULTS[장]) */
  defaults: unknown;
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
  lang: Language;
  /** 찾기 — 이름 · 기본값 · 고친 글에 들어 있으면 보인다 */
  query: string;
}) {
  const L = useL();
  const fields = useMemo<Field[]>(
    () =>
      collectTextLeaves(defaults)
        .filter((f) => !/\.(ko|en)$/.test(f.path) || f.path.endsWith(`.${lang}`))
        .map((f) => ({ path: f.path, label: labelOf(f.path), base: f.value })),
    [defaults, lang],
  );
  const q = query.trim().toLowerCase();
  const shown = q
    ? fields.filter((f) => [f.label, f.base, value[f.path] ?? ""].some((s) => s.toLowerCase().includes(q)))
    : fields;

  const set = (f: Field, v: string) => {
    const next = { ...value };
    if (v === f.base) delete next[f.path];
    else next[f.path] = v;
    onChange(next);
  };

  if (!shown.length) return <p className={tx.empty}>{L("찾는 글이 없습니다.", "No matching text.")}</p>;

  return (
    <section className={css.block}>
      <ul className={tx.list}>
        {shown.map((f) => {
          const cur = value[f.path] ?? f.base;
          const edited = f.path in value;
          const long = f.base.length > 70 || cur.includes("\n");
          return (
            <li key={f.path} className={tx.row} data-edited={edited || undefined}>
              <span className={tx.label} title={f.path}>{f.label}</span>
              <div className={tx.field}>
                {long
                  ? <Textarea value={cur} onChange={(v) => set(f, v)} aria-label={f.label} />
                  : <Input value={cur} onChange={(v) => set(f, v)} aria-label={f.label} clearable={false} />}
                {edited && <p className={tx.base}>{L("기본값", "Default")}: {f.base}</p>}
              </div>
              <Button variant="ghost" shape="circle" icon={<RotateCcw size={14} />} disabled={!edited}
                onClick={() => set(f, f.base)} aria-label={L("기본값으로", "Reset to default")} title={L("기본값으로", "Reset to default")} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
