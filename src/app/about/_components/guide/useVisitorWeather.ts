"use client";

/* 방문자 날씨 — 하늘(TimeSky)과 첫 화면 날씨 줄이 같이 쓴다. 한 페이지에서 한 번만 받는다(/api/weather).
   받기 전과 실패하면 null — 하늘은 날씨 없이 방문자 시계만으로 그린다 */
import { useSyncExternalStore } from "react";
import type { VisitorWeather } from "@/lib/weather/sky";

let value: VisitorWeather | null = null;
let started = false;
const listeners = new Set<() => void>();

function start() {
  if (started) return;
  started = true;
  fetch("/api/weather")
    .then((r) => (r.ok ? (r.json() as Promise<VisitorWeather>) : null))
    .then((v) => {
      if (!v) return;
      value = v;
      listeners.forEach((l) => l());
    })
    .catch(() => {});
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  start();
  return () => listeners.delete(cb);
};

export function useVisitorWeather(): VisitorWeather | null {
  return useSyncExternalStore(subscribe, () => value, () => null);
}
