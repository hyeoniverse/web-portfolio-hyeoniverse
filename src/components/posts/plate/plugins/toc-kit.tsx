"use client";

// ── TOC Kit ──
// 문서 내 목차 블록. 현재 문서의 heading 목록을 실시간으로 보여주고, 클릭 시 해당 heading
// 으로 스크롤한다. @platejs/toc 의 useTocElementState/useTocElement 사용.

import * as React from "react";
import { PlateElement, useEditorRef, type PlateElementProps } from "platejs/react";
import { TocPlugin, useTocElementState } from "@platejs/toc/react";
import { useLanguage } from "@/providers/LanguageProvider";
import styles from "../../RichTextEditor.module.css";

function TocElement(props: PlateElementProps) {
  const { t } = useLanguage();
  const editor = useEditorRef();
  const state = useTocElementState();
  const { headingList } = state;

  // 항목 클릭 → 해당 heading 으로 스크롤. @platejs/toc 기본은 스크롤 컨테이너 판정을 놓치면 window(전체 페이지)를
  // 스크롤한다 → 여기선 에디터 스크롤 컨테이너([data-slate-editor], overflow-y:auto)만 직접 스크롤(페이지 고정).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scrollToHeading = React.useCallback((h: any) => {
    try {
      const entry = editor.api.node(h.path);
      const dom = entry ? (editor.api.toDOMNode(entry[0]) as HTMLElement | null) : null;
      const container = (dom?.closest('[data-slate-editor="true"]')
        || document.querySelector('[data-slate-editor="true"]')) as HTMLElement | null;
      if (!dom || !container) return;
      const top = container.scrollTop + (dom.getBoundingClientRect().top - container.getBoundingClientRect().top) - 12;
      container.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    } catch { /* noop */ }
  }, [editor]);

  return (
    <PlateElement {...props}>
      <div className={styles.toc} contentEditable={false}>
        {headingList.length === 0 ? (
          <div className={styles.tocEmpty}>{t("editor.tocEmpty")}</div>
        ) : (
          headingList.map((h) => (
            <button
              key={h.id}
              type="button"
              className={styles.tocItem}
              data-depth={h.depth}
              onClick={() => scrollToHeading(h)}
            >
              {h.title}
            </button>
          ))
        )}
      </div>
      {props.children}
    </PlateElement>
  );
}

export const TocKit = [
  TocPlugin.configure({
    render: { node: TocElement },
    // 저장된 마커(<div data-toc>) → toc 노드 복원
    parsers: {
      html: {
        deserializer: {
          rules: [{ validNodeName: "DIV" }],
          query: ({ element }: { element: HTMLElement }) => element.hasAttribute("data-toc"),
          parse: () => ({ type: "toc", children: [{ text: "" }] }),
        },
      },
    },
  }),
];
