"use client";

/* Code Highlights 스니펫의 코드 편집기.
 *
 * prism 이 그린 <pre> 위에 투명 textarea 를 겹치는 방식을 쓰다 버렸다.
 * pre 와 textarea 는 서로 다른 렌더링 경로라 같은 글자도 배치가 미묘하게 달라지고,
 * 그때마다 캐럿 위치·스크롤·줄바꿈이 어긋난다. 편집은 편집기에 맡긴다.
 *
 * CodeMirror(Sandpack 경유)는 하이라이팅된 텍스트를 직접 편집하므로
 * 캐럿·스크롤·줄바꿈이 애초에 어긋날 수 없다.
 * 폰트만 패널의 코드 블록(.codeBlock code)과 맞춰 미리보기 크기를 유지한다. */

import { useEffect, useRef } from "react";
import {
  SandpackProvider,
  SandpackCodeEditor,
  useSandpack,
  type SandpackTheme,
} from "@codesandbox/sandpack-react";
import css from "./CodeBlockEditor.module.css";

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
    body: "var(--font-mono), monospace",
    mono: "var(--font-mono), monospace",
    /* 실제 크기는 CSS 에서 패널 토큰(--font-size-prose)으로 덮는다 */
    size: "16px",
    lineHeight: "1.5",
  },
};

/* 확장자가 있어야 Sandpack 이 언어 확장을 물려 CodeMirror 를 띄운다 */
const FILE = "/snippet.tsx";

export default function CodeBlockEditor({
  code,
  onChange,
}: {
  code: string;
  onChange: (v: string) => void;
}) {
  return (
    /* data-lenis-prevent — 전역 Lenis 가 휠을 가로채 페이지를 스크롤해버린다.
       내부 스크롤 영역은 이 프로젝트 관례대로 Lenis 에서 제외한다. */
    <div className={css.wrap} data-lenis-prevent>
      <SandpackProvider
        template="react-ts"
        theme={SP_THEME}
        files={{ [FILE]: { code } }}
        /* initMode immediate — 스테이지 안에 있어 lazy 로 두면 초기화가 안 걸린다 */
        options={{ visibleFiles: [FILE], activeFile: FILE, initMode: "immediate" }}
      >
        <Sync onChange={onChange} />
        <SandpackCodeEditor
          className={css.editor}
          showTabs={false}
          showLineNumbers
          wrapContent
        />
      </SandpackProvider>
    </div>
  );
}

/* 편집분을 config 로 올린다. 처음 값은 props 에서 온 것이라 올리지 않는다 — 올리면 고치지 않았는데도
   "바뀜" 이 된다. 저장값이 비어 있어 기본 데이터를 보여 주는 동안(Code Highlights)에는 그 순간 기본 목록
   전체가 설정값에 들어가, About 을 열기만 해도 저장 단추가 켜지고 떠날 때마다 확인을 물었다. */
function Sync({ onChange }: { onChange: (v: string) => void }) {
  const { sandpack } = useSandpack();
  const last = useRef<string | null>(null);
  useEffect(() => {
    const f = sandpack.files[FILE] as { code?: string } | undefined;
    const next = f?.code ?? "";
    if (last.current === null) { last.current = next; return; }
    if (last.current === next) return;
    last.current = next;
    onChange(next);
  }, [sandpack.files, onChange]);
  return null;
}
