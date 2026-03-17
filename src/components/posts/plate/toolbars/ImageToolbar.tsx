"use client";

import React, { useCallback } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import TBtn from "../TBtn";
import { TblTrash, LockIcon, UnlockIcon } from "../icons";
import { IMG_ALIGNS, IMG_ALIGN_ICONS, IMG_FILTERS } from "../constants";
import styles from "../../RichTextEditor.module.css";

interface ImageToolbarProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: any;
  visible: boolean;
  selectedImage: Record<string, unknown> | null;
  setImageAttr: (attr: string, val: unknown) => void;
  moveImage: (direction: "up" | "down") => void;
}

export default React.memo(function ImageToolbar({
  editor, visible, selectedImage, setImageAttr, moveImage,
}: ImageToolbarProps) {
  const { t } = useLanguage();

  const deleteImage = useCallback(() => {
    try {
      const entry = editor.api.above({ match: { type: "img" } });
      if (entry) editor.tf.removeNodes({ at: entry[1] });
    } catch { /* ignore */ }
  }, [editor]);

  return (
    <div className={`${styles.tableToolbar} ${styles.tableToolbarFull} ${!visible ? styles.tableToolbarHidden : ""}`}>
      <div className={styles.tableToolbarRow}>
        <span className={styles.tableToolbarLabel}>IMAGE</span>
        <div className={styles.divider} />

        {/* 비율 고정 토글 */}
        <div className={styles.tableGroup}>
          <span className={styles.tableGroupLabel}>{t("editor.imageSize")}</span>
          <TBtn
            active={selectedImage ? (selectedImage.lockAspect as boolean) ?? true : true}
            onClick={() => setImageAttr("lockAspect", !((selectedImage?.lockAspect as boolean) ?? true))}
            tooltip={((selectedImage?.lockAspect as boolean) ?? true) ? t("editor.lockAspect") : t("editor.unlockAspect")}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 2, fontSize: 9 }}>
              <span style={{ display: "flex", transform: "scale(0.8)" }}>{((selectedImage?.lockAspect as boolean) ?? true) ? <LockIcon /> : <UnlockIcon />}</span>
              {t("editor.ratio")}
            </span>
          </TBtn>
          {selectedImage && (selectedImage.width as number) > 0 && (
            <span style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "var(--font-mono)", whiteSpace: "nowrap", padding: "0 2px" }}>
              {selectedImage.width as number}×{(selectedImage.height as number) || "auto"}
            </span>
          )}
          <TBtn onClick={() => { setImageAttr("width", 0); setImageAttr("height", 0); }} tooltip={t("editor.restoreOriginal")}>↺</TBtn>
        </div>

        <div className={styles.divider} />

        {/* 정렬 */}
        <div className={styles.tableGroup}>
          <span className={styles.tableGroupLabel}>{t("editor.imageAlign")}</span>
          {IMG_ALIGNS.map((a) => (
            <TBtn
              key={a}
              active={selectedImage ? (selectedImage.align as string || "center") === a : false}
              onClick={() => setImageAttr("align", a)}
              tooltip={a === "left" ? t("editor.left") : a === "center" ? t("editor.center") : t("editor.right")}
            >
              {IMG_ALIGN_ICONS[a]}
            </TBtn>
          ))}
        </div>

        <div className={styles.divider} />

        {/* 캡션 */}
        <div className={styles.tableGroup}>
          <span className={styles.tableGroupLabel}>{t("editor.caption")}</span>
          <input
            type="text"
            value={selectedImage ? (selectedImage.caption as string || "") : ""}
            placeholder={t("editor.captionPlaceholder")}
            onChange={(e) => setImageAttr("caption", e.target.value)}
            className={styles.fontSelect}
            style={{ width: 160 }}
          />
          <TBtn onClick={() => setImageAttr("caption", "")} tooltip={t("editor.removeCaption")} style={{ visibility: selectedImage?.caption ? "visible" : "hidden" }}>×</TBtn>
        </div>

        <div className={styles.divider} />

        {/* 색조 */}
        <div className={styles.tableGroup}>
          <span className={styles.tableGroupLabel}>{t("editor.filter")}</span>
          <div className={styles.selectWrap}>
            <select
              value={selectedImage ? (selectedImage.filter as string || "") : ""}
              onChange={(e) => { setImageAttr("filter", e.target.value); setTimeout(() => editor.tf.focus(), 0); }}
              className={styles.fontSelect}
              style={{ width: 80 }}
            >
              {IMG_FILTERS.map((f) => <option key={f.value} value={f.value}>{t(f.labelKey)}</option>)}
            </select>
          </div>
        </div>

        <div className={styles.divider} />

        {/* 순서 */}
        <div className={styles.tableGroup}>
          <span className={styles.tableGroupLabel}>{t("editor.order")}</span>
          <TBtn onClick={() => moveImage("up")} tooltip={t("editor.moveUp")}>↑</TBtn>
          <TBtn onClick={() => moveImage("down")} tooltip={t("editor.moveDown")}>↓</TBtn>
        </div>

        <div style={{ marginLeft: "auto" }} />

        {/* 삭제 */}
        <TBtn className={styles.tableDangerBtn} onClick={deleteImage} tooltip={t("editor.deleteImage")}><TblTrash /></TBtn>
      </div>
    </div>
  );
})
