"use client";

// ── 저장 충돌(낙관적 동시성) 다이얼로그 ──
// 다른 기기/탭에서 이미 저장돼 version 이 어긋났을 때: 덮어쓰기 / 최신 불러오기 / 취소.
import Button from "@/components/ui/Button";
import styles from "./SaveConflictDialog.module.css";

export default function SaveConflictDialog({
  language,
  onOverwrite,
  onReload,
  onCancel,
}: {
  language: string;
  onOverwrite: () => void;
  onReload: () => void;
  onCancel: () => void;
}) {
  const t = (ko: string, en: string) => (language === "ko" ? ko : en);
  return (
    <div className={styles.dialog}>
      <p className={styles.text}>
        {t(
          "다른 기기나 탭에서 이 글이 먼저 저장됐어요. 지금 저장하면 그 변경을 덮어씁니다.",
          "This post was saved elsewhere (another device or tab) first. Saving now will overwrite those changes.",
        )}
      </p>
      <div className={styles.actions}>
        <Button size="sm" variant="ghost" onClick={onCancel}>{t("취소", "Cancel")}</Button>
        <Button size="sm" variant="subtle" onClick={onReload}>{t("최신 불러오기", "Load latest")}</Button>
        <Button size="sm" tone="danger" onClick={onOverwrite}>{t("덮어쓰기", "Overwrite")}</Button>
      </div>
    </div>
  );
}
