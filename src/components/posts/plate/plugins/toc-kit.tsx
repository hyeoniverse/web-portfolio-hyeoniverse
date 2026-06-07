"use client";

// ── TOC Kit ──
// 문서 내 목차 블록. 현재 문서의 heading 목록을 실시간으로 보여주고, 클릭 시 해당 heading
// 으로 스크롤한다. @platejs/toc 의 useTocElementState/useTocElement 사용.

import * as React from "react";
import { PlateElement, type PlateElementProps } from "platejs/react";
import { TocPlugin, useTocElementState, useTocElement } from "@platejs/toc/react";
import { useLanguage } from "@/providers/LanguageProvider";
import styles from "../../RichTextEditor.module.css";

function TocElement(props: PlateElementProps) {
  const { t } = useLanguage();
  const state = useTocElementState();
  const { props: btnProps } = useTocElement(state);
  const { headingList } = state;

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
              onClick={(e) => btnProps.onClick(e, h, "smooth")}
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
