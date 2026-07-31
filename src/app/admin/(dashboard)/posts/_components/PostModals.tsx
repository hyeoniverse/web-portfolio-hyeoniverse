"use client";

import { useState } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import { useModalStore } from "@/stores/modalStore";
import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import Input from "@/components/ui/Input";
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
      <Input
        size="sm"
        placeholder={title}
        value={input}
        onChange={setInput}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing && valid) { closeAll(); onConfirm(); } }}
      />
      <div className="tw:flex tw:justify-end tw:gap-xs">
        <Button variant="outline" size="xs" onClick={closeAll}>{t("admin.posts.cancel")}</Button>
        <Button variant="primary" size="xs" tone="danger" disabled={!valid} onClick={() => { closeAll(); onConfirm(); }}>{t("admin.posts.trashPurge")}</Button>
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
      <Input
        size="sm"
        placeholder={series.title}
        value={input}
        onChange={setInput}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing && valid) { closeAll(); onConfirm(); } }}
      />
      <div className="tw:flex tw:justify-end tw:gap-xs">
        <Button variant="outline" size="xs" onClick={closeAll}>{t("admin.posts.cancel")}</Button>
        <Button variant="primary" size="xs" tone="danger" disabled={!valid} onClick={() => { closeAll(); onConfirm(); }}>{t("admin.posts.delete")}</Button>
      </div>
    </div>
  );
}
