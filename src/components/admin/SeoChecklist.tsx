"use client";

import { Check, AlertTriangle, ChevronRight, Sparkles } from "lucide-react";
import { useLanguage } from "@/providers/LanguageProvider";
import styles from "./SeoChecklist.module.css";

/** 게시물·작품 편집 시 SEO/메타 필드 누락 점검을 위한 작은 체크리스트 위젯.
 *  데이터 무관, 단순히 form 값의 truthy 여부 + 길이 등으로 판단. */
export interface SeoCheckData {
  title?: string;
  slug?: string;
  excerpt?: string;
  cover?: string;
  category?: string;
  tagsCount?: number;
}

export type SeoCheckId = "title" | "slug" | "excerpt" | "cover" | "category" | "tags";

interface SeoChecklistProps {
  data: SeoCheckData;
  /** 항목 클릭 시 호출 — 해당 필드로 스크롤 등의 동작을 부모가 담당 */
  onItemClick?: (id: SeoCheckId) => void;
  className?: string;
}

export default function SeoChecklist({ data, onItemClick, className }: SeoChecklistProps) {
  const { t } = useLanguage();

  const checks: { id: SeoCheckId; label: string; ok: boolean; warn?: boolean; hint?: string }[] = [
    {
      id: "title",
      label: t("admin.seoChecklist.title") || "Title",
      ok: !!(data.title && data.title.trim().length > 0),
    },
    {
      id: "slug",
      label: t("admin.seoChecklist.slug") || "Slug",
      ok: !!(data.slug && /^[a-z0-9-]+$/i.test(data.slug)),
      warn: !!(data.slug && !/^[a-z0-9-]+$/i.test(data.slug)),
      hint: data.slug && !/^[a-z0-9-]+$/i.test(data.slug)
        ? t("admin.seoChecklist.slugHint")
        : undefined,
    },
    {
      id: "excerpt",
      label: t("admin.seoChecklist.excerpt") || "Description",
      ok: !!(data.excerpt && data.excerpt.trim().length >= 30),
      warn: !!(data.excerpt && data.excerpt.trim().length > 0 && data.excerpt.trim().length < 30),
      hint: data.excerpt && data.excerpt.trim().length < 30 && data.excerpt.trim().length > 0
        ? t("admin.seoChecklist.excerptShort")
        : undefined,
    },
    {
      id: "cover",
      label: t("admin.seoChecklist.cover") || "Cover image",
      ok: !!data.cover,
    },
    {
      id: "category",
      label: t("admin.seoChecklist.category") || "Category",
      ok: !!data.category,
    },
    {
      id: "tags",
      label: t("admin.seoChecklist.tags") || "Tags",
      ok: (data.tagsCount ?? 0) > 0,
    },
  ];

  const passed = checks.filter((c) => c.ok).length;
  const total = checks.length;
  const score = Math.round((passed / total) * 100);
  const tone = score === 100 ? "full" : score >= 60 ? "ok" : "low";

  return (
    <section
      className={`${styles.wrap} ${styles[`tone-${tone}`]} ${className ?? ""}`}
      aria-label="SEO checklist"
    >
      <header className={styles.head}>
        <div className={styles.heading}>
          <Sparkles className={styles.headIcon} size={13} strokeWidth={2} />
          <span className={styles.headLabel}>
            {t("admin.seoChecklist.heading") || "SEO check"}
          </span>
        </div>
        <div className={styles.score}>
          <span className={styles.scoreCount}>{passed}<span className={styles.scoreSep}>/</span>{total}</span>
        </div>
      </header>

      <div className={styles.bar} aria-hidden>
        <div className={styles.barFill} style={{ width: `${score}%` }} />
      </div>

      <ul className={styles.list}>
        {checks.map((c) => {
          const state = c.ok ? "ok" : c.warn ? "warn" : "fail";
          const interactive = !!onItemClick;
          const itemClass = `${styles.item} ${styles[`item-${state}`]} ${interactive ? styles.itemInteractive : ""}`;

          const inner = (
            <>
              <span className={styles.icon} aria-hidden>
                {c.ok ? (
                  <Check size={11} strokeWidth={3} />
                ) : c.warn ? (
                  <AlertTriangle size={11} strokeWidth={2.5} />
                ) : (
                  <span className={styles.iconDot} />
                )}
              </span>
              <span className={styles.label}>{c.label}</span>
              {c.hint && <span className={styles.hint}>{c.hint}</span>}
              {interactive && <ChevronRight className={styles.arrow} size={12} strokeWidth={2} />}
            </>
          );

          return (
            <li key={c.id}>
              {interactive ? (
                <button
                  type="button"
                  className={itemClass}
                  onClick={() => onItemClick(c.id)}
                  data-clickable="true"
                >
                  {inner}
                </button>
              ) : (
                <div className={itemClass}>{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
