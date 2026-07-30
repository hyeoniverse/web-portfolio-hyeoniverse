"use client";

import { ImageIcon } from "@/components/icons";
import MediaThumb from "@/components/admin/MediaThumb";
import { adminShellStyles as shell } from "@/components/admin/AdminListShell";
import { formatPostTitle } from "@/utils/post";
import type { Post } from "@/types/post";

/* ── Isolated tooltip to prevent parent re-renders from reaching AdminTable ── */
export default function PreviewTooltip({
  post,
  pos,
  imgError,
  onImgError,
  onDismiss,
  onNavigate,
}: {
  post: Post | null;
  pos: { top: number; left: number };
  imgError: boolean;
  onImgError: () => void;
  onDismiss: () => void;
  onNavigate: () => void;
}) {
  if (!post) return null;
  return (
    <>
      <div className={shell.previewBackdrop} onClick={onDismiss} />
      <div
        className={shell.previewTooltip}
        style={{ top: pos.top, left: pos.left }}
        onClick={onNavigate}
      >
        <div className={shell.previewImage}>
          {post.cover_image && !imgError ? (
            <MediaThumb
              src={post.cover_image}
              width={280}
              height={140}
              className={shell.previewImg}
              onError={onImgError}
            />
          ) : (
            <div className={shell.previewPlaceholder}>
              <ImageIcon size={32} strokeWidth={1.5} />
            </div>
          )}
        </div>
        <div className={shell.previewBody}>
          <p className={shell.previewTitle}>{formatPostTitle(post)}</p>
          <p className={shell.previewExcerpt} style={!post.excerpt ? { color: "var(--text-muted)", fontStyle: "italic" } : undefined}>{post.excerpt || "내용 없음"}</p>
          {post.tags.length > 0 && (
            <div className={shell.previewTags}>
              {post.tags.map((tag) => (
                <span key={tag} className={shell.previewTag}>{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
