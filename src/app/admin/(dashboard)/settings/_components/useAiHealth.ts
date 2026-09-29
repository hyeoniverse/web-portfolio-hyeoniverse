"use client";

/* AI 상태·사용량(GET /api/admin/ai-health) — 서비스 탭이 한 번 불러 상태 패널과 fallback 섹션들이 같이 쓴다.
   fallback 순서에 고른 공급자가 키 없음·꺼짐이면 그 자리에서 보이게 하려고 */
import { useCallback, useEffect, useState } from "react";
import { tryRequest } from "@/lib/sendAction";
import { isDisabledNow } from "@/lib/ai/status";
import type { AiProvider, ProviderHealth, ProviderUsage } from "@/lib/ai/providers";

export interface AiHealthData {
  health: Partial<Record<AiProvider, ProviderHealth>>;
  usage: { month: string; providers: Partial<Record<AiProvider, ProviderUsage>> };
  configured: Record<AiProvider, boolean>;
  deepl: { count: number; limit: number } | null;
  /** 불러온 때 — 무료 기한까지 남은 날·꺼짐 판정에 쓴다(그리는 중에 시계를 읽지 않는다) */
  loadedAt: number;
}

export type ProviderState = "ok" | "failing" | "off" | "nokey";

export function useAiHealth() {
  const [data, setData] = useState<AiHealthData | null>(null);
  const [failed, setFailed] = useState(false);

  const fetchData = useCallback(async () => {
    const res = await tryRequest("/api/admin/ai-health", { method: "GET" });
    if (!(res instanceof Response)) return null;
    const body = await res.json().catch(() => null);
    return body ? ({ ...body, loadedAt: Date.now() } as AiHealthData) : null;
  }, []);

  useEffect(() => {
    let alive = true;
    void fetchData().then((d) => {
      if (!alive) return;
      if (d) setData(d);
      else setFailed(true);
    });
    return () => { alive = false; };
  }, [fetchData]);

  const reload = useCallback(async () => {
    const d = await fetchData();
    if (d) setData(d);
  }, [fetchData]);

  const stateOf = useCallback((p: AiProvider): ProviderState | null => {
    if (!data) return null;
    const h = data.health[p];
    if (!data.configured[p]) return "nokey";
    if (isDisabledNow(h, data.loadedAt)) return "off";
    if ((h?.fails ?? 0) > 0) return "failing";
    return "ok";
  }, [data]);

  return { data, failed, reload, stateOf };
}
