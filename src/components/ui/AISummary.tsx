"use client";

import { useState } from "react";
import { AlertTriangle, ArrowRight, Info, Lightbulb, Sparkles } from "@/components/icons";
import Button from "@/components/ui/Button";
import LoadingDots from "@/components/ui/LoadingDots";
import Tooltip from "@/components/ui/Tooltip";
import { parseInline, parseStoredSummary, type CalloutTone, type DisplaySummary, type SummaryBlock, type SummaryItem } from "@/lib/ai/summary";
import { useLanguage } from "@/providers/LanguageProvider";
import styles from "./AISummary.module.css";

interface AISummaryProps {
  summaryKo: string;
  summaryEn: string;
  /** "ko" | "en" — synced with the detail page language toggle */
  lang: "ko" | "en";
  /** Whether the summary is currently being generated */
  generating?: boolean;
  /** 요약이 비어 있을 때 방문자가 처음 한 번 만들 수 있게 — posts/works 의 ai-summary 에 { public: true } 로.
   *  글마다 한 번만 만들어지고(저장되면 다음부터는 저장된 것), 작성자는 편집기에서 다시 만든다 */
  generateEndpoint?: string;
}

/** 글 안의 **굵게** · `코드` 를 요소로 — 문자열을 HTML 로 넣지 않는다 */
function Inline({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((p, i) =>
        p.kind === "strong" ? <strong key={i} className={styles.em}>{p.text}</strong>
          : p.kind === "mark" ? <mark key={i} className={styles.mark}>{p.text}</mark>
          : p.kind === "code" ? <code key={i} className={styles.code}>{p.text}</code>
          : <span key={i}>{p.text}</span>)}
    </>
  );
}

/** 목록 · 단계 한 줄 — 이모지(있으면 점 대신) · 굵은 머리말 · 한 문장 */
function ItemBody({ item }: { item: SummaryItem }) {
  return (
    <>
      {item.emoji && <span className={styles.pointEmoji} aria-hidden>{item.emoji}</span>}
      {item.label && <strong className={styles.pointLabel}>{item.label}</strong>}
      <span className={styles.pointText}><Inline text={item.text} /></span>
    </>
  );
}

const CALLOUT_ICON: Record<CalloutTone, typeof Info> = { tip: Lightbulb, warn: AlertTriangle, info: Info };

/** 블록 하나 — 모델이 고른 종류대로 */
function Block({ block: b }: { block: SummaryBlock }) {
  switch (b.type) {
    case "paragraph":
      return <p className={styles.body}><Inline text={b.text} /></p>;
    case "heading":
      return <h3 className={styles.sectionTitle}>{b.text}</h3>;
    case "quote":
      return <blockquote className={styles.quote}><Inline text={b.text} /></blockquote>;
    case "callout": {
      const Icon = CALLOUT_ICON[b.tone];
      return (
        <aside className={styles.callout} data-tone={b.tone}>
          <Icon size={16} strokeWidth={1.75} className={styles.calloutIcon} aria-hidden />
          <p className={styles.calloutText}><Inline text={b.text} /></p>
        </aside>
      );
    }
    case "list":
    case "steps": {
      const items = b.items.map((it, i) => (
        <li key={i} className={styles.point} data-emoji={b.type === "list" && it.emoji ? "" : undefined}>
          <ItemBody item={b.type === "steps" ? { ...it, emoji: undefined } : it} />
        </li>
      ));
      return (
        <div className={styles.group}>
          {b.title && <h3 className={styles.sectionTitle}>{b.title}</h3>}
          {b.type === "steps" ? <ol className={`${styles.points} ${styles.steps}`}>{items}</ol> : <ul className={styles.points}>{items}</ul>}
        </div>
      );
    }
    case "metrics":
      /* 수치 카드 — 원문이 말한 수치만. 이전 값이 있으면 "이전 → 지금" */
      return (
        <ul className={styles.metrics}>
          {b.items.map((m, i) => (
            <li key={i} className={styles.metric}>
              <span className={styles.metricLabel}>{m.label}</span>
              <span className={styles.metricRow}>
                {m.from && (
                  <>
                    <span className={styles.metricFrom}>{m.from}</span>
                    <ArrowRight size={12} strokeWidth={2} className={styles.metricArrow} aria-hidden />
                  </>
                )}
                <span className={styles.metricValue}>{m.value}</span>
              </span>
            </li>
          ))}
        </ul>
      );
    case "compare":
      /* 전후 · 둘 비교 — 줄마다 이름 · 왼쪽 · 오른쪽. 오른쪽(나중 · 고른 쪽)이 더 또렷하다 */
      return (
        <div className={styles.group}>
          {b.title && <h3 className={styles.sectionTitle}>{b.title}</h3>}
          <div className={styles.compare} role="table">
            {(b.beforeLabel || b.afterLabel) && (
              <div className={styles.compareRow} role="row">
                <span role="columnheader" />
                <span className={styles.compareHead} role="columnheader">{b.beforeLabel}</span>
                <span className={styles.compareHead} role="columnheader">{b.afterLabel}</span>
              </div>
            )}
            {b.items.map((r, i) => (
              <div key={i} className={styles.compareRow} role="row">
                <span className={styles.compareLabel} role="rowheader">{r.label}</span>
                <span className={styles.compareBefore} role="cell"><Inline text={r.before} /></span>
                <span className={styles.compareAfter} role="cell"><Inline text={r.after} /></span>
              </div>
            ))}
          </div>
        </div>
      );
  }
}

/** 저장된 요약을 그린다 — 고정인 제목 한 줄(이모지) · 키워드 칩 사이에 모델이 고른 블록들. 예전 줄글은 문단 그대로.
 *  compact 는 편집기 칸처럼 좁은 자리용(글자 한 단계 작게) */
export function SummaryBody({ summary, compact }: { summary: DisplaySummary; compact?: boolean }) {
  if (!summary) return null;
  if (summary.kind === "text") return <p className={styles.text}>{summary.text}</p>;
  return (
    <div className={`${styles.structured} ${compact ? styles.compact : ""}`}>
      {summary.tldr && (
        <p className={styles.tldr}>
          {summary.emoji && <span className={styles.tldrEmoji} aria-hidden>{summary.emoji}</span>}
          <Inline text={summary.tldr} />
        </p>
      )}
      {summary.blocks.map((b, i) => <Block key={i} block={b} />)}
      {summary.keywords.length > 0 && (
        <ul className={styles.keywords}>
          {summary.keywords.map((k, i) => <li key={i} className={styles.keyword}>{k}</li>)}
        </ul>
      )}
    </div>
  );
}

export default function AISummary({ summaryKo, summaryEn, lang, generating = false, generateEndpoint }: AISummaryProps) {
  const { t } = useLanguage();
  /* 방문자가 만든 결과 — 페이지는 정적이라 저장된 값이 바로 안 바뀌니 여기서 들고 보인다 */
  const [made, setMade] = useState<{ ko: string; en: string } | null>(null);
  const [making, setMaking] = useState(false);
  const [failed, setFailed] = useState(false);

  const ko = made?.ko ?? summaryKo;
  const en = made?.en ?? summaryEn;
  const summary = parseStoredSummary(lang === "ko" ? ko || en : en || ko);
  const empty = !summary;
  const busy = generating || making;

  if (!busy && empty && !generateEndpoint) return null;

  const make = async () => {
    if (!generateEndpoint || making) return;
    setMaking(true);
    setFailed(false);
    try {
      const res = await fetch(generateEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ public: true }) });
      const data = (await res.json().catch(() => null)) as { summary_ko?: string; summary_en?: string } | null;
      if (!res.ok || !data?.summary_ko) { setFailed(true); return; }
      setMade({ ko: data.summary_ko, en: data.summary_en ?? "" });
    } catch {
      setFailed(true);
    } finally {
      setMaking(false);
    }
  };

  return (
    <section className={styles.card} aria-label={t("aiSummary.label")}>
      {/* 머리 — 아이콘 · 이름 · ⓘ(AI 가 만든 요약이라는 설명). 접고 펼치지 않는다 */}
      <header className={styles.header}>
        <span className={styles.icon} aria-hidden><Sparkles size={16} strokeWidth={1.75} /></span>
        <h2 className={styles.label}>{t("aiSummary.label")}</h2>
        <Tooltip content={t("aiSummary.about")} placement="top">
          <span className={styles.info} tabIndex={0} aria-label={t("aiSummary.about")}><Info size={14} strokeWidth={1.75} /></span>
        </Tooltip>
      </header>

      {busy ? (
        <span className={styles.generating}>
          <LoadingDots />
          {t("aiSummary.generating")}
        </span>
      ) : empty ? (
        /* 아직 요약이 없다 — 처음 보는 사람이 한 번 만들 수 있다 */
        <div className={styles.emptyRow}>
          <span className={styles.emptyText}>{t(failed ? "aiSummary.failed" : "aiSummary.empty")}</span>
          <Button variant="outline" shape="capsule" onClick={make} icon={<Sparkles size={14} strokeWidth={1.5} />} soundDisabled>
            {t("aiSummary.generate")}
          </Button>
        </div>
      ) : (
        <SummaryBody summary={summary} />
      )}
    </section>
  );
}
