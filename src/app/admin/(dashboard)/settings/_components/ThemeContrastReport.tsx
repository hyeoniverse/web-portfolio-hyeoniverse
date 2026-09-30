"use client";

import { useMemo } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import { auditTheme, type AuditKey, type AuditStatus, type ThemeColors, type Verdict } from "@/lib/themeAudit";
import styles from "./ThemeTools.module.css";

const ROWS: AuditKey[] = ["body", "muted", "link", "graphic", "button", "distinct"];
const STATUS_CLASS: Record<AuditStatus, string> = { pass: styles.pass, warn: styles.warn, fail: styles.fail };
const VERDICT_STATUS: Record<Verdict, AuditStatus> = { good: "pass", caution: "warn", poor: "fail" };

/** 테마 전체 판정 칩 — 점검표 머리와 추천 카드가 같이 쓴다 */
export function VerdictChip({ theme }: { theme: ThemeColors }) {
  const { t } = useLanguage();
  const audit = useMemo(() => auditTheme(theme), [theme]);
  const label = audit.verdict === "caution" ? `${t("admin.settings.themeTools.caution")} ${audit.issues}` : t(`admin.settings.themeTools.${audit.verdict}`);
  return <span className={`${styles.chip} ${STATUS_CLASS[VERDICT_STATUS[audit.verdict]]}`}>{label}</span>;
}

/**
 * 지금 고른 테마 색의 WCAG 대비 점검표. 라이트·다크 두 열, 항목마다 대비와 등급.
 * 흐린 글자·강조 링크는 사이트가 자동으로 맞춘 뒤의 색으로 잰다 — 실제로 보이는 값.
 */
export default function ThemeContrastReport({ theme }: { theme: ThemeColors }) {
  const { t } = useLanguage();
  const k = (key: string) => t(`admin.settings.themeTools.${key}`);
  const audit = useMemo(() => auditTheme(theme), [theme]);
  const summary = audit.verdict === "good" ? k("summaryGood") : audit.verdict === "poor" ? k("summaryPoor") : k("summaryCaution").replace("{{count}}", String(audit.issues));

  return (
    <div className={styles.report}>
      <div className={styles.reportHead}>
        <span className={styles.reportTitle}>{k("title")}</span>
        <VerdictChip theme={theme} />
        <span className={styles.reportSummary}>{summary}</span>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">{k("item")}</th>
              <th scope="col">{k("light")}</th>
              <th scope="col">{k("dark")}</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((key) => (
              <tr key={key}>
                <th scope="row">
                  <span className={styles.rowLabel}>
                    <span>{k(key)}</span>
                    <span className={styles.rowHint}>{k(`${key}Hint`)}</span>
                  </span>
                </th>
                {audit.modes.map((m) => {
                  const row = m.rows.find((r) => r.key === key)!;
                  return (
                    <td key={m.mode}>
                      <span className={styles.cell}>
                        <span className={styles.value}>{key === "distinct" ? row.value.toFixed(0) : `${row.value.toFixed(1)}:1`}</span>
                        <span className={`${styles.chip} ${STATUS_CLASS[row.status]}`}>{row.grade === "미달" ? k("fail") : row.grade ?? (row.status === "pass" ? "OK" : row.status === "warn" ? k("caution") : k("fail"))}</span>
                        {row.corrected && <span className={styles.corrected}>{k("corrected")}</span>}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
