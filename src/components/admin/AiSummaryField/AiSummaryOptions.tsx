"use client";

/* AI 요약 옵션 — 편집기에서 "다시 만들기" 를 누르면 뜨는 팝오버. 말투 · 분량 · 초점 · 키워드 수 · 덧붙임 · 추가 지시를 고르고 만든다.
   고른 값은 브라우저에 남아 다음에 그대로 열린다. 방문자의 첫 생성은 늘 기본값이다 */
import { useState } from "react";
import { Sparkles } from "@/components/icons";
import Button from "@/components/ui/Button";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { Switch } from "@/components/ui/Switch";
import Textarea from "@/components/ui/Textarea";
import { DEFAULT_SUMMARY_OPTIONS, type SummaryOptions } from "@/lib/ai/summary";
import { useLanguage } from "@/providers/LanguageProvider";
import { loadSummaryOptions, saveSummaryOptions } from "./summaryOptionsStore";
import styles from "./AiSummaryField.module.css";

export default function AiSummaryOptions({ onSubmit, submitLabel }: { onSubmit: (o: SummaryOptions) => void; submitLabel: string }) {
  const { t } = useLanguage();
  const to = (k: string) => t(`admin.aiSummaryField.options.${k}`);
  const [o, setO] = useState<SummaryOptions>(() => loadSummaryOptions());
  const set = <K extends keyof SummaryOptions>(k: K, v: SummaryOptions[K]) => setO((prev) => ({ ...prev, [k]: v }));
  const row = (label: string, control: React.ReactNode) => (
    <div className={styles.optRow}>
      <span className={styles.optLabel}>{label}</span>
      {control}
    </div>
  );
  return (
    <div className={styles.options}>
      {row(to("tone"), <SegmentedControl size="sm" value={o.tone} onChange={(v) => set("tone", v)} items={[{ value: "formal", label: to("toneFormal") }, { value: "friendly", label: to("toneFriendly") }, { value: "plain", label: to("tonePlain") }]} />)}
      {row(to("length"), <SegmentedControl size="sm" value={o.length} onChange={(v) => set("length", v)} items={[{ value: "short", label: to("lengthShort") }, { value: "normal", label: to("lengthNormal") }, { value: "detailed", label: to("lengthDetailed") }]} />)}
      {row(to("focus"), <SegmentedControl size="sm" value={o.focus} onChange={(v) => set("focus", v)} items={[{ value: "outcome", label: to("focusOutcome") }, { value: "process", label: to("focusProcess") }, { value: "reader", label: to("focusReader") }]} />)}
      {row(to("keywords"), <SegmentedControl size="sm" value={String(o.keywords) as "0" | "3" | "5"} onChange={(v) => set("keywords", Number(v) as 0 | 3 | 5)} items={[{ value: "0", label: to("keywordsNone") }, { value: "3", label: "3" }, { value: "5", label: "5" }]} />)}
      {row(to("note"), <Switch size="sm" checked={o.note} onCheckedChange={(v) => set("note", v)} />)}
      <Textarea value={o.instruction} onChange={(v) => set("instruction", v)} placeholder={to("instructionPlaceholder")} rows={2} maxHint={300} />
      <div className={styles.optActions}>
        <Button variant="ghost" size="sm" shape="capsule" onClick={() => setO(DEFAULT_SUMMARY_OPTIONS)} soundDisabled>{to("reset")}</Button>
        <Button variant="primary" size="sm" shape="capsule" icon={<Sparkles size={14} strokeWidth={1.75} />} onClick={() => { saveSummaryOptions(o); onSubmit(o); }} soundDisabled>{submitLabel}</Button>
      </div>
    </div>
  );
}
