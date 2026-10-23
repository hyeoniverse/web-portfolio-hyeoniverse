"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useEditorRef, useSelected, PlateElement, type PlateElementProps } from "platejs/react";
import { Images, FileText } from "@/components/icons";
import Button from "@/components/ui/Button";
import Pressable from "@/components/ui/Pressable";
import { useSyncRef } from "@/hooks/useSyncRef";
import { useLanguage } from "@/providers/LanguageProvider";
import { useModalStore } from "@/stores/modalStore";
import GalleryEditor, { type GalleryValue } from "@/components/gallery/GalleryEditor";
import { NarrationBadge } from "@/components/works/GalleryNarrationEditor";
import { isOfficeDocUrl, officeDocKind } from "@/lib/officeViewer";
import { isVideoUrl } from "@/lib/isVideoUrl";
import { BlockDropZone, useBlockDrag } from "./BlockDragHandle";
import { normalizeGallery, type GalleryBlockData } from "./gallery/model";
import styles from "./GalleryBlockElement.module.css";

/** 편집 창 안 — 갤러리를 고치는 동안의 값을 들고, 바뀔 때마다 블록에 바로 저장한다(창을 닫아도 잃지 않게) */
function GalleryModalBody({ initial, persist }: { initial: GalleryBlockData; persist: (next: GalleryBlockData) => void }) {
  const [value, setValue] = useState<GalleryValue>(initial);
  const onChange = useCallback((update: (prev: GalleryValue) => GalleryValue) => {
    setValue((prev) => {
      const next = update(prev);
      persist({ gallery: next.gallery, notes: next.notes });
      return next;
    });
  }, [persist]);
  /* 한 문서가 한 언어라 대본 · 음성은 노트의 기본 칸 하나에 둔다 — 영어 본문의 갤러리면 그 칸이 영어 대본이다 */
  return (
    <div className={styles.modalBody}>
      <GalleryEditor value={value} onChange={onChange} lang="ko" translatable={false} />
    </div>
  );
}

/**
 * 글 본문의 슬라이드 갤러리 블록 — 편집 화면에서는 썸네일 줄과 "편집" 단추만 보이고, 누르면 큰 창에서 작업물 갤러리와 같은
 * 편집(그림 · 영상 · PDF · PPTX 들이기, 차례 바꾸기, 장마다 대본 · 음성 · 녹음)을 한다. 읽는 화면은 readerExtras/islands 가 그린다.
 */
export function GalleryBlockElement(props: PlateElementProps) {
  const editor = useEditorRef();
  const selected = useSelected();
  const { t } = useLanguage();
  const openModal = useModalStore((s) => s.openModal);
  const el = props.element as Record<string, unknown>;
  const data = useMemo(() => normalizeGallery(el.data), [el.data]);

  const elementRef = useRef(props.element); useSyncRef(elementRef, props.element);
  const elPath = (() => { try { const p = editor.api.findPath(props.element); return p ? Array.from(p) : null; } catch { return null; } })();
  const { blockDragProps } = useBlockDrag(elPath);

  const persist = useCallback((next: GalleryBlockData) => {
    let p: number[] | null = null;
    try { const pp = editor.api.findPath(elementRef.current); p = pp ? Array.from(pp) : null; } catch { p = null; }
    if (!p) return;
    try { if (!editor.api.node(p)) return; } catch { return; }
    try { editor.tf.setNodes({ data: next } as Record<string, unknown>, { at: p }); } catch { /* noop */ }
  }, [editor]);

  const openEditor = useCallback(() => {
    openModal(<GalleryModalBody initial={data} persist={persist} />, {
      id: "gallery-block-editor",
      header: { title: t("editor.galleryTitle"), icon: <Images size={16} /> },
      width: "min(1120px, 94vw)",
    });
  }, [data, openModal, persist, t]);

  return (
    <BlockDropZone path={elPath}>
      <div {...blockDragProps}>
        <PlateElement {...props} className={styles.block}>
          <div contentEditable={false} className={styles.inner} data-selected={selected ? "" : undefined} onMouseDown={(e) => e.stopPropagation()}>
            <div className={styles.head}>
              <span className={styles.title}>
                <Images size={15} />
                {t("editor.galleryTitle")}
                {data.gallery.length > 0 && <span className={styles.count}>{data.gallery.length}</span>}
              </span>
              <Button variant="outline" shape="capsule" onClick={openEditor} soundDisabled>
                {data.gallery.length > 0 ? t("editor.galleryEdit") : t("editor.galleryAdd")}
              </Button>
            </div>
            {data.gallery.length === 0 ? (
              <Pressable className={styles.empty} onClick={openEditor}>{t("editor.galleryEmpty")}</Pressable>
            ) : (
              <div className={styles.strip}>
                {data.gallery.map((src, i) => (
                  <Pressable key={`${src}-${i}`} className={styles.thumb} onClick={openEditor} aria-label={`${i + 1} / ${data.gallery.length}`}>
                    {isOfficeDocUrl(src) ? (
                      <span className={styles.doc}><FileText size={20} strokeWidth={1.5} />{officeDocKind(src)}</span>
                    ) : isVideoUrl(src) ? (
                      <video src={src} muted playsInline preload="metadata" />
                    ) : (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={src} alt="" loading="lazy" />
                    )}
                    <NarrationBadge note={data.notes[src]} className={styles.badge} />
                  </Pressable>
                ))}
              </div>
            )}
          </div>
          {props.children}
        </PlateElement>
      </div>
    </BlockDropZone>
  );
}
