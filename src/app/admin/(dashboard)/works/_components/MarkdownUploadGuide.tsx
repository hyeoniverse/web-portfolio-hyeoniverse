"use client";

import { Fragment, type ReactNode } from "react";
import { useLanguage } from "@/providers/LanguageProvider";
import styles from "../AdminWorks.module.css";

/** frontmatter 필드 — 이름이 두 개면 한국어 / 영어 칸. 설명은 사전 키 */
const FIELDS: { keys: string[]; type: string; desc: string }[] = [
  { keys: ["title", "title_en"], type: "string", desc: "admin.inline.worksMarkdownUploadGuide.fieldTitle" },
  { keys: ["subtitle", "subtitle_en"], type: "string", desc: "admin.inline.worksMarkdownUploadGuide.fieldSubtitle" },
  { keys: ["slug"], type: "string", desc: "admin.inline.worksMarkdownUploadGuide.fieldSlug" },
  { keys: ["category", "category_en"], type: "string", desc: "admin.inline.worksMarkdownUploadGuide.fieldCategory" },
  { keys: ["nature", "nature_en"], type: "string", desc: "admin.inline.worksMarkdownUploadGuide.fieldNature" },
  { keys: ["year"], type: "string", desc: "admin.inline.worksMarkdownUploadGuide.fieldYear" },
  { keys: ["tech"], type: "string[]", desc: "admin.inline.worksMarkdownUploadGuide.fieldTech" },
  { keys: ["description", "description_en"], type: "string", desc: "admin.inline.worksMarkdownUploadGuide.fieldDescription" },
  { keys: ["role", "role_en"], type: "string", desc: "admin.inline.worksMarkdownUploadGuide.fieldRole" },
  { keys: ["icon"], type: "string", desc: "admin.inline.worksMarkdownUploadGuide.fieldIcon" },
  { keys: ["image"], type: "string", desc: "admin.inline.worksMarkdownUploadGuide.fieldImage" },
  { keys: ["live_url"], type: "string", desc: "admin.inline.worksMarkdownUploadGuide.fieldLiveUrl" },
  { keys: ["github_url"], type: "string", desc: "admin.inline.worksMarkdownUploadGuide.fieldGithubUrl" },
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

/** 사전 글의 {{이름}} 자리에 JSX 조각을 끼운다 — 문장 안의 <code>·<strong> 을 언어마다 다른 어순으로 둘 수 있다. */
function rich(template: string, parts: Record<string, ReactNode>): ReactNode {
  return template.split(/\{\{(\w+)\}\}/).map((chunk, i) => (i % 2 === 1 ? <Fragment key={i}>{parts[chunk] ?? chunk}</Fragment> : chunk));
}

/** 작업물 마크다운 올리기 도움말 — 정적 문서. 화면 상태와 무관하다. */
export default function MarkdownUploadGuide() {
  const { t } = useLanguage();
  const k = (key: string) => t(`admin.inline.worksMarkdownUploadGuide.${key}`);
  return (
    <div className={styles.uploadGuide}>
      <h4>{k("basics")}</h4>
      <p>{rich(k("intro"), { md: <code>.md</code>, draft: <strong>{k("privateDraft")}</strong> })}</p>
      <ul>
        <li>{k("fileNameTitle")}</li>
        <li>{rich(k("contentInto"), { field: <code>content_ko</code> })}</li>
        <li>{k("randomPreset")}</li>
      </ul>

      <h4>Frontmatter</h4>
      <p>{k("frontmatterIntro")}</p>
      <p className={styles.uploadGuideNote}>{rich(k("enSuffixNote"), { suffix: <code>_en</code>, ex1: <code>title_en</code>, ex2: <code>category_en</code> })}</p>
      <table>
        <thead><tr><th>{k("colField")}</th><th>{k("colType")}</th><th>{k("colDescription")}</th></tr></thead>
        <tbody>
          {FIELDS.map((f) => (
            <tr key={f.keys[0]}>
              <td>{f.keys.map((key, i) => <span key={key}>{i > 0 && " / "}<code>{key}</code></span>)}</td>
              <td>{f.type}</td>
              <td>{t(f.desc)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h4>{k("example")}</h4>
      <pre><code>{EXAMPLE}</code></pre>
    </div>
  );
}
