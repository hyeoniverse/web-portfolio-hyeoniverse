"use client";

/* AI 요약 — 본문을 고치거나 붙여 넣고 보내면 /api/demo/summary 가 실제로 요약한다.
   돌아온 요약은 글 상세가 저장하는 모양(JSON 문자열)과 같아서, 글 위 요약 상자와 같은 SummaryBody 로 그린다. */
import { useId, useState } from "react";
import Button from "@/components/ui/Button";
import Textarea from "@/components/ui/Textarea";
import LoadingDots from "@/components/ui/LoadingDots";
import { SummaryBody } from "@/components/ui/AISummary";
import { Sparkles } from "@/components/icons";
import { parseStoredSummary, type DisplaySummary } from "@/lib/ai/summary";
import { useL } from "../../features/shared";
import { common, MAX_CHARS, providerName, SUMMARY_SAMPLE, summaryCopy as copy } from "./data";
import { blockReason, Chip, LiveInfo, perIpOf, QuotaChip, StatusLine, useSampleText } from "./parts";
import { useDemoApi } from "./useDemoApi";
import styles from "./AiDemos.module.css";

const MAX = MAX_CHARS.summary;

export default function SummaryDemo() {
  const L = useL();
  const id = useId();
  const [text, setText] = useSampleText(SUMMARY_SAMPLE);
  const [made, setMade] = useState<{ summary: NonNullable<DisplaySummary>; provider: string; key: string } | null>(null);
  const { quota, busy, error, run, fail, clearError } = useDemoApi<{ summary?: string; provider?: string }>("summary");

  const summarize = async () => {
    const blocked = blockReason(text, MAX, quota);
    if (blocked) return fail(L(blocked));
    const data = await run({ text });
    if (!data) return;
    const summary = parseStoredSummary(data.summary);
    if (!summary) return fail(L(copy.unreadable));
    setMade({ summary, provider: providerName(data.provider), key: data.summary ?? "" });
  };

  return (
    <div className={styles.panel}>
      {/* 고를 것이 없는 데모라 안내 줄과 칩을 한 줄에 — 글 칸이 그만큼 커진다 */}
      <div className={styles.head}>
        <LiveInfo text={common.live(perIpOf(quota, "summary"), MAX)} />
        <div className={styles.chips}>
          {made?.provider && <Chip>{made.provider}</Chip>}
          <QuotaChip quota={quota} kind="summary" />
        </div>
      </div>
      <Textarea
        className={styles.fieldLg}
        id={`${id}-body`}
        label={L(copy.label)}
        size="sm"
        rows={8}
        maxHint={MAX}
        value={text}
        disabled={busy}
        onChange={(v) => { setText(v); clearError(); }}
      />
      <section className={styles.result} aria-label={L(copy.result)} aria-busy={busy || undefined}>
        <span className={styles.resultLabel}>
          <Sparkles size={14} aria-hidden />
          {L(copy.result)}
        </span>
        <div className={`${styles.resultBody} ${styles.summaryBody}`}>
          {busy ? (
            <p className={styles.placeholder}>
              <LoadingDots /> {L(copy.busy)}
            </p>
          ) : made ? (
            <div key={made.key} className={styles.typed}>
              <SummaryBody summary={made.summary} compact />
            </div>
          ) : (
            <p className={styles.placeholder}>{L(copy.placeholder)}</p>
          )}
        </div>
      </section>
      <div className={styles.foot}>
        <StatusLine error={error}>
          {busy ? L(copy.busy) : made ? L(common.madeBy(made.provider || "AI")) : L(copy.idle)}
        </StatusLine>
        <Button
          size="md"
          icon={<Sparkles size={16} />}
          loading={busy}
          disabled={busy || quota?.remaining === 0 || quota?.unavailable}
          onClick={() => void summarize()}
        >
          {L(copy.run)}
        </Button>
      </div>
    </div>
  );
}
