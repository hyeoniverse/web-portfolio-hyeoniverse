"use client";

import { useContext, useState } from "react";
import { createPortal } from "react-dom";
import { ModalFooterContext } from "@/components/ui/Modal";
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
  const footerEl = useContext(ModalFooterContext);
  const valid = input === title;
  /* 입력칸 크기와 단추 자리는 공통 모달(ModalPrompt)을 따른다 — 여기서 따로 정하면 같은 확인 창이
     화면마다 다른 크기로 보인다. 단추는 모달의 발치 슬롯으로 보낸다 */
  return (
    <div className={styles.seriesDeleteModal}>
      <p className={styles.seriesDeleteHint}>{t("admin.posts.trashPurgeHint")}</p>
      <Input
        placeholder={title}
        value={input}
        onChange={setInput}
        autoFocus
        onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing && valid) { closeAll(); onConfirm(); } }}
      />
      {footerEl && createPortal(
        <>
          <Button variant="outline" size="sm" soundDisabled onClick={closeAll}>{t("admin.posts.cancel")}</Button>
          <Button variant="primary" size="sm" tone="danger" soundDisabled disabled={!valid} onClick={() => { closeAll(); onConfirm(); }}>
            {t("admin.posts.trashPurge")}
          </Button>
        </>,
        footerEl,
      )}
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
  const footerEl = useContext(ModalFooterContext);
  const valid = input === series.title;

  return (
    <div className={styles.seriesDeleteModal}>
      <p className={styles.seriesDeleteHint}>{t("admin.posts.seriesDeleteHint")}</p>
      <label className={styles.seriesDeleteCheck}>
        <Checkbox checked={withPosts} onChange={(v) => { setWithPosts(v); deletePostsRef.current = v; }} shape="square" />
        {t("admin.posts.seriesDeleteWithPosts")}
      </label>
      <Input
        placeholder={series.title}
        value={input}
        onChange={setInput}
        autoFocus
        onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing && valid) { closeAll(); onConfirm(); } }}
      />
      {footerEl && createPortal(
        <>
          <Button variant="outline" size="sm" soundDisabled onClick={closeAll}>{t("admin.posts.cancel")}</Button>
          <Button variant="primary" size="sm" tone="danger" soundDisabled disabled={!valid} onClick={() => { closeAll(); onConfirm(); }}>
            {t("admin.posts.delete")}
          </Button>
        </>,
        footerEl,
      )}
    </div>
  );
}
