"use client";

import { useState } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import { useModalStore } from "@/stores/modalStore";
import Checkbox from "@/components/ui/Checkbox";
import type { Series } from "@/types/post";
import styles from "../AdminPosts.module.css";

export function PurgeModal({ title, onConfirm }: { title: string; onConfirm: () => void }) {
  const { t } = useLanguage();
  const { closeAll } = useModalStore();
  const [input, setInput] = useState("");
  const valid = input === title;
  return (
    <div className={styles.seriesDeleteModal}>
      <p className={styles.seriesDeleteHint}>{t("admin.posts.trashPurgeHint")}</p>
      <input
        className={styles.seriesDeleteInput}
        type="text"
        placeholder={title}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && valid) { closeAll(); onConfirm(); } }}
      />
      <div className={styles.seriesDeleteActions}>
        <button className={styles.seriesDeleteCancel} onClick={closeAll}>{t("admin.posts.cancel")}</button>
        <button className={styles.seriesDeleteConfirm} disabled={!valid} onClick={() => { closeAll(); onConfirm(); }}>{t("admin.posts.trashPurge")}</button>
      </div>
    </div>
  );
}

export function SeriesDeleteModal({ series, deletePostsRef, onConfirm }: {
  series: Series;
  deletePostsRef: { current: boolean };
  onConfirm: () => void;
}) {
  const { t } = useLanguage();
  const [withPosts, setWithPosts] = useState(false);
  const [input, setInput] = useState("");
  const { closeAll } = useModalStore();
  const valid = input === series.title;

  return (
    <div className={styles.seriesDeleteModal}>
      <p className={styles.seriesDeleteHint}>{t("admin.posts.seriesDeleteHint")}</p>
      <label className={styles.seriesDeleteCheck}>
        <Checkbox checked={withPosts} onChange={(v) => { setWithPosts(v); deletePostsRef.current = v; }} shape="square" />
        {t("admin.posts.seriesDeleteWithPosts")}
      </label>
      <input
        className={styles.seriesDeleteInput}
        type="text"
        placeholder={series.title}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && valid) { closeAll(); onConfirm(); } }}
      />
      <div className={styles.seriesDeleteActions}>
        <button className={styles.seriesDeleteCancel} onClick={closeAll}>{t("admin.posts.cancel")}</button>
        <button className={styles.seriesDeleteConfirm} disabled={!valid} onClick={() => { closeAll(); onConfirm(); }}>{t("admin.posts.delete")}</button>
      </div>
    </div>
  );
}
