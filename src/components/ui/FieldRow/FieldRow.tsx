import type { ReactNode } from "react";
import { HelpCircle } from "@/components/icons";
import Tooltip from "@/components/ui/Tooltip";
import { cn } from "@/utils/cn";
import styles from "./FieldRow.module.css";

interface FieldRowProps {
  /** 라벨 (텍스트 또는 <T> 등) */
  label: ReactNode;
  /** 라벨 아래 보조 설명 (작은 글씨) */
  hint?: ReactNode;
  /** 라벨 옆 ? 도움말 — hover 시 Tooltip 으로 노출 */
  help?: ReactNode;
  /** control 을 라벨에 겹쳐 배치하는 변형 */
  inline?: boolean;
  /** 행 컨테이너에 추가할 클래스 (레이아웃 override 등) */
  className?: string;
  /** 폼 control (Select · Switch · SegmentedControl · 커스텀 등 무엇이든) */
  children: ReactNode;
}

/**
 * 라벨 + 임의 control 을 묶는 폼 행.
 *
 * `SettingsFormFields` 의 `Field` 는 텍스트 입력 전용(내부에서 Input/Textarea 렌더)이라,
 * Select·Switch 같은 다른 control 을 담을 땐 매번 `<div className={styles.fieldRow}>` 를
 * 손으로 짰다. 그 raw 패턴을 공통화한다.
 */
export default function FieldRow({ label, hint, help, inline, className, children }: FieldRowProps) {
  return (
    <div className={cn(styles.fieldRow, inline && styles.fieldRowInline, className)}>
      <label className={styles.fieldLabel}>
        <span className={styles.fieldLabelText}>
          {label}
          {help != null && (
            <Tooltip content={help} placement="top">
              <span className={styles.fieldHelp} role="button" tabIndex={0} aria-label="설명">
                <HelpCircle size={13} />
              </span>
            </Tooltip>
          )}
        </span>
        {hint != null && <span className={styles.fieldLabelHint}>{hint}</span>}
      </label>
      {children}
    </div>
  );
}
