"use client";

import type { ReactNode } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import styles from "../AdminWorks.module.css";

type Pair<V> = [ko: V, en: V];

/** frontmatter 필드 — 이름이 두 개면 한국어 / 영어 칸. 설명은 [한국어, 영어] */
const FIELDS: { keys: string[]; type: string; desc: Pair<ReactNode> }[] = [
  { keys: ["title", "title_en"], type: "string", desc: ["프로젝트명 (한/영)", "Project name (Korean/English)"] },
  { keys: ["subtitle", "subtitle_en"], type: "string", desc: ["부제목 (한/영)", "Subtitle (Korean/English)"] },
  { keys: ["slug"], type: "string", desc: ["URL 슬러그", "URL slug"] },
  { keys: ["category", "category_en"], type: "string", desc: ["카테고리 (쉼표로 여러 개)", "Categories (comma-separated)"] },
  { keys: ["nature", "nature_en"], type: "string", desc: ["프로젝트 성격", "Nature of the project"] },
  { keys: ["year"], type: "string", desc: ["연도", "Year"] },
  { keys: ["tech"], type: "string[]", desc: ["기술 스택 (예: [React, TS])", "Tech stack (e.g. [React, TS])"] },
  { keys: ["description", "description_en"], type: "string", desc: ["프로젝트 설명 (한/영)", "Project description (Korean/English)"] },
  { keys: ["role", "role_en"], type: "string", desc: ["역할 (한/영)", "Role (Korean/English)"] },
  { keys: ["icon"], type: "string", desc: ["페이지 아이콘 (이모지 또는 이미지 URL)", "Page icon (emoji or image URL)"] },
  { keys: ["image"], type: "string", desc: ["대표 이미지 URL", "Main image URL"] },
  { keys: ["live_url"], type: "string", desc: ["라이브 URL", "Live URL"] },
  { keys: ["github_url"], type: "string", desc: ["GitHub URL", "GitHub URL"] },
];

/* 예시는 올릴 파일의 내용이라 화면 언어와 상관없이 그대로 둔다 */
const EXAMPLE = `---
title: 포트폴리오 웹사이트
title_en: Portfolio Website
subtitle: 인터랙티브 웹 포트폴리오
category: 웹, 프론트엔드
nature: 개인 프로젝트
year: 2024
tech: [Next.js, TypeScript, GSAP]
description: GSAP 가로 스크롤 + Three.js 3D
role: 풀스택 개발
icon: 🎨
---

## 프로젝트 개요

본문 내용...`;

/** 작업물 마크다운 올리기 도움말 — 정적 문서. 화면 상태와 무관하다. */
export default function MarkdownUploadGuide() {
  const { language } = useLanguage();
  /* 긴 안내라 문장마다 키를 두지 않고 두 언어를 나란히 적는다. 문장 안의 <code>·<strong> 을 그대로 쓸 수 있다 */
  const L = <V,>(ko: V, en: V): V => (language === "ko" ? ko : en);
  return (
    <div className={styles.uploadGuide}>
      <h4>{L("기본 사용법", "Basics")}</h4>
      <p>{L(
        <><code>.md</code> 파일을 선택하면 각 파일이 <strong>비공개 초안</strong>으로 생성됩니다.</>,
        <>Each <code>.md</code> file you select becomes a <strong>private draft</strong>.</>,
      )}</p>
      <ul>
        <li>{L("파일명이 작업물 제목으로 사용됩니다 (확장자 제외)", "The file name, without the extension, becomes the work title")}</li>
        <li>{L(<>파일 내용이 <code>content_ko</code>로 들어갑니다</>, <>The file contents go into <code>content_ko</code></>)}</li>
        <li>{L("대표 이미지가 없으면 랜덤 프리셋이 생성됩니다", "Without a main image, a random preset is generated")}</li>
      </ul>

      <h4>Frontmatter</h4>
      <p>{L("파일 상단에 YAML frontmatter를 작성하면 메타데이터가 자동 반영됩니다.", "YAML frontmatter at the top of the file fills in the metadata.")}</p>
      <p className={styles.uploadGuideNote}>{L(
        <><code>_en</code> 접미사 필드로 영문도 함께 넣을 수 있습니다 (예: <code>title_en</code>, <code>category_en</code>).</>,
        <>Fields ending in <code>_en</code> hold the English version (e.g. <code>title_en</code>, <code>category_en</code>).</>,
      )}</p>
      <table>
        <thead><tr><th>{L("필드", "Field")}</th><th>{L("타입", "Type")}</th><th>{L("설명", "Description")}</th></tr></thead>
        <tbody>
          {FIELDS.map((f) => (
            <tr key={f.keys[0]}>
              <td>{f.keys.map((k, i) => <span key={k}>{i > 0 && " / "}<code>{k}</code></span>)}</td>
              <td>{f.type}</td>
              <td>{L(...f.desc)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h4>{L("예시", "Example")}</h4>
      <pre><code>{EXAMPLE}</code></pre>
    </div>
  );
}
