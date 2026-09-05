import React from "react";

import {
  PlateElement,
  type PlateElementProps,
} from "platejs/react";
import type { TLinkElement } from "platejs";

import Tooltip from "@/components/ui/Tooltip";

/* 링크 요소 — elements.tsx 에서 분리 (#680). */

export function LinkElement(props: PlateElementProps<TLinkElement>) {
  const url = props.element.url || "";
  return (
    <Tooltip content={url} delay={300} placement="top" wrapperStyle={{ display: "inline" }}>
      <PlateElement
        {...props}
        as="a"
        style={{
          color: "var(--color-accent)",
          textDecoration: "underline",
          textUnderlineOffset: 2,
          cursor: "pointer",
          ...props.style,
        }}
        attributes={{
          ...props.attributes,
          href: url,
          target: "_blank",
          rel: "noopener noreferrer",
          onClick: (e: React.MouseEvent) => {
            e.preventDefault();
          },
          onDoubleClick: (e: React.MouseEvent) => {
            e.preventDefault();
            window.open(url, "_blank", "noopener,noreferrer");
          },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any}
      >
        {props.children}
      </PlateElement>
    </Tooltip>
  );
}

/** 파일 첨부 — PDF/오디오 등 다운로드 가능한 파일 카드 */
