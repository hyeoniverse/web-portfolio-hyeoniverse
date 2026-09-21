"use client";

import { useMemo, useRef } from "react";
import { motion } from "framer-motion";
import "katex/dist/katex.min.css";
import { useRichtextEnhance } from "@/hooks/useRichtextEnhance";
import { processRichtextHtml } from "@/utils/processRichtextHtml";
import { useLanguage } from "@/providers/LanguageProvider";
import MarkdownRenderer from "@/components/posts/MarkdownRenderer";
import DateMentionPeek from "@/components/posts/DateMentionPeek";
import { ImageViewer, useProseImageViewer } from "@/components/ui/ImageViewer";
import { pickLocalized } from "@/types/common";
import styles from "./WorkArticleBody.module.css";
import type { WorkArticleViewProps } from "./workArticleTypes";
import { pickContent } from "@/lib/contentLang";

/* ────────────────────────────────────────────────────────────
 * WorkArticleBody — DetailLayout 의 children slot.
 * 본문(richtext/markdown) + ImageViewer.
 * richtext 후처리는 글(posts) 상세와 같은 길을 탄다 — processRichtextHtml 로 HTML 을 다듬고
 * useRichtextEnhance 가 코드블록 바·수식·island 를 얹는다. 예전에는 작업물만 따로 후처리를 걸어서,
 * 코드블록의 휠·줄바꿈 단추가 글 상세와 다르게 굴었다.
 * 팀 멤버 carousel 은 full-width afterContent slot 으로 분리됨 → WorkArticleTeam.
 * ──────────────────────────────────────────────────────────── */
export function WorkArticleBody({ project, viewLang }: WorkArticleViewProps) {
  const { t, language } = useLanguage();
  const isRichtext = project.contentType === "richtext";

  const { containerRef: proseRef, viewerState: proseViewer, closeViewer: closeProseViewer } = useProseImageViewer();
  const richtextRef = useRef<HTMLDivElement>(null);

  /* 보는 언어의 본문이 없으면 반대 언어 쪽을 보여 준다 — 번역 단추는 상세 화면이 본문 위에 낸다 */
  /* 보는 언어 칸에 글이 없으면 다른 언어 본문 — 빈 문단·복사된 README 도 없는 것으로 친다(contentLang) */
  const content = pickContent(project.content, viewLang);

  /* heading id(목차 앵커) · embed 주소 · 줄바꿈 단추 라벨 · 그림 확대 커서 — 글 상세와 같은 다듬기.
     언어가 확정되며 라벨이 바뀌어 본문이 다시 세팅돼도 괜찮다 — useRichtextEnhance 가 알아채고 다시 건다 */
  const html = useMemo(
    () => (isRichtext
      ? processRichtextHtml(content, { codeScroll: t("common.codeScroll"), codeWrap: t("common.codeWrap") })
      : ""),
    [isRichtext, content, t],
  );

  useRichtextEnhance(richtextRef, html, isRichtext);

  return (
    <>
      {/* Content */}
      {content && (
        <motion.div
          className={styles.section}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          <div ref={proseRef}>
            {isRichtext ? (
              <div ref={richtextRef} className={`${styles.sectionProse} prose-content`} dangerouslySetInnerHTML={{ __html: html }} />
            ) : (
              <MarkdownRenderer content={content} className={`${styles.sectionProse} prose-content`} />
            )}
          </div>
          {isRichtext && <DateMentionPeek containerRef={richtextRef} language={language} />}
        </motion.div>
      )}

      {/* Prose ImageViewer */}
      <ImageViewer
        images={proseViewer.images}
        index={proseViewer.index}
        open={proseViewer.open}
        onClose={closeProseViewer}
        title={pickLocalized(project.title, viewLang)}
      />
    </>
  );
}
