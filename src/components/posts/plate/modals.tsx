import React, { useState, useEffect, useRef } from "react";
import { useModalStore } from "@/stores/modalStore";
import styles from "../RichTextEditor.module.css";

export function EmbedModalContent({ onInsert }: { onInsert: (url: string) => void }) {
  const { closeModal } = useModalStore();
  const [url, setUrl] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50); }, []);
  const submit = () => { if (url.trim()) { onInsert(url.trim()); closeModal(); } };
  return (
    <div className={styles.embedModalBody}>
      <p className={styles.embedModalDesc}>YouTube, Twitter/X, Instagram, Spotify, SoundCloud, Figma 등을 지원합니다.</p>
      <input ref={inputRef} type="url" className={styles.embedModalInput} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." onKeyDown={(e) => { if (e.key === "Enter") submit(); }} />
      <div className={styles.embedModalActions}>
        <button type="button" className={styles.embedModalCancel} onClick={() => closeModal()}>취소</button>
        <button type="button" className={styles.embedModalConfirm} disabled={!url.trim()} onClick={submit}>삽입</button>
      </div>
    </div>
  );
}

export function LinkModalContent({ onInsert }: { onInsert: (url: string) => void }) {
  const { closeModal } = useModalStore();
  const [url, setUrl] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50); }, []);
  const submit = () => { if (url.trim()) { onInsert(url.trim()); closeModal(); } };
  return (
    <div className={styles.embedModalBody}>
      <p className={styles.embedModalDesc}>텍스트를 선택한 상태에서 삽입하면 해당 텍스트에 링크가 적용됩니다.</p>
      <input ref={inputRef} type="url" className={styles.embedModalInput} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." onKeyDown={(e) => { if (e.key === "Enter") submit(); }} />
      <div className={styles.embedModalActions}>
        <button type="button" className={styles.embedModalCancel} onClick={() => closeModal()}>취소</button>
        <button type="button" className={styles.embedModalConfirm} disabled={!url.trim()} onClick={submit}>삽입</button>
      </div>
    </div>
  );
}
