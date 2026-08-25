"use client";

import { useContext, useState } from "react";
import { createPortal } from "react-dom";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { ModalFooterContext } from "@/components/ui/Modal";
import { useLanguage } from "@/providers/LanguageProvider";
import { useModalStore } from "@/stores/modalStore";
import type { BilingualCategory } from "@/hooks/useCategories";
import { toCategoryOptions, findCategoryNode } from "@/lib/categoryTree";
import styles from "./BulkCategoryModal.module.css";

/**
 * 일괄 카테고리 변경 모달
 * - 선택한 N개 항목의 category 필드를 한 번에 변경
 * - 빈 값 선택 시 카테고리 해제
 */
interface BulkCategoryModalProps {
  count: number;
  categories: BilingualCategory[];
  /** 빈 값(category 해제) 선택 시 null 전달, 아니면 선택된 BilingualCategory 전달 */
  onConfirm: (category: BilingualCategory | null) => void | Promise<void>;
}

export default function BulkCategoryModal({ count, categories, onConfirm }: BulkCategoryModalProps) {
  const { t, language } = useLanguage();
  const { closeAll } = useModalStore();
  const [value, setValue] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const footerEl = useContext(ModalFooterContext);

  const options = [
    { value: "", label: t("admin.common.unset") || "—" },
    ...toCategoryOptions(categories, language === "ko" ? "ko" : "en"),
  ];

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const picked = value ? findCategoryNode(categories, value) : null;
      await onConfirm(picked);
      closeAll();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.body}>
      <p className={styles.desc}>
        {t("admin.common.bulkCategoryDesc").replace("{{count}}", String(count))}
      </p>
      <Select value={value} options={options} onChange={setValue} />
      {footerEl && createPortal(
        <>
          <Button variant="ghost" size="sm" onClick={closeAll} disabled={submitting}>
            {t("admin.posts.cancel")}
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "..." : t("admin.common.apply") || "Apply"}
          </Button>
        </>,
        footerEl,
      )}
    </div>
  );
}
