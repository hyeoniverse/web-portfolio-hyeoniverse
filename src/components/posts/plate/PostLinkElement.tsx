"use client";

// ── 다른 게시물 링크 (inline void) ──
// 노션식 인라인 pill. 클릭하면 popover 로 "열기 / 삭제".
// 저장: { type:"post_link", slug, postId?, title, id }

import React, { useRef, useState } from "react";
import { useSyncRef } from "@/hooks/useSyncRef";
import { useEditorRef, useSelected, PlateElement, type PlateElementProps } from "platejs/react";
import { FileText, ExternalLink, Trash2, Replace } from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import Popover from "@/components/ui/Popover";
import { cachedPostIcon, fetchPostIcon, primePostIcon, isImageIcon, isVideoIcon } from "./postLinkIcon";
import styles from "./PostLink.module.css";
import Pressable from "@/components/ui/Pressable";

/** 문서 멘션 앞 아이콘 — 게시물 이모지/이미지, 없으면 FileText */
function PostLinkIcon({ slug, icon }: { slug: string; icon?: string }) {
  React.useEffect(() => { if (icon) primePostIcon(slug, icon); }, [slug, icon]);
  const [resolved, setResolved] = useState<string | undefined>(icon || cachedPostIcon(slug));
  React.useEffect(() => {
    if (resolved !== undefined || !slug) return;
    let alive = true;
    fetchPostIcon(slug).then((v) => { if (alive) setResolved(v); });
    return () => { alive = false; };
  }, [slug, resolved]);
  // 동영상 cover 는 <img> 로 못 띄워 엑박 → <video> 로 (gif 는 이미지라 <img> 로 동작)
  if (resolved && isVideoIcon(resolved)) return <video className={styles.pillIconImg} src={resolved} autoPlay loop muted playsInline aria-hidden />;
  // eslint-disable-next-line @next/next/no-img-element -- 작은 게시물 아이콘, 최적화 불필요
  if (resolved && isImageIcon(resolved)) return <img className={styles.pillIconImg} src={resolved} alt="" aria-hidden />;
  if (resolved) return <span className={styles.pillIconEmoji} aria-hidden>{resolved}</span>;
  return <FileText size={13} aria-hidden />;
}

export function PostLinkElement(props: PlateElementProps) {
  const editor = useEditorRef();
  const selected = useSelected();
  const { language } = useLanguage();
  const t = (ko: string, en: string) => (language === "ko" ? ko : en);

  const el = props.element as Record<string, unknown>;
  const slug = (el.slug as string) || "";
  const icon = (el.icon as string) || "";
  const title = (el.title as string) || slug || t("(제목 없음)", "(Untitled)");
  const href = slug ? `/posts/${slug}` : "#";

  const [open, setOpen] = useState(false);

  // stale path 방지 — 호출 시점에 path 재탐색 후 removeNodes
  const elementRef = useRef(props.element);
  useSyncRef(elementRef, props.element);
  const removeNode = () => {
    let p: number[] | null = null;
    try { const pp = editor.api.findPath(elementRef.current); p = pp ? Array.from(pp) : null; } catch { p = null; }
    if (!p) return;
    try { editor.tf.removeNodes({ at: p }); } catch { /* noop */ }
  };
  // 교체 — 이 멘션을 지우고 그 자리에서 삽입 메뉴("[[")를 다시 띄워 새 게시물 선택
  const replaceNode = () => {
    setOpen(false);
    let p: number[] | null = null;
    try { const pp = editor.api.findPath(elementRef.current); p = pp ? Array.from(pp) : null; } catch { p = null; }
    if (!p) return;
    try {
      editor.tf.removeNodes({ at: p });
      const at = editor.api.start(p);
      if (at) editor.tf.select(at);
      editor.tf.focus();
      editor.tf.insertText("[[");
    } catch { /* noop */ }
  };

  return (
    <PlateElement {...props} as="span">
      <span contentEditable={false} style={{ userSelect: "none" }}>
        <Popover
          open={open}
          onOpenChange={setOpen}
          placement="bottom-start"
          offset={6}
          maxHeight={false}
          responsive={false}
          contentClassName={styles.menu}
          trigger={
            <span className={`${styles.pill}${selected ? ` ${styles.pillSelected}` : ""}`} role="button" tabIndex={0}>
              <PostLinkIcon slug={slug} icon={icon} />
              <span className={styles.pillLabel}>{title}</span>
            </span>
          }
        >
          <div className={styles.menuBody} onMouseDown={(e) => e.preventDefault()}>
            <a className={styles.menuItem} href={href} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={15} aria-hidden />{t("게시물 열기", "Open post")}
            </a>
            <Pressable className={styles.menuItem} onClick={replaceNode}>
              <Replace size={15} aria-hidden />{t("게시물 교체", "Replace post")}
            </Pressable>
            <Pressable className={`${styles.menuItem} ${styles.menuItemDanger}`} onClick={() => { removeNode(); setOpen(false); }}>
              <Trash2 size={15} aria-hidden />{t("삭제", "Remove")}
            </Pressable>
          </div>
        </Popover>
      </span>
      <span style={{ padding: "0 1px" }}>{props.children}</span>
    </PlateElement>
  );
}
