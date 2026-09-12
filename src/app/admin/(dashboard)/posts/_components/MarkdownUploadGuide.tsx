"use client";

import type { ReactNode } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import styles from "../AdminPosts.module.css";

type Pair<V> = [ko: V, en: V];

const NONE: Pair<string> = ["없음", "None"];

/** frontmatter 필드 — 설명·기본값은 [한국어, 영어] */
const FIELDS: { key: string; type: string; desc: Pair<ReactNode>; def: Pair<string> }[] = [
  { key: "title", type: "string", desc: ["포스트 제목", "Post title"], def: ["파일명", "File name"] },
  { key: "slug", type: "string", desc: ["URL 슬러그", "URL slug"], def: ["제목에서 자동 생성", "Generated from the title"] },
  {
    key: "category", type: "string",
    desc: [<>카테고리 — 2단계 중 <strong>소분류</strong>(대분류는 자동 도출)</>, <>Category. Use the <strong>subcategory</strong>; the parent category is derived</>],
    def: ["기타", "Etc"],
  },
  { key: "tags", type: "string[]", desc: ["태그 목록 (예: [React, Next.js])", "Tags (e.g. [React, Next.js])"], def: NONE },
  { key: "excerpt", type: "string", desc: ["요약/발췌문", "Excerpt"], def: NONE },
  { key: "excerpt_en", type: "string", desc: ["영문 요약", "English excerpt"], def: NONE },
  { key: "title_en", type: "string", desc: ["영문 제목", "English title"], def: NONE },
  { key: "language", type: "ko | en", desc: ["기본 언어", "Primary language"], def: ["ko", "ko"] },
  { key: "icon", type: "string", desc: ["페이지 아이콘 (이모지 또는 이미지 URL)", "Page icon (emoji or image URL)"], def: NONE },
  { key: "github_url", type: "string", desc: ["연결할 GitHub URL", "GitHub URL to link"], def: NONE },
  { key: "pinned", type: "boolean", desc: ["상단 고정 (true/false)", "Pin to top (true/false)"], def: ["false", "false"] },
  { key: "cover_image", type: "string", desc: ["커버 이미지 URL", "Cover image URL"], def: NONE },
  { key: "cover_position", type: "number", desc: ["커버 세로 위치 % (0~100)", "Cover vertical position in % (0–100)"], def: ["50", "50"] },
  { key: "cover_zoom", type: "number", desc: ["커버 확대 배율 (1~2.5)", "Cover zoom (1–2.5)"], def: ["1", "1"] },
  { key: "date", type: "string", desc: ["작성일 (ISO 8601 또는 YYYY-MM-DD)", "Date written (ISO 8601 or YYYY-MM-DD)"], def: ["업로드 시점", "Upload time"] },
];

/* 예시는 올릴 파일의 내용이라 화면 언어와 상관없이 그대로 둔다. 모듈 맨 위에 두어 줄 앞 들여쓰기가
   예시에 섞이지 않게 한다. 컴포넌트 안에 두었을 때 들여쓰기가 들어가, 보이는 대로 옮긴 파일은
   frontmatter 가 읽히지 않았다(parseMdPost 는 줄 첫머리의 키와 --- 만 본다). */
const FULL_EXAMPLE = `---
title: Next.js 15 마이그레이션 가이드
title_en: Migrating to Next.js 15
slug: nextjs-15-migration
category: 개발
tags: [Next.js, React, Migration]
icon: 🚀
github_url: https://github.com/me/next15-demo
pinned: true
date: 2024-03-15
excerpt: Next.js 14에서 15로 마이그레이션 정리
---

## 개요

본문 내용...`;

/** 날짜·태그 예시 — 설명인 # 주석만 화면 언어로 */
const dateTagExample = (date: string, tags: string) => `# ${date}
date: 2024-03-15
date: 2024-03-15T14:30:00+09:00

# ${tags}
tags: [React, Next.js, TypeScript]
tags: React`;

/** 마크다운 올리기 도움말 — 정적 문서. 화면 상태와 무관하다. */
export default function MarkdownUploadGuide() {
  const { language } = useLanguage();
  /* 긴 안내라 문장마다 키를 두지 않고 두 언어를 나란히 적는다. 문장 안의 <code>·<strong> 을 그대로 쓸 수 있다 */
  const L = <V,>(ko: V, en: V): V => (language === "ko" ? ko : en);
  return (
    <div className={styles.uploadGuide}>
      <h4>{L("기본 사용법", "Basics")}</h4>
      <p>{L(
        <><code>.md</code> 파일을 선택하면 각 파일이 <strong>비공개 초안</strong>으로 생성됩니다. 여러 파일을 한번에 선택할 수 있습니다.</>,
        <>Each <code>.md</code> file you select becomes a <strong>private draft</strong>. You can select several files at once.</>,
      )}</p>
      <ul>
        <li>{L("파일명이 포스트 제목으로 사용됩니다 (확장자 제외)", "The file name, without the extension, becomes the post title")}</li>
        <li>{L("파일 내용이 마크다운 콘텐츠로 들어갑니다", "The file contents become the Markdown body")}</li>
        <li>{L(<>발행 상태는 <strong>비공개(draft)</strong>로 설정됩니다</>, <>The status is set to <strong>private (draft)</strong></>)}</li>
      </ul>

      <h4>Frontmatter</h4>
      <p>{L("파일 상단에 YAML frontmatter를 작성하면 메타데이터가 자동 반영됩니다.", "YAML frontmatter at the top of the file fills in the metadata.")}</p>
      <p className={styles.uploadGuideNote}>{L(
        <>발행하려면 <strong>제목 · 슬러그 · 카테고리 · 본문</strong>이 필요합니다. 초안은 제목만 있어도 생성되고, 나머지는 에디터에서 채우면 됩니다.</>,
        <>Publishing needs a <strong>title, slug, category and body</strong>. A draft needs only a title, and you can fill in the rest in the editor.</>,
      )}</p>
      <table>
        <thead><tr><th>{L("필드", "Field")}</th><th>{L("타입", "Type")}</th><th>{L("설명", "Description")}</th><th>{L("기본값", "Default")}</th></tr></thead>
        <tbody>
          {FIELDS.map((f) => (
            <tr key={f.key}><td><code>{f.key}</code></td><td>{f.type}</td><td>{L(...f.desc)}</td><td>{L(...f.def)}</td></tr>
          ))}
        </tbody>
      </table>

      <h4>{L("예시 — 전체 형식", "Example: full format")}</h4>
      <pre><code>{FULL_EXAMPLE}</code></pre>

      <h4>{L("날짜/태그 작성법", "Writing dates and tags")}</h4>
      <pre><code>{dateTagExample(L("날짜", "Date"), L("태그 — 배열 또는 단일", "Tags: a list or a single tag"))}</code></pre>

      <h4>{L("GitHub Pages 마이그레이션", "Moving from GitHub Pages")}</h4>
      <p>{L(
        <>Jekyll/Hugo 등 기존 블로그의 <code>_posts/</code> 디렉토리에서 <code>.md</code> 파일을 선택하면 <code>title</code>, <code>tags</code>, <code>categories</code> 필드가 자동 인식됩니다.</>,
        <>Select <code>.md</code> files from the <code>_posts/</code> folder of an existing Jekyll or Hugo blog, and the <code>title</code>, <code>tags</code> and <code>categories</code> fields are picked up.</>,
      )}</p>
      <p className={styles.uploadGuideNote}>{L(
        "등록되지 않은 카테고리는 생성 여부를 확인합니다. Jekyll의 layout, permalink 등 미지원 필드는 무시됩니다.",
        "For a category that doesn't exist yet, you're asked whether to create it. Unsupported Jekyll fields such as layout and permalink are ignored.",
      )}</p>
    </div>
  );
}
