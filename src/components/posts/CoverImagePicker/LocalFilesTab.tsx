"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { isVideoUrl } from "@/lib/isVideoUrl";
import styles from "./CoverImagePicker.module.css";

interface LocalFile {
  url: string;
  name: string;
  sizeBytes: number;
}

interface LocalFilesTabProps {
  /** 파일 목록 fetch URL — { files: LocalFile[] } 또는 { videos: LocalFile[] } 반환 */
  endpoint: string;
  onSelect: (url: string, name: string) => void;
  currentUrl?: string;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function LocalFilesTab({ endpoint, onSelect, currentUrl }: LocalFilesTabProps) {
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(endpoint)
      .then((r) => r.ok ? r.json() : { files: [] })
      .then((d) => setFiles(d.files ?? d.videos ?? []))
      .catch(() => setFiles([]))
      .finally(() => setLoading(false));
  }, [endpoint]);

  if (loading) {
    return <p className={styles.emptyMsg}>불러오는 중…</p>;
  }
  if (files.length === 0) {
    return <p className={styles.emptyMsg}>로컬 파일이 없습니다.</p>;
  }

  return (
    <div className={styles.localFilesGrid}>
      {files.map((f) => {
        const selected = currentUrl === f.url;
        const video = isVideoUrl(f.url);
        return (
          <button
            key={f.url}
            type="button"
            className={`${styles.localFileCard} ${selected ? styles.localFileCardSelected : ""}`}
            onClick={() => onSelect(f.url, f.name)}
            title={`${f.name} · ${formatBytes(f.sizeBytes)}`}
          >
            {video ? (
              <video
                src={f.url}
                className={styles.localFileThumb}
                muted
                playsInline
                preload="metadata"
                onMouseEnter={(e) => { e.currentTarget.play().catch(() => {}); }}
                onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
              />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={f.url} alt={f.name} className={styles.localFileThumb} />
            )}
            {selected && (
              <span className={styles.localFileCheck} aria-hidden>
                <Check size={12} strokeWidth={3} />
              </span>
            )}
            <span className={styles.localFileMeta}>
              <span className={styles.localFileName}>{f.name}</span>
              <span className={styles.localFileSize}>{formatBytes(f.sizeBytes)}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
