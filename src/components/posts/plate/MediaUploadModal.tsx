"use client";

import { useEffect, useRef, useState } from "react";
import { useModalStore } from "@/stores/modalStore";
import { compressVideo, formatBytes } from "@/lib/videoCompress";
import { directUpload } from "@/lib/directUpload";
import { useLanguage } from "@/providers/LanguageProvider";
import { fillTemplate } from "@/utils/format";
import { CodedError } from "@/lib/apiError";
import styles from "../EditorMedia.module.css";

type Limits = Record<string, number> | undefined;

/** 동영상 형식별 업로드 제한(MB) — 이 값을 넘으면 브라우저 압축을 시도한 뒤 업로드 */
function getVideoLimitMB(file: File, limits: Limits): number {
  if (limits && typeof limits[file.type] === "number") return limits[file.type];
  if (limits && typeof limits._default === "number") return limits._default;
  return 200;
}

interface Props {
  file: File;
  limits: Limits;
  onDone: (url: string) => void;
  onError: (err: unknown) => void;
}

/**
 * 동영상 업로드 진행 모달 — 마운트 시 (필요하면) 압축 → Storage 직접 업로드 파이프라인 실행.
 * 압축은 진행률(%)을, 업로드는 indeterminate 바를 표시.
 */
function MediaUploadModal({ file, limits, onDone, onError }: Props) {
  const { t } = useLanguage();
  const [stage, setStage] = useState<"prep" | "compress" | "upload">("prep");
  const [progress, setProgress] = useState(0);
  const [info, setInfo] = useState(formatBytes(file.size));
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return; // StrictMode 중복 실행 방지
    startedRef.current = true;
    (async () => {
      try {
        const limitMB = getVideoLimitMB(file, limits);
        const limitBytes = limitMB * 1024 * 1024;
        let payload: File = file;

        // 제한 초과 → 브라우저에서 압축 (mp4 h264, 최대 폭 1280, CRF 28)
        if (file.size > limitBytes) {
          setStage("compress");
          setInfo(fillTemplate(t("editor.videoOverLimit"), { size: formatBytes(file.size), limit: limitMB }));
          const { blob, name } = await compressVideo(file, {
            format: "mp4-h264",
            crf: 28,
            maxWidth: 1280,
            onProgress: setProgress,
          });
          payload = new File([blob], name, { type: blob.type });
          if (payload.size > limitBytes) {
            throw new CodedError("Video is still over the limit after compression", {
              code: "UPLOAD_STILL_TOO_LARGE",
              params: { size: formatBytes(payload.size), max: limitMB },
            });
          }
          setInfo(`${formatBytes(file.size)} → ${formatBytes(payload.size)}`);
        }

        setStage("upload");
        const url = await directUpload(payload, payload.name, payload.type);
        onDone(url);
      } catch (e) {
        onError(e);
      }
    })();
  }, [file, limits, onDone, onError, t]);

  const pct = Math.round(progress * 100);
  const stageLabel =
    stage === "compress" ? fillTemplate(t("editor.videoCompressing"), { pct })
    : stage === "upload" ? t("editor.videoUploading")
    : t("editor.videoPreparing");

  return (
    <div className={styles.mediaUploadBody}>
      <p className={styles.mediaUploadName}>{file.name}</p>
      <div className={styles.mediaUploadBar}>
        {stage === "compress"
          ? <div className={styles.mediaUploadBarFill} style={{ width: `${pct}%` }} />
          : <div className={styles.mediaUploadBarIndeterminate} />}
      </div>
      <p className={styles.mediaUploadStage}>{stageLabel}</p>
      {info && <p className={styles.mediaUploadHint}>{info}</p>}
      <p className={styles.mediaUploadHint}>{t("editor.videoKeepOpen")}</p>
    </div>
  );
}

/**
 * 동영상을 진행 모달과 함께 업로드하고 최종 URL 을 반환하는 헬퍼.
 * 에디터의 업로드 콜백(handleImageUpload)에서 동영상 분기 시 호출.
 * 모달 제목은 문자열이라 훅을 쓸 수 없어, 부르는 쪽이 화면 언어로 넘긴다.
 */
export function runVideoUpload(file: File, limits: Limits, title: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const id = "media-upload-progress";
    const { openModal, closeModal } = useModalStore.getState();
    openModal(
      <MediaUploadModal
        file={file}
        limits={limits}
        onDone={(url) => { closeModal(id); resolve(url); }}
        onError={(e) => { closeModal(id); reject(e); }}
      />,
      { id, header: { title }, closeButton: false, width: "440px" },
    );
  });
}
