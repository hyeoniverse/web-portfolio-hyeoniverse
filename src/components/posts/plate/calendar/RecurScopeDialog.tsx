"use client";

// ── 반복 일정 부분 변경(시간 등) 적용 범위 선택 다이얼로그 ──
// 라디오로 범위 선택 후 "확인". "이 일정만"은 반복에서 분리되므로 한 번 더 경고 후 적용. 취소 가능.
import React from "react";
import RadioGroup from "@/components/ui/RadioGroup";
import Button from "@/components/ui/Button";
import styles from "./Calendar.module.css";

export type TimeScope = "this" | "all";

export default function RecurScopeDialog({
  language, message, onConfirm, onCancel,
}: {
  language: string;
  message: string;
  onConfirm: (scope: TimeScope) => void;
  onCancel: () => void;
}) {
  const t = (ko: string, en: string) => (language === "ko" ? ko : en);
  const [step, setStep] = React.useState<"select" | "warn">("select");
  const [scope, setScope] = React.useState<TimeScope>("all");

  // "이 일정만" 선택 시 반복 분리 경고 단계
  if (step === "warn") {
    return (
      <div className={styles.scopeDialog}>
        <p className={styles.scopeDialogText}>
          {t("이 일정만 변경하면 해당 회차가 반복에서 분리돼 독립 일정이 됩니다. 계속할까요?",
            "Changing only this event detaches it from the series as a standalone event. Continue?")}
        </p>
        <div className={styles.scopeDialogFooter}>
          <Button size="sm" variant="ghost" onClick={() => setStep("select")}>{t("뒤로", "Back")}</Button>
          <Button size="sm" onClick={() => onConfirm("this")}>{t("확인", "Confirm")}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.scopeDialog}>
      <p className={styles.scopeDialogText}>{message}</p>
      <RadioGroup<TimeScope>
        direction="horizontal"
        value={scope}
        onChange={setScope}
        options={[
          { value: "this", label: t("이 일정만", "This event") },
          { value: "all", label: t("전체 일정", "All events") },
        ]}
      />
      <div className={styles.scopeDialogFooter}>
        <Button size="sm" variant="ghost" onClick={onCancel}>{t("취소", "Cancel")}</Button>
        <Button size="sm" onClick={() => (scope === "this" ? setStep("warn") : onConfirm("all"))}>{t("확인", "Confirm")}</Button>
      </div>
    </div>
  );
}
