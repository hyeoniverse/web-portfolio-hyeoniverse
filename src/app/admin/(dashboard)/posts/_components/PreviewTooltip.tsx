"use client";

import { ImageIcon } from "@/components/icons";
import MediaThumb from "@/components/admin/MediaThumb";
import { adminShellStyles as shell } from "@/components/admin/AdminListShell";
import { formatPostTitle } from "@/utils/post";
import type { Post } from "@/types/post";
import { useLanguage } from "@/providers/LanguageProvider";
import { usePopoverRef } from "@/hooks/useTopLayer";

/* ── Isolated tooltip to prevent parent re-renders from reaching AdminTable ── */
export default function PreviewTooltip({
  post,
  open = true,
  pos,
  imgError,
  onImgError,
  onDismiss,
  onNavigate,
}: {
  post: Post | null;
  /** 떠 있는 중인지 — 닫힐 때는 false 로 사라지는 효과를 보인 뒤 post 가 비워진다 */
  open?: boolean;
  pos: { top: number; left: number };
  imgError: boolean;
  onImgError: () => void;
  onDismiss: () => void;
  onNavigate: () => void;
}) {
  const { t } = useLanguage();
  const backdropPop = usePopoverRef<HTMLDivElement>();
  const tipPop = usePopoverRef<HTMLDivElement>();
  if (!post) return null;
  return (
    <>
      <div ref={backdropPop} popover="manual" className={shell.previewBackdrop} onClick={onDismiss} />
      <div
        ref={tipPop}
        popover="manual"
        className={shell.previewTooltip}
        data-preview-tooltip
        data-state={open ? "open" : "closed"}
        style={{ top: pos.top, left: pos.left }}
        onClick={onNavigate}
      >
        {/* 행을 옮기면 같은 툴팁 안에서 내용만 바뀐다 — 바뀐 내용은 살짝 번지듯 들어온다 */}
        <div key={post.id} className={shell.previewSwap}>
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
          <p className={shell.previewExcerpt} style={!post.excerpt ? { color: "var(--text-muted)", fontStyle: "italic" } : undefined}>{post.excerpt || t("admin.common.noContent")}</p>
          {post.tags.length > 0 && (
            <div className={shell.previewTags}>
              {post.tags.map((tag) => (
                <span key={tag} className={shell.previewTag}>{tag}</span>
              ))}
            </div>
          )}
        </div>
        </div>
      </div>
    </>
  );
}
