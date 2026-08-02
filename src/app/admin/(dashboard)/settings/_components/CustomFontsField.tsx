"use client";

import { useRef, useState } from "react";
import { Plus, X } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import Button from "@/components/ui/Button";
import { showToast } from "@/stores/toastStore";
import { uploadFile } from "@/lib/adminUpload";
import { fontFormatFromExt, injectFontFace, type CustomFont } from "@/lib/customFonts";
import { LOCAL_FONTS } from "@/config/localFonts.generated";
import styles from "./AppearanceTab.module.css";

/** 파일명 → 표시/패밀리 이름 (scan-fonts.mjs 와 동일 규칙) */
function prettyName(file: string): string {
  return file
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface Props {
  fonts: CustomFont[];
  onChange: (fonts: CustomFont[]) => void;
}

/** 커스텀 폰트 업로드·목록 관리 — 업로드 폰트는 Storage(uploads/fonts), 목록엔 public/fonts 스캔본도 함께 표시.
 *  이름은 파일명에서 파생(read-only)해 선택값 참조가 깨지지 않게 한다. */
export default function CustomFontsField({ fonts, onChange }: Props) {
  const { t } = useLanguage();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const map = new Map(fonts.map((f) => [f.name, f]));
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() ?? "";
        const url = await uploadFile(file, "fonts");
        const font: CustomFont = { name: prettyName(file.name), url, format: fontFormatFromExt(ext) };
        injectFontFace(font); // 즉시 미리보기 렌더
        map.set(font.name, font);
      }
      onChange(Array.from(map.values()));
    } catch (e) {
      showToast(e instanceof Error ? e.message : t("admin.settings.fontUploadError"), "error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const remove = (name: string) => onChange(fonts.filter((f) => f.name !== name));

  const hasAny = fonts.length > 0 || LOCAL_FONTS.length > 0;

  return (
    <div className={styles.customFonts}>
      <input
        ref={fileRef}
        type="file"
        accept=".woff2,.woff,.ttf,.otf"
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className={styles.customFontsHead}>
        <Button
          variant="outline"
          size="md"
          icon={<Plus size={14} strokeWidth={1.8} />}
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? t("admin.settings.fontUploading") : t("admin.settings.fontUpload")}
        </Button>
        <span className={styles.customFontsHint}>{t("admin.settings.fontUploadHint")}</span>
      </div>

      {hasAny && (
        <ul className={styles.customFontsList}>
          {LOCAL_FONTS.map((f) => (
            <li key={`local-${f.name}`} className={styles.customFontRow}>
              <span className={styles.customFontName}>{f.name}</span>
              <span className={styles.customFontPreview} style={{ fontFamily: `"${f.name}"` }}>
                Ag 가나다 123
              </span>
              <span className={styles.customFontBadge}>public/fonts</span>
            </li>
          ))}
          {fonts.map((f) => (
            <li key={`up-${f.name}`} className={styles.customFontRow}>
              <span className={styles.customFontName}>{f.name}</span>
              <span className={styles.customFontPreview} style={{ fontFamily: `"${f.name}"` }}>
                Ag 가나다 123
              </span>
              <button
                type="button"
                className={styles.customFontRemove}
                onClick={() => remove(f.name)}
                aria-label={t("admin.settings.fontRemove")}
              >
                <X size={14} strokeWidth={2} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
