import React, { useState, useEffect, useRef } from "react";
import { useModalStore } from "@/stores/modalStore";
import { useLanguage } from "@/providers/LanguageProvider";
import styles from "../RichTextEditor.module.css";

interface UrlModalContentProps {
  onInsert: (url: string) => void;
  descKey: string;
}

/** Embed / Link 공용 URL 입력 모달 */
function UrlModalContent({ onInsert, descKey }: UrlModalContentProps) {
  const { closeModal } = useModalStore();
  const { t } = useLanguage();
  const [url, setUrl] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50); }, []);
  const submit = () => { if (url.trim()) { onInsert(url.trim()); closeModal(); } };
  return (
    <div className={styles.embedModalBody}>
      <p className={styles.embedModalDesc}>{t(descKey)}</p>
      <input ref={inputRef} type="url" className={styles.embedModalInput} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." onKeyDown={(e) => { if (e.key === "Enter") submit(); }} />
      <div className={styles.embedModalActions}>
        <button type="button" className={styles.embedModalCancel} onClick={() => closeModal()}>{t("editor.cancel")}</button>
        <button type="button" className={styles.embedModalConfirm} disabled={!url.trim()} onClick={submit}>{t("editor.insert")}</button>
      </div>
    </div>
  );
}

export function EmbedModalContent({ onInsert }: { onInsert: (url: string) => void }) {
  return <UrlModalContent onInsert={onInsert} descKey="editor.embedDesc" />;
}

export function LinkModalContent({ onInsert }: { onInsert: (url: string) => void }) {
  return <UrlModalContent onInsert={onInsert} descKey="editor.linkDesc" />;
}
