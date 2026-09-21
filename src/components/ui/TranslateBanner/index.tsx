"use client";

import T from "@/components/ui/T";
import Button from "@/components/ui/Button";
import { Languages } from "@/components/icons";
import styles from "./TranslateBanner.module.css";

/* 보고 있는 언어의 본문이 없을 때 — 안내 + 자동 번역 버튼(실패하면 메시지). 표시 조건(needsTranslation && translationEnabled)은 부모가 판단.
   글·작업물 상세가 같이 쓴다. 안내 문구만 무엇을 보고 있는지(subject)에 따라 다르다 */
export default function TranslateBanner({
  viewLang,
  translating,
  error,
  onTranslate,
  subject = "post",
}: {
  viewLang: "ko" | "en";
  translating: boolean;
  error: boolean;
  onTranslate: () => void;
  subject?: "post" | "work";
}) {
  const notice = subject === "work"
    ? (viewLang === "en" ? "workDetail.noTranslationEn" : "workDetail.noTranslationKo")
    : (viewLang === "en" ? "postDetail.noTranslationEn" : "postDetail.noTranslationKo");
  return (
    <div className={styles.translateBanner}>
      <Languages className={styles.translateIcon} size={16} />
      <p className={styles.translateMessage}>
        <T k={notice} />
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
