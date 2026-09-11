"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Pressable from "@/components/ui/Pressable";
import { X, ArrowRight } from "@/components/icons";
import styles from "./IndexSheet.module.css";
import { useLanguage } from "@/providers/LanguageProvider";

/* 터치 디바이스 바텀 시트 — 인덱스(시리즈 · 카테고리 · 태그)에서 카드를 탭했을 때 상세 + CTA.
   열림 state · ESC · body 스크롤 잠금은 부모의 useSheet 가 한다. show 가 false 로 바뀌어도 AnimatePresence 가
   마지막 내용을 exit 동안 유지하므로 내용 props 는 부모가 sheet?.x 로 넘겨도 된다. children 은 설명과 CTA 사이 슬롯. */
export default function IndexSheet({
  show,
  onClose,
  title,
  count,
  description,
  cta,
  children,
}: {
  show: boolean;
  onClose: () => void;
  title: ReactNode;
  count: ReactNode;
  description?: string | null;
  cta: { href: string; label: string };
  children?: ReactNode;
}) {
  const { t } = useLanguage();
  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div
            className={styles.sheetBackdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            className={styles.sheet}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            role="dialog"
            aria-modal="true"
          >
            <Pressable
              className={styles.sheetClose}
              onClick={onClose}
              aria-label={t("common.close")}
            >
              <X size={18} aria-hidden />
            </Pressable>
            <div className={styles.sheetHeader}>
              <h2 className={styles.sheetTitle}>{title}</h2>
              <span className={styles.sheetCount}>{count}</span>
            </div>
            {description ? <p className={styles.sheetDesc}>{description}</p> : null}
            {children}
            <Link
              href={cta.href}
              className={styles.sheetCta}
              onClick={onClose}
            >
              {cta.label}
              <ArrowRight size={14} aria-hidden />
            </Link>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
