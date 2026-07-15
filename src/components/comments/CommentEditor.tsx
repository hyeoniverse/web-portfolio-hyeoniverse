"use client";

import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import Textarea from "@/components/ui/Textarea";
import SegmentedControl from "@/components/ui/SegmentedControl";
import CommentMarkdown from "./CommentMarkdown";
import CommentMarkdownToolbar from "./CommentMarkdownToolbar";
import styles from "./CommentEditor.module.css";

/* 댓글 입력 에디터 공용 컴포넌트 — 새 댓글/답글(CommentForm) + 수정 폼(CommentItem) 공유.
   Write/Preview 탭 + 마크다운 툴바 + 미리보기. giscus `.gsc-comment-box` 내부 구조 미러.
   - mode(write/preview) 는 내부 state — 호출부는 value/onChange 만 신경 쓰면 된다.
   - 툴바가 찾는 [contenteditable] 는 이 루트 div 안에 있으므로 containerRef 도 내부에서 관리. */

interface CommentEditorProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}

export default function CommentEditor({
  value,
  onChange,
  placeholder,
  rows = 3,
}: CommentEditorProps) {
  const { t } = useLanguage();
  // giscus 식 작성/미리보기 토글
  const [mode, setMode] = useState<"write" | "preview">("write");
  const containerRef = useRef<HTMLDivElement>(null);

  /* 작성창 높이를 재서 미리보기에 그대로 물려준다 — 탭을 오가도 상자 크기가 안 변한다.
     렌더된 마크다운(제목·이미지·코드블록)은 원문 텍스트보다 훨씬 높아서, 상한이 없으면
     미리보기로 넘어가는 순간 상자가 확 늘어나고 아래 등록 버튼까지 밀려 내려간다.
     ResizeObserver 인 이유: 입력하면 작성창이 자라므로 마운트 때 한 번 재선 안 된다. */
  const writeRef = useRef<HTMLDivElement>(null);
  const [writeHeight, setWriteHeight] = useState<number>();

  useEffect(() => {
    const el = writeRef.current;
    if (mode !== "write" || !el) return;
    const update = () => setWriteHeight(el.getBoundingClientRect().height);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [mode]);

  return (
    <div ref={containerRef} className={styles.editor}>
      {/* 탭 + 서식 툴바가 한 행 — 둘 다 "입력 도구" 라 행을 나눌 이유가 없고,
          나누면 입력창이 그만큼 아래로 밀린다. 툴바는 write 모드에서만 나타난다. */}
      <div className={styles.editorHeader}>
        <SegmentedControl<"write" | "preview">
          size="sm"
          items={[
            { value: "write", label: t("comments.write") },
            { value: "preview", label: t("comments.preview") },
          ]}
          value={mode}
          onChange={setMode}
        />
        {mode === "write" && (
          <CommentMarkdownToolbar
            containerRef={containerRef}
            content={value}
            onChange={onChange}
          />
        )}
      </div>

      {mode === "write" ? (
        <div ref={writeRef}>
          <Textarea
            size="sm"
            textareaClassName={styles.textarea}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            rows={rows}
            maxHint="long"
            tabIndent
          />
        </div>
      ) : (
        // height 를 작성창과 동일하게 고정 → 넘치는 내용은 스크롤. 아직 못 쟀으면 CSS min-height 로 폴백.
        <div className={styles.previewArea} style={writeHeight ? { height: writeHeight } : undefined}>
          {value.trim() ? (
            <CommentMarkdown content={value} />
          ) : (
            <span className={styles.previewEmpty}>{t("comments.previewEmpty")}</span>
          )}
        </div>
      )}
    </div>
  );
}
