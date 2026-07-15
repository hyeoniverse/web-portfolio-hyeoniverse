"use client";

import { useState } from "react";
import Popover from "@/components/ui/Popover";
import Button from "@/components/ui/Button";
import Tooltip from "@/components/ui/Tooltip";
import MarkdownMarkIcon from "./MarkdownMarkIcon";
import { useLanguage } from "@/providers/LanguageProvider";
import { useIsMobile } from "@/hooks/useIsMobile";
import styles from "./CommentEditor.module.css";

/* 댓글 마크다운 치트시트 — 댓글 헤딩 우측 도움말 버튼 → 공통 Popover.
   locale 키 추가 금지 규칙에 따라 문구는 inline 다국어.

   여기 나열하는 문법은 전부 CommentMarkdown(marked gfm+breaks → DOMPurify 화이트리스트)이
   실제로 렌더하는 것만. 화이트리스트에 없는 건(예: 각주·수식) 적지 않는다 —
   도움말이 되는 게 아니라 안 되는 걸 알려주는 꼴이 된다. */

export default function MarkdownHelp() {
  const { language } = useLanguage();
  const ko = language === "ko";
  const title = ko ? "마크다운 지원" : "Markdown supported";
  // 치트시트가 열리면 툴팁은 끈다 — 안 그러면 popover 위에 툴팁이 겹쳐 남는다
  // (마우스가 트리거 위에 그대로 있으니 hover 가 안 풀린다).
  const [open, setOpen] = useState(false);
  /* Popover 는 모바일에서 bottom sheet 가 되며 sheetTitle 로 자기 헤더를 그린다.
     그 판단(isTouch || isMobile)을 여기서도 똑같이 해서, sheet 일 땐 우리 헤더를 안 그린다 —
     안 그러면 같은 제목이 위아래로 두 번 뜬다. Popover 가 sheet 여부를 안 알려줘서 hook 을 같이 쓴다. */
  const { isTouch, isMobile } = useIsMobile();
  const isSheet = isTouch || isMobile;

  const rows: { syntax: string; label: string }[] = [
    { syntax: `# ${ko ? "제목" : "heading"}`, label: ko ? "제목 (# ~ ######)" : "Heading (# – ######)" },
    { syntax: `**${ko ? "굵게" : "bold"}**`, label: ko ? "굵게" : "Bold" },
    { syntax: `*${ko ? "기울임" : "italic"}*`, label: ko ? "기울임" : "Italic" },
    { syntax: `~~${ko ? "취소선" : "strike"}~~`, label: ko ? "취소선" : "Strikethrough" },
    { syntax: `\`${ko ? "코드" : "code"}\``, label: ko ? "인라인 코드" : "Inline code" },
    { syntax: `\`\`\`js\n${ko ? "코드 블록" : "code block"}\n\`\`\``, label: ko ? "코드 블록 (언어명 선택)" : "Code block (language optional)" },
    { syntax: `[${ko ? "텍스트" : "text"}](url)`, label: ko ? "링크" : "Link" },
    { syntax: `![${ko ? "설명" : "alt"}](${ko ? "이미지 url" : "image url"})`, label: ko ? "이미지 (외부 링크만)" : "Image (external URL only)" },
    { syntax: `- ${ko ? "항목" : "item"}`, label: ko ? "목록" : "List" },
    { syntax: `1. ${ko ? "항목" : "item"}`, label: ko ? "번호 목록" : "Ordered list" },
    { syntax: `- [ ] ${ko ? "할 일" : "todo"}`, label: ko ? "체크박스" : "Task list" },
    { syntax: `> ${ko ? "인용" : "quote"}`, label: ko ? "인용" : "Quote" },
    { syntax: `| a | b |\n| --- | --- |\n| 1 | 2 |`, label: ko ? "표" : "Table" },
    { syntax: `---`, label: ko ? "구분선" : "Divider" },
  ];

  return (
    <Popover
      placement="bottom-end"
      sheetTitle={title}
      className={styles.toolbarHelp}
      contentClassName={styles.helpPopover}
      open={open}
      onOpenChange={setOpen}
      trigger={
        /* Tooltip 을 Popover "안"에 둔다 — 밖에서 감싸면 Tooltip 의 래퍼 span 이
           툴바의 flex item 이 되어, 오른쪽 끝으로 미는 .toolbarHelp(margin-left: auto)가
           안쪽 span 에 걸려 안 먹는다. */
        <Tooltip
          content={ko ? "마크다운을 지원합니다." : "Markdown is supported."}
          placement="top"
          delay={200}
          disabled={open}
        >
          {/* ghost — 보더/원 없이. 서식 버튼들과 같은 variant 지만 tone 으로 accent 를 물려
              "서식 버튼이 아니라 안내" 라는 걸 색으로 구분한다. */}
          <Button
            variant="ghost"
            tone="accent"
            shape="circle"
            size="sm"
            icon={<MarkdownMarkIcon />}
            aria-label={ko ? "마크다운 도움말" : "Markdown help"}
          />
        </Tooltip>
      }
    >
      {/* 표 — 칩이 아니라. 코드 블록/표 문법은 여러 줄이라 칩(알약)에 담으면 늘어져 어색하고,
          문법↔설명은 원래 2열 대응 관계라 표가 의미에도 맞는다.
          스타일은 댓글 본문 표(CommentMarkdown table)와 같은 라인 테이블 결. */}
      <div className={styles.helpPanel}>
        {!isSheet && <span className={styles.helpTitle}>{title}</span>}
        <table className={styles.helpTable}>
          <thead>
            <tr>
              <th scope="col">{ko ? "문법" : "Syntax"}</th>
              <th scope="col">{ko ? "설명" : "Description"}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <td>
                  <code className={styles.helpCode}>{r.syntax}</code>
                </td>
                <td className={styles.helpDesc}>{r.label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Popover>
  );
}
