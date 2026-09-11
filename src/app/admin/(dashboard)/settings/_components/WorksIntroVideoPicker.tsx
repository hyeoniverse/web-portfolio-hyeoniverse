"use client";

import { useRef, useState } from "react";
import { Upload, ImagePlus, Expand } from "@/components/icons";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import ImageViewer from "@/components/ui/ImageViewer/ImageViewer";
import { isVideoUrl } from "@/lib/isVideoUrl";
import { showToast } from "@/stores/toastStore";
import { useModalStore } from "@/stores/modalStore";
import { ModalConfirm } from "@/components/ui/ModalTemplates";
import CompressVideoModal from "./CompressVideoModal";
import CoverImagePicker from "@/components/posts/CoverImagePicker";
import shared from "../Settings.module.css";
import local from "./WorksIntroVideoPicker.module.css";
import Pressable from "@/components/ui/Pressable";
import { useLanguage } from "@/providers/LanguageProvider";
import { fillTemplate } from "@/utils/format";
const styles = { ...shared, ...local };

/* 기본 업로드 제한 (api/upload 의 DEFAULT_LIMIT_MB 와 맞춤). */
const UPLOAD_LIMIT_MB = 20;

interface Props {
  value: string;
  onChange: (next: string) => void;
}

/** Works intro 미디어 picker — 업로드 + cover picker (Local/Preset/Unsplash/Pexels/AI/History) + URL 직접 입력. */
export default function WorksIntroVideoPicker({ value, onChange }: Props) {
  const { t } = useLanguage();
  const [uploading, setUploading] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { openModal, closeModal } = useModalStore();
  /* cover picker drawer — inline collapsible */
  const [showPicker, setShowPicker] = useState(false);
  const [pickerClosing, setPickerClosing] = useState(false);
  const pickerCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closePicker = () => {
    if (pickerCloseTimer.current) clearTimeout(pickerCloseTimer.current);
    setPickerClosing(true);
    pickerCloseTimer.current = setTimeout(() => {
      setShowPicker(false);
      setPickerClosing(false);
    }, 450);
  };

  /** 실제 업로드 — 압축 후 또는 제한 안일 때 호출. */
  const doUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        showToast(fillTemplate(t("admin.settings.worksIntroMedia.uploadFailed"), { error: txt || res.status }), "error");
        return;
      }
      const data = await res.json();
      if (data?.url) {
        onChange(data.url);
        showToast(t("admin.settings.worksIntroMedia.uploaded"), "success");
      }
    } finally {
      setUploading(false);
    }
  };

  const openCompressModal = (file: File) => {
    const id = "compress-video";
    openModal(
      <CompressVideoModal
        file={file}
        limitMB={UPLOAD_LIMIT_MB}
        onCompressed={(compressed) => {
          closeModal(id);
          showToast(fillTemplate(t("admin.settings.worksIntroMedia.compressed"), { from: (file.size / 1024 / 1024).toFixed(1), to: (compressed.size / 1024 / 1024).toFixed(1) }), "success");
          void doUpload(compressed);
        }}
        onCancel={() => closeModal(id)}
      />,
      { id, header: { title: t("admin.settings.worksIntroMedia.compressTitle") }, closeButton: true, width: "560px" },
    );
  };

  const handleUpload = (file: File) => {
    const sizeMB = file.size / 1024 / 1024;
    const isVideo = file.type.startsWith("video/");
    if (sizeMB > UPLOAD_LIMIT_MB && isVideo) {
      const confirmId = "compress-confirm";
      openModal(
        <ModalConfirm
          desc={fillTemplate(t("admin.settings.worksIntroMedia.tooLarge"), { size: sizeMB.toFixed(1), limit: UPLOAD_LIMIT_MB })}
          confirmText={t("admin.settings.worksIntroMedia.compress")}
          onConfirm={() => openCompressModal(file)}
        />,
        { id: confirmId, header: { title: t("admin.settings.worksIntroMedia.tooLargeTitle") }, closeButton: true, width: "440px" },
      );
      return;
    }
    void doUpload(file);
  };

  const isVideo = value ? isVideoUrl(value) : false;

  return (
    <div className={styles.worksIntroVideoPicker}>
      {/* 선택된 커버 미리보기 — 클릭하면 ImageViewer 로 크게 */}
      {value && (
        <Pressable
          className={styles.worksIntroPreview}
          onClick={() => setViewerOpen(true)}
          title={t("admin.settings.worksIntroMedia.enlarge")}
        >
          {isVideo ? (
            <video
              src={value}
              className={styles.worksIntroPreviewThumb}
              muted
              playsInline
              autoPlay
              loop
              preload="metadata"
            />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={value} alt={t("admin.settings.worksIntroMedia.selectedAlt")} className={styles.worksIntroPreviewThumb} />
          )}
          <span className={styles.worksIntroPreviewExpand}>
            <Expand size={14} strokeWidth={2} />
          </span>
        </Pressable>
      )}

      <div className={styles.worksIntroVideoActions}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/mp4,video/webm,video/quicktime"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
            e.target.value = "";
          }}
        />
        <Button
          variant="outline"
          size="md"
          icon={<Upload size={14} strokeWidth={2} />}
          onClick={() => fileInputRef.current?.click()}
          loading={uploading}
        >
          {t("admin.settings.worksIntroMedia.upload")}
        </Button>
        <Button
          variant="outline"
          size="md"
          icon={<ImagePlus size={14} strokeWidth={2} />}
          onClick={() => {
            if (showPicker && !pickerClosing) closePicker();
            else if (!showPicker) setShowPicker(true);
          }}
        >
          {showPicker && !pickerClosing ? t("admin.settings.worksIntroMedia.closeCover") : t("admin.settings.worksIntroMedia.chooseCover")}
        </Button>
        <div style={{ flex: "1 1 100%", minWidth: 0 }}>
          <Input
            value={value}
            onChange={onChange}
            placeholder={t("admin.settings.worksIntroMedia.urlPlaceholder")}
          />
        </div>
      </div>

      {showPicker && (
        <div className={styles.worksIntroPickerWrap}>
          <CoverImagePicker
            onSelect={(url) => { onChange(url); closePicker(); }}
            onClose={closePicker}
            closing={pickerClosing}
            currentUrl={value}
            localFilesEndpoint="/api/admin/cover"
          />
        </div>
      )}

      {value && (
        <ImageViewer
          images={[value]}
          index={0}
          open={viewerOpen}
          onClose={() => setViewerOpen(false)}
          title={t("admin.settings.worksIntroMedia.previewTitle")}
        />
      )}
    </div>
  );
}
