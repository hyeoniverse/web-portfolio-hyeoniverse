"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useImageFallback } from "@/hooks/useImageFallback";
import { useHasMounted } from "@/hooks/useHasMounted";
import { IMAGE_FALLBACK_SRC } from "@/lib/imageFallback";
import { Upload, ImageIcon, Trash2, Palette, Copy, X } from "@/components/icons";
import Tooltip from "@/components/ui/Tooltip";
import { adminEditorStyles as es } from "@/components/admin/AdminEditorShell";
import { showToast } from "@/stores/toastStore";
import { useLanguage } from "@/providers/LanguageProvider";
import Input from "@/components/ui/Input";
import { isVideoUrl } from "@/lib/isVideoUrl";
import { extractPalette } from "./extractPalette";
import styles from "./CoverImageField.module.css";
import Pressable from "@/components/ui/Pressable";

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
  /** 좁은 열(속성 패널)용 — 썸네일이 열 폭을 다 쓰고(16:9), 단추 줄은 썸네일 아래로 */
  fill?: boolean;
}

/* 최근에 지운 커버 — 지운 뒤에도 빈 칸에서 눌러 되돌린다. 브라우저에만, 편집 화면 전체가 같이 쓴다 */
const RECENT_KEY = "admin.recentCovers";
const RECENT_MAX = 4;
function readRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((u): u is string => typeof u === "string").slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
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
  fill = false,
}: CoverImageFieldProps) {
  const { t } = useLanguage();
  const mounted = useHasMounted();
  const [recent, setRecent] = useState<string[]>(() => (typeof window === "undefined" ? [] : readRecent()));
  /* 지우기 — 지운 주소를 최근 커버 맨 앞에 둔다(같은 주소는 한 번만) */
  const remove = () => {
    if (value) {
      const next = [value, ...recent.filter((u) => u !== value)].slice(0, RECENT_MAX);
      setRecent(next);
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* 저장 못 해도 이번 화면에서는 되돌릴 수 있다 */ }
    }
    onChange("");
  };
  const recentShown = recent.filter((u) => u !== value);
  // 로드 실패 추적 — value 변경 리셋까지 공용 훅이 담당
  const { broken: imgErrored, markBroken } = useImageFallback(value);

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
  const displaySrc = enablePlaceholderFallback && imgErrored ? IMAGE_FALLBACK_SRC : value;

  /* 커버 동작 — 아이콘 셋(업로드 · 고르기/닫기 · 제거)을 테두리 하나짜리 알약에 담는다. 이름은 말풍선으로.
     예전에는 글자 단추 셋이 따로 서서 칸 아래가 단추 줄로 무거웠다 */
  const inlineActions = (
    <div className={styles.iconGroup} role="group" aria-label={label}>
      <Tooltip content={uploadLabel} placement="bottom">
        <Pressable className={styles.iconBtn} onClick={onUpload} aria-label={uploadLabel}>
          <Upload size={14} strokeWidth={2} />
        </Pressable>
      </Tooltip>
      <Tooltip content={buttonText} placement="bottom">
        <Pressable className={styles.iconBtn} onClick={onPickerToggle} aria-label={buttonText} aria-pressed={isInteractive} data-active={isInteractive || undefined}>
          {isInteractive ? <X size={14} strokeWidth={2} /> : <ImageIcon size={14} strokeWidth={2} />}
        </Pressable>
      </Tooltip>
      {value && (
        <Tooltip content={removeLabel} placement="bottom">
          <Pressable className={`${styles.iconBtn} ${styles.iconBtnDanger}`} onClick={remove} aria-label={removeLabel}>
            <Trash2 size={14} strokeWidth={2} />
          </Pressable>
        </Tooltip>
      )}
    </div>
  );

  return (
    <div className={styles.field} data-seo={seoId} data-fill={fill || undefined}>
      <div className={styles.labelRow}>
        <label className={`${es.fieldLabel}${hasError ? ` ${es.fieldLabelError}` : ""}`}>
          {label}
        </label>
        {!fill && inlineActions}
      </div>
      {value && (
        <div className={styles.previewRow}>
          <Pressable noTapScale
            className={styles.previewBtn}
            style={fill ? undefined : { height: thumbHeight }}
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
                onError={markBroken}
              />
            ) : (
              /* key 를 주소로 — 바꾸면 새로 그린다(CoverBanner 와 같은 이유, 사파리) */
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={displaySrc}
                src={displaySrc}
                alt={label}
                className={styles.thumb}
                onError={markBroken}
              />
            )}
          </Pressable>
          {/* 추출된 테마 색상 — palette 아이콘 = 전체 복사, swatch 개별 = hex 복사 */}
          {palette.length > 0 && (
            <div className={styles.palette}>
              <Pressable noTapScale
                className={styles.paletteCopyAll}
                onClick={copyAllPalette}
                title={t("common.copyAllPalette") || "Copy all"}
                aria-label={t("common.copyAllPalette") || "Copy all palette"}
              >
                <Palette size={11} strokeWidth={2} className={styles.paletteIcon} aria-hidden />
                <Copy size={9} strokeWidth={2.4} className={styles.paletteCopyAllIcon} aria-hidden />
              </Pressable>
              {palette.map((hex) => (
                <Pressable noTapScale
                  key={hex}
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
          {fill && <div className={styles.actionsEnd}>{inlineActions}</div>}
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
      {/* 비었을 때 — 최근에 지운 커버. 맨 앞이 방금 지운 것, 누르면 그대로 되돌아온다 */}
      {!value && mounted && recentShown.length > 0 && (
        <div className={styles.recent}>
          <span className={styles.recentLabel}>{t("admin.common.recentCovers")}</span>
          <div className={styles.recentList}>
            {recentShown.map((u) => (
              <Pressable
                key={u}
                className={styles.recentItem}
                onClick={() => onChange(u)}
                title={t("admin.common.restoreCover")}
                aria-label={t("admin.common.restoreCover")}
              >
                {isVideoUrl(u) ? (
                  <video src={u} className={styles.recentThumb} muted playsInline preload="metadata" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u} alt="" className={styles.recentThumb} loading="lazy" />
                )}
              </Pressable>
            ))}
          </div>
        </div>
      )}
      {fill && !value && inlineActions}
    </div>
  );
}
