"use client";

import { useContext, useState } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/providers/LanguageProvider";
import type { Series } from "@/types/post";
import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import Input from "@/components/ui/Input";
import { ModalFooterContext } from "@/components/ui/Modal";
import styles from "../Settings.module.css";

export default function SeriesDeleteModal({ series, onConfirm, onCancel }: {
  series: Series;
  onConfirm: (deletePosts: boolean) => void;
  onCancel: () => void;
}) {
  const { t } = useLanguage();
  const [deletePosts, setDeletePosts] = useState(false);
  const [input, setInput] = useState("");
  const valid = input === series.title;
  const footerEl = useContext(ModalFooterContext);
  return (
    <div className={styles.seriesDeleteModal}>
      <p className={styles.seriesDeleteHint}>{t("admin.posts.seriesDeleteHint")}</p>
      <label className={styles.seriesDeleteCheck}>
        <Checkbox checked={deletePosts} onChange={setDeletePosts} shape="square" />
        {t("admin.posts.seriesDeleteWithPosts")}
      </label>
      <Input
        size="md"
        placeholder={series.title}
        value={input}
        onChange={setInput}
        onKeyDown={(e) => { if (e.key === "Enter" && valid) onConfirm(deletePosts); }}
      />
      {footerEl && createPortal(
        <>
          <Button variant="outline" size="md" onClick={onCancel}>{t("admin.posts.seriesModal.cancel")}</Button>
          <Button variant="primary" size="md" tone="danger" disabled={!valid} onClick={() => onConfirm(deletePosts)}>{t("admin.posts.delete")}</Button>
        </>,
        footerEl,
      )}
    </div>
  );
}
