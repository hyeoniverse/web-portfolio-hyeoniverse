"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, ImageIcon, X, Palette, Copy } from "lucide-react";
import { adminEditorStyles as es } from "@/components/admin/AdminEditorShell";
import { showToast } from "@/stores/toastStore";
import { useLanguage } from "@/providers/LanguageProvider";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { isVideoUrl } from "@/lib/isVideoUrl";
import { extractPalette } from "./extractPalette";
import styles from "./CoverImageField.module.css";

interface CoverImageFieldProps {
  /** 현재 이미지 URL */
  value: string;
  onChange: (url: string) => void;
  /** i18n 라벨 — caller 가 t() 결과 전달 */
  label: string;
  removeLabel: string;
  uploadLabel: string;
  chooseLabel: string;
  closeLabel: string;
  /** Upload 버튼 클릭 — caller 가 업로드 후 onChange 로 url 전달 */
  onUpload: () => void;
  /** picker 펼침 상태 — caller controlled (open 상태에선 Choose 버튼 텍스트가 closeLabel 로 전환) */
  pickerOpen: boolean;
  /** 닫는 중 (애니메이션) — true 면 picker 가 보이지만 버튼 텍스트는 chooseLabel 로 (다음 인터랙션 안내) */
  pickerClosing?: boolean;
  /** Choose / Close 버튼 클릭 시 호출 — caller 가 open/close 결정 (단순 toggle 또는 닫기 애니메이션 포함) */
  onPickerToggle: () => void;
  /** URL 직접 입력 input (works 처럼 paste 지원) — undefined 면 input 안 보임 */
  urlInputPlaceholder?: string;
  /** 버튼 row 아래 보조 hint */
  hint?: ReactNode;
  /** SEO 체크리스트용 data-seo 마커 */
  seoId?: string;
  /** 라벨 에러 표시 — 미입력 표시용 */
  hasError?: boolean;
  /** 썸네일 높이 (default 100px) */
  thumbHeight?: number;
  /** 깨진 이미지 fallback — default true */
  enablePlaceholderFallback?: boolean;
}

/**
 * Admin editor 공용 cover/main 이미지 field UI.
 *
 * 구조: 라벨 + remove 버튼 (값 있을 때) → 썸네일 표시 OR Upload/Choose 버튼 row.
 * Picker 본체는 caller 가 따로 렌더 — 위치 (인라인 / 다음 row 외부 / 모달 등) 가
 * 사용처마다 달라서 placement 결정권을 caller 에게 위임.
 */
export default function CoverImageField({
  value,
  onChange,
  label,
  removeLabel,
  uploadLabel,
  chooseLabel,
  closeLabel,
  onUpload,
  pickerOpen,
  pickerClosing,
  onPickerToggle,
  urlInputPlaceholder,
  hint,
  seoId,
  hasError,
  thumbHeight = 100,
  enablePlaceholderFallback = true,
}: CoverImageFieldProps) {
  const { t } = useLanguage();
  const [imgErrored, setImgErrored] = useState(false);
  // value 가 바뀌면 에러 상태 리셋 — 새 src 는 다시 시도
  useEffect(() => { setImgErrored(false); }, [value]);

  // ── 테마 색상 추출 ── value(이미지 url) 가 바뀌면 5개 팔레트 비동기 추출
  const [palette, setPalette] = useState<string[]>([]);
  const [paletteLoading, setPaletteLoading] = useState(false);
  useEffect(() => {
    setPalette([]);
    if (!value || imgErrored) return;
    let cancelled = false;
    setPaletteLoading(true);
    extractPalette(value, 5)
      .then((colors) => { if (!cancelled) setPalette(colors); })
      .catch(() => { /* CORS / load fail — 빈 list 유지 */ })
      .finally(() => { if (!cancelled) setPaletteLoading(false); });
    return () => { cancelled = true; };
  }, [value, imgErrored]);

  const copyToClipboard = (text: string, successMsg: string) => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    navigator.clipboard.writeText(text)
      .then(() => showToast(successMsg, "success"))
      .catch(() => showToast(t("common.copyFailed") || "Copy failed", "error"));
  };

  const copyAllPalette = () => {
    if (palette.length === 0) return;
    copyToClipboard(palette.join(", "), t("common.paletteCopied") || "Palette copied");
  };

  // picker 가 실제로 인터랙션 가능한 상태 (open 이면서 닫는 중 아님)
  const isInteractive = pickerOpen && !pickerClosing;
  const buttonText = isInteractive ? closeLabel : chooseLabel;
  const displaySrc = enablePlaceholderFallback && imgErrored ? "/images/placeholder.svg" : value;

  // 라벨 라인의 inline 액션 버튼들 — 공통 Button (ghost) + className 으로 현재 크기 유지
  const inlineActions = (
    <div className={styles.inlineActions}>
      <Button
        variant="ghost"
        size="xs"
        className={styles.inlineBtn}
        onClick={onUpload}
        title={uploadLabel}
        icon={<Upload size={12} strokeWidth={2} />}
      >
        {uploadLabel}
      </Button>
      <motion.div
        layout
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        style={{ display: "inline-flex" }}
      >
        <Button
          variant="ghost"
          size="xs"
          className={styles.inlineBtn}
          onClick={onPickerToggle}
          title={buttonText}
          icon={<ImageIcon size={12} strokeWidth={2} />}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={isInteractive ? "close" : "open"}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
              className={styles.toggleBtnText}
            >
              {buttonText}
            </motion.span>
          </AnimatePresence>
        </Button>
      </motion.div>
      {value && (
        <Button
          variant="ghost"
          size="xs"
          className={`${styles.inlineBtn} ${styles.inlineBtnRemove}`}
          onClick={() => { onChange(""); setImgErrored(false); }}
          title={removeLabel}
          icon={<X size={12} strokeWidth={2.2} />}
        >
          {removeLabel}
        </Button>
      )}
    </div>
  );

  return (
    <div className={styles.field} data-seo={seoId}>
      <div className={styles.labelRow}>
        <label className={`${es.fieldLabel}${hasError ? ` ${es.fieldLabelError}` : ""}`}>
          {label}
        </label>
        {inlineActions}
      </div>
      {value && (
        <div className={styles.previewRow}>
          <button
            type="button"
            className={styles.previewBtn}
            style={{ height: thumbHeight }}
            onClick={onPickerToggle}
            title={chooseLabel}
          >
            {isVideoUrl(value) && !imgErrored ? (
              <video
                src={value}
                className={styles.thumb}
                muted
                playsInline
                autoPlay
                loop
                preload="metadata"
                onError={() => setImgErrored(true)}
              />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={displaySrc}
                alt={label}
                className={styles.thumb}
                onError={() => setImgErrored(true)}
              />
            )}
          </button>
          {/* 추출된 테마 색상 — palette 아이콘 = 전체 복사, swatch 개별 = hex 복사 */}
          {palette.length > 0 && (
            <div className={styles.palette}>
              <button
                type="button"
                className={styles.paletteCopyAll}
                onClick={copyAllPalette}
                title={t("common.copyAllPalette") || "Copy all"}
                aria-label={t("common.copyAllPalette") || "Copy all palette"}
              >
                <Palette size={11} strokeWidth={2} className={styles.paletteIcon} aria-hidden />
                <Copy size={9} strokeWidth={2.4} className={styles.paletteCopyAllIcon} aria-hidden />
              </button>
              {palette.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  className={styles.paletteSwatch}
                  style={{ background: hex }}
                  onClick={() => copyToClipboard(hex, `${t("common.copied") || "Copied"} ${hex}`)}
                  title={`${hex} (click to copy)`}
                  aria-label={`Copy ${hex}`}
                />
              ))}
            </div>
          )}
          {paletteLoading && palette.length === 0 && (
            <span className={styles.paletteLoading}>extracting…</span>
          )}
        </div>
      )}
      {!value && urlInputPlaceholder !== undefined && (
        <Input
          value={value}
          onChange={onChange}
          placeholder={urlInputPlaceholder}
          className={styles.urlInput}
        />
      )}
      {!value && hint && <div className={styles.hint}>{hint}</div>}
    </div>
  );
}
