"use client";

import { useContext, useState } from "react";
import { createPortal } from "react-dom";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import { ModalFooterContext } from "@/components/ui/Modal";
import { compressVideo, formatBytes, type TargetFormat } from "@/lib/videoCompress";
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
      alert("압축 실패: " + (e as Error).message);
      setRunning(false);
    }
  };

  return (
    <div className={styles.compressModalBody}>
      <p className={styles.sectionHint}>
        원본 <strong>{file.name}</strong> ({formatBytes(file.size)}) 가 업로드 제한({limitMB}MB) 을 초과합니다.
        브라우저에서 압축 후 업로드합니다. (수 분 소요 가능 — 페이지 닫지 마세요)
      </p>

      <div className={styles.fieldRow}>
        <label className={styles.fieldLabel}>
          <span className={styles.fieldLabelText}>포맷</span>
        </label>
        <Select
          value={format}
          options={[
            { value: "webm-vp9", label: "WebM (VP9) — 화질 대비 용량 최적 ⭐ 추천" },
            { value: "mp4-h264", label: "MP4 (H.264) — 호환성 위주" },
          ]}
          onChange={(v) => setFormat(v as TargetFormat)}
        />
      </div>

      <div className={styles.fieldRow}>
        <label className={styles.fieldLabel}>
          <span className={styles.fieldLabelText}>최대 가로 (px)</span>
        </label>
        <Select
          value={String(maxWidth)}
          options={[
            { value: "1920", label: "1920 (FHD, 원본 유지)" },
            { value: "1280", label: "1280 (HD)" },
            { value: "960", label: "960 (SD+)" },
            { value: "720", label: "720" },
          ]}
          onChange={(v) => setMaxWidth(Number(v))}
        />
      </div>

      <div className={styles.fieldRow}>
        <label className={styles.fieldLabel}>
          <span className={styles.fieldLabelText}>화질 (CRF)</span>
        </label>
        <Select
          value={String(crf)}
          options={[
            { value: "23", label: "23 — 고화질 (용량 큼)" },
            { value: "28", label: "28 — 균형" },
            { value: "30", label: "30 — 권장 (intro 영상)" },
            { value: "35", label: "35 — 저용량 (화질 손실 보임)" },
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
            {Math.round(progress * 100)}% — wasm 모듈 첫 로드 후 인코딩
          </span>
        </div>
      )}

      {footerEl && createPortal(
        <>
          <Button variant="outline" size="md" onClick={onCancel} disabled={running}>
            취소
          </Button>
          <Button variant="primary" size="md" onClick={handleStart} disabled={running} loading={running}>
            {running ? "압축 중…" : "압축 시작"}
          </Button>
        </>,
        footerEl,
      )}
    </div>
  );
}
