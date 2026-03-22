import React from "react";
import {
  PlateElement,
  PlateLeaf,
  type PlateElementProps,
  type PlateLeafProps,
  ParagraphPlugin,
} from "platejs/react";
import {
  BoldPlugin,
  ItalicPlugin,
  UnderlinePlugin,
  StrikethroughPlugin,
  SuperscriptPlugin,
  SubscriptPlugin,
  HighlightPlugin,
  HeadingPlugin,
  BlockquotePlugin,
  CodePlugin,
  HorizontalRulePlugin,
} from "@platejs/basic-nodes/react";
import {
  FontColorPlugin,
  FontBackgroundColorPlugin,
  FontFamilyPlugin,
  FontSizePlugin,
  LineHeightPlugin,
  TextAlignPlugin,
} from "@platejs/basic-styles/react";
import {
  TablePlugin,
  TableRowPlugin,
  TableCellPlugin,
  TableCellHeaderPlugin,
} from "@platejs/table/react";
import { CodeBlockPlugin, CodeLinePlugin, CodeSyntaxPlugin } from "@platejs/code-block/react";
import { common, createLowlight } from "lowlight";
import { ImagePlugin, MediaEmbedPlugin } from "@platejs/media/react";
import { LinkPlugin } from "@platejs/link/react";
import { ListPlugin } from "@platejs/list/react";
import { IndentPlugin } from "@platejs/indent/react";
import { EquationPlugin, InlineEquationPlugin } from "@platejs/math/react";
import { ColumnPlugin, ColumnItemPlugin } from "@platejs/layout/react";

import { ImageElement, CodeBlockElement, ParagraphElement, LinkElement, MediaEmbedElement, HeadingElement, BlockquoteElement, HrElement, FileElement, AudioElement, ColumnGroupElement, ColumnElement, ToggleElement, CalloutElement } from "./elements";
import { createSlatePlugin } from "platejs";
import { TableElement, TableRowElement, TableCellElement, TableCellHeaderElement } from "./TableElements";
import { EquationElement, InlineEquationElement } from "./MathElements";

const lowlight = createLowlight(common);

// ── Plugins (모듈 레벨에서 한번만 생성) ──
/** 인라인 style에서 셀별 border 정보를 파싱 */
function parseCellBordersFromStyle(element: HTMLElement) {
  const borders: Record<string, { width?: string; style?: string; color?: string } | null> = {};
  for (const side of ["top", "right", "bottom", "left"] as const) {
    const val = element.style.getPropertyValue(`border-${side}`);
    if (val === "none") {
      borders[side] = null;
    } else if (val) {
      // "2px solid #000" 형태 파싱
      const parts = val.split(/\s+/);
      borders[side] = {
        width: parts[0] || undefined,
        style: parts[1] || undefined,
        color: parts.slice(2).join(" ") || undefined,
      };
    }
  }
  return Object.keys(borders).length ? borders : undefined;
}

export const plugins = [
  // Paragraph (todo 체크박스 렌더링)
  ParagraphPlugin.configure({
    render: { node: ParagraphElement },
  }),
  // Basic marks
  BoldPlugin,
  ItalicPlugin,
  UnderlinePlugin,
  StrikethroughPlugin,
  SuperscriptPlugin,
  SubscriptPlugin,
  HighlightPlugin,
  CodePlugin,
  // Block elements (드롭 존 래퍼 포함)
  HeadingPlugin.configure({ render: { node: HeadingElement } }),
  BlockquotePlugin.configure({ render: { node: BlockquoteElement } }),
  HorizontalRulePlugin.configure({ render: { node: HrElement } }),
  // Column layout
  ColumnPlugin.configure({
    node: { isContainer: false },
    render: { node: ColumnGroupElement },
    parsers: {
      html: {
        deserializer: {
          rules: [{ validNodeName: "DIV" }],
          query: ({ element }: { element: HTMLElement }) => element.hasAttribute("data-column-group"),
          parse: ({ element }: { element: HTMLElement }) => ({
            type: "column_group",
            layout: element.getAttribute("data-layout") || undefined,
            columnBg: element.getAttribute("data-column-bg") || undefined,
            columnDivider: element.getAttribute("data-column-divider") || undefined,
          }),
        },
      },
    },
  }),
  ColumnItemPlugin.configure({
    node: { isContainer: false },
    render: { node: ColumnElement },
    parsers: {
      html: {
        deserializer: {
          rules: [{ validNodeName: "DIV" }],
          query: ({ element }: { element: HTMLElement }) => element.hasAttribute("data-column"),
          parse: ({ element }: { element: HTMLElement }) => ({
            type: "column",
            width: element.getAttribute("data-width") || undefined,
          }),
        },
      },
    },
  }),
  // Table — 블록 요소 (table>tbody>tr>td 구조상 inline 불가)
  TablePlugin.configure({
    options: {
      minColumnWidth: 48,
    },
    render: {
      node: TableElement,
    },
    parsers: {
      html: {
        deserializer: {
          parse: ({ element }: { element: HTMLElement }) => {
            const raw = element.getAttribute("data-col-sizes");
            const colSizes = raw ? raw.split(",").map(Number) : undefined;
            const captionEl = element.querySelector("caption");
            const caption = captionEl?.textContent || undefined;
            if (captionEl) captionEl.remove();
            const borderColor = element.getAttribute("data-border-color") || undefined;
            const borderStyle = element.getAttribute("data-border-style") || undefined;
            const borderWidth = element.getAttribute("data-border-width") || undefined;
            return {
              type: "table",
              ...(colSizes?.length ? { colSizes } : {}),
              ...(caption ? { caption } : {}),
              ...(borderColor ? { borderColor } : {}),
              ...(borderStyle ? { borderStyle } : {}),
              ...(borderWidth ? { borderWidth } : {}),
            };
          },
        },
      },
    },
  }),
  TableRowPlugin.configure({
    render: { node: TableRowElement },
  }),
  TableCellPlugin.configure({
    render: { node: TableCellElement },
    parsers: {
      html: {
        deserializer: {
          parse: ({ element }: { element: HTMLElement }) => {
            const result: Record<string, unknown> = { type: "td" };
            if (element.hasAttribute("data-cell-borders")) {
              result.cellBorders = parseCellBordersFromStyle(element);
            }
            const bg = element.style.backgroundColor;
            if (bg) result.background = bg;
            return result;
          },
        },
      },
    },
  }),
  TableCellHeaderPlugin.configure({
    render: { node: TableCellHeaderElement },
    parsers: {
      html: {
        deserializer: {
          parse: ({ element }: { element: HTMLElement }) => {
            const result: Record<string, unknown> = { type: "th" };
            if (element.hasAttribute("data-cell-borders")) {
              result.cellBorders = parseCellBordersFromStyle(element);
            }
            const bg = element.style.backgroundColor;
            if (bg) result.background = bg;
            return result;
          },
        },
      },
    },
  }),
  // Code block (syntax highlighting via lowlight)
  CodeBlockPlugin.configure({
    options: { lowlight, defaultLanguage: "auto" },
    render: { node: CodeBlockElement },
  }).configurePlugin(CodeLinePlugin, {
    render: {
      node: (props: PlateElementProps) => <PlateElement {...props} as="div" />,
    },
  }).configurePlugin(CodeSyntaxPlugin, {
    render: {
      node: (props: PlateLeafProps) => {
        const leaf = props.leaf as Record<string, unknown>;
        const cls = (leaf.className as string) || undefined;
        return <PlateLeaf {...props} as="span" className={cls} />;
      },
    },
  }),
  // Media — 이미지 커스텀 렌더러 (크기/정렬/캡션)
  ImagePlugin.configure({
    node: { isInline: true },
    render: { node: ImageElement },
    parsers: {
      html: {
        deserializer: {
          rules: [{ validNodeName: ["IMG", "FIGURE"] }],
          parse: ({ element }: { element: HTMLElement }) => {
            // FIGURE → 내부 IMG를 찾아서 처리
            const imgEl = element.nodeName === "FIGURE"
              ? element.querySelector("img")
              : element;
            if (!imgEl) return { text: "" };
            const figureEl = element.nodeName === "FIGURE" ? element : element.parentElement;
            const url = imgEl.getAttribute("src") || "";
            const alt = imgEl.getAttribute("alt") || undefined;
            const style = imgEl.getAttribute("style") || "";
            const wMatch = imgEl.getAttribute("data-width") || style.match(/width:\s*(\d+)px/)?.[1];
            const hMatch = imgEl.getAttribute("data-height") || style.match(/height:\s*(\d+)px/)?.[1];
            const filterMatch = imgEl.getAttribute("data-filter") || style.match(/filter:\s*([^;]+)/)?.[1] || undefined;
            const caption = imgEl.getAttribute("data-caption")
              || figureEl?.querySelector("figcaption")?.textContent
              || undefined;
            const layout = imgEl.getAttribute("data-layout") || undefined;
            const align = imgEl.getAttribute("data-align") || undefined;
            const lockAspect = imgEl.getAttribute("data-lock-aspect") === "false" ? false : undefined;
            return {
              type: "img",
              url,
              ...(alt && { alt }),
              ...(wMatch && { width: parseInt(String(wMatch), 10) }),
              ...(hMatch && { height: parseInt(String(hMatch), 10) }),
              ...(caption && { caption }),
              ...(layout && { layout }),
              ...(align && { align }),
              ...(lockAspect !== undefined && { lockAspect }),
              ...(filterMatch && { filter: filterMatch }),
              children: [{ text: "" }],
            };
          },
        },
      },
    },
  }),
  MediaEmbedPlugin.configure({
    render: { node: MediaEmbedElement },
    parsers: {
      html: {
        deserializer: {
          rules: [{ validNodeName: "IFRAME" }],
          parse: ({ element }: { element: HTMLElement }) => ({
            type: "media_embed",
            url: element.getAttribute("data-original-url") || element.getAttribute("src") || "",
            children: [{ text: "" }],
          }),
        },
      },
    },
  }),
  // Link
  LinkPlugin.configure({
    render: { node: LinkElement },
  }),
  // List
  ListPlugin,
  // Indent
  IndentPlugin,
  // Math (KaTeX)
  EquationPlugin.extend({
    render: { node: EquationElement },
    handlers: {
      onKeyDown: ({ editor, event }) => {
        // 블록 수식 선택 상태에서 타이핑 시 새 paragraph 생성
        if (!editor.selection) return;
        const entry = editor.api.above({ match: { type: editor.getType("equation") } });
        if (!entry) return;
        if (event.key === "Backspace" || event.key === "Delete") return; // 삭제는 기본 동작
        if (event.metaKey || event.ctrlKey || event.altKey) return; // 단축키 무시
        if (event.key.length > 1 && event.key !== "Enter") return; // 특수키 무시
        event.preventDefault();
        const [, path] = entry;
        const nextPath = [...path.slice(0, -1), path[path.length - 1] + 1];
        if (!editor.api.node(nextPath)) {
          editor.tf.insertNodes({ type: "p", children: [{ text: "" }] }, { at: nextPath });
        }
        editor.tf.select(nextPath);
        editor.tf.collapse({ edge: "start" });
        if (event.key !== "Enter") {
          editor.tf.insertText(event.key);
        }
      },
    },
    parsers: {
      html: {
        deserializer: {
          rules: [{ validNodeName: "DIV" }],
          query: ({ element }: { element: HTMLElement }) => element.hasAttribute("data-math-block"),
          parse: ({ element }: { element: HTMLElement }) => ({
            type: "equation",
            texExpression: element.getAttribute("data-latex") || "",
            children: [{ text: "" }],
          }),
        },
      },
    },
  }),
  InlineEquationPlugin.extend({
    render: { node: InlineEquationElement },
    parsers: {
      html: {
        deserializer: {
          rules: [{ validNodeName: "SPAN" }],
          query: ({ element }: { element: HTMLElement }) => element.hasAttribute("data-math-inline"),
          parse: ({ element }: { element: HTMLElement }) => ({
            type: "inline_equation",
            texExpression: element.getAttribute("data-latex") || "",
            children: [{ text: "" }],
          }),
        },
      },
    },
  }),
  // File embed (PDF, audio, etc.)
  createSlatePlugin({
    key: "file_embed",
    node: { isElement: true, isVoid: true },
    render: { node: FileElement },
    parsers: {
      html: {
        deserializer: {
          rules: [{ validNodeName: "DIV" }],
          query: ({ element }: { element: HTMLElement }) => element.hasAttribute("data-file-embed"),
          parse: ({ element }: { element: HTMLElement }) => ({
            type: "file_embed",
            url: element.getAttribute("data-url") || "",
            fileName: element.getAttribute("data-filename") || "",
            fileSize: parseInt(element.getAttribute("data-filesize") || "0", 10) || undefined,
            children: [{ text: "" }],
          }),
        },
      },
    },
  }),
  // Audio player
  createSlatePlugin({
    key: "audio_embed",
    node: { isElement: true, isVoid: true },
    render: { node: AudioElement },
    parsers: {
      html: {
        deserializer: {
          rules: [{ validNodeName: "DIV" }],
          query: ({ element }: { element: HTMLElement }) => element.hasAttribute("data-audio-embed"),
          parse: ({ element }: { element: HTMLElement }) => ({
            type: "audio_embed",
            url: element.getAttribute("data-url") || "",
            title: element.getAttribute("data-title") || "",
            children: [{ text: "" }],
          }),
        },
      },
    },
  }),
  // Toggle (접기/펼치기)
  createSlatePlugin({
    key: "toggle",
    node: { isElement: true },
    render: { node: ToggleElement },
    parsers: {
      html: {
        deserializer: {
          rules: [{ validNodeName: "DIV" }],
          query: ({ element }: { element: HTMLElement }) => element.hasAttribute("data-toggle"),
          parse: ({ element }: { element: HTMLElement }) => ({
            type: "toggle",
            open: element.hasAttribute("data-open"),
          }),
        },
      },
    },
  }),
  // Callout
  createSlatePlugin({
    key: "callout",
    node: { isElement: true },
    render: { node: CalloutElement },
    parsers: {
      html: {
        deserializer: {
          rules: [{ validNodeName: "DIV" }],
          query: ({ element }: { element: HTMLElement }) => element.hasAttribute("data-callout"),
          parse: ({ element }: { element: HTMLElement }) => ({
            type: "callout",
            bg: element.getAttribute("data-callout-bg") || "var(--bg-tertiary)",
            icon: element.getAttribute("data-callout-icon") || "💡",
          }),
        },
      },
    },
  }),
  // Styles
  FontColorPlugin,
  FontBackgroundColorPlugin,
  FontFamilyPlugin,
  FontSizePlugin,
  LineHeightPlugin,
  TextAlignPlugin,
];
