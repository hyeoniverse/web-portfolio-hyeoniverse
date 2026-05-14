"use client";

import { useState } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import type { Series } from "@/types/post";
import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import Input from "@/components/ui/Input";
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
  return (
    <div className={styles.seriesDeleteModal}>
      <p className={styles.seriesDeleteHint}>{t("admin.posts.seriesDeleteHint")}</p>
      <label className={styles.seriesDeleteCheck}>
        <Checkbox checked={deletePosts} onChange={setDeletePosts} shape="square" />
        {t("admin.posts.seriesDeleteWithPosts")}
      </label>
      <Input
        size="sm"
        placeholder={series.title}
        value={input}
        onChange={setInput}
        onKeyDown={(e) => { if (e.key === "Enter" && valid) onConfirm(deletePosts); }}
      />
      <div className={styles.seriesDeleteActions}>
        <Button variant="outline" size="xs" onClick={onCancel}>{t("admin.posts.seriesModal.cancel")}</Button>
        <Button variant="primary" size="xs" tone="danger" disabled={!valid} onClick={() => onConfirm(deletePosts)}>{t("admin.posts.delete")}</Button>
      </div>
    </div>
  );
}
