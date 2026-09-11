"use client";

import { useContext, useState } from "react";
import { createPortal } from "react-dom";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import { ModalFooterContext } from "@/components/ui/Modal";
import { compressVideo, formatBytes, type TargetFormat } from "@/lib/videoCompress";
import { useLanguage } from "@/providers/LanguageProvider";
import { fillTemplate } from "@/utils/format";
import BoldMarks from "@/components/ui/BoldMarks";
import shared from "../Settings.module.css";
import local from "./CompressVideoModal.module.css";
const styles = { ...shared, ...local };

interface Props {
  file: File;
  /** 원본 파일이 초과한 제한 (MB) — 안내 문구용 */
  limitMB: number;
  /** 압축 완료 시 호출 — 새 Blob/File 전달 */
  onCompressed: (compressed: File) => void;
  onCancel: () => void;
}

export default function CompressVideoModal({ file, limitMB, onCompressed, onCancel }: Props) {
  const { t } = useLanguage();
  const footerEl = useContext(ModalFooterContext);
  const [format, setFormat] = useState<TargetFormat>("webm-vp9");
  const [maxWidth, setMaxWidth] = useState<number>(1920);
  const [crf, setCrf] = useState<number>(30);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleStart = async () => {
    setRunning(true);
    setProgress(0);
    try {
      const { blob, name } = await compressVideo(file, {
        format,
        crf,
        maxWidth,
        onProgress: setProgress,
      });
      const newFile = new File([blob], name, { type: blob.type });
      onCompressed(newFile);
    } catch (e) {
      console.error(e);
      alert(fillTemplate(t("admin.settings.compressVideo.failed"), { error: (e as Error).message }));
      setRunning(false);
    }
  };

  return (
    <div className={styles.compressModalBody}>
      <p className={styles.sectionHint}>
        <BoldMarks text={fillTemplate(t("admin.settings.compressVideo.intro"), { name: file.name, size: formatBytes(file.size), limit: limitMB })} />
      </p>

      <div className={styles.fieldRow}>
        <label className={styles.fieldLabel}>
          <span className={styles.fieldLabelText}>{t("admin.settings.compressVideo.format")}</span>
        </label>
        <Select
          value={format}
          options={[
            { value: "webm-vp9", label: t("admin.settings.compressVideo.formatWebm") },
            { value: "mp4-h264", label: t("admin.settings.compressVideo.formatMp4") },
          ]}
          onChange={(v) => setFormat(v as TargetFormat)}
        />
      </div>

      <div className={styles.fieldRow}>
        <label className={styles.fieldLabel}>
          <span className={styles.fieldLabelText}>{t("admin.settings.compressVideo.maxWidth")}</span>
        </label>
        <Select
          value={String(maxWidth)}
          options={[
            { value: "1920", label: t("admin.settings.compressVideo.width1920") },
            { value: "1280", label: "1280 (HD)" },
            { value: "960", label: "960 (SD+)" },
            { value: "720", label: "720" },
          ]}
          onChange={(v) => setMaxWidth(Number(v))}
        />
      </div>

      <div className={styles.fieldRow}>
        <label className={styles.fieldLabel}>
          <span className={styles.fieldLabelText}>{t("admin.settings.compressVideo.quality")}</span>
        </label>
        <Select
          value={String(crf)}
          options={[
            { value: "23", label: t("admin.settings.compressVideo.crf23") },
            { value: "28", label: t("admin.settings.compressVideo.crf28") },
            { value: "30", label: t("admin.settings.compressVideo.crf30") },
            { value: "35", label: t("admin.settings.compressVideo.crf35") },
          ]}
          onChange={(v) => setCrf(Number(v))}
        />
      </div>

      {running && (
        <div className={styles.compressProgress}>
          <div className={styles.compressProgressBar}>
            <div
              className={styles.compressProgressFill}
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <span className={styles.compressProgressText}>
            {fillTemplate(t("admin.settings.compressVideo.progress"), { n: Math.round(progress * 100) })}
          </span>
        </div>
      )}

      {footerEl && createPortal(
        <>
          <Button variant="outline" size="md" onClick={onCancel} disabled={running}>
            {t("admin.settings.cancel")}
          </Button>
          <Button variant="primary" size="md" onClick={handleStart} disabled={running} loading={running}>
            {running ? t("admin.settings.compressVideo.running") : t("admin.settings.compressVideo.start")}
          </Button>
        </>,
        footerEl,
      )}
    </div>
  );
}
