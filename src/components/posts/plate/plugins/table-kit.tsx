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
];
