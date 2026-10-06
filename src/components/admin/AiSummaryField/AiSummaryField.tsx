"use client";

/* 편집기의 AI 요약 칸 — 저장된 요약(한 줄 + 핵심)을 보여 주고 다시 만든다. 손으로 고치는 칸이 아니다(요약은 AI 만 쓴다).
   "설명(excerpt · description)" 과 다른 값이라 라벨에 AI 를 붙이고, 공개 페이지의 요약 절과 똑같이(글자 크기까지) 그린다 — 미리보기가 곧 공개 화면이다 */
import { Sparkles, RefreshCw } from "@/components/icons";
import Button from "@/components/ui/Button";
import Tooltip from "@/components/ui/Tooltip";
import { SummaryBody } from "@/components/ui/AISummary";
import { parseStoredSummary } from "@/lib/ai/summary";
import { useLanguage } from "@/providers/LanguageProvider";
import { adminEditorStyles as es } from "@/components/admin/AdminEditorShell";
import styles from "./AiSummaryField.module.css";

export default function AiSummaryField({ value, lang, onRegenerate, busy, disabled, disabledReason }: {
  /** 저장된 요약(JSON 또는 예전 줄글) — 편집 언어 쪽 */
  value: string;
  lang: "ko" | "en";
  /** 다시 만들기 — 없으면(새 글 저장 전) 단추를 숨긴다 */
  onRegenerate?: () => void;
  busy?: boolean;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const { t } = useLanguage();
  const ta = (k: string) => t(`admin.aiSummaryField.${k}`);
  const summary = parseStoredSummary(value);
  return (
    <div className={es.field}>
      <div className={styles.head}>
        <label className={es.fieldLabel}>
          <Sparkles size={14} strokeWidth={1.5} className={styles.icon} aria-hidden />
          {ta("label")}
        </label>
        {onRegenerate && (
          <Tooltip content={disabled && disabledReason ? disabledReason : ta(summary ? "regenerate" : "generate")}>
            <Button variant="ghost" size="xs" shape="capsule" onClick={onRegenerate} loading={busy} disabled={disabled} soundDisabled icon={<RefreshCw size={12} strokeWidth={2} />}>
              {ta(summary ? "regenerate" : "generate")}
            </Button>
          </Tooltip>
        )}
      </div>
      <div className={styles.box} data-empty={summary ? undefined : ""} lang={lang}>
        {summary ? <SummaryBody summary={summary} /> : <p className={styles.empty}>{ta(onRegenerate ? "empty" : "emptyUnsaved")}</p>}
      </div>
    </div>
  );
}
