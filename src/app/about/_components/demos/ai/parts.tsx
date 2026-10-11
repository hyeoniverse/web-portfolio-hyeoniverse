"use client";

/* 네 데모가 함께 쓰는 조각 — 남은 횟수 칩, 안내 줄, 상태 줄, 고칠 수 있는 예시 글 */
import { useState, type ReactNode } from "react";
import { Info } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import type { L10n } from "../../../_data/showcase";
import { useL } from "../../features/shared";
import { common, DEFAULT_PER_IP, type DemoKind } from "./data";
import type { Quota } from "./useDemoApi";
import styles from "./AiDemos.module.css";

/** 하루 상한 — 받기 전에는 기본값 */
export const perIpOf = (quota: Quota | null, kind: DemoKind) => quota?.perIp || DEFAULT_PER_IP[kind];

/** 남은 횟수 칩 — 받기 전(서버가 아직 없을 때 포함)에는 하루 상한을 */
export function QuotaChip({ quota, kind }: { quota: Quota | null; kind: DemoKind }) {
  const L = useL();
  return (
    <span className={styles.chip} data-empty={quota?.remaining === 0 || quota?.unavailable || undefined}>
      {L(quota?.unavailable ? common.offNow : quota ? common.remaining(quota.remaining) : common.perDay(perIpOf(quota, kind)))}
    </span>
  );
}

/** 공급자 칩 */
export function Chip({ children }: { children: ReactNode }) {
  return <span className={styles.chip}>{children}</span>;
}

/** 실제로 부른다는 안내 */
export function LiveInfo({ text }: { text: L10n }) {
  const L = useL();
  return (
    <p className={styles.info}>
      <Info size={14} aria-hidden className={styles.infoIcon} />
      <span>{L(text)}</span>
    </p>
  );
}

/** 상태 줄 — 오류면 붉게. 화면 읽기 프로그램이 바뀔 때마다 읽는다 */
export function StatusLine({ error, children }: { error?: string | null; children: ReactNode }) {
  return (
    <p className={styles.status} role="status" data-error={error ? true : undefined}>
      {error ?? children}
    </p>
  );
}

/** 고칠 수 있는 예시 글 — 손대기 전에는 사이트 언어를 따라 예시가 바뀌고, 고친 뒤에는 그대로 둔다 */
export function useSampleText(sample: L10n) {
  const { language } = useLanguage();
  const [own, setOwn] = useState<string | null>(null);
  return [own ?? sample[language], setOwn] as const;
}

/** 서버로 보내기 전 화면에서 막을 이유 — 없으면 null */
export function blockReason(text: string, max: number, quota: Quota | null): L10n | null {
  if (!text.trim()) return common.empty;
  if ([...text].length > max) return common.tooLong(max);
  if (quota?.remaining === 0) return common.usedUp;
  return null;
}
