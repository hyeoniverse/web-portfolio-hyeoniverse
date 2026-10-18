"use client";

// ── 라이브러리 파일 미리보기 (업로드한 파일 › 미리보기 단추 → 모달) ──
// 종류마다 브라우저가 그릴 수 있는 것으로 보여 준다. 이미지 · 동영상 · 음원은 그대로, 폰트는 견본 글,
// PDF 는 브라우저 뷰어, 오피스 문서는 마이크로소프트 뷰어(officeViewer), 글 파일은 앞부분. 그 밖은 새 탭에서 열기.
import { useEffect, useState } from "react";
import { ExternalLink, File, Music } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import { isOfficeDocUrl, officeViewerUrl } from "@/lib/officeViewer";
import { mediaType } from "@/lib/mediaUsage";
import EmptyState from "@/components/ui/EmptyState";
import styles from "./LibraryFilePreview.module.css";

type PreviewFile = { name: string; mime: string; url: string };

const TEXT_EXT = /\.(txt|csv|tsv|json|xml|ya?ml|toml|ini|log|md|svg|css|js|ts)$/i;
/* 글 파일은 앞부분만 — 큰 로그를 통째로 그리면 모달이 굳는다 */
const TEXT_LIMIT = 20000;

function previewKind(f: PreviewFile): "image" | "video" | "audio" | "font" | "pdf" | "office" | "text" | "none" {
  const k = mediaType(f.mime, f.name);
  if (k === "image" || k === "video" || k === "audio" || k === "font") return k;
  if (f.mime === "application/pdf" || /\.pdf$/i.test(f.name)) return "pdf";
  if (isOfficeDocUrl(f.name)) return "office";
  if (f.mime.startsWith("text/") || f.mime === "application/json" || TEXT_EXT.test(f.name)) return "text";
  return "none";
}

function TextPreview({ url }: { url: string }) {
  const { t } = useLanguage();
  const [text, setText] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetch(url)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((s) => { if (!cancelled) setText(s.length > TEXT_LIMIT ? `${s.slice(0, TEXT_LIMIT)}\n…` : s); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [url]);
  if (failed) return <EmptyState pad="sm">{t("admin.inline.filePreview.loadFailed")}</EmptyState>;
  return <pre className={styles.text}>{text ?? t("admin.inline.filePreview.loading")}</pre>;
}

/* 폰트 — 파일을 이름 없는 글꼴로 불러 견본 글을 그 글꼴로 쓴다. 닫으면 문서에서 뺀다 */
function FontPreview({ url }: { url: string }) {
  const { t } = useLanguage();
  const [family, setFamily] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const name = `library-preview-${Math.random().toString(36).slice(2)}`;
    const face = new FontFace(name, `url(${JSON.stringify(url)})`);
    let cancelled = false;
    face.load()
      .then((f) => { if (cancelled) return; document.fonts.add(f); setFamily(name); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; document.fonts.delete(face); };
  }, [url]);
  if (failed) return <EmptyState pad="sm">{t("admin.inline.filePreview.loadFailed")}</EmptyState>;
  if (!family) return <p className={styles.fontLoading}>{t("admin.inline.filePreview.loading")}</p>;
  return (
    <div className={styles.font}>
      {/* 크기는 역할 토큰(font 줄임 · 글꼴 포함), 글꼴만 불러온 것으로 덮는다 */}
      {[styles.fontLg, styles.fontMd, styles.fontSm].map((size) => (
        <p key={size} className={size} style={{ fontFamily: `"${family}"` }}>
          <span>{t("admin.inline.filePreview.sampleHangul")}</span>
          <span>The quick brown fox jumps over the lazy dog</span>
          <span>0123456789 !?&amp;@</span>
        </p>
      ))}
    </div>
  );
}

export default function LibraryFilePreview({ file }: { file: PreviewFile }) {
  const { t } = useLanguage();
  const kind = previewKind(file);
  return (
    <div className={styles.wrap} data-kind={kind}>
      {kind === "image" && (
        // eslint-disable-next-line @next/next/no-img-element -- 올린 원본 그대로(크기 · 형식 무관), 최적화 대상이 아니다
        <img className={styles.image} src={file.url} alt={file.name} />
      )}
      {kind === "video" && <video className={styles.video} src={file.url} controls playsInline preload="metadata" />}
      {kind === "audio" && (
        <div className={styles.audio}>
          <Music size={40} strokeWidth={1.25} />
          <audio src={file.url} controls preload="metadata" />
        </div>
      )}
      {kind === "font" && <FontPreview url={file.url} />}
      {kind === "pdf" && <iframe className={styles.frame} src={file.url} title={file.name} />}
      {kind === "office" && <iframe className={styles.frame} src={officeViewerUrl(file.url)} title={file.name} />}
      {kind === "text" && <TextPreview url={file.url} />}
      {kind === "none" && (
        <div className={styles.none}>
          <File size={40} strokeWidth={1.25} />
          <p>{t("admin.inline.filePreview.unsupported")}</p>
        </div>
      )}
      <a className={styles.open} href={file.url} target="_blank" rel="noopener noreferrer">
        <ExternalLink size={13} />
        {t("admin.inline.filePreview.openNewTab")}
      </a>
    </div>
  );
}
