"use client";

/* AI 요약 옵션 — 노션식 칩 한 줄. 칩마다 "이름 · 지금 값" 만 보이고, 누르면 작은 목록에서 고른다.
   내용 칩(말투 · 분량 · 초점 · 키워드 · 한계·주의) + 추가 지시, 생성 칩(공급자 · temperature · 토큰)은 따로 묶는다.
   SummaryOptionsForm 은 값만 다루는 틀이라 두 곳이 같이 쓴다:
   - 설정 › 서비스의 AI 자동 요약 — 사이트 기본값(발행 때 자동 요약 · 방문자의 첫 생성이 쓴다). 생성 칩까지 늘 보인다
   - 편집기 "다시 만들기" 팝오버(AiSummaryOptions) — 이번 요청만. 생성 칩은 아래 ⚙ 단추로 펼친다.
     처음엔 브라우저에 남은 값, 없으면 사이트 기본값으로 연다 */
import { useState } from "react";
import { SlidersHorizontal } from "@/components/icons";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import Tooltip from "@/components/ui/Tooltip";
import { sanitizeSummaryOptions, type SummaryOptions } from "@/lib/ai/summary";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { loadSummaryOptions, saveSummaryOptions } from "./summaryOptionsStore";
import styles from "./AiSummaryField.module.css";

type ChipOption = { value: string; label: string };

/** 칩 하나 — "이름 지금 값 ›". 목록에 설명(describe)이 있으면 옵션 아래 한 줄로 */
function OptChip({ name, value, options, onChange, describe }: {
  name: string;
  value: string;
  options: ChipOption[];
  onChange: (v: string) => void;
  describe?: (value: string) => string;
}) {
  return (
    <Select
      value={value}
      options={options}
      onChange={onChange}
      showCheck
      triggerClassName={styles.chipTrigger}
      renderValue={(opt) => (
        <span className={styles.chipValue}>
          <span className={styles.chipName}>{name}</span>
          {opt?.label}
        </span>
      )}
      renderOption={describe ? (opt) => (
        <span className={styles.chipOption}>
          <span>{opt.label}</span>
          <span className={styles.chipOptionDesc}>{describe(opt.value)}</span>
        </span>
      ) : undefined}
    />
  );
}

/** temperature 칩의 값 — 자동 + 몇 개의 고정 값. 예전에 슬라이더로 고른 값이면 목록에 끼워 둔다 */
const TEMPS = [0, 0.2, 0.5, 0.7, 1];

export function SummaryOptionsForm({ value: o, onChange, showGeneration = true, inline = false }: {
  value: SummaryOptions;
  onChange: (next: SummaryOptions) => void;
  /** 생성 칩(공급자 · temperature · 토큰)을 보일지 — 편집기 팝오버는 ⚙ 로 펼친다 */
  showGeneration?: boolean;
  /** 팝오버가 아니라 페이지(설정 화면) 안 — 안쪽 여백 없이 제목과 왼쪽을 맞춘다 */
  inline?: boolean;
}) {
  const { t } = useLanguage();
  const to = (k: string) => t(`admin.aiSummaryField.options.${k}`);
  const set = <K extends keyof SummaryOptions>(k: K, v: SummaryOptions[K]) => onChange({ ...o, [k]: v });
  const temps = o.temperature !== null && !TEMPS.includes(o.temperature) ? [...TEMPS, o.temperature].sort((a, b) => a - b) : TEMPS;
  return (
    <div className={styles.optForm} data-inline={inline ? "" : undefined}>
      <div className={styles.chipRow}>
        <OptChip name={to("tone")} value={o.tone} onChange={(v) => set("tone", v as SummaryOptions["tone"])}
          options={[{ value: "formal", label: to("toneFormal") }, { value: "friendly", label: to("toneFriendly") }, { value: "plain", label: to("tonePlain") }]} />
        <OptChip name={to("length")} value={o.length} onChange={(v) => set("length", v as SummaryOptions["length"])}
          options={[{ value: "short", label: to("lengthShort") }, { value: "normal", label: to("lengthNormal") }, { value: "detailed", label: to("lengthDetailed") }]} />
        <OptChip name={to("focus")} value={o.focus} onChange={(v) => set("focus", v as SummaryOptions["focus"])}
          describe={(v) => to(`focusDesc.${v}`)}
          options={[{ value: "auto", label: to("focusAuto") }, { value: "outcome", label: to("focusOutcome") }, { value: "process", label: to("focusProcess") }, { value: "reader", label: to("focusReader") }]} />
        <OptChip name={to("keywords")} value={String(o.keywords)} onChange={(v) => set("keywords", Number(v) as 0 | 3 | 5)}
          options={[{ value: "0", label: to("keywordsNone") }, { value: "3", label: "3" }, { value: "5", label: "5" }]} />
        <OptChip name={to("note")} value={o.note ? "on" : "off"} onChange={(v) => set("note", v === "on")}
          describe={(v) => to(v === "on" ? "noteOnDesc" : "noteOffDesc")}
          options={[{ value: "on", label: to("noteOn") }, { value: "off", label: to("noteOff") }]} />
      </div>

      {showGeneration && (
        <div className={styles.chipRow} data-generation="">
          <OptChip name={to("provider")} value={o.provider} onChange={(v) => set("provider", v as SummaryOptions["provider"])}
            options={[{ value: "auto", label: to("providerAuto") }, { value: "gemini", label: "Gemini" }, { value: "openai", label: "OpenAI" }, { value: "groq", label: "Groq" }, { value: "claude", label: "Claude" }]} />
          <OptChip name={to("temperature")} value={o.temperature === null ? "auto" : String(o.temperature)} onChange={(v) => set("temperature", v === "auto" ? null : Number(v))}
            describe={(v) => to(v === "auto" ? "temperatureAutoDesc" : "temperatureManualDesc")}
            options={[{ value: "auto", label: to("temperatureAuto") }, ...temps.map((n) => ({ value: String(n), label: n.toFixed(1) }))]} />
          <OptChip name={to("maxTokensShort")} value={String(o.maxTokens)} onChange={(v) => set("maxTokens", Number(v) as 512 | 1024 | 2048)}
            describe={() => to("maxTokensDesc")}
            options={[{ value: "512", label: "512" }, { value: "1024", label: "1024" }, { value: "2048", label: "2048" }]} />
        </div>
      )}

      <Textarea value={o.instruction} onChange={(v) => set("instruction", v)} placeholder={to("instructionPlaceholder")} rows={2} maxHint={300} />
    </div>
  );
}

/** 사이트 기본값 — 설정 › 서비스에서 정한 요약 옵션(없거나 이상하면 코드 기본값) */
export function useSiteSummaryDefaults(): SummaryOptions {
  const config = useSiteConfig();
  return sanitizeSummaryOptions((config?.aiSummary as { options?: unknown } | undefined)?.options);
}

export default function AiSummaryOptions({ onSubmit, submitLabel }: { onSubmit: (o: SummaryOptions) => void; submitLabel: string }) {
  const { t } = useLanguage();
  const to = (k: string) => t(`admin.aiSummaryField.options.${k}`);
  const siteDefaults = useSiteSummaryDefaults();
  const [o, setO] = useState<SummaryOptions>(() => loadSummaryOptions() ?? siteDefaults);
  const [gen, setGen] = useState(false);
  return (
    <div className={styles.options}>
      <SummaryOptionsForm value={o} onChange={setO} showGeneration={gen} />
      <div className={styles.optActions}>
        {/* 생성 설정(공급자 · temperature · 토큰) — 자주 안 바꿔서 접어 둔다 */}
        <Tooltip content={to("generation")}>
          <Button variant="ghost" shape="circle" icon={<SlidersHorizontal size={14} strokeWidth={1.75} />}
            aria-label={to("generation")} aria-pressed={gen} data-active={gen ? "" : undefined} className={styles.genToggle}
            onClick={() => setGen((v) => !v)} soundDisabled />
        </Tooltip>
        <span className={styles.optSpacer} />
        {/* 기본값 = 설정 › 서비스의 사이트 기본값 */}
        <Button variant="ghost" shape="capsule" onClick={() => setO(siteDefaults)} soundDisabled>{t("admin.aiSummaryField.options.reset")}</Button>
        <Button variant="primary" shape="capsule" onClick={() => { saveSummaryOptions(o); onSubmit(o); }} soundDisabled>{submitLabel}</Button>
      </div>
    </div>
  );
}
