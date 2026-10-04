"use client";

/* 스니펫 왼쪽 데모 칸.
   데모는 실행 코드라 admin 이 폼으로 만들 수 없으므로 세 가지 경로만 둔다.
   - media   : GIF/영상/이미지 업로드 (가장 가볍고 안전)
   - sandbox : 별도 실행용 코드를 iframe 샌드박스에서 렌더
   - live    : 저장소에 들어 있는 작은 데모 컴포넌트(LiveDemos)를 이름으로 불러 렌더 */

import dynamic from "next/dynamic";
import styles from "./CodeHighlightsPanel.module.css";

/* 데모 종류. 미설정(undefined) = 아직 안 채운 상태 → 아무것도 렌더하지 않는다 */
export type CodeDemoMode = "media" | "sandbox" | "live";

/* Sandpack 은 무거워서 실제로 sandbox 모드일 때만 로드 */
const LazySandbox = dynamic(() => import("./CodeDemoSandbox"), {
  ssr: false,
  loading: () => <div className={styles.codeDemoInner} />,
});

/* 라이브 데모는 Code Highlights 에 닿을 때만 받는다 */
const LazyLive = dynamic(() => import("./codeHighlights/LiveDemos").then((m) => {
  function LiveDemo({ demoKey, active }: { demoKey: string; active: boolean }) {
    const Demo = m.LIVE_DEMOS[demoKey];
    return Demo ? <>{Demo({ active })}</> : null;
  }
  return LiveDemo;
}), { ssr: false, loading: () => <div className={styles.codeDemoInner} /> });

const VIDEO_RE = /\.(mp4|webm|ogg|mov)(\?|$)/i;

export default function CodeDemoSlot({
  mode,
  media,
  files,
  template,
  demoKey,
  active = true,
}: {
  mode?: CodeDemoMode;
  media?: string;
  files?: Record<string, string>;
  template?: string;
  /** mode="live" 일 때 데모 이름 */
  demoKey?: string;
  /** 보이는 패인만 true — Sandpack 은 iframe 마다 번들러가 돌아서 전부 띄우면 브라우저가 버겁다 */
  active?: boolean;
}) {
  if (mode === "live") {
    return demoKey ? <LazyLive demoKey={demoKey} active={active} /> : null;
  }

  if (mode === "sandbox") {
    const hasCode = files && Object.values(files).some((c) => c.trim());
    if (!hasCode || !active) return null;
    return <LazySandbox files={files} template={template} />;
  }

  if (mode === "media") {
    const url = media?.trim();
    if (!url) return null;
    if (VIDEO_RE.test(url)) {
      return (
        <video
          className={styles.codeDemoMedia}
          src={url}
          autoPlay
          loop
          muted
          playsInline
        />
      );
    }
    /* eslint-disable-next-line @next/next/no-img-element */
    return <img className={styles.codeDemoMedia} src={url} alt="" />;
  }

  return null;
}
