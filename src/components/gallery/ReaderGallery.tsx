"use client";

import { useState } from "react";
import { ImageViewer } from "@/components/ui/ImageViewer";
import WorkGallery from "@/components/works/WorkGallery";
import { BodyLabelsProvider } from "@/components/posts/BodyLabelsContext";
import { readerNotes } from "@/lib/galleryNotes";
import { isOfficeDocUrl } from "@/lib/officeViewer";
import type { BodyLabels } from "@/lib/bodyLabels";
import type { GalleryBlockData } from "@/components/posts/plate/gallery/model";

/**
 * 글 본문의 슬라이드 갤러리(읽는 화면) — 작업물 상세와 같은 갤러리(장마다 음성 · 자막)와 크게 보기 뷰어.
 * 본문 HTML 안에 따로 붙는 부품(readerExtras/islands)이라 사이트 문맥 밖에서 그려진다 — 버튼 문구는 본문이 쓰는 라벨(labels)을 받는다.
 * 한 문서가 한 언어라 대본 · 음성은 노트의 기본 칸을 쓴다.
 */
export default function ReaderGallery({ data, title, labels }: { data: GalleryBlockData; title: string; labels: BodyLabels }) {
  const [viewer, setViewer] = useState({ open: false, index: 0 });
  const viewerImages = data.gallery.filter((url) => !isOfficeDocUrl(url));
  const toViewerIndex = (i: number) => data.gallery.slice(0, i).filter((url) => !isOfficeDocUrl(url)).length;
  return (
    <BodyLabelsProvider override={labels}>
      <WorkGallery
        images={data.gallery}
        title={title}
        onOpen={(index) => setViewer({ open: true, index: toViewerIndex(index) })}
        notes={readerNotes(data.notes, "ko")}
        suspended={viewer.open}
      />
      <ImageViewer images={viewerImages} index={viewer.index} open={viewer.open} onClose={() => setViewer({ open: false, index: 0 })} title={title} />
    </BodyLabelsProvider>
  );
}
