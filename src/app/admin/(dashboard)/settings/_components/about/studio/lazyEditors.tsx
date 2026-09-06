"use client";

import dynamic from "next/dynamic";
import css from "../AboutStudio.module.css";

/* 둘 다 편집기 본체가 무거워서 실제로 열 때만 불러온다.
   CodeMirror 와 Sandpack 은 첫 화면에 필요하지 않다. */

/** CodeMirror 기반 코드 편집기. */
export const CodeBlockEditor = dynamic(() => import("../CodeBlockEditor"), { ssr: false });

/** Sandpack 기반 실행 코드 편집기. */
export const DemoFilesEditor = dynamic(() => import("../DemoFilesEditor"), {
  ssr: false,
  loading: () => <div className={css.demoEditorLoading}>Loading editor…</div>,
});
