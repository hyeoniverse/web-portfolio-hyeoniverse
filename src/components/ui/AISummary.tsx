"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, ChevronDown } from "@/components/icons";
import T from "@/components/ui/T";
import Button from "@/components/ui/Button";
import LoadingDots from "@/components/ui/LoadingDots";
import Pressable from "@/components/ui/Pressable";
import { parseStoredSummary, type DisplaySummary } from "@/lib/ai/summary";
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

/** 저장된 요약(JSON 또는 예전 줄글)을 한 줄 요약 + 핵심 항목으로. 예전 줄글은 문단 그대로 */
export function SummaryBody({ summary }: { summary: DisplaySummary }) {
  if (!summary) return null;
  if (summary.kind === "text") return <p className={styles.text}>{summary.text}</p>;
  return (
    <div className={styles.structured}>
      {summary.tldr && <p className={styles.tldr}>{summary.tldr}</p>}
      {summary.points.length > 0 && (
        <ul className={styles.points}>
          {summary.points.map((p, i) => <li key={i} className={styles.point}>{p}</li>)}
        </ul>
      )}
    </div>
  );
}

export default function AISummary({ summaryKo, summaryEn, lang, generating = false, generateEndpoint }: AISummaryProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(true);
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
    <div className={styles.container}>
      <Pressable
        type="button"
        className={styles.header}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className={styles.headerLeft}>
          <Sparkles className={styles.icon} size={16} strokeWidth={1.5} />
          <span className={styles.label}><T k="aiSummary.label" /></span>
        </span>
        <ChevronDown
          className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}
          size={16}
          strokeWidth={1.5}
        />
      </Pressable>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className={styles.body}
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <div className={styles.bodyInner}>
              {busy ? (
                <span className={styles.generating}>
                  <LoadingDots />
                  <T k="aiSummary.generating" />
                </span>
              ) : empty ? (
                /* 아직 요약이 없다 — 처음 보는 사람이 한 번 만들 수 있다 */
                <div className={styles.emptyRow}>
                  <span className={styles.emptyText}>{t(failed ? "aiSummary.failed" : "aiSummary.empty")}</span>
                  <Button variant="outline" size="sm" shape="capsule" onClick={make} icon={<Sparkles size={14} strokeWidth={1.5} />} soundDisabled>
                    {t("aiSummary.generate")}
                  </Button>
                </div>
              ) : (
                <SummaryBody summary={summary} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
