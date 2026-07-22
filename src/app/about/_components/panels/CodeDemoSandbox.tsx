"use client";

/* 스니펫 데모용 샌드박스 프리뷰 — 에디터/콘솔 없이 결과 화면만.
   블로그 PlaygroundSandpack 과 같은 Sandpack 을 쓰지만 그쪽은 풀 에디터라 여기선 preview 만 따로 구성.
   임의 코드는 Sandpack 이 iframe 안에서 실행하므로 앱 컨텍스트와 격리된다.

   파일 맵(경로 → 코드)으로 받는다. react-ts 템플릿의 index.tsx 가 ./styles.css 를 import 하므로
   /styles.css 를 넣으면 그대로 스타일이 먹는다. 넘기지 않은 파일은 템플릿 기본값이 쓰인다. */

import {
  SandpackProvider,
  SandpackPreview,
  type SandpackTheme,
} from "@codesandbox/sandpack-react";
import styles from "./CodeHighlightsPanel.module.css";

/* 앱 토큰 기반 테마 — 데모 배경이 패널과 겉돌지 않게 */
const SP_THEME: SandpackTheme = {
  colors: {
    surface1: "transparent",
    surface2: "transparent",
    surface3: "var(--bg-tertiary)",
    disabled: "var(--text-muted)",
    base: "var(--text-primary)",
    clickable: "var(--text-secondary)",
    hover: "var(--text-primary)",
    accent: "var(--text-accent)",
    error: "var(--text-accent)",
    errorSurface: "var(--bg-accent-subtle)",
  },
  syntax: {
    plain: "var(--text-primary)",
    comment: { color: "var(--text-muted)", fontStyle: "italic" },
    keyword: "var(--text-accent)",
    tag: "var(--text-accent)",
    punctuation: "var(--text-secondary)",
    definition: "var(--text-info)",
    property: "var(--text-info)",
    static: "var(--text-warning)",
    string: "var(--text-success)",
  },
  font: {
    body: "var(--font-space-grotesk), sans-serif",
    mono: "var(--font-mono), monospace",
    size: "13px",
    lineHeight: "1.6",
  },
};

export default function CodeDemoSandbox({
  files,
  template = "react-ts",
}: {
  files: Record<string, string>;
  template?: string;
}) {
  const spFiles = Object.fromEntries(
    Object.entries(files).map(([path, code]) => [path, { code }]),
  );

  return (
    <div className={styles.codeDemoSandbox}>
      <SandpackProvider
        template={template as "react-ts"}
        theme={SP_THEME}
        files={spFiles}
        options={{ recompileMode: "delayed", recompileDelay: 600 }}
      >
        <SandpackPreview
          showOpenInCodeSandbox={false}
          showRefreshButton={false}
          showSandpackErrorOverlay
        />
      </SandpackProvider>
    </div>
  );
}
