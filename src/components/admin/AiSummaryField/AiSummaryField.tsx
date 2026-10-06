"use client";

/* 편집기의 AI 요약 칸 — 저장된 요약(한 줄 + 핵심)을 보여 주고 다시 만든다. 손으로 고치는 칸이 아니다(요약은 AI 만 쓴다).
   "설명(excerpt · description)" 과 다른 값이라 라벨에 AI 를 붙이고, 공개 페이지의 요약 절과 똑같이(글자 크기까지) 그린다 — 미리보기가 곧 공개 화면이다 */
import { useState } from "react";
import { Sparkles, RefreshCw } from "@/components/icons";
import Button from "@/components/ui/Button";
import Popover from "@/components/ui/Popover";
import Tooltip from "@/components/ui/Tooltip";
import type { SummaryOptions } from "@/lib/ai/summary";
import AiSummaryOptions from "./AiSummaryOptions";
import { SummaryBody } from "@/components/ui/AISummary";
import { parseStoredSummary } from "@/lib/ai/summary";
import { useLanguage } from "@/providers/LanguageProvider";
import { adminEditorStyles as es } from "@/components/admin/AdminEditorShell";
import styles from "./AiSummaryField.module.css";

export default function AiSummaryField({ value, lang, onRegenerate, busy, disabled, disabledReason }: {
  /** 저장된 요약(JSON 또는 예전 줄글) — 편집 언어 쪽 */
  value: string;
  lang: "ko" | "en";
  /** 다시 만들기 — 고른 옵션과 함께. 없으면(새 글 저장 전) 단추를 숨긴다 */
  onRegenerate?: (options: SummaryOptions) => void;
  busy?: boolean;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const { t } = useLanguage();
  const ta = (k: string) => t(`admin.aiSummaryField.${k}`);
  const summary = parseStoredSummary(value);
  const [open, setOpen] = useState(false);
  const actionLabel = ta(summary ? "regenerate" : "generate");
  return (
    <div className={es.field}>
      <div className={styles.head}>
        <label className={es.fieldLabel}>
          <Sparkles size={14} strokeWidth={1.5} className={styles.icon} aria-hidden />
          {ta("label")}
        </label>
        {/* 다시 만들기 — 누르면 옵션 팝오버(말투 · 분량 · 초점 · 키워드 · 덧붙임 · 추가 지시)가 열리고 거기서 만든다 */}
        {onRegenerate && (
          <Popover
            open={open}
            onOpenChange={setOpen}
            placement="bottom-end"
            sheetTitle={ta("options.title")}
            trigger={
              <Tooltip content={disabled && disabledReason ? disabledReason : actionLabel} disabled={open}>
                <Button variant="ghost" size="xs" shape="capsule" loading={busy} disabled={disabled} soundDisabled icon={<RefreshCw size={12} strokeWidth={2} />}>
                  {actionLabel}
                </Button>
              </Tooltip>
            }
          >
            {({ close }) => <AiSummaryOptions submitLabel={actionLabel} onSubmit={(o) => { close(); onRegenerate(o); }} />}
          </Popover>
        )}
      </div>
      <div className={styles.box} data-empty={summary ? undefined : ""} lang={lang}>
        {summary ? <SummaryBody summary={summary} /> : <p className={styles.empty}>{ta(onRegenerate ? "empty" : "emptyUnsaved")}</p>}
      </div>
    </div>
  );
}
