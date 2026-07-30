"use client";

import { useCallback, type ReactNode, type RefObject } from "react";
import {
  Heading,
  Bold,
  Italic,
  Strikethrough,
  Code,
  SquareCode,
  Link as LinkIcon,
  Image as ImageIcon,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Table,
  Minus,
} from "@/components/icons";
import { useLanguage } from "@/providers/LanguageProvider";
import Button from "@/components/ui/Button";
import Tooltip from "@/components/ui/Tooltip";
import MarkdownHelp from "./MarkdownHelp";
import styles from "./CommentEditor.module.css";

/* 댓글 에디터용 경량 마크다운 툴바.
   - 공통 Textarea(maxHint → contentEditable)를 건드리지 않고, 에디터 컨테이너 안의
     [contenteditable] 요소를 찾아 content 문자열 + caret offset 기준으로 서식 적용.
   - onChange 로 상태 갱신 → EditableTextarea 가 innerHTML 재구성/caret 복원 → rAF 로 원하는 선택 덮어씀. */

// 서식 동작 — wrap(감싸기) / link / prefix(줄머리) / block(통째 삽입)
type MdAction =
  /** 선택(없으면 placeholder)을 before/after 로 감쌈. block: 코드펜스처럼 자기 줄에서 시작해야 하는 것 */
  | { kind: "wrap"; before: string; after: string; placeholder: string; block?: boolean }
  /** [텍스트](url) — image 면 앞에 ! 를 붙여 이미지 문법 */
  | { kind: "link"; placeholder: string; image?: boolean }
  /** 줄머리에 prefix. placeholder — 빈 줄에서 눌렀을 때 채울 예시 텍스트 */
  | { kind: "prefix"; prefix: string; placeholder: string }
  /** 표·구분선처럼 선택과 무관하게 통째로 넣는 블록. select 가 있으면 삽입 후 그 부분을 선택 */
  | { kind: "block"; text: string; select?: string };

/** 블록 요소는 자기 줄에서 시작해야 마크다운으로 파싱된다 (`breaks: true` 라도 펜스/표는 줄머리 기준).
 *  커서 앞이 줄 시작이 아니면 필요한 만큼 줄바꿈을 채워 넣는다. */
function blockLead(before: string): string {
  if (before === "" || before.endsWith("\n\n")) return "";
  return before.endsWith("\n") ? "\n" : "\n\n";
}

/** 에디터 안 현재 선택의 문자 offset [start,end] — 선택이 에디터 밖이면 null.
 *  EditableTextarea 의 caret offset 계산과 동일 기법(range → 문자수). */
function getSelectionOffsets(root: HTMLElement): { start: number; end: number } | null {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return null;
  const range = sel.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;
  const pre = range.cloneRange();
  pre.selectNodeContents(root);
  pre.setEnd(range.startContainer, range.startOffset);
  const start = pre.toString().length;
  return { start, end: start + range.toString().length };
}

/** offset 범위로 선택 복원 (start===end 면 collapsed caret). */
function setSelectionOffsets(root: HTMLElement, start: number, end: number): void {
  const sel = window.getSelection();
  if (!sel) return;
  const locate = (offset: number): { node: Node; pos: number } => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    let remaining = offset;
    while ((node = walker.nextNode())) {
      const len = node.textContent?.length ?? 0;
      if (remaining <= len) return { node, pos: remaining };
      remaining -= len;
    }
    return { node: root, pos: root.childNodes.length };
  };
  const a = locate(start);
  const b = locate(end);
  const range = document.createRange();
  range.setStart(a.node, a.pos);
  range.setEnd(b.node, b.pos);
  sel.removeAllRanges();
  sel.addRange(range);
}

interface Props {
  /** 에디터 컨테이너 ref — 안의 contenteditable 에디터를 찾는다.
   *  querySelector 만 쓰므로 form/div 등 어떤 HTMLElement 든 받는다. */
  containerRef: RefObject<HTMLElement | null>;
  content: string;
  onChange: (v: string) => void;
}

export default function CommentMarkdownToolbar({ containerRef, content, onChange }: Props) {
  const { language } = useLanguage();
  const ko = language === "ko";

  const apply = useCallback(
    (action: MdAction) => {
      const root = containerRef.current?.querySelector<HTMLElement>("[contenteditable]");
      if (!root) return;
      const sel = getSelectionOffsets(root);
      // 선택이 에디터 밖이면 끝에 삽입
      const start = sel ? sel.start : content.length;
      const end = sel ? sel.end : content.length;
      const selected = content.slice(start, end);

      let next: string;
      let selStart: number;
      let selEnd: number;

      if (action.kind === "wrap") {
        const inner = selected || action.placeholder;
        const head = content.slice(0, start);
        const lead = action.block ? blockLead(head) : "";
        next = head + lead + action.before + inner + action.after + content.slice(end);
        selStart = start + lead.length + action.before.length;
        selEnd = selStart + inner.length; // 안쪽 텍스트 선택 → 이어 타이핑하면 덮어씀
      } else if (action.kind === "link") {
        const text = selected || action.placeholder;
        const url = "url";
        const mark = action.image ? "!" : "";
        next = content.slice(0, start) + `${mark}[${text}](${url})` + content.slice(end);
        selStart = start + mark.length + 1 + text.length + 2; // ("!") + "[" + text + "]("
        selEnd = selStart + url.length; // url 자리 선택
      } else if (action.kind === "block") {
        const head = content.slice(0, start);
        const lead = blockLead(head);
        // 뒤가 줄바꿈으로 안 이어지면 하나 붙여 다음 입력이 블록에 먹히지 않게
        const tail = content.slice(end);
        const trail = tail === "" || tail.startsWith("\n") ? "" : "\n";
        next = head + lead + action.text + trail + tail;
        if (action.select) {
          selStart = start + lead.length + action.text.indexOf(action.select);
          selEnd = selStart + action.select.length;
        } else {
          // 선택할 자리가 없으면(구분선 등) 삽입한 블록 끝에 caret
          selStart = selEnd = start + lead.length + action.text.length;
        }
      } else {
        // prefix — 선택 범위의 각 줄 앞에 prefix
        const lineStart = content.lastIndexOf("\n", start - 1) + 1;
        const block = content.slice(lineStart, end);
        /* 빈 줄에서 눌렀으면 마커만 남는다. 체크박스가 특히 문제 —
           GFM 은 "- [ ] " 뒤에 텍스트가 있어야 체크박스로 파싱해서, 마커만 있으면
           <li>[ ]</li> 인 그냥 불릿 목록이 된다. 다른 마커(-, 1., >, ###)도 빈 블록이 되고.
           → placeholder 를 채워 넣고 그 부분을 선택 → 이어 타이핑하면 덮어써진다 (wrap 과 동일한 감각). */
        if (block.trim() === "") {
          next = content.slice(0, lineStart) + action.prefix + action.placeholder + content.slice(end);
          selStart = lineStart + action.prefix.length;
          selEnd = selStart + action.placeholder.length;
        } else {
          const prefixed = block.split("\n").map((ln) => action.prefix + ln).join("\n");
          next = content.slice(0, lineStart) + prefixed + content.slice(end);
          selStart = lineStart;
          selEnd = lineStart + prefixed.length;
        }
      }

      onChange(next);
      // 재렌더(innerHTML 재구성 + caret 복원) 이후 원하는 선택으로 덮어씀
      requestAnimationFrame(() => {
        const el = containerRef.current?.querySelector<HTMLElement>("[contenteditable]");
        if (!el) return;
        el.focus();
        setSelectionOffsets(el, selStart, selEnd);
      });
    },
    [containerRef, content, onChange],
  );

  type Item = { key: string; icon: ReactNode; label: string; action: MdAction };

  /* 하는 일 기준 4묶음 — 14개가 균일하게 늘어서면 뭘 찾는지 모른다.
     경계는 "선택한 글에 무슨 일이 일어나는가":
       텍스트 = 글 일부를 감쌈 / 블록 = 줄 전체를 다른 블록으로 / 목록 = 줄머리를 붙임 /
       삽입 = 선택과 무관하게 새 걸 통째로 넣음 (그래서 표·구분선이 블록이 아니라 여기).
     여기 있는 건 전부 CommentMarkdown 이 실제로 렌더한다. */
  const groups: { label: string; items: Item[] }[] = [
    {
      label: ko ? "텍스트" : "Text",
      items: [
        { key: "bold", icon: <Bold size={14} />, label: ko ? "굵게" : "Bold", action: { kind: "wrap", before: "**", after: "**", placeholder: ko ? "굵게" : "bold" } },
        { key: "italic", icon: <Italic size={14} />, label: ko ? "기울임" : "Italic", action: { kind: "wrap", before: "*", after: "*", placeholder: ko ? "기울임" : "italic" } },
        { key: "strike", icon: <Strikethrough size={14} />, label: ko ? "취소선" : "Strikethrough", action: { kind: "wrap", before: "~~", after: "~~", placeholder: ko ? "취소선" : "strikethrough" } },
        { key: "code", icon: <Code size={14} />, label: ko ? "인라인 코드" : "Inline code", action: { kind: "wrap", before: "`", after: "`", placeholder: ko ? "코드" : "code" } },
      ],
    },
    {
      label: ko ? "블록" : "Block",
      items: [
        { key: "heading", icon: <Heading size={14} />, label: ko ? "제목" : "Heading", action: { kind: "prefix", prefix: "### ", placeholder: ko ? "제목" : "heading" } },
        { key: "quote", icon: <Quote size={14} />, label: ko ? "인용" : "Quote", action: { kind: "prefix", prefix: "> ", placeholder: ko ? "인용" : "quote" } },
        // 펜스는 줄머리에서만 파싱 → block: true 로 앞줄을 확보한다
        { key: "codeblock", icon: <SquareCode size={14} />, label: ko ? "코드 블록" : "Code block", action: { kind: "wrap", before: "```\n", after: "\n```", placeholder: ko ? "코드" : "code", block: true } },
      ],
    },
    {
      label: ko ? "목록" : "List",
      items: [
        { key: "list", icon: <List size={14} />, label: ko ? "목록" : "List", action: { kind: "prefix", prefix: "- ", placeholder: ko ? "항목" : "item" } },
        { key: "ordered", icon: <ListOrdered size={14} />, label: ko ? "번호 목록" : "Ordered list", action: { kind: "prefix", prefix: "1. ", placeholder: ko ? "항목" : "item" } },
        { key: "task", icon: <ListChecks size={14} />, label: ko ? "체크박스" : "Task list", action: { kind: "prefix", prefix: "- [ ] ", placeholder: ko ? "할 일" : "todo" } },
      ],
    },
    {
      label: ko ? "삽입" : "Insert",
      items: [
        { key: "link", icon: <LinkIcon size={14} />, label: ko ? "링크" : "Link", action: { kind: "link", placeholder: ko ? "텍스트" : "text" } },
        // 업로드는 없고 외부 호스팅 url 만 — 렌더러가 http(s) 만 통과시킨다
        { key: "image", icon: <ImageIcon size={14} />, label: ko ? "이미지 (외부 링크)" : "Image (external URL)", action: { kind: "link", placeholder: ko ? "설명" : "alt", image: true } },
        {
          key: "table",
          icon: <Table size={14} />,
          label: ko ? "표" : "Table",
          action: {
            kind: "block",
            // 헤더 구분행(| --- |)이 있어야 표로 파싱된다 → 골격을 통째로 넣고 첫 칸을 선택
            text: ko
              ? "| 제목 | 제목 |\n| --- | --- |\n| 내용 | 내용 |"
              : "| Head | Head |\n| --- | --- |\n| Cell | Cell |",
            select: ko ? "제목" : "Head",
          },
        },
        { key: "divider", icon: <Minus size={14} />, label: ko ? "구분선" : "Divider", action: { kind: "block", text: "---" } },
      ],
    },
  ];

  return (
    <div className={styles.toolbar} role="toolbar" aria-label={ko ? "마크다운 서식" : "Markdown formatting"}>
      {groups.map((group) => (
        /* 라벨 + 버튼이 한 덩어리 — 좁아지면 그룹 통째로 다음 줄로 넘어가야
           라벨만 홀로 떨어지는 일이 없다 (답글은 중첩될수록 폭이 좁다). */
        <div key={group.label} className={styles.toolbarGroup} role="group" aria-label={group.label}>
          <span className={styles.toolbarGroupLabel} aria-hidden="true">
            {group.label}
          </span>
          {group.items.map((it) => (
            /* 툴팁 — 아이콘만으론 뭘 하는 버튼인지 확실치 않다(제목/코드 블록/표 등).
               native title 은 지연이 길고 스타일도 못 맞춰서 공통 Tooltip 으로 통일.
               둘 다 두면 툴팁이 두 개 뜨므로 title 은 제거하고 aria-label 만 남긴다. */
            <Tooltip key={it.key} content={it.label} placement="top" delay={200}>
              <Button
                variant="ghost"
                shape="circle"
                size="sm"
                icon={it.icon}
                // 에디터 포커스/선택 유지 — 클릭 전에 blur 되지 않게
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => apply(it.action)}
                aria-label={it.label}
              />
            </Tooltip>
          ))}
        </div>
      ))}
      {/* 도움말 — 서식 버튼이 아니라 툴바 맨 오른쪽 끝(margin-left: auto)에 따로 떨어져 앉는다 */}
      <MarkdownHelp />
    </div>
  );
}
