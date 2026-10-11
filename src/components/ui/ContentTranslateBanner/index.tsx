"use client";

import { Languages } from "@/components/icons";
import Pressable from "@/components/ui/Pressable";
import LoadingDots from "@/components/ui/LoadingDots";
import type { ReactNode } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import { fillTemplate } from "@/utils/format";
import { localLangName } from "@/utils/localLangName";
import type { ContentTranslateError } from "@/hooks/useContentTranslation";
import styles from "./ContentTranslateBanner.module.css";

/**
 * "다른 언어로 읽기" 중일 때 본문 위의 한 줄 — 기계 번역 안내 · 번역 중 · 실패와 원문 보기.
 * 글·작업물 상세가 같이 쓴다. 보이는 조건(targetLang 이 있을 때)은 부모가 판단한다.
 */
export default function ContentTranslateBanner({
  lang,
  translating,
  error,
  onShowOriginal,
  onRetry,
}: {
  lang: string;
  translating: boolean;
  error: ContentTranslateError | null;
  onShowOriginal: () => void;
  onRetry: () => void;
}) {
  const { t, language } = useLanguage();
  const name = localLangName(lang, language);
  const message = error
    ? t(error === "rateLimited" ? "contentTranslate.rateLimited" : "contentTranslate.failed")
    : fillTemplate(t(translating ? "contentTranslate.translating" : "contentTranslate.notice"), { lang: name });

  return (
    <div className={styles.banner} role="status" aria-live="polite" data-error={error ? "" : undefined} data-busy={translating && !error ? "" : undefined}>
      <Languages className={styles.icon} size={14} aria-hidden />
      <p className={styles.message}>
        {message}
        {translating && !error && <LoadingDots className={styles.dots} />}
      </p>
      <div className={styles.actions}>
        {error && (
          <Pressable type="button" className={styles.action} onClick={onRetry}>
            {t("contentTranslate.retry")}
          </Pressable>
        )}
        <Pressable type="button" className={styles.action} onClick={onShowOriginal}>
          {t("contentTranslate.showOriginal")}
        </Pressable>
      </div>
    </div>
  );
}

/**
 * 번역이 오면 바뀔 자리 — 받아 오는 동안 흐리게 숨 쉬듯 깜빡여 "곧 바뀐다"를 알린다.
 * 읽기는 막지 않는다(원문은 그대로 보인다). 동작 줄이기 설정이면 흐리기만 한다.
 */
export function TranslatingRegion({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <div className={styles.region} data-active={active ? "" : undefined} aria-busy={active || undefined}>
      {children}
    </div>
  );
}
