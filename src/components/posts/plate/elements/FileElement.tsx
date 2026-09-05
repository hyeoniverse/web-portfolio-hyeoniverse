import { useState, useEffect } from "react";

import {
  PlateElement,
  type PlateElementProps,
  useEditorRef,
} from "platejs/react";

import Tooltip from "@/components/ui/Tooltip";

import { BlockDropZone, useBlockDrag } from "../BlockDragHandle";

import { FileText, File, Music, Paperclip, Eye, Download } from "@/components/icons";

import Pressable from "@/components/ui/Pressable";

/* 파일 요소 — 미리보기와 내려받기 — elements.tsx 에서 분리 (#680). */

const AUDIO_EXT = /\.(mp3|wav|ogg|m4a|flac|aac|wma)(\?|$)/i;

const OFFICE_EXT = /\.(docx?|xlsx?|pptx?)(\?|$)/i;
const TEXT_EXT = /\.(txt|csv|json|xml|ya?ml|toml|ini|log|md)(\?|$)/i;

function FilePreviewContent({ url, fileName, isPdf, isOffice, isText }: {
  url: string; fileName: string; isPdf: boolean; isOffice: boolean; isText: boolean;
}) {
  const [textContent, setTextContent] = useState<string | null>(null);

  useEffect(() => {
    if (!isText) return;
    let cancelled = false;
    fetch(url).then((r) => r.text()).then((t) => {
      if (!cancelled) setTextContent(t.slice(0, 10000));
    }).catch(() => {
      if (!cancelled) setTextContent("Failed to load file.");
    });
    return () => { cancelled = true; };
  }, [url, isText]);

  if (isPdf) {
    return (
      <iframe
        src={url}
        title={fileName}
        style={{ width: "100%", height: 500, border: "none", borderRadius: 0, display: "block", margin: 0 }}
      />
    );
  }
  if (isOffice) {
    const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
    return (
      <iframe
        src={viewerUrl}
        title={fileName}
        style={{ width: "100%", height: 500, border: "none", borderRadius: 0, display: "block", margin: 0 }}
      />
    );
  }
  if (isText) {
    return (
      <pre style={{
        margin: 0, padding: "12px 16px",
        borderRadius: "var(--radius-2xl)", background: "var(--bg-primary)",
        fontSize: 12, color: "var(--text-secondary)", overflow: "auto",
        maxHeight: 400, whiteSpace: "pre-wrap", wordBreak: "break-all",
        fontFamily: "var(--font-mono)",
      }}>
        {textContent === null ? "Loading..." : textContent}
      </pre>
    );
  }
  return null;
}

/** 확장자 종류별 첨부 아이콘. 판정 순서는 원래 코드 그대로다. */
function fileIconFor(k: { isPdf: boolean; isAudio: boolean; isText: boolean; isOffice: boolean }) {
  if (k.isPdf) return <FileText size={20} strokeWidth={1.5} />;
  if (k.isAudio) return <Music size={20} strokeWidth={1.5} />;
  if (k.isText) return <FileText size={20} strokeWidth={1.5} />;
  if (k.isOffice) return <File size={20} strokeWidth={1.5} />;
  return <Paperclip size={20} strokeWidth={1.5} />;
}

export function FileElement(props: PlateElementProps) {
  const editor = useEditorRef();
  const el = props.element as Record<string, unknown>;
  const url = (el.url as string) || "";
  const fileName = (el.fileName as string) || decodeURIComponent(url.split("/").pop()?.split("?")[0] || "file");
  const fileSize = el.fileSize as number | undefined;
  const elPath = (() => { try { const p = editor.api.findPath(props.element); return p ? Array.from(p) : null; } catch { return null; } })();
  const { blockDragProps } = useBlockDrag(elPath);

  const isAudio = AUDIO_EXT.test(url);
  const isPdf = /\.pdf(\?|$)/i.test(url);
  const isOffice = OFFICE_EXT.test(url);
  const isText = TEXT_EXT.test(url);
  const hasPreview = isPdf || isOffice || isText;
  const [previewOpen, setPreviewOpen] = useState(false);
  const sizeLabel = fileSize ? (fileSize < 1024 * 1024 ? `${(fileSize / 1024).toFixed(1)} KB` : `${(fileSize / (1024 * 1024)).toFixed(1)} MB`) : "";

  /* 아이콘은 컴포넌트가 아니라 값으로 만든다. 렌더 안에서 컴포넌트를 정의하면
     렌더할 때마다 다른 컴포넌트가 되어 React 가 매번 새로 마운트한다. */
  const fileIcon = fileIconFor({ isPdf, isAudio, isText, isOffice });

  return (
    <PlateElement {...props} style={{ margin: "var(--prose-block-gap) 0", ...props.style }}>
      <BlockDropZone path={elPath}>
        <div {...blockDragProps} contentEditable={false} style={{
          maxWidth: hasPreview ? 640 : 480, cursor: "default",
          border: "1px solid var(--border-color-light)",
          borderRadius: previewOpen ? "var(--radius-2xl)" : "var(--radius-capsule, 999px)",
          background: "var(--bg-secondary)", overflow: "hidden",
          display: "flex", flexDirection: "column" as const,
          transition: previewOpen
            ? "border-radius 0.2s ease"
            : "border-radius 0.2s ease 0.3s",
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "8px 12px",
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "var(--color-neutral-alpha-5)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, color: "var(--text-secondary)",
            }}>
              {fileIcon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fileName}</div>
              {sizeLabel && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{sizeLabel}</div>}
            </div>
            {hasPreview && (
              <Tooltip content={previewOpen ? "Close preview" : "Preview"} placement="top">
                <Pressable noTapScale
                  onClick={() => setPreviewOpen(!previewOpen)}
                  style={{
                    width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: "1px solid var(--border-color-light)",
                    background: previewOpen ? "var(--bg-inverse)" : "var(--bg-primary)",
                    color: previewOpen ? "var(--text-inverse)" : "var(--text-primary)", cursor: "pointer",
                    transition: "background 0.2s, color 0.2s",
                  }}
                >
                  <Eye size={16} />
                </Pressable>
              </Tooltip>
            )}
            <a href={url} target="_blank" rel="noopener noreferrer" download={fileName} style={{
              width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "1px solid var(--border-color-light)", background: "var(--bg-primary)",
              color: "var(--text-primary)", textDecoration: "none", cursor: "pointer",
            }}>
              <Download size={16} />
            </a>
          </div>
          {isAudio && (
            <audio src={url} controls preload="metadata" style={{ width: "100%", padding: "0 12px 8px", borderRadius: "var(--radius-2xl)" }} />
          )}
          {hasPreview && (
            <div style={{
              display: "grid",
              gridTemplateRows: previewOpen ? "1fr" : "0fr",
              transition: previewOpen
                ? "grid-template-rows 0.35s cubic-bezier(0.16, 1, 0.3, 1) 0.15s"
                : "grid-template-rows 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
            }}>
              <div style={{ overflow: "hidden" }}>
                <div>
                  <FilePreviewContent url={url} fileName={fileName} isPdf={isPdf} isOffice={isOffice} isText={isText} />
                </div>
              </div>
            </div>
          )}
        </div>
      </BlockDropZone>
      {props.children}
    </PlateElement>
  );
}

/** Heading (h1–h6) — 드롭 존 래퍼 */
