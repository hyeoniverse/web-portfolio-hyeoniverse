"use client";

/* sandbox 데모 파일 편집기.
   줄 번호·신택스 하이라이팅은 Sandpack 의 CodeMirror 에디터를 그대로 쓴다(이미 의존성에 있음).
   탭은 VS Code 처럼 직접 그린다 — Sandpack 기본 탭은 높이/스타일을 주변 컨트롤과 못 맞춘다.

   Sandpack Provider 는 uncontrolled — 마운트 시점의 files 만 읽는다.
   따라서 스니펫이 바뀌면 호출부에서 key 로 remount 시켜야 한다. */

import { useEffect, useRef, useState } from "react";
import {
  SandpackProvider,
  SandpackCodeEditor,
  useSandpack,
  type SandpackTheme,
} from "@codesandbox/sandpack-react";
import { Plus, X } from "lucide-react";
import css from "./DemoFilesEditor.module.css";

const SP_EDITOR_THEME: SandpackTheme = {
  colors: {
    surface1: "var(--bg-primary)",
    surface2: "var(--bg-secondary)",
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

type Files = Record<string, string>;

const shallowEqual = (a: Files, b: Files) => {
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => a[k] === b[k]);
};

export default function DemoFilesEditor({
  files,
  onChange,
  lang,
}: {
  files: Files;
  onChange: (f: Files) => void;
  lang: "ko" | "en";
}) {
  const paths = Object.keys(files);
  return (
    <div className={css.panel}>
      <p className={css.hint}>
        {lang === "ko"
          ? "App.tsx 가 진입점입니다. styles.css 는 자동으로 적용되고, 파일을 더 만들어 import 할 수 있습니다."
          : "App.tsx is the entry point. styles.css is applied automatically; add more files and import them."}
      </p>
      <SandpackProvider
        template="react-ts"
        theme={SP_EDITOR_THEME}
        files={Object.fromEntries(paths.map((p) => [p, { code: files[p] }]))}
        options={{ visibleFiles: paths, activeFile: paths[0] }}
      >
        <Body onChange={onChange} lang={lang} />
      </SandpackProvider>
    </div>
  );
}

function Body({ onChange, lang }: { onChange: (f: Files) => void; lang: "ko" | "en" }) {
  const { sandpack } = useSandpack();
  const [adding, setAdding] = useState(false);
  const lastSent = useRef<Files | null>(null);

  /* 에디터 편집분을 config 로 올린다. visibleFiles 만 — 템플릿 기본 파일까지 저장하면 안 된다. */
  useEffect(() => {
    const next: Files = {};
    for (const p of sandpack.visibleFiles) {
      const f = sandpack.files[p] as { code?: string } | undefined;
      if (f) next[p] = f.code ?? "";
    }
    if (lastSent.current && shallowEqual(lastSent.current, next)) return;
    lastSent.current = next;
    onChange(next);
  }, [sandpack.files, sandpack.visibleFiles, onChange]);

  const addFile = (raw: string) => {
    setAdding(false);
    const name = raw.trim().replace(/^\/*/, "/");
    if (!name || name === "/" || sandpack.files[name]) return;
    sandpack.addFile(name, "");
    sandpack.setActiveFile(name);
  };

  const closeFile = (path: string) => {
    if (sandpack.visibleFiles.length <= 1) return;
    sandpack.deleteFile(path);
  };

  return (
    <div className={css.editor}>
      <div className={css.tabs}>
        {sandpack.visibleFiles.map((path) => {
          const active = path === sandpack.activeFile;
          return (
            <div key={path} className={`${css.tab} ${active ? css.tabActive : ""}`}>
              <button type="button" className={css.tabName} onClick={() => sandpack.setActiveFile(path)}>
                {path.replace(/^\//, "")}
              </button>
              {sandpack.visibleFiles.length > 1 && (
                <button type="button" className={css.tabClose} onClick={() => closeFile(path)} aria-label={`close ${path}`}>
                  <X size={11} />
                </button>
              )}
            </div>
          );
        })}
        {adding ? (
          <input className={css.tabInput} autoFocus defaultValue="/" aria-label={lang === "ko" ? "새 파일 경로" : "New file path"}
            onBlur={(e) => addFile(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") setAdding(false);
            }} />
        ) : (
          <button type="button" className={css.addTab} onClick={() => setAdding(true)}>
            <Plus size={12} /> {lang === "ko" ? "파일" : "File"}
          </button>
        )}
      </div>
      <SandpackCodeEditor
        className={css.code}
        showTabs={false}
        showLineNumbers
        showInlineErrors
        wrapContent
      />
    </div>
  );
}
