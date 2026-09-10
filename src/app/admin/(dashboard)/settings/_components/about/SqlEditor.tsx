"use client";

/* SQL 가져오기 입력창 — 하이라이팅되는 편집기.
 *
 * <pre> 위에 투명 textarea 를 겹치는 방식은 쓰지 않는다.
 * CodeBlockEditor 주석에 남아 있듯 pre 와 textarea 는 렌더링 경로가 달라
 * 캐럿·스크롤·줄바꿈이 어긋난다. 편집은 편집기(CodeMirror)에 맡긴다.
 *
 * Sandpack 은 이 화면(About 스튜디오)에서 이미 쓰고 있어 추가 비용이 없고,
 * SQL 문법만 additionalLanguages 로 물려준다(→ sqlLanguage.ts). */

import { useEffect, useMemo, useRef } from "react";
import { useSyncRef } from "@/hooks/useSyncRef";
import {
  SandpackProvider,
  SandpackCodeEditor,
  useSandpack,
  type SandpackTheme,
} from "@codesandbox/sandpack-react";
import { sqlLanguage } from "./sqlLanguage";
import { sqlEditorExtensions } from "./sqlEditorExtensions";
import type { ErdTable } from "@/data/about/types";
import css from "./SqlEditor.module.css";

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
    size: "14px",
    lineHeight: "1.7",
  },
};

/* 확장자가 있어야 Sandpack 이 언어 확장을 물려 CodeMirror 를 띄운다 */
const FILE = "/schema.sql";

const SQL_LANG = [{ name: "sql", extensions: ["sql"], language: sqlLanguage() }];

export default function SqlEditor({
  value, onChange, ariaLabel, tables, lang,
}: {
  value: string;
  onChange: (v: string) => void;
  ariaLabel?: string;
  /** 자동완성·진단이 참조하는 현재 ERD */
  tables: ErdTable[];
  lang: "ko" | "en";
}) {
  /* 확장은 한 번만 만든다 — 배열이 매번 새로 생기면 CodeMirror 가 통째로 재구성돼
     커서와 되돌리기 이력이 날아간다. 최신 값은 ref 를 통해 읽는다. */
  const live = useRef({ tables, lang });
  useSyncRef(live, { tables, lang });
  const extensions = useMemo(
    () => sqlEditorExtensions(() => live.current.tables, () => live.current.lang),
    [],
  );

  return (
    /* data-lenis-prevent — 전역 Lenis 가 휠을 가로채 페이지가 대신 스크롤된다 */
    <div className={css.wrap} data-lenis-prevent aria-label={ariaLabel}>
      <SandpackProvider
        /* 이 저장소의 다른 Sandpack 편집기와 같은 템플릿 — 미리보기는 안 띄우므로
           번들러는 돌지 않고, 검증된 초기화 경로만 그대로 쓴다 */
        template="react-ts"
        theme={SP_THEME}
        files={{ [FILE]: { code: value } }}
        /* initMode immediate — 접혔다 펼쳐지는 패널 안이라 lazy 면 초기화가 안 걸린다 */
        options={{ visibleFiles: [FILE], activeFile: FILE, initMode: "immediate" }}
      >
        <Sync value={value} onChange={onChange} />
        <SandpackCodeEditor
          className={css.editor}
          showTabs={false}
          showLineNumbers
          wrapContent
          additionalLanguages={SQL_LANG}
          extensions={extensions}
        />
      </SandpackProvider>
    </div>
  );
}

/* 편집분을 바깥 state 로 올린다. 바깥에서 값이 바뀐 경우(파일 업로드·초기화)도 되받는다. */
function Sync({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { sandpack } = useSandpack();
  const last = useRef<string | null>(null);

  useEffect(() => {
    const f = sandpack.files[FILE] as { code?: string } | undefined;
    const next = f?.code ?? "";
    if (last.current === next) return;
    last.current = next;
    onChange(next);
  }, [sandpack.files, onChange]);

  /* 파일을 올리거나 생성 후 비울 때 — 편집기 안 내용도 따라가야 한다 */
  useEffect(() => {
    if (last.current === value) return;
    const f = sandpack.files[FILE] as { code?: string } | undefined;
    if ((f?.code ?? "") === value) return;
    last.current = value;
    sandpack.updateFile(FILE, value);
  }, [value, sandpack]);

  return null;
}
