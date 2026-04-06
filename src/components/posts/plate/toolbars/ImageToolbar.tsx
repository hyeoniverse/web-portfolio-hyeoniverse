"use client";

import React, { useCallback, useState, useEffect, useRef } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import TBtn from "../TBtn";
import { TblTrash, LockIcon, UnlockIcon } from "../icons";
import { RxReset } from "react-icons/rx";
import { IMG_ALIGNS, IMG_ALIGN_ICONS, IMG_FILTERS, IMG_LAYOUTS } from "../constants";
import styles from "../../RichTextEditor.module.css";

interface ImageToolbarProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: any;
  visible: boolean;
  selectedImage: Record<string, unknown> | null;
  setImageAttr: (attr: string, val: unknown) => void;
  moveImage: (direction: "up" | "down") => void;
  onFocusCapture?: () => void;
  onBlurCapture?: () => void;
}

export default React.memo(function ImageToolbar({
  editor, visible, selectedImage, setImageAttr, moveImage, onFocusCapture, onBlurCapture,
}: ImageToolbarProps) {
  const { t } = useLanguage();

  const deleteImage = useCallback(() => {
    try {
      const entry = editor.api.above({ match: { type: "img" } });
      if (entry) editor.tf.removeNodes({ at: entry[1] });
    } catch { /* ignore */ }
  }, [editor]);

  // 캡션 로컬 state — 에디터 값과 동기화하되, 입력 중에는 로컬 우선
  const [captionLocal, setCaptionLocal] = useState("");
  const captionFocusedRef = useRef(false);
  const externalCaption = selectedImage ? (selectedImage.caption as string || "") : "";
  useEffect(() => {
    if (!captionFocusedRef.current) setCaptionLocal(externalCaption);
  }, [externalCaption]);

  return (
    <div className={`${styles.tableToolbar} ${!visible ? styles.tableToolbarHidden : ""}`} onFocusCapture={onFocusCapture} onBlurCapture={onBlurCapture}>
      <TBtn
        square
        className={styles.tableDangerBtn}
        onClick={deleteImage}
        tooltip={t("editor.deleteImage")}
        style={{ position: "absolute", top: 4, right: 4, zIndex: 1 }}
      >
        <TblTrash />
      </TBtn>
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
            style={{ padding: "0 6px" }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 2, fontSize: 9 }}>
              <span style={{ display: "flex", transform: "scale(0.8)" }}>{((selectedImage?.lockAspect as boolean) ?? true) ? <LockIcon /> : <UnlockIcon />}</span>
              {t("editor.ratio")}
            </span>
          </TBtn>
          {selectedImage && (selectedImage.width as number) > 0 && (() => {
            const w = selectedImage.width as number;
            const h = (selectedImage.height as number) || 0;
            const lock = (selectedImage.lockAspect as boolean) ?? true;
            const ratio = w > 0 && h > 0 ? w / h : 0;
            const inputStyle: React.CSSProperties = { width: 44, fontSize: 9, fontFamily: "var(--font-mono)", textAlign: "center", padding: "1px 2px", margin: "0 3px", border: "var(--border-light)", borderRadius: "var(--radius-2xs)", background: "var(--bg-primary)", color: "var(--text-primary)" };
            const labelStyle: React.CSSProperties = { fontSize: 8, color: "var(--text-muted)", fontWeight: 600, padding: "0 3px" };
            const sepStyle: React.CSSProperties = { width: 1, height: 14, background: "var(--border-light-color)", flexShrink: 0, margin: "0 2px" };
            return (
              <span style={{ display: "inline-flex", alignItems: "center", fontSize: 9, fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
                <span style={labelStyle}>W</span>
                <input
                  type="number"
                  value={w}
                  min={1}
                  style={inputStyle}
                  onChange={(e) => {
                    const nw = Math.max(1, parseInt(e.target.value) || 1);
                    setImageAttr("width", nw);
                    if (lock && ratio > 0) setImageAttr("height", Math.round(nw / ratio));
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                />
                <span style={sepStyle} />
                <span style={labelStyle}>H</span>
                <input
                  type="number"
                  value={h || ""}
                  min={1}
                  placeholder="auto"
                  style={inputStyle}
                  onChange={(e) => {
                    const nh = Math.max(1, parseInt(e.target.value) || 1);
                    setImageAttr("height", nh);
                    if (lock && ratio > 0) setImageAttr("width", Math.round(nh * ratio));
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                />
              </span>
            );
          })()}
          <TBtn square onClick={() => { setImageAttr("width", 0); setImageAttr("height", 0); }} tooltip={t("editor.restoreOriginal")}><RxReset size={13} /></TBtn>
        </div>

        <div className={styles.divider} />

        {/* 배치 */}
        <div className={styles.tableGroup}>
          <span className={styles.tableGroupLabel}>{t("editor.imageLayout")}</span>
          {IMG_LAYOUTS.map((l) => {
            const labels: Record<string, string> = {
              inline: "Inline",
              block: "Block",
              "float-left": "Float ◧",
              "float-right": "Float ◨",
            };
            return (
              <TBtn
                key={l}
                active={selectedImage ? (selectedImage.layout as string || "inline") === l : false}
                onClick={() => setImageAttr("layout", l)}
                tooltip={labels[l]}
                style={{ padding: "0 6px" }}
              >
                <span style={{ fontSize: 9 }}>{labels[l]}</span>
              </TBtn>
            );
          })}
        </div>

        <div className={styles.divider} />

        {/* 정렬 — inline/float에서는 비활성화 */}
        <div className={styles.tableGroup}>
          <span className={styles.tableGroupLabel}>{t("editor.imageAlign")}</span>
          {IMG_ALIGNS.map((a) => {
            const currentLayout = (selectedImage?.layout as string) || "inline";
            const disabled = currentLayout !== "block";
            return (
              <TBtn
                key={a}
                square
                active={!disabled && selectedImage ? (selectedImage.align as string || "center") === a : false}
                onClick={() => setImageAttr("align", a)}
                tooltip={a === "left" ? t("editor.left") : a === "center" ? t("editor.center") : t("editor.right")}
                disabled={disabled}
              >
                {IMG_ALIGN_ICONS[a]}
              </TBtn>
            );
          })}
        </div>

        <div className={styles.divider} />

        {/* 캡션 */}
        <div className={styles.tableGroup}>
          <span className={styles.tableGroupLabel}>{t("editor.caption")}</span>
          <input
            type="text"
            value={captionLocal}
            placeholder={t("editor.captionPlaceholder")}
            onChange={(e) => {
              setCaptionLocal(e.target.value);
              setImageAttr("caption", e.target.value);
            }}
            onFocus={() => { captionFocusedRef.current = true; }}
            onBlur={() => { captionFocusedRef.current = false; }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className={styles.fontSelect}
            style={{ width: 160 }}
          />
          <TBtn square onClick={() => { setImageAttr("caption", ""); setCaptionLocal(""); }} tooltip={t("editor.removeCaption")} disabled={!captionLocal}>×</TBtn>
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
          <TBtn square onClick={() => moveImage("up")} tooltip={t("editor.moveUp")}>↑</TBtn>
          <TBtn square onClick={() => moveImage("down")} tooltip={t("editor.moveDown")}>↓</TBtn>
        </div>

      </div>
    </div>
  );
})
