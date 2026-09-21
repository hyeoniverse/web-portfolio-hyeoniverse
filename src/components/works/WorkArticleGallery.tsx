"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ImageViewer } from "@/components/ui/ImageViewer";
import { pickLocalized } from "@/types/common";
import WorkGallery from "./WorkGallery";
import { isOfficeDocUrl } from "@/lib/officeViewer";
import type { WorkArticleViewProps } from "./workArticleTypes";

/* ────────────────────────────────────────────────────────────
 * WorkArticleGallery — 작업물의 슬라이드 갤러리.
 *
 * 본문(children) 이 아니라 DetailLayout 의 afterContent 로 들어간다. 갤러리에 담기는 건 대체로
 * 발표 자료·문서를 장으로 쪼갠 것이라, 글 칼럼(목차 사이드바와 폭을 나눠 쓰는) 안에 두면 작다.
 * afterContent 는 페이지 폭을 그대로 쓴다.
 *
 * 한 장씩 넘겨 보는 건 여기서, 확대해서 읽는 건 뷰어(전체화면)가 맡는다.
 * ──────────────────────────────────────────────────────────── */
export function WorkArticleGallery({ project, viewLang }: WorkArticleViewProps) {
  const [viewer, setViewer] = useState({ open: false, index: 0 });
  if (project.gallery.length === 0) return null;
  /* 확대 뷰어에는 그림만 넘긴다 — 문서 칸(옛 .ppt 등)은 갤러리 안의 문서 뷰어로 보고, 뷰어에 섞이면 깨진 그림이 된다 */
  const viewerImages = project.gallery.filter((url) => !isOfficeDocUrl(url));
  const toViewerIndex = (galleryIndex: number) =>
    project.gallery.slice(0, galleryIndex).filter((url) => !isOfficeDocUrl(url)).length;

  return (
    <>
      <motion.div
        id="gallery"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65, duration: 0.6 }}
      >
        <WorkGallery
          images={project.gallery}
          title={pickLocalized(project.title, viewLang)}
          onOpen={(index) => setViewer({ open: true, index: toViewerIndex(index) })}
          notes={project.galleryNotes}
          suspended={viewer.open}
        />
      </motion.div>

      {/* 확대·전체화면은 뷰어 안에서 고른다 — 여는 순간 전체화면으로 바꾸면 Esc 의 뜻이 둘로 갈린다 */}
      <ImageViewer
        images={viewerImages}
        index={viewer.index}
        open={viewer.open}
        onClose={() => setViewer({ open: false, index: 0 })}
        title={pickLocalized(project.title, viewLang)}
      />
    </>
  );
}
