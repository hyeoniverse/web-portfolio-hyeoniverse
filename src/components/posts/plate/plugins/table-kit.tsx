"use client";

import {
  TablePlugin,
  TableRowPlugin,
  TableCellPlugin,
  TableCellHeaderPlugin,
} from "@platejs/table/react";
import {
  TableElement,
  TableRowElement,
  TableCellElement,
  TableCellHeaderElement,
} from "../TableElements";

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

/** 테이블 — block 요소 (table>tbody>tr>td 구조상 inline 불가) */
export const TableKit = [
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
            const fitWidth = element.getAttribute("data-fit-width") === "true";
            // 고정 개수 — 구버전(data-freeze-row/col/header) 은 1개로 호환
            const frRaw = element.getAttribute("data-freeze-rows");
            const fcRaw = element.getAttribute("data-freeze-cols");
            const freezeRows = frRaw != null ? Number(frRaw)
              : (element.getAttribute("data-freeze-row") === "true" || element.getAttribute("data-freeze-header") === "true" ? 1 : 0);
            const freezeCols = fcRaw != null ? Number(fcRaw)
              : (element.getAttribute("data-freeze-col") === "true" ? 1 : 0);
            const headerBg = element.getAttribute("data-header-bg") || undefined;
            const headerColor = element.getAttribute("data-header-color") || undefined;
            const headerBold = element.getAttribute("data-header-bold");
            return {
              type: "table",
              ...(colSizes?.length ? { colSizes } : {}),
              ...(caption ? { caption } : {}),
              ...(borderColor ? { borderColor } : {}),
              ...(borderStyle ? { borderStyle } : {}),
              ...(borderWidth ? { borderWidth } : {}),
              ...(fitWidth ? { fitWidth: true } : {}),
              ...(freezeRows > 0 && !Number.isNaN(freezeRows) ? { freezeRows } : {}),
              ...(freezeCols > 0 && !Number.isNaN(freezeCols) ? { freezeCols } : {}),
              ...(headerBg ? { headerBg } : {}),
              ...(headerColor ? { headerColor } : {}),
              ...(headerBold === "false" ? { headerBold: false } : {}),
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
            // 헤더 배경 — 직렬화가 background-color 에 불투명 base(var(--bg-primary))를 넣으므로 그걸 읽으면
            // 리로드 시 헤더가 페이지 배경색으로 투명해짐. 커스텀 색은 data-th-bg 로만 왕복.
            const thBg = element.getAttribute("data-th-bg");
            if (thBg && thBg !== "var(--bg-primary)") result.background = thBg;
            return result;
          },
        },
      },
    },
  }),
];
