"use client";

import Image from "next/image";
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
            <Image
              src={post.cover_image}
              alt=""
              width={280}
              height={140}
              className={shell.previewImg}
              unoptimized
              onError={onImgError}
            />
          ) : (
            <div className={shell.previewPlaceholder}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
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
