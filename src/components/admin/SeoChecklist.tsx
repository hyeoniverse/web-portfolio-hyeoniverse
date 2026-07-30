"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, AlertTriangle, ChevronRight, Sparkles } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import styles from "./SeoChecklist.module.css";

/** 게시물·작품 편집 시 SEO/메타 필드 누락 점검을 위한 floating 위젯.
 *  화면 우하단 fixed pill — 클릭 시 expand panel.
 *  통과 항목은 subtle, 미통과/경고만 prominent 로 (Card hierarchy 강화). */
interface SeoCheckData {
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
  const [open, setOpen] = useState(false);
  // SSR + 첫 client render 모두 null 을 리턴해 hydration 일치 — mount 후 portal 트리 노출
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const wrapRef = useRef<HTMLDivElement | null>(null);

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

  // 미통과 + 경고 (강조), 통과 (subtle)
  const issues = checks.filter((c) => !c.ok);
  const passedItems = checks.filter((c) => c.ok);

  // 외부 클릭 / Escape 시 닫기
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const ref = wrapRef.current;
      if (ref && !ref.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // body 에 portal 로 렌더해서 부모 stacking context (Lenis transform / mix-blend-mode 등) 우회 —
  // backdrop-filter 가 페이지 전체 콘텐츠를 blur 할 수 있게.
  // SSR + 첫 client render 는 null 로 hydration 통과 → effect 후 portal 마운트
  if (!mounted) return null;

  const tree = (
    <div ref={wrapRef} className={`${styles.wrap} ${className ?? ""}`} aria-label="SEO checklist">
      <motion.div
        layout
        className={`${styles.shell} ${styles[`tone-${tone}`]} ${open ? styles.shellOpen : ""}`}
        style={{ borderRadius: open ? 20 : 999 }}
        transition={{
          // 열림: spring (organic 한 출렁임).
          // 닫힘 2단계: (1) panel 이 충분히 작아질 때까지 width shrink → (2) borderRadius 가 capsule 로 morph
          layout: open
            ? { type: "spring", damping: 28, stiffness: 260, mass: 0.9 }
            : { duration: 0.42, ease: [0.4, 0, 0.2, 1] },
          borderRadius: open
            ? { type: "spring", damping: 28, stiffness: 260, mass: 0.9 }
            : { duration: 0.22, delay: 0.5, ease: [0.4, 0, 0.2, 1] },
        }}
        role={open ? "dialog" : undefined}
        aria-label={open ? "SEO 상세 점검" : undefined}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {open ? (
            <motion.div
              key="panel"
              className={styles.panel}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.22, delay: 0.08, ease: [0.4, 0, 0.2, 1] } }}
              // 닫기 1단계 동안 panel 콘텐츠는 빠르게 fade-out
              exit={{ opacity: 0, transition: { duration: 0.16, ease: "easeOut" } }}
            >
              {/* 헤더 — 큰 점수 강조 (E) */}
              <div className={`${styles.panelHeader} ${styles[`tone-${tone}`]}`}>
                <div className={styles.panelScoreBig}>
                  <span className={styles.panelScoreNum}>{passed}</span>
                  <span className={styles.panelScoreSepBig}>/</span>
                  <span className={styles.panelScoreTotalBig}>{total}</span>
                </div>
                <div className={styles.panelHeaderRight}>
                  <span className={styles.panelHeaderLabel}>
                    {t("admin.seoChecklist.heading") || "SEO check"}
                  </span>
                  <span className={styles.panelHeaderStatus}>
                    {tone === "full"
                      ? (t("admin.seoChecklist.statusFull") || "All set")
                      : issues.length === 1
                        ? (t("admin.seoChecklist.statusOne") || "1 item to fix")
                        : `${issues.length} ${t("admin.seoChecklist.statusMany") || "items to fix"}`}
                  </span>
                </div>
              </div>

              {/* 미통과 항목 — prominent */}
              {issues.length > 0 && (
                <ul className={styles.panelList}>
                  {issues.map((c) => {
                    const state = c.warn ? "warn" : "fail";
                    const inner = (
                      <>
                        <span className={`${styles.panelIcon} ${styles[`item-${state}`]}`} aria-hidden>
                          {c.warn ? <AlertTriangle size={11} strokeWidth={2.5} /> : <span className={styles.iconDot} />}
                        </span>
                        <span className={styles.panelLabel}>{c.label}</span>
                        {c.hint && <span className={styles.panelHint}>{c.hint}</span>}
                        {onItemClick && <ChevronRight className={styles.panelArrow} size={12} strokeWidth={2} />}
                      </>
                    );
                    return (
                      <li key={c.id}>
                        {onItemClick ? (
                          <button
                            type="button"
                            className={`${styles.panelItem} ${styles.panelItemActive}`}
                            onClick={() => { onItemClick(c.id); setOpen(false); }}
                          >
                            {inner}
                          </button>
                        ) : (
                          <div className={styles.panelItem}>{inner}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* 통과 항목 — subtle (✓ + 라벨만) */}
              {passedItems.length > 0 && (
                <div className={styles.panelPassed}>
                  <span className={styles.panelPassedLabel}>
                    {t("admin.seoChecklist.completed") || "Completed"}
                  </span>
                  <ul className={styles.panelPassedList}>
                    {passedItems.map((c) => {
                      const inner = (
                        <>
                          <Check size={10} strokeWidth={3} className={styles.panelPassedCheck} />
                          <span>{c.label}</span>
                        </>
                      );
                      return (
                        <li key={c.id} className={styles.panelPassedLi}>
                          {onItemClick ? (
                            <button
                              type="button"
                              className={`${styles.panelPassedItem} ${styles.panelPassedBtn}`}
                              onClick={() => { onItemClick(c.id); setOpen(false); }}
                            >
                              {inner}
                            </button>
                          ) : (
                            <span className={styles.panelPassedItem}>{inner}</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.button
              key="pill"
              type="button"
              className={styles.pill}
              onClick={() => setOpen(true)}
              aria-expanded={open}
              aria-haspopup="dialog"
              // 닫기 2단계 (width 0.42s + borderRadius delay 0.5s + 0.22s = 총 0.72s) 끝날 무렵 fade-in
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.18, delay: 0.62, ease: "easeOut" } }}
              exit={{ opacity: 0, transition: { duration: 0.12, ease: "easeIn" } }}
            >
              <Sparkles className={styles.pillIcon} size={13} strokeWidth={2} />
              <span className={styles.pillLabel}>SEO</span>
              <span className={styles.pillScore}>
                <span className={styles.pillScoreCount}>{passed}</span>
                <span className={styles.pillScoreSep}>/</span>
                <span className={styles.pillScoreTotal}>{total}</span>
              </span>
              <span className={styles.pillRing} style={{ "--p": score } as React.CSSProperties} aria-hidden />
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );

  return createPortal(tree, document.body);
}
