"use client";

import type { ReactNode } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import styles from "../AdminPosts.module.css";

/** 기본값 — 사전 키(화면 언어로 번역) 또는 언어와 무관한 값 그대로 */
type DefVal = { key: string } | { text: string };

/** frontmatter 필드 — 설명·기본값은 사전 키 */
const FIELDS: { key: string; type: string; desc: string; def: DefVal }[] = [
  { key: "title", type: "string", desc: "admin.inline.postsMarkdownUploadGuide.fieldTitle", def: { key: "admin.inline.postsMarkdownUploadGuide.defFileName" } },
  { key: "slug", type: "string", desc: "admin.inline.postsMarkdownUploadGuide.fieldSlug", def: { key: "admin.inline.postsMarkdownUploadGuide.defFromTitle" } },
  { key: "category", type: "string", desc: "admin.inline.postsMarkdownUploadGuide.fieldCategory", def: { key: "admin.inline.postsMarkdownUploadGuide.defEtc" } },
  { key: "tags", type: "string[]", desc: "admin.inline.postsMarkdownUploadGuide.fieldTags", def: { key: "admin.inline.postsMarkdownUploadGuide.none" } },
  { key: "excerpt", type: "string", desc: "admin.inline.postsMarkdownUploadGuide.fieldExcerpt", def: { key: "admin.inline.postsMarkdownUploadGuide.none" } },
  { key: "excerpt_en", type: "string", desc: "admin.inline.postsMarkdownUploadGuide.fieldExcerptEn", def: { key: "admin.inline.postsMarkdownUploadGuide.none" } },
  { key: "title_en", type: "string", desc: "admin.inline.postsMarkdownUploadGuide.fieldTitleEn", def: { key: "admin.inline.postsMarkdownUploadGuide.none" } },
  { key: "language", type: "ko | en", desc: "admin.inline.postsMarkdownUploadGuide.fieldLanguage", def: { text: "ko" } },
  { key: "icon", type: "string", desc: "admin.inline.postsMarkdownUploadGuide.fieldIcon", def: { key: "admin.inline.postsMarkdownUploadGuide.none" } },
  { key: "github_url", type: "string", desc: "admin.inline.postsMarkdownUploadGuide.fieldGithubUrl", def: { key: "admin.inline.postsMarkdownUploadGuide.none" } },
  { key: "pinned", type: "boolean", desc: "admin.inline.postsMarkdownUploadGuide.fieldPinned", def: { text: "false" } },
  { key: "cover_image", type: "string", desc: "admin.inline.postsMarkdownUploadGuide.fieldCoverImage", def: { key: "admin.inline.postsMarkdownUploadGuide.none" } },
  { key: "cover_position", type: "number", desc: "admin.inline.postsMarkdownUploadGuide.fieldCoverPosition", def: { text: "50" } },
  { key: "cover_zoom", type: "number", desc: "admin.inline.postsMarkdownUploadGuide.fieldCoverZoom", def: { text: "1" } },
  { key: "date", type: "string", desc: "admin.inline.postsMarkdownUploadGuide.fieldDate", def: { key: "admin.inline.postsMarkdownUploadGuide.defUploadTime" } },
];

/** 사전 글 안의 <code>·<strong> 표시를 요소로 바꾼다(innerHTML 없이). 그 밖의 글은 그대로 */
function rich(text: string): ReactNode {
  const parts = text.split(/(<code>.*?<\/code>|<strong>.*?<\/strong>)/g);
  return parts.map((p, i) => {
    const m = /^<(code|strong)>(.*)<\/\1>$/.exec(p);
    if (!m) return p;
    return m[1] === "code" ? <code key={i}>{m[2]}</code> : <strong key={i}>{m[2]}</strong>;
  });
}

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
  const { t } = useLanguage();
  return (
    <div className={styles.uploadGuide}>
      <h4>{t("admin.inline.postsMarkdownUploadGuide.basics")}</h4>
      <p>{rich(t("admin.inline.postsMarkdownUploadGuide.intro"))}</p>
      <ul>
        <li>{t("admin.inline.postsMarkdownUploadGuide.fileNameTitle")}</li>
        <li>{t("admin.inline.postsMarkdownUploadGuide.fileContents")}</li>
        <li>{rich(t("admin.inline.postsMarkdownUploadGuide.statusDraft"))}</li>
      </ul>

      <h4>Frontmatter</h4>
      <p>{t("admin.inline.postsMarkdownUploadGuide.frontmatterIntro")}</p>
      <p className={styles.uploadGuideNote}>{rich(t("admin.inline.postsMarkdownUploadGuide.publishNeeds"))}</p>
      <table>
        <thead><tr><th>{t("admin.inline.postsMarkdownUploadGuide.thField")}</th><th>{t("admin.inline.postsMarkdownUploadGuide.thType")}</th><th>{t("admin.inline.postsMarkdownUploadGuide.thDesc")}</th><th>{t("admin.inline.postsMarkdownUploadGuide.thDefault")}</th></tr></thead>
        <tbody>
          {FIELDS.map((f) => (
            <tr key={f.key}><td><code>{f.key}</code></td><td>{f.type}</td><td>{rich(t(f.desc))}</td><td>{"key" in f.def ? t(f.def.key) : f.def.text}</td></tr>
          ))}
        </tbody>
      </table>

      <h4>{t("admin.inline.postsMarkdownUploadGuide.exampleFull")}</h4>
      <pre><code>{FULL_EXAMPLE}</code></pre>

      <h4>{t("admin.inline.postsMarkdownUploadGuide.datesTags")}</h4>
      <pre><code>{dateTagExample(t("admin.inline.postsMarkdownUploadGuide.commentDate"), t("admin.inline.postsMarkdownUploadGuide.commentTags"))}</code></pre>

      <h4>{t("admin.inline.postsMarkdownUploadGuide.ghPages")}</h4>
      <p>{rich(t("admin.inline.postsMarkdownUploadGuide.ghPagesIntro"))}</p>
      <p className={styles.uploadGuideNote}>{t("admin.inline.postsMarkdownUploadGuide.ghPagesNote")}</p>
    </div>
  );
}
