"use client";

/* AI 요약 옵션 — 말투 · 분량 · 초점 · 키워드 수 · 덧붙임 · 생성 값(공급자 · temperature · 토큰) · 추가 지시.
   SummaryOptionsForm 은 값만 다루는 틀이라 두 곳이 같이 쓴다:
   - 설정 › 서비스의 AI 자동 요약 — 사이트 기본값(발행 때 자동 요약 · 방문자의 첫 생성이 쓴다)
   - 편집기 "다시 만들기" 팝오버(AiSummaryOptions) — 이번 요청만. 처음엔 브라우저에 남은 값, 없으면 사이트 기본값으로 연다 */
import { useState } from "react";
import { Sparkles } from "@/components/icons";
import Button from "@/components/ui/Button";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Select from "@/components/ui/Select";
import { Slider } from "@/components/ui/Slider";
import { Switch } from "@/components/ui/Switch";
import Textarea from "@/components/ui/Textarea";
import { sanitizeSummaryOptions, type SummaryOptions } from "@/lib/ai/summary";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { loadSummaryOptions, saveSummaryOptions } from "./summaryOptionsStore";
import styles from "./AiSummaryField.module.css";

export function SummaryOptionsForm({ value: o, onChange }: { value: SummaryOptions; onChange: (next: SummaryOptions) => void }) {
  const { t } = useLanguage();
  const to = (k: string) => t(`admin.aiSummaryField.options.${k}`);
  const set = <K extends keyof SummaryOptions>(k: K, v: SummaryOptions[K]) => onChange({ ...o, [k]: v });
  const row = (label: string, control: React.ReactNode) => (
    <div className={styles.optRow}>
      <span className={styles.optLabel}>{label}</span>
      {control}
    </div>
  );
  return (
    <>
      {row(to("tone"), <SegmentedControl size="sm" value={o.tone} onChange={(v) => set("tone", v)} items={[{ value: "formal", label: to("toneFormal") }, { value: "friendly", label: to("toneFriendly") }, { value: "plain", label: to("tonePlain") }]} />)}
      {row(to("length"), <SegmentedControl size="sm" value={o.length} onChange={(v) => set("length", v)} items={[{ value: "short", label: to("lengthShort") }, { value: "normal", label: to("lengthNormal") }, { value: "detailed", label: to("lengthDetailed") }]} />)}
      {row(to("focus"), <SegmentedControl size="sm" value={o.focus} onChange={(v) => set("focus", v)} items={[{ value: "outcome", label: to("focusOutcome") }, { value: "process", label: to("focusProcess") }, { value: "reader", label: to("focusReader") }]} />)}
      {row(to("keywords"), <SegmentedControl size="sm" value={String(o.keywords) as "0" | "3" | "5"} onChange={(v) => set("keywords", Number(v) as 0 | 3 | 5)} items={[{ value: "0", label: to("keywordsNone") }, { value: "3", label: "3" }, { value: "5", label: "5" }]} />)}
      {row(to("note"), <Switch size="sm" checked={o.note} onCheckedChange={(v) => set("note", v)} />)}
      {/* 생성 값 — 공급자 · temperature · 출력 토큰. 문체 옵션과 줄로 가른다 */}
      <hr className={styles.optDivider} />
      {row(to("provider"), <Select size="sm" value={o.provider} onChange={(v) => set("provider", v as SummaryOptions["provider"])} options={[{ value: "auto", label: to("providerAuto") }, { value: "gemini", label: "Gemini" }, { value: "openai", label: "OpenAI" }, { value: "groq", label: "Groq" }, { value: "claude", label: "Claude" }]} />)}
      {row(to("temperature"), (
        <span className={styles.optTemp}>
          <Switch size="sm" label={to("temperatureAuto")} checked={o.temperature === null} onCheckedChange={(auto) => set("temperature", auto ? null : 0.7)} />
          {o.temperature !== null && (
            <>
              <Slider className={styles.optSlider} min={0} max={1} step={0.05} value={[o.temperature]} onValueChange={([v]) => set("temperature", Math.round(v * 100) / 100)} />
              <span className={styles.optValue}>{o.temperature.toFixed(2)}</span>
            </>
          )}
        </span>
      ))}
      {row(to("maxTokens"), <SegmentedControl size="sm" value={String(o.maxTokens) as "512" | "1024" | "2048"} onChange={(v) => set("maxTokens", Number(v) as 512 | 1024 | 2048)} items={[{ value: "512", label: "512" }, { value: "1024", label: "1024" }, { value: "2048", label: "2048" }]} />)}
      <p className={styles.optHint}>{to("genHint")}</p>
      <Textarea value={o.instruction} onChange={(v) => set("instruction", v)} placeholder={to("instructionPlaceholder")} rows={2} maxHint={300} />
    </>
  );
}

/** 사이트 기본값 — 설정 › 서비스에서 정한 요약 옵션(없거나 이상하면 코드 기본값) */
export function useSiteSummaryDefaults(): SummaryOptions {
  const config = useSiteConfig();
  return sanitizeSummaryOptions((config?.aiSummary as { options?: unknown } | undefined)?.options);
}

export default function AiSummaryOptions({ onSubmit, submitLabel }: { onSubmit: (o: SummaryOptions) => void; submitLabel: string }) {
  const { t } = useLanguage();
  const siteDefaults = useSiteSummaryDefaults();
  const [o, setO] = useState<SummaryOptions>(() => loadSummaryOptions() ?? siteDefaults);
  return (
    <div className={styles.options}>
      <SummaryOptionsForm value={o} onChange={setO} />
      <div className={styles.optActions}>
        {/* 기본값 = 설정 › 서비스의 사이트 기본값 */}
        <Button variant="ghost" size="sm" shape="capsule" onClick={() => setO(siteDefaults)} soundDisabled>{t("admin.aiSummaryField.options.reset")}</Button>
        <Button variant="primary" size="sm" shape="capsule" icon={<Sparkles size={14} strokeWidth={1.75} />} onClick={() => { saveSummaryOptions(o); onSubmit(o); }} soundDisabled>{submitLabel}</Button>
      </div>
    </div>
  );
}
