"use client";

import T from "@/components/ui/T";
import Button from "@/components/ui/Button";
import { Languages } from "@/components/icons";
import styles from "./TranslateBanner.module.css";

/* 보고 있는 언어의 본문이 없을 때 — 안내 + 자동 번역 버튼(실패하면 메시지). 표시 조건(needsTranslation && translationEnabled)은 부모가 판단. */
export default function TranslateBanner({
  viewLang,
  translating,
  error,
  onTranslate,
}: {
  viewLang: "ko" | "en";
  translating: boolean;
  error: boolean;
  onTranslate: () => void;
}) {
  return (
    <div className={styles.translateBanner}>
      <Languages className={styles.translateIcon} size={16} />
      <p className={styles.translateMessage}>
        <T k={viewLang === "en" ? "postDetail.noTranslationEn" : "postDetail.noTranslationKo"} />
      </p>
      {error ? (
        <p className={styles.translateErrorMsg}>
          <T k="postDetail.translateFailed" />
        </p>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="2xs"
          onClick={onTranslate}
          disabled={translating}
        >
          {translating
            ? <T k="postDetail.translating" />
            : <T k="postDetail.autoTranslate" />}
        </Button>
      )}
    </div>
  );
}
