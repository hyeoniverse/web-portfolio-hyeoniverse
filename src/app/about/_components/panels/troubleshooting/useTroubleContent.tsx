"use client";

import React, { useCallback, useState } from "react";
import Image from "next/image";
import { ImageIcon, Maximize2 } from "@/components/icons";
import Pressable from "@/components/ui/Pressable";
import type { TroubleshootingImage, TroubleShootingItem } from "@/data/about/types";
import type { Language } from "@/providers/LanguageProvider";
import { renderHighlight } from "../../renderHighlight";
import CanonicalCodeBlock from "./CanonicalCodeBlock";
import { displayTitle } from "./itemHelpers";
import styles from "../TroubleshootingPanel.module.css";

export interface ImageViewerState {
  images: string[];
  index: number;
  title?: string;
}

/* 항목 본문을 IDE 에디터 줄로 그리는 렌더러 묶음.
   문단·펜스 코드블록·인라인 서식은 renderParagraphs 가, 위치별 이미지는 renderImagesAt 가 맡는다.
   이미지 뷰어 상태는 두 렌더러만 쓰므로 여기서 들고 있고 패널은 뷰어에 넘길 값만 받는다. */
export function useTroubleContent(language: Language) {
  // 공통 ImageViewer — 클릭한 이미지가 viewer 의 시작 index, 같은 item 의 src 있는 이미지들이 list 가 됨
  const [viewerState, setViewerState] = useState<{ images: string[]; index: number; title?: string } | null>(null);
  const openImageViewer = useCallback((item: TroubleShootingItem, clickedImg: TroubleshootingImage) => {
    const srcs = (item.images ?? []).filter((i): i is TroubleshootingImage & { src: string } => !!i.src).map((i) => i.src);
    const idx = clickedImg.src ? srcs.indexOf(clickedImg.src) : 0;
    setViewerState({ images: srcs, index: Math.max(0, idx), title: displayTitle(item)[language] });
  }, [language]);


  /** \n\n 로 구분된 문단을 각각 별도 ideLine 으로 렌더 + 사이에 빈 줄. ``` 펜스는 코드블록으로.
   *  인라인 `code`·**bold**·*italic*·용어 툴팁은 renderHighlight 가 처리. */
  const renderParagraphs = useCallback(
    (
      text: string,
      opts?: { insightStyle?: boolean; takeViz?: () => React.ReactNode | null },
    ) => {
      // 펜스 코드블록(``` … ```)을 먼저 통째로 분리 — 블록 내부에 빈 줄(\n\n)이 있어도
      // \n\n 문단 분리에 두 동강 나지 않게 한다.
      type Block =
        | { type: "code"; code: string; lang: string }
        | { type: "prose"; text: string }
        | { type: "viz" };
      const blocks: Block[] = [];
      const pushProse = (chunk: string) => {
        for (const p of chunk.split(/\n\n+/)) {
          const t = p.replace(/^\n+|\n+$/g, "");
          if (!t.trim()) continue;
          /* `[[viz]]` 한 줄은 그 자리에 도형을 넣으라는 표시다. 도형을 섹션 끝에 몰지 않고
             설명이 필요한 문단 사이에 끼우기 위한 마커. */
          if (t.trim() === "[[viz]]") blocks.push({ type: "viz" });
          else blocks.push({ type: "prose", text: t });
        }
      };
      const fenceRe = /```[^\n]*\n[\s\S]*?```/g;
      let last = 0;
      let m: RegExpExecArray | null;
      while ((m = fenceRe.exec(text)) !== null) {
        if (m.index > last) pushProse(text.slice(last, m.index));
        const fence = m[0];
        const lang = fence.match(/^```([^\n]*)/)?.[1]?.trim() ?? "";
        const code = fence.replace(/^```[^\n]*\n?/, "").replace(/\n?```\s*$/, "");
        blocks.push({ type: "code", code, lang });
        last = m.index + fence.length;
      }
      if (last < text.length) pushProse(text.slice(last));

      return blocks.map((blk, bi) => {
        const gap =
          bi > 0 ? (
            <div className={`${styles.ideLine} ${styles.ideLineEmpty}`}>
              <span className={styles.ideLineNum} />
              <span className={styles.ideLineText} />
            </div>
          ) : null;

        /* 본문 안의 `### 소제목` — 긴 항목에서 검토 대상을 나눠 준다.
           섹션 제목(##)은 패널이 그리고, 이건 섹션 안쪽 단계 구분용이다. */
        if (blk.type === "prose" && /^###\s+/.test(blk.text)) {
          return (
            <React.Fragment key={bi}>
              {gap}
              <div className={styles.ideLine}>
                <span className={styles.ideLineNum} />
                <span className={styles.ideLineText}>
                  <span className={styles.ideHashH2}>###</span>{" "}
                  <span className={styles.ideHeading}>
                    {blk.text.replace(/^###\s+/, "")}
                  </span>
                </span>
              </div>
            </React.Fragment>
          );
        }

        if (blk.type === "viz") {
          const node = opts?.takeViz?.() ?? null;
          if (!node) return null;
          return (
            <React.Fragment key={bi}>
              {gap}
              {node}
            </React.Fragment>
          );
        }

        if (blk.type === "code") {
          return (
            <React.Fragment key={bi}>
              {gap}
              <div className={styles.ideIndent}>
                <CanonicalCodeBlock code={blk.code} lang={blk.lang} />
              </div>
            </React.Fragment>
          );
        }

        return (
          <React.Fragment key={bi}>
            {gap}
            <div className={styles.ideLine}>
              <span className={styles.ideLineNum} />
              <span className={`${styles.ideLineText} ${opts?.insightStyle ? styles.ideInsight : ""}`}>
                {renderHighlight(blk.text, language)}
              </span>
            </div>
          </React.Fragment>
        );
      });
    },
    [language],
  );


  /** 특정 position 의 이미지들만 골라서 렌더 — content 흐름 안에 자연스럽게 끼워 넣기 위함 */
  const renderImagesAt = useCallback(
    (item: TroubleShootingItem, position: "definition" | "cause" | "solution" | "insight") => {
      const images = item.images;
      if (!images || images.length === 0) return null;
      const filtered = images.filter((img) => img.src && (img.position ?? "solution") === position);
      if (filtered.length === 0) return null;
      return (
        <div className={styles.ideIndent}>
          <div className={styles.troubleImages}>
            {filtered.map((img, ii) =>
              img.src ? (
                <figure key={ii} className={styles.troubleImage}>
                  {/* wrap (relative) > 이미지 button (clip + radius) + hint button (overflow 밖, 잘림 없음) */}
                  <div className={styles.troubleImageWrap}>
                    <Pressable noTapScale
                      data-clickable="true"
                      className={styles.troubleImageBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        openImageViewer(item, img);
                      }}
                      aria-label={img.alt[language]}
                    >
                      <Image
                        src={img.src}
                        alt={img.alt[language]}
                        width={1200}
                        height={750}
                        sizes="(max-width: 1024px) 100vw, 800px"
                        className={styles.troubleImageImg}
                      />
                    </Pressable>
                    <Pressable noTapScale
                      data-clickable="true"
                      className={styles.ideDiagramHint}
                      onClick={(e) => {
                        e.stopPropagation();
                        openImageViewer(item, img);
                      }}
                      aria-label="크게 보기"
                    >
                      <Maximize2 strokeWidth={2} className={styles.ideDiagramHintIcon} />
                      크게 보기
                    </Pressable>
                  </div>
                  {img.caption && (
                    <figcaption className={styles.troubleImageCaption}>
                      {img.caption[language]}
                    </figcaption>
                  )}
                </figure>
              ) : (
                <div key={ii} className={styles.troubleImagePlaceholder}>
                  <ImageIcon size={32} strokeWidth={1.5} />
                  <span className={styles.troubleImagePlaceholderTitle}>
                    {img.placeholderKeyword ?? "Screenshot needed"}
                  </span>
                  <small className={styles.troubleImagePlaceholderAlt}>
                    {img.alt[language]}
                  </small>
                </div>
              ),
            )}
          </div>
        </div>
      );
    },
    [language, openImageViewer],
  );

  return { renderParagraphs, renderImagesAt, viewerState, closeViewer: () => setViewerState(null) };
}
