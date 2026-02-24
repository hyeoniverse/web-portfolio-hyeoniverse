"use client";

import { useEffect } from "react";

/**
 * 다른 탭에서 Settings 저장 시 현재 페이지를 자동 새로고침.
 * BroadcastChannel API 사용 — 같은 origin의 탭 간 통신.
 */
export default function SettingsSync() {
  useEffect(() => {
    let bc: BroadcastChannel;
    try {
      bc = new BroadcastChannel("settings-updated");
      bc.onmessage = (event) => {
        if (event.data?.type === "settings-updated") {
          window.location.reload();
        }
      };
    } catch {
      // BroadcastChannel 미지원 브라우저 — 무시
      return;
    }

    return () => {
      bc?.close();
    };
  }, []);

  return null;
}
