"use client";

import { createSlatePlugin } from "platejs";
import { CalendarElement } from "../CalendarElement";
import { normalizeCalendar } from "../calendar/model";

/** 이벤트 달력 — block void, 연결형. 리더 직렬화는 <div data-calendar-id>(신규) / <div data-calendar>(legacy inline) */
export const CalendarKit = [
  createSlatePlugin({
    key: "calendar",
    node: { isElement: true, isVoid: true },
    render: { node: CalendarElement },
    parsers: {
      html: {
        deserializer: {
          rules: [{ validNodeName: "DIV" }],
          query: ({ element }: { element: HTMLElement }) =>
            element.hasAttribute("data-calendar-id") || element.hasAttribute("data-calendar"),
          parse: ({ element }: { element: HTMLElement }) => {
            // 신규: calendarId 참조
            const calId = element.getAttribute("data-calendar-id");
            if (calId) {
              return { type: "calendar", calendarId: calId, children: [{ text: "" }] };
            }
            // legacy: inline data (마운트 시 서버 달력으로 승계)
            let raw: unknown = {};
            try { raw = JSON.parse(element.getAttribute("data-calendar") || "{}"); } catch { /* noop */ }
            const data = normalizeCalendar(raw);
            return {
              type: "calendar",
              month: data.month, events: data.events, labels: data.labels,
              children: [{ text: "" }],
            };
          },
        },
      },
    },
  }),
];
