"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";
import { marked } from "marked";
import { useLanguage } from "@/providers/LanguageProvider";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { validateContentSecurity } from "@/utils/contentSecurity";
import type { Post, PostFormData, Series } from "@/types/post";
import { useCategories, type BilingualCategory } from "@/hooks/useCategories";
import Checkbox from "@/components/ui/Checkbox";
import Select from "@/components/ui/Select";
import AdminEditorShell, {
  adminEditorStyles as es,
} from "@/components/admin/AdminEditorShell";
import { useRevisions } from "@/hooks/useRevisions";
import { useServiceStatus } from "@/hooks/useServiceStatus";
import { autoTranslate } from "@/utils/autoTranslate";
import EditorToggle from "./EditorToggle";
import MarkdownEditor, { extractMarkdownImages } from "./MarkdownEditor";
import CoverImagePicker from "./CoverImagePicker";
import { useModalStore } from "@/stores/modalStore";
import { ModalConfirm } from "@/components/ui/ModalTemplates";
import styles from "./PostEditor.module.css";

function TagsList({ tags, onRemove }: { tags: string[]; onRemove: (tag: string) => void }) {
  const { t } = useLanguage();
  const measureRef = useRef<HTMLDivElement>(null);
  const displayRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [visibleCount, setVisibleCount] = useState(tags.length);
  const [swapping, setSwapping] = useState<'exiting' | 'entering' | false>(false);
  const animating = useRef(false);

  useEffect(() => {
    if (expanded) { setVisibleCount(tags.length); return; }
    const el = measureRef.current;
    if (!el) return;

    const check = () => {
      const children = Array.from(el.children) as HTMLElement[];
      if (children.length === 0) return;
      const cutoff = el.getBoundingClientRect().top + el.clientHeight;

      let fitCount = 0;
      for (const child of children) {
        if (child.getBoundingClientRect().bottom <= cutoff + 1) fitCount++;
        else break;
      }

      if (fitCount >= tags.length) {
        setVisibleCount(tags.length);
      } else {
        setVisibleCount(Math.max(1, fitCount - 1));
      }
    };

    const frame = requestAnimationFrame(check);
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => { cancelAnimationFrame(frame); ro.disconnect(); };
  }, [tags, expanded]);

  const animateToggle = useCallback((toExpanded: boolean) => {
    const el = displayRef.current;
    if (!el) { setExpanded(toExpanded); return; }

    const fromH = el.offsetHeight;
    animating.current = true;

    if (toExpanded) {
      // 펼치기: 먼저 상태 변경 → 새 높이 측정 → 애니메이션
      setExpanded(true);
      requestAnimationFrame(() => {
        const toH = el.scrollHeight;
        el.style.height = `${fromH}px`;
        el.style.transition = "none";
        requestAnimationFrame(() => {
          el.style.transition = "height 0.25s ease";
          el.style.height = `${toH}px`;
          const onEnd = () => {
            el.style.height = "";
            el.style.transition = "";
            animating.current = false;
            el.removeEventListener("transitionend", onEnd);
          };
          el.addEventListener("transitionend", onEnd);
        });
      });
    } else {
      // 접기: 높이 애니메이션 → 끝나면 마지막 태그 shrink + 더보기 slide-in
      const targetH = measureRef.current?.clientHeight ?? 64;
      const measureEl = measureRef.current;
      let newVC = 0;
      let total = 0;
      if (measureEl) {
        const children = Array.from(measureEl.children) as HTMLElement[];
        total = children.length;
        const cutoff = measureEl.getBoundingClientRect().top + measureEl.clientHeight;
        let fitCount = 0;
        for (const child of children) {
          if (child.getBoundingClientRect().bottom <= cutoff + 1) fitCount++;
          else break;
        }
        newVC = fitCount >= total ? total : Math.max(1, fitCount - 1);
      }
      el.style.height = `${fromH}px`;
      el.style.overflow = "clip";
      el.style.transition = "none";
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.style.transition = "height 0.25s ease";
          el.style.height = `${targetH}px`;
          const onEnd = () => {
            el.style.height = "";
            el.style.overflow = "";
            el.style.transition = "";
            setVisibleCount(newVC);
            setExpanded(false);
            if (newVC < total) setSwapping('exiting');
            animating.current = false;
            el.removeEventListener("transitionend", onEnd);
          };
          el.addEventListener("transitionend", onEnd);
        });
      });
    }
  }, []);

  const hiddenCount = tags.length - visibleCount;

  return (
    <div style={{ position: "relative" }}>
      {/* 숨겨진 측정용 */}
      <div
        ref={measureRef}
        className={es.tags}
        aria-hidden
        style={{ position: "absolute", visibility: "hidden", pointerEvents: "none", left: 0, right: 0 }}
      >
        {tags.map((tag) => (
          <span key={tag} className={es.tag}>
            {tag}
            <button type="button" className={es.tagRemove} tabIndex={-1}>&times;</button>
          </span>
        ))}
      </div>
      {/* 실제 표시 */}
      <div ref={displayRef} className={es.tags} style={{ maxHeight: "none", overflow: "visible" }}>
        {(expanded ? tags : swapping === 'exiting' ? tags.slice(0, visibleCount + 1) : tags.slice(0, visibleCount)).map((tag, i) => (
          <span
            key={tag}
            className={`${es.tag}${swapping === 'exiting' && i === visibleCount ? ` ${es.tagExiting}` : ""}`}
            onAnimationEnd={swapping === 'exiting' && i === visibleCount ? () => setSwapping('entering') : undefined}
          >
            {tag}
            <button type="button" className={es.tagRemove} onClick={() => onRemove(tag)}>&times;</button>
          </span>
        ))}
        {hiddenCount > 0 && !expanded && swapping !== 'exiting' && (
          <button
            type="button"
            className={`${es.tagMore}${swapping === 'entering' ? ` ${es.tagMoreEntering}` : ""}`}
            onClick={() => animateToggle(true)}
            onAnimationEnd={() => { if (swapping === 'entering') setSwapping(false); }}
          >
            + {t("editor.showMore")} ({hiddenCount})
          </button>
        )}
        {expanded && (
          <button type="button" className={es.tagMore} onClick={() => animateToggle(false)}>
            {t("editor.collapse")}
          </button>
        )}
      </div>
    </div>
  );
}

function ShortcutsModalContent() {
  const { t } = useLanguage();
  return (
    <div className={styles.helpGrid}>
      <div className={styles.helpSection}>
        <p className={styles.helpSectionTitle}>{t("editor.helpTextFormat")}</p>
        <div className={styles.helpRows}>
          {([[t("editor.bold"), "⌘B"], [t("editor.italic"), "⌘I"], [t("editor.underline"), "⌘U"], [t("editor.strikethrough"), "⌘⇧S"], [t("editor.inlineCode"), "⌘E"]]).map(([label, key]) => (
            <div key={label} className={styles.helpRow}><span>{label}</span><kbd className={styles.helpKbd}>{key}</kbd></div>
          ))}
        </div>
      </div>
      <div className={styles.helpSection}>
        <p className={styles.helpSectionTitle}>{t("editor.helpParagraph")}</p>
        <div className={styles.helpRows}>
          {([[t("editor.heading1"), "⌘⌥1"], [t("editor.heading2"), "⌘⌥2"], [t("editor.heading3"), "⌘⌥3"], [t("editor.blockquote"), "⌘⇧B"], [t("editor.helpBulletList"), "⌘⇧8"], [t("editor.helpOrderedList"), "⌘⇧7"]]).map(([label, key]) => (
            <div key={label} className={styles.helpRow}><span>{label}</span><kbd className={styles.helpKbd}>{key}</kbd></div>
          ))}
        </div>
      </div>
      <div className={styles.helpSection}>
        <p className={styles.helpSectionTitle}>{t("editor.helpEdit")}</p>
        <div className={styles.helpRows}>
          {([[t("editor.undo"), "⌘Z"], [t("editor.redo"), "⌘⇧Z"]]).map(([label, key]) => (
            <div key={label} className={styles.helpRow}><span>{label}</span><kbd className={styles.helpKbd}>{key}</kbd></div>
          ))}
        </div>
      </div>
      <div className={styles.helpSection}>
        <p className={styles.helpSectionTitle}>{t("editor.helpFont")}</p>
        <div className={styles.helpRows}>
          <div className={styles.helpRow}><span>{t("editor.helpFontDblClick")}</span><span className={styles.helpDesc}>{t("editor.helpDirectInput")}</span></div>
          <div className={styles.helpRow}><span>Enter</span><span className={styles.helpDesc}>{t("editor.helpConfirmInput")}</span></div>
          <div className={styles.helpRow}><span>Escape</span><span className={styles.helpDesc}>{t("editor.helpCancelInput")}</span></div>
        </div>
      </div>
    </div>
  );
}

const Editor = dynamic(() => import("./PlateEditor"), {
  ssr: false,
});

const ImagePanel = dynamic(
  () => import("./PlateEditor").then((m) => ({ default: m.ImagePanel })),
  { ssr: false },
);

import type { PlateEditorHandle, EditorImageInfo } from "./PlateEditor";

interface PostEditorProps {
  post?: Post;
}

interface PostTemplate {
  id: string;
  label: { ko: string; en: string };
  desc: { ko: string; en: string };
  content: { ko: string; en: string };
}

const POST_TEMPLATES: PostTemplate[] = [
  {
    id: "tutorial",
    label: { ko: "튜토리얼", en: "Tutorial" },
    desc: { ko: "단계별로 설명하는 가이드", en: "Step-by-step guide" },
    content: {
      ko: `## 개요

이 글에서는 React에서 커스텀 훅을 만드는 방법을 단계별로 알아보겠습니다.

> [!NOTE]
> 이 튜토리얼은 React 18 이상을 기준으로 작성되었습니다.

## 사전 준비

- Node.js 18 이상
- React 프로젝트 (CRA, Next.js 등)
- 기본적인 React Hooks 이해

## Step 1: 프로젝트 설정

프로젝트를 생성하고 필요한 의존성을 설치합니다.

\`\`\`bash
npx create-next-app@latest my-app
cd my-app
\`\`\`

## Step 2: 커스텀 훅 작성

\`src/hooks\` 디렉토리를 만들고 훅 파일을 생성합니다.

\`\`\`typescript
export function useCustomHook() {
  // 구현
}
\`\`\`

## Step 3: 컴포넌트에서 사용

작성한 훅을 컴포넌트에 적용합니다.

> [!TIP]
> 훅 이름은 항상 \`use\`로 시작해야 합니다.

## 결과

| 항목 | 변경 전 | 변경 후 |
| --- | --- | --- |
| 코드 중복 | 많음 | 없음 |
| 재사용성 | 낮음 | 높음 |

## 마치며

커스텀 훅을 활용하면 로직을 깔끔하게 분리할 수 있습니다. 관련 문서는 [React 공식 문서](https://react.dev)를 참고하세요.`,
      en: `## Overview

In this post, we'll walk through how to create custom hooks in React, step by step.

> [!NOTE]
> This tutorial is based on React 18+.

## Prerequisites

- Node.js 18+
- A React project (CRA, Next.js, etc.)
- Basic understanding of React Hooks

## Step 1: Project Setup

Create a project and install dependencies.

\`\`\`bash
npx create-next-app@latest my-app
cd my-app
\`\`\`

## Step 2: Write the Custom Hook

Create a \`src/hooks\` directory and add the hook file.

\`\`\`typescript
export function useCustomHook() {
  // implementation
}
\`\`\`

## Step 3: Use in a Component

Apply the hook in your component.

> [!TIP]
> Hook names must always start with \`use\`.

## Result

| Metric | Before | After |
| --- | --- | --- |
| Code duplication | High | None |
| Reusability | Low | High |

## Wrap Up

Custom hooks let you cleanly separate logic. See the [React docs](https://react.dev) for more.`,
    },
  },
  {
    id: "troubleshooting",
    label: { ko: "트러블슈팅", en: "Troubleshooting" },
    desc: { ko: "문제 해결 과정 공유", en: "Problem-solving walkthrough" },
    content: {
      ko: `## 문제 상황

Next.js 15로 마이그레이션하던 중 빌드 시 \`Module not found\` 에러가 발생했습니다.

## 환경

- Next.js 15.5.3
- Node.js 22
- pnpm 9.x

## 증상

\`\`\`
Error: Module not found: Can't resolve '@/lib/utils'
\`\`\`

- 로컬 \`dev\` 서버에서는 정상 동작
- \`build\` 시에만 발생
- 특정 파일에서만 에러

## 원인 분석

> [!WARNING]
> \`tsconfig.json\`의 \`paths\` 설정과 \`next.config.js\`의 별칭이 충돌할 수 있습니다.

조사 결과, 대소문자가 다른 import 경로가 원인이었습니다.

## 해결 방법

1. import 경로의 대소문자를 통일
2. \`tsconfig.json\`에서 \`paths\` 재설정

\`\`\`json
{
  "compilerOptions": {
    "paths": { "@/*": ["./src/*"] }
  }
}
\`\`\`

## 결과

빌드 성공. CI/CD 파이프라인 정상 통과.

## TL;DR

- 대소문자 구분은 OS마다 다르므로 항상 일관되게 작성할 것
- CI 환경(Linux)에서 반드시 빌드 테스트할 것

> [!TIP]
> 비슷한 문제를 겪고 있다면 아래 체크리스트를 확인해보세요.

### 체크리스트

- [ ] import 경로 대소문자 확인
- [ ] \`tsconfig.json\` paths 설정 확인
- [ ] CI 환경에서 빌드 테스트
- [ ] 에디터 자동완성과 실제 경로 일치 확인`,
      en: `## Problem

During migration to Next.js 15, a \`Module not found\` error occurred at build time.

## Environment

- Next.js 15.5.3
- Node.js 22
- pnpm 9.x

## Symptoms

\`\`\`
Error: Module not found: Can't resolve '@/lib/utils'
\`\`\`

- Works fine in local \`dev\` server
- Only fails during \`build\`
- Only affects specific files

## Root Cause

> [!WARNING]
> \`tsconfig.json\` paths and \`next.config.js\` aliases can conflict.

Investigation revealed mismatched casing in import paths.

## Solution

1. Unified import path casing
2. Reconfigured \`tsconfig.json\` paths

\`\`\`json
{
  "compilerOptions": {
    "paths": { "@/*": ["./src/*"] }
  }
}
\`\`\`

## Result

Build successful. CI/CD pipeline passed.

## TL;DR

- Casing rules differ across OS — always be consistent
- Always test builds in CI environment (Linux)

> [!TIP]
> If you're facing a similar issue, check the list below.

### Checklist

- [ ] Verify import path casing
- [ ] Check \`tsconfig.json\` paths config
- [ ] Test build in CI environment
- [ ] Confirm editor autocomplete matches actual paths`,
    },
  },
  {
    id: "review",
    label: { ko: "회고/리뷰", en: "Review" },
    desc: { ko: "프로젝트 회고 또는 리뷰", en: "Project retrospective or review" },
    content: {
      ko: `## 소개

2개월간 진행한 포트폴리오 웹사이트 리뉴얼 프로젝트를 돌아봅니다.

## 목표

- 디자인 시스템 구축
- 성능 최적화 (Lighthouse 90+ 달성)
- 다국어 지원

## 기술 스택

| 분류 | 기술 |
| --- | --- |
| 프레임워크 | Next.js 15 |
| 스타일 | CSS Modules |
| DB | Supabase |
| 배포 | Vercel |

## 잘한 점

- **디자인 토큰 시스템**: 일관된 UI를 유지하는 데 큰 도움이 되었습니다
- **컴포넌트 재사용**: 공통 컴포넌트 분리로 개발 속도 향상

## 아쉬운 점

- **테스트 부족**: 유닛 테스트를 작성하지 못한 부분이 아쉽습니다
- **일정 초과**: 예상보다 2주 지연

> [!IMPORTANT]
> 다음 프로젝트에서는 초기 단계부터 테스트를 포함시킬 계획입니다.

## 배운 점

1. 초기 설계에 충분한 시간을 투자할 것
2. 작은 단위로 자주 배포할 것
3. 문서화를 습관적으로 할 것

## 앞으로

접근성(a11y) 개선과 PWA 지원을 다음 목표로 설정했습니다.

### 다음 프로젝트 체크리스트

- [ ] 초기 설계 문서 작성
- [ ] 테스트 코드 작성
- [ ] 주간 회고 진행
- [ ] 성능 모니터링 설정`,
      en: `## Introduction

A look back at the 2-month portfolio website renewal project.

## Goal

- Build a design system
- Performance optimization (Lighthouse 90+)
- Internationalization support

## Tech Stack

| Category | Technology |
| --- | --- |
| Framework | Next.js 15 |
| Styling | CSS Modules |
| Database | Supabase |
| Deployment | Vercel |

## What Went Well

- **Design token system**: Helped maintain consistent UI
- **Component reuse**: Improved dev velocity through shared components

## What Could Be Better

- **Lack of tests**: Missed writing unit tests
- **Schedule overrun**: Delayed by 2 weeks

> [!IMPORTANT]
> Plan to include testing from the initial phase in the next project.

## Lessons Learned

1. Invest enough time in initial design
2. Deploy frequently in small increments
3. Make documentation a habit

## Next Steps

Accessibility (a11y) improvements and PWA support are set as next goals.

### Next Project Checklist

- [ ] Write design documents upfront
- [ ] Write test code
- [ ] Conduct weekly retrospectives
- [ ] Set up performance monitoring`,
    },
  },
  {
    id: "essay",
    label: { ko: "에세이", en: "Essay" },
    desc: { ko: "자유로운 형식의 글", en: "Free-form writing" },
    content: {
      ko: `최근 개발을 하면서 느낀 점을 정리해보려 합니다.

---

## 첫 번째 생각

좋은 코드란 무엇일까요? 단순히 동작하는 코드가 아니라, **읽기 쉽고 변경하기 쉬운 코드**가 좋은 코드라고 생각합니다.

> "Any fool can write code that a computer can understand. Good programmers write code that humans can understand." — Martin Fowler

## 두 번째 생각

완벽을 추구하다 보면 아무것도 완성하지 못하는 경우가 많습니다. *완성된 것이 완벽한 것보다 낫다*는 말을 되새기게 됩니다.

## 세 번째 생각

혼자 고민하는 시간도 중요하지만, 때로는 동료에게 물어보는 것이 훨씬 빠른 해결책이 됩니다.

---

앞으로도 이런 생각들을 꾸준히 기록해두려 합니다.[^1]

![사진 설명](이미지 URL)

[^1]: 이 글은 개인적인 경험을 바탕으로 작성되었습니다.`,
      en: `Here are some reflections from my recent development experience.

---

## First Thought

What makes good code? I believe it's not just code that works, but **code that is easy to read and easy to change**.

> "Any fool can write code that a computer can understand. Good programmers write code that humans can understand." — Martin Fowler

## Second Thought

Chasing perfection often means nothing gets finished. *Done is better than perfect* keeps coming back to mind.

## Third Thought

Time spent thinking alone is valuable, but sometimes asking a colleague is a much faster path to a solution.

---

I plan to keep recording thoughts like these going forward.[^1]

![Photo description](image URL)

[^1]: This post is based on personal experience.`,
    },
  },
  {
    id: "til",
    label: { ko: "TIL", en: "TIL" },
    desc: { ko: "오늘 배운 것", en: "Today I Learned" },
    content: {
      ko: `## 배운 것

CSS \`has()\` 선택자를 사용하면 자식 요소의 상태에 따라 부모 스타일을 변경할 수 있습니다.

## 예시

\`\`\`css
/* input에 focus가 있으면 부모 div에 border 색 변경 */
.wrapper:has(input:focus) {
  border-color: blue;
}
\`\`\`

## 핵심 정리

- \`has()\`는 **부모 선택자**처럼 동작
- 모든 모던 브라우저에서 지원 (2023~)
- 복잡한 JS 없이 상태 기반 스타일링 가능

> [!TIP]
> \`:has()\`는 성능 비용이 있으므로 남용하지 않는 것이 좋습니다.

## 참고 자료

- [MDN - :has()](https://developer.mozilla.org/en-US/docs/Web/CSS/:has)
- [Can I Use](https://caniuse.com/css-has)

> [!CAUTION]
> IE에서는 지원되지 않습니다. 브라우저 호환성을 반드시 확인하세요.

## 복습 체크리스트

- [ ] \`:has()\` 문법 숙지
- [ ] 실제 프로젝트에 적용
- [ ] 성능 측정 비교`,
      en: `## What I Learned

CSS \`has()\` selector allows styling a parent element based on the state of its children.

## Example

\`\`\`css
/* Change parent div border when input is focused */
.wrapper:has(input:focus) {
  border-color: blue;
}
\`\`\`

## Key Points

- \`has()\` works like a **parent selector**
- Supported in all modern browsers (2023+)
- Enables state-based styling without complex JS

> [!TIP]
> \`:has()\` has performance costs, so avoid overusing it.

## References

- [MDN - :has()](https://developer.mozilla.org/en-US/docs/Web/CSS/:has)
- [Can I Use](https://caniuse.com/css-has)

> [!CAUTION]
> Not supported in IE. Always check browser compatibility.

## Review Checklist

- [ ] Understand \`:has()\` syntax
- [ ] Apply in a real project
- [ ] Compare performance measurements`,
    },
  },
];

/** marked HTML → Plate 호환 후처리 */
function postProcessMarkedHtml(html: string): string {
  // 각주 참조
  html = html.replace(
    /<sup><a[^>]*data-footnote-ref[^>]*>(\d+)<\/a><\/sup>/g,
    (_, num) => `<sup data-footnote-ref="${num}" id="fnref-${num}">[${num}]</sup>`
  );
  // 각주 정의
  html = html.replace(
    /<section[^>]*data-footnotes[^>]*>[\s\S]*?<\/section>/g,
    (section) => {
      const items: string[] = [];
      const liRe = /<li id="footnote-(\d+)"[^>]*>([\s\S]*?)<\/li>/g;
      let m;
      while ((m = liRe.exec(section)) !== null) {
        const id = m[1];
        const text = m[2].replace(/<\/?p>/g, "").replace(/<a[^>]*data-footnote-backref[^>]*>[^<]*<\/a>/g, "").trim();
        items.push(`<div data-footnote-content="${id}" id="fn-${id}">${text}</div>`);
      }
      return items.join("\n");
    }
  );
  // ��림 블록 → callout
  html = html.replace(
    /<div class="markdown-alert markdown-alert-(\w+)">([\s\S]*?)<\/div>/g,
    (_, type, inner) => {
      const iconMap: Record<string, string> = { note: "ℹ️", tip: "💡", important: "❗", warning: "⚠️", caution: "🔴" };
      const body = inner.replace(/<p class="markdown-alert-title">[\s\S]*?<\/p>/, "").trim();
      return `<div data-callout data-callout-bg="var(--bg-tertiary)" data-callout-icon="${iconMap[type] || "💡"}">${body}</div>`;
    }
  );
  // 인라인 수식
  html = html.replace(
    /<span class="katex">([\s\S]*?)<\/span>(?=(?:(?!<span class="katex">).)*?(?:<\/p>|$))/g,
    (full) => {
      const ann = full.match(/<annotation encoding="application\/x-tex">([\s\S]*?)<\/annotation>/);
      if (!ann) return full;
      return `<span data-math-inline="true" data-latex="${ann[1]}">${ann[1]}</span>`;
    }
  );
  // 블록 수식
  html = html.replace(
    /<span class="katex-display">([\s\S]*?)<\/span>\s*(?=\n|$)/g,
    (full) => {
      const ann = full.match(/<annotation encoding="application\/x-tex">([\s\S]*?)<\/annotation>/);
      if (!ann) return full;
      return `<div data-math-block="true" data-latex="${ann[1]}">${ann[1]}</div>`;
    }
  );
  // 코드블록 wrap toggle 버튼 제거
  html = html.replace(/<button[^>]*class="code-wrap-toggle"[^>]*>[\s\S]*?<\/button>/g, "");
  // callout 아이콘 visual span 제거 (deserialize 시 중복 방지)
  html = html.replace(/<span data-callout-icon-visual[^>]*>[\s\S]*?<\/span>/g, "");
  // <ul>/<ol> → Plate indent-list 호환 (li를 개별 div로)
  const convertList = (listHtml: string, type: "disc" | "decimal", depth = 1): string => {
    return listHtml.replace(/<li>([\s\S]*?)<\/li>/g, (_, content: string) => {
      let nested = "";
      let text = content;
      text = text.replace(/<(ul|ol)>([\s\S]*?)<\/\1>/g, (_m: string, tag: string, inner: string) => {
        nested += convertList(inner, tag === "ol" ? "decimal" : "disc", depth + 1);
        return "";
      });
      // checkbox → Plate todo (일반 li가 아닌 별도 처리)
      const checkboxMatch = text.match(/<input([^>]*)type="checkbox"([^>]*)>/);
      if (checkboxMatch) {
        const fullAttrs = (checkboxMatch[1] || "") + (checkboxMatch[2] || "");
        const checked = fullAttrs.includes("checked");
        text = text.replace(/<input[^>]*type="checkbox"[^>]*>\s*/, "");
        text = text.replace(/<\/?p>/g, "").trim();
        return `<div data-plate-todo="true" data-todo-checked="${checked}" data-todo-indent="${depth}">${text}</div>${nested}`;
      }
      text = text.replace(/<\/?p>/g, "").trim();
      return `<li data-indent="${depth}" data-list-style-type="${type}">${text}</li>${nested}`;
    });
  };
  html = html.replace(/<ul>([\s\S]*?)<\/ul>/g, (_, inner) => convertList(inner, "disc"));
  html = html.replace(/<ol>([\s\S]*?)<\/ol>/g, (_, inner) => convertList(inner, "decimal"));
  return html;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

const SLUG_RE = /^[a-z0-9가-힣]+(?:-[a-z0-9가-힣]+)*$/;

function validateSlug(slug: string): string | null {
  if (!slug.trim()) return null; // 빈 건 다른 검증에서 처리
  if (slug !== slug.toLowerCase()) return "SLUG_UPPERCASE";
  if (/\s/.test(slug)) return "SLUG_SPACE";
  if (/--/.test(slug)) return "SLUG_DOUBLE_HYPHEN";
  if (/^-|-$/.test(slug)) return "SLUG_EDGE_HYPHEN";
  if (!SLUG_RE.test(slug)) return "SLUG_INVALID_CHAR";
  if (slug.length > 80) return "SLUG_TOO_LONG";
  return null;
}

export default function PostEditor({ post }: PostEditorProps) {
  const router = useRouter();
  const { tLang, language } = useLanguage();
  const config = useSiteConfig();
  const mediaLimits = (config.media as Record<string, unknown>)?.limits as Record<string, number> | undefined;
  const isEdit = !!post;
  const categories = useCategories();
  const serviceStatus = useServiceStatus();
  // 카테고리 ko 또는 en 값으로 매칭
  const findCat = (val: string): BilingualCategory | undefined =>
    categories.find((c) => c.ko === val || c.en === val);
  const isManagedCat = (val: string) => !!findCat(val);

  const [editorLang, setEditorLang] = useState<"ko" | "en">("ko");

  const te = useCallback(
    (key: string) => tLang(`admin.posts.editor.${key}`, editorLang),
    [tLang, editorLang],
  );

  const [form, setForm] = useState<PostFormData>({
    title: post?.title ?? "",
    slug: post?.slug ?? "",
    content: post?.content ?? "",
    content_type: post?.content_type ?? "markdown",
    excerpt: post?.excerpt ?? "",
    cover_image: post?.cover_image ?? "",
    tags: post?.tags ?? [],
    category: post?.category || "",
    is_pinned: post?.is_pinned ?? false,
    published: post?.published ?? false,
    language: post?.language ?? "ko",
    title_en: post?.title_en ?? "",
    content_en: post?.content_en ?? "",
    excerpt_en: post?.excerpt_en ?? "",
    series_id: post?.series_id ?? null,
    series_order: post?.series_order ?? 0,
  });

  // Auto-correct invalid category when categories load
  useEffect(() => {
    if (categories.length === 0) return;
    if (!isManagedCat(form.category)) {
      setForm((prev) => ({ ...prev, category: categories[0].ko }));
    }
  }, [categories]); // eslint-disable-line react-hooks/exhaustive-deps

  const { openModal, closeAll } = useModalStore();
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [generatingSummary, setRegeneratingSummary] = useState(false);
  const [status, setStatusRaw] = useState("");
  const [statusType, setStatusType] = useState<"info" | "success">("info");
  const [statusTimestamp, setStatusTimestamp] = useState<number | undefined>(undefined);
  const setStatus = useCallback((s: string) => { setStatusRaw(s); setStatusTimestamp(undefined); }, []);
  const [error, setError] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [optionalOpen, setOptionalOpen] = useState(false);
  const optionalInnerRef = useRef<HTMLDivElement>(null);
  const optionalContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const inner = optionalInnerRef.current;
    const content = optionalContentRef.current;
    if (!inner || !content) return;
    const update = () => {
      if (optionalOpen) {
        content.style.setProperty("--_content-height", `${inner.scrollHeight}px`);
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [optionalOpen]);

  // 에디터 ref + 첨부 이미지
  const plateRef = useRef<PlateEditorHandle>(null);
  const [editorImages, setEditorImages] = useState<EditorImageInfo[]>([]);
  // 초기 로드 후 이미지 목록 동기화 (에디터 준비될 때까지 polling)
  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const poll = setInterval(() => {
      attempts++;
      const imgs = plateRef.current?.getImages();
      if (!cancelled && imgs !== undefined) {
        setEditorImages(imgs);
        // 이미지가 있거나 충분히 시도했으면 중단
        if (imgs.length > 0 || attempts >= 10) clearInterval(poll);
      }
    }, 300);
    return () => { cancelled = true; clearInterval(poll); };
  }, [editorLang, form.content_type]);
  const [slugManual, setSlugManual] = useState(isEdit);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [showMdHelp, setShowMdHelp] = useState(false);
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [seriesPosts, setSeriesPosts] = useState<{ id: string; title: string; series_order: number }[]>([]);
  const [seriesPostsLoading, setSeriesPostsLoading] = useState(false);
  const initialFormRef = useRef(form);
  const formRef = useRef(form);
  formRef.current = form;
  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initialFormRef.current),
    [form],
  );

  // 새 글도 DB revision 저장을 위해 임시 ID 사용
  const draftEntityId = post?.id ?? "draft-new-post";
  const { revisions: dbRevisions, saveRevision, loadRevisionSnapshot, deleteRevision, dismissRevision } = useRevisions({
    entityType: "post",
    entityId: draftEntityId,
  });

  // 편집기 진입 시 초안 복원 확인 (localStorage → DB revision 순서)
  const draftRestored = useRef(false);
  const applyDraft = useCallback((data: PostFormData, json?: string) => {
    autoSaveSkip.current = true;
    setForm(data);
    if (json) lastAutoSaveJson.current = json;
    setStatus(te("draftRestored"));
    setStatusType("info");
  }, [te]); // eslint-disable-line react-hooks/exhaustive-deps

  const askRestore = useCallback((data: PostFormData, json?: string, revisionId?: string) => {
    if (draftRestored.current) return;
    draftRestored.current = true;
    const modalId = "draft-restore";
    openModal(
      <ModalConfirm
        desc={te("draftFoundDesc")}
        cancelText={te("draftFoundDiscard")}
        confirmText={te("draftFoundLoad")}
        onConfirm={() => applyDraft(data, json)}
        onCancel={() => { if (revisionId) dismissRevision(revisionId); }}
      />,
      { id: modalId, header: { title: te("draftFoundTitle") }, width: "360px", closeButton: false },
    );
  }, [te, openModal, applyDraft, dismissRevision]);

  useEffect(() => {
    if (draftRestored.current) return;
    // localStorage 먼저 확인
    try {
      const local = localStorage.getItem(localDraftKey);
      if (local) {
        const parsed = JSON.parse(local) as PostFormData;
        if (JSON.stringify(parsed) !== JSON.stringify(initialFormRef.current)) {
          draftRestored.current = true;
          localStorage.removeItem(localDraftKey);
          askRestore(parsed, local);
          return;
        }
        localStorage.removeItem(localDraftKey);
      }
    } catch { /* ignore */ }
    // DB revision fallback — dismissed 된 건 건너뜀
    const latestRevision = dbRevisions.find((r) => !r.dismissed);
    if (!latestRevision) return;
    draftRestored.current = true;
    loadRevisionSnapshot(latestRevision.id).then((snapshot) => {
      if (!snapshot) return;
      askRestore(snapshot as PostFormData, undefined, latestRevision.id);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbRevisions]);

  useEffect(() => {
    fetch("/api/series?all=true")
      .then((res) => res.json())
      .then((data) => setSeriesList(Array.isArray(data) ? data : []));
  }, []);

  // 시리즈 선택 시 해당 시리즈 게시물 목록 fetch + 순서 자동 설정
  useEffect(() => {
    if (!form.series_id) { setSeriesPosts([]); setSeriesPostsLoading(false); return; }
    setSeriesPostsLoading(true);
    fetch(`/api/series/${form.series_id}`)
      .then((res) => res.json())
      .then((data) => {
        const posts = (data.posts ?? []) as { id: string; title: string; series_order: number }[];
        setSeriesPosts(posts);
        // 새 글이면 마지막 순서 +1
        if (!isEdit || !posts.some((p) => p.id === post?.id)) {
          const maxOrder = posts.reduce((max, p) => Math.max(max, p.series_order ?? 0), 0);
          updateField("series_order", maxOrder + 1);
        }
      })
      .finally(() => setSeriesPostsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.series_id]);

  useEffect(() => {
    if (!slugManual && form.title) {
      setForm((prev) => ({ ...prev, slug: generateSlug(prev.title) }));
    }
  }, [form.title, slugManual]);

  // status 메시지는 다음 액션까지 유지

  /* ── Auto-save (5s debounce) ── */
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const autoSaveSkip = useRef(true);
  const autoSaveBusy = useRef(false);
  const savedId = useRef<string | undefined>(post?.id);
  const lastAutoSaveJson = useRef<string>("");
  autoSaveBusy.current = saving || translating;

  // localStorage 키 (새 글: "post-draft-new", 기존 글: "post-draft-{id}")
  const localDraftKey = `post-draft-${post?.id ?? "new"}`;

  const flushSave = useCallback(() => {
    const current = JSON.stringify(formRef.current);
    if (!current || current === lastAutoSaveJson.current) return;

    // localStorage에 항상 백업 (id 없어도)
    try { localStorage.setItem(localDraftKey, current); } catch { /* quota */ }

    if (autoSaveBusy.current) return;
    lastAutoSaveJson.current = current;
    saveRevision({ ...formRef.current }, formRef.current.title || formRef.current.title_en || "(untitled)");
    setStatus(te("autoSaved"));
    setStatusType("success");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveRevision, te, localDraftKey]);

  useEffect(() => {
    if (autoSaveSkip.current) {
      autoSaveSkip.current = false;
      return;
    }

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(flushSave, 30000);

    return () => clearTimeout(autoSaveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  /* ── Save on leave (visibility change + beforeunload + SPA nav) ── */
  useEffect(() => {
    const onVisChange = () => { if (document.hidden) flushSave(); };
    const onBeforeUnload = () => {
      // localStorage에 즉시 백업 (동기, 항상 동작)
      try { localStorage.setItem(localDraftKey, JSON.stringify(formRef.current)); } catch { /* quota */ }
      // DB revision도 시도 (새 글이면 draftEntityId 사용)
      const id = savedId.current || draftEntityId;
      const current = JSON.stringify(formRef.current);
      if (!current || current === lastAutoSaveJson.current) return;
      const body = JSON.stringify({
        entity_type: "post",
        entity_id: id,
        snapshot: formRef.current,
        title: formRef.current.title || formRef.current.title_en || "(untitled)",
      });
      navigator.sendBeacon("/api/revisions", new Blob([body], { type: "application/json" }));
    };

    document.addEventListener("visibilitychange", onVisChange);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVisChange);
      window.removeEventListener("beforeunload", onBeforeUnload);
      // SPA 이탈 시 keepalive fetch
      const id = savedId.current || draftEntityId;
      const current = JSON.stringify(formRef.current);
      if (!current || current === lastAutoSaveJson.current) return;
      fetch("/api/revisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity_type: "post",
          entity_id: id,
          snapshot: formRef.current,
          title: formRef.current.title || formRef.current.title_en || "(untitled)",
        }),
        keepalive: true,
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flushSave]);

  const updateField = useCallback(
    <K extends keyof PostFormData>(key: K, value: PostFormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setStatus("");
      setError("");
      setShowErrors(false);
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const translateFields = useCallback(
    async (fieldKeys: string[], lang: "ko" | "en") => {
      const isToEn = lang === "en";
      const sourceLang: "ko" | "en" = isToEn ? "ko" : "en";
      const targetLang: "ko" | "en" = isToEn ? "en" : "ko";
      const want = new Set(fieldKeys);

      const srcTitle = isToEn ? form.title : form.title_en;
      const srcContent = isToEn ? form.content : form.content_en;
      const srcExcerpt = isToEn ? form.excerpt : form.excerpt_en;

      const texts: string[] = [];
      const keys: (keyof PostFormData)[] = [];

      if (want.has("title") && srcTitle.trim()) {
        texts.push(srcTitle);
        keys.push(isToEn ? "title_en" : "title");
      }
      if (want.has("content") && srcContent.trim()) {
        texts.push(srcContent);
        keys.push(isToEn ? "content_en" : "content");
      }
      if (want.has("excerpt") && srcExcerpt.trim()) {
        texts.push(srcExcerpt);
        keys.push(isToEn ? "excerpt_en" : "excerpt");
      }

      if (texts.length === 0) return;

      setTranslating(true);
      setStatus(tLang("admin.posts.editor.translating", lang));
      setStatusType("info");

      const result = await autoTranslate(texts, sourceLang, targetLang);
      setTranslating(false);

      if ("translations" in result) {
        const patch: Partial<PostFormData> = {};
        keys.forEach((k, i) => {
          (patch as Record<string, string>)[k] = result.translations[i];
        });
        setForm((prev) => ({ ...prev, ...patch }));
        setStatus(tLang("admin.posts.editor.autoTranslated", lang));
        setStatusType("success");
      } else {
        setError(result.error);
      }
    },
    [form, tLang], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleEditorLangChange = useCallback(
    async (newLang: "ko" | "en") => {
      if (translating) return;
      setEditorLang(newLang);

      const isToEn = newLang === "en";
      const dstTitle = isToEn ? form.title_en : form.title;
      const dstContent = isToEn ? form.content_en : form.content;
      const srcTitle = isToEn ? form.title : form.title_en;
      const srcContent = isToEn ? form.content : form.content_en;

      const hasSource = !!(srcTitle.trim() || srcContent.trim());
      const hasDest = !!(dstTitle.trim() || dstContent.trim());

      if (hasSource && !hasDest) {
        await translateFields(["title", "content", "excerpt"], newLang);
      }
    },
    [form, translating, translateFields],
  );

  const handleRetranslate = useCallback(
    async (fieldKeys?: string[]) => {
      if (translating) return;
      await translateFields(fieldKeys ?? ["title", "content", "excerpt"], editorLang);
    },
    [translating, editorLang, translateFields],
  );

  const [converting, setConverting] = useState(false);

  const handleContentTypeChange = useCallback(
    async (newType: "markdown" | "richtext") => {
      if (newType === form.content_type) return;
      setConverting(true);

      const convert = async (content: string): Promise<string> => {
        if (!content) return content;
        if (form.content_type === "markdown" && newType === "richtext") {
          let html = marked.parse(content, { async: false }) as string;
          html = postProcessMarkedHtml(html);
          return html;
        } else {
          const TurndownService = (await import("turndown")).default;
          const td = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });
          // 백틱 이스케이프 방지
          td.escape = (str: string) => str;

          // 각주 참조: <sup data-footnote-ref="1">[1]</sup> → [^1]
          td.addRule("footnoteRef", {
            filter: (node) => node.nodeName === "SUP" && node.hasAttribute("data-footnote-ref"),
            replacement: (_content, node) => `[^${(node as HTMLElement).getAttribute("data-footnote-ref")}]`,
          });
          // 각주 ID span: <span data-footnote-id="1">[1]</span> → 무시
          td.addRule("footnoteIdSpan", {
            filter: (node) => node.nodeName === "SPAN" && (node as HTMLElement).hasAttribute("data-footnote-id"),
            replacement: () => "",
          });
          // 각주 내용: <div data-footnote-content="1">text</div> → [^1]: text
          td.addRule("footnoteContent", {
            filter: (node) => node.nodeName === "DIV" && (node as HTMLElement).hasAttribute("data-footnote-content"),
            replacement: (content, node) => {
              const id = (node as HTMLElement).getAttribute("data-footnote-content");
              return `\n[^${id}]: ${content.trim()}\n`;
            },
          });
          // 수식 블록: <div data-math-block data-latex="..."> → $$...$$
          td.addRule("mathBlock", {
            filter: (node) => node.nodeName === "DIV" && (node as HTMLElement).hasAttribute("data-math-block"),
            replacement: (_content, node) => `\n$$\n${(node as HTMLElement).getAttribute("data-latex") ?? ""}\n$$\n`,
          });
          // 인라인 수식: <span data-math-inline data-latex="..."> → $...$
          td.addRule("mathInline", {
            filter: (node) => node.nodeName === "SPAN" && (node as HTMLElement).hasAttribute("data-math-inline"),
            replacement: (_content, node) => `$${(node as HTMLElement).getAttribute("data-latex") ?? ""}$`,
          });
          // 코드 블록: fenced style 보장
          td.addRule("codeBlock", {
            filter: (node) => {
              if (node.nodeName === "PRE") {
                const code = (node as HTMLElement).querySelector("code");
                return !!code;
              }
              if (node.nodeName === "DIV" && (node as HTMLElement).classList.contains("code-block-wrap")) return true;
              return false;
            },
            replacement: (_content, node) => {
              const el = node as HTMLElement;
              const code = el.querySelector("code");
              if (!code) return _content;
              const lang = Array.from(code.classList).find(c => c.startsWith("language-"))?.replace("language-", "") ?? "";
              const text = code.textContent ?? "";
              return `\n\`\`\`${lang}\n${text}\n\`\`\`\n`;
            },
          });

          // 콜아웃: <div data-callout ...> → > [!NOTE]
          td.addRule("callout", {
            filter: (node) => node.nodeName === "DIV" && (node as HTMLElement).hasAttribute("data-callout"),
            replacement: (content) => {
              const lines = content.trim().split("\n").map((l) => `> ${l}`).join("\n");
              return `\n> [!NOTE]\n${lines}\n`;
            },
          });
          // 콜아웃 아이콘 visual span 무시
          td.addRule("calloutIconVisual", {
            filter: (node) => node.nodeName === "SPAN" && (node as HTMLElement).hasAttribute("data-callout-icon-visual"),
            replacement: () => "",
          });
          // 테이블: Plate 테이블 → 마크다운 표
          td.addRule("table", {
            filter: (node) => node.nodeName === "TABLE",
            replacement: (_content, node) => {
              const el = node as HTMLElement;
              const rows = Array.from(el.querySelectorAll("tr"));
              if (rows.length === 0) return _content;
              const toRow = (tr: Element) => {
                const cells = Array.from(tr.querySelectorAll("th, td"));
                return `| ${cells.map((c) => (c.textContent ?? "").trim().replace(/\|/g, "\\|")).join(" | ")} |`;
              };
              const header = toRow(rows[0]);
              const divider = `| ${Array.from(rows[0].querySelectorAll("th, td")).map(() => "---").join(" | ")} |`;
              const body = rows.slice(1).map(toRow).join("\n");
              return `\n${header}\n${divider}\n${body}\n`;
            },
          });
          // 인라인 리스트 div (Plate indent-list) → 마크다운 리스트
          td.addRule("indentList", {
            filter: (node) => {
              if (node.nodeName !== "DIV") return false;
              const style = (node as HTMLElement).getAttribute("style") ?? "";
              return style.includes("list-style-type") && style.includes("margin-left");
            },
            replacement: (content, node) => {
              const style = (node as HTMLElement).getAttribute("style") ?? "";
              const isOl = style.includes("decimal");
              const prefix = isOl ? "1. " : "- ";
              return `${prefix}${content.trim()}\n`;
            },
          });

          return td.turndown(content);
        }
      };

      const [newContent, newContentEn] = await Promise.all([
        convert(form.content),
        convert(form.content_en),
      ]);

      setForm((prev) => ({
        ...prev,
        content: newContent,
        content_en: newContentEn,
        content_type: newType,
      }));
      setConverting(false);
      setStatus("");
      setError("");
    },
    [form.content, form.content_en, form.content_type] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleImageUpload = useCallback(async (file: File): Promise<string> => {
    const { compressImage, validateFileSize } = await import("@/lib/compressImage");

    // 보안 + 형식별 크기 제한 검증 (설정 값 사용)
    const sizeError = validateFileSize(file, mediaLimits);
    if (sizeError) throw new Error(sizeError);

    // 일반 이미지는 압축 파이프라인 적용
    const compressed = await compressImage(file);

    const formData = new FormData();
    formData.append("file", compressed);

    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error);
    return data.url;
  }, [mediaLimits]);

  const handleCoverUpload = useCallback(async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const url = await handleImageUpload(file);
      updateField("cover_image", url);
    };
    input.click();
  }, [handleImageUpload, updateField]);

  const addTag = useCallback(() => {
    const tag = tagInput.trim().replace(/,/g, "");
    if (tag && !form.tags.includes(tag)) {
      updateField("tags", [...form.tags, tag]);
    }
    setTagInput("");
  }, [tagInput, form.tags, updateField]);

  const handleTagKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.nativeEvent.isComposing) return;
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        addTag();
      }
    },
    [addTag]
  );

  const removeTag = useCallback(
    (tag: string) => {
      updateField(
        "tags",
        form.tags.filter((t) => t !== tag)
      );
    },
    [form.tags, updateField]
  );

  const handleSave = useCallback(
    async (publish?: boolean) => {
      const willPublish = publish !== undefined ? publish : form.published;

      if (willPublish) {
        const missing: string[] = [];
        const _koStarted = !!(form.title.trim() || form.content.trim());
        const _enStarted = !!(form.title_en.trim() || form.content_en.trim());

        if (!form.slug.trim()) {
          missing.push(te("slug"));
        }
        if (!form.category.trim()) missing.push(te("category"));

        if (!_koStarted && !_enStarted) {
          missing.push(te("title"));
          missing.push(te("content"));
        } else {
          if (_koStarted) {
            if (!form.title.trim()) missing.push(`${te("title")} (KO)`);
            if (!form.content.trim()) missing.push(`${te("content")} (KO)`);
          }
          if (_enStarted) {
            if (!form.title_en.trim()) missing.push(`${te("title")} (EN)`);
            if (!form.content_en.trim()) missing.push(`${te("content")} (EN)`);
          }
        }

        if (missing.length > 0) {
          setError(`${missing.join(" · ")} ${te("requiredFields")}`);
          setShowErrors(true);
          return;
        }

        const slugError = validateSlug(form.slug);
        if (slugError) {
          setError(`[Slug] ${te(`slugError.${slugError}`)}`);
          setShowErrors(true);
          return;
        }

        const security = validateContentSecurity(form.content + form.content_en);
        if (!security.safe) {
          setError(`${te("securityWarning")}: ${security.warnings.join(", ")}`);
          return;
        }
      }

      setSaving(true);
      setError("");
      setStatus("");

      const body = {
        ...form,
        published: willPublish,
      };

      try {
        const url = savedId.current
          ? `/api/posts/${savedId.current}`
          : "/api/posts";
        const method = savedId.current ? "PATCH" : "POST";

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error ?? "Failed to save");
          return;
        }

        if (!savedId.current) savedId.current = data.id;

        // 발행 시 AI 요약 자동 생성 (fire-and-forget)
        if (willPublish && savedId.current) {
          fetch(`/api/posts/${savedId.current}/ai-summary`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }).catch(() => {});
        }

        const savedSlug = data.slug || form.slug;

        if (!isEdit && publish && savedSlug) {
          window.open(`/posts/${savedSlug}`, "_blank");
        }

        try { localStorage.removeItem(localDraftKey); } catch { /* ignore */ }
        // 새 글이었으면 임시 draft revision 정리
        if (!isEdit) {
          fetch(`/api/revisions?entity_type=post&entity_id=draft-new-post`, { method: "DELETE" }).catch(() => {});
        }
        router.push("/admin/posts");
      } catch {
        setError(te("networkError"));
      } finally {
        setSaving(false);
      }
    },
    [form, router, te, isEdit] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleDelete = useCallback(async () => {
    if (!post) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      try { localStorage.removeItem(localDraftKey); } catch { /* ignore */ }
      router.push("/admin/posts");
    } catch {
      setError(te("deleteFailed"));
      setDeleting(false);
    }
  }, [post, router, te]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePreview = useCallback(() => {
    sessionStorage.setItem("post-preview", JSON.stringify(form));
    window.open("/admin/posts/preview", "_blank");
  }, [form]);

  const handleRestoreRevision = useCallback(
    async (index: number) => {
      const rev = dbRevisions[index];
      if (!rev) return;
      const snapshot = await loadRevisionSnapshot(rev.id);
      if (snapshot) {
        setForm(snapshot as PostFormData);
        setStatus(te("restored"));
        setStatusType("success");
        setStatusTimestamp(rev.timestamp);
      }
    },
    [dbRevisions, loadRevisionSnapshot, te], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleLoadRevisionDetail = useCallback(
    async (index: number) => {
      const rev = dbRevisions[index];
      if (!rev) return null;
      const snapshot = await loadRevisionSnapshot(rev.id);
      if (!snapshot) return null;
      const s = snapshot as PostFormData;
      const stripHtml = (html: string) =>
        html
          .replace(/<\/?(p|div|br|li|tr|h[1-6]|blockquote)[^>]*>/gi, "\n")
          .replace(/<[^>]+>/g, "")
          .replace(/&nbsp;/g, " ")
          .replace(/\n{3,}/g, "\n\n")
          .trim();
      return {
        excerpt: s.excerpt || s.excerpt_en || "",
        content: stripHtml(s.content || s.content_en || ""),
        meta: {
          Category: s.category || "",
          Tags: s.tags?.join(", ") || "",
          Series: seriesList.find((x) => x.id === s.series_id)?.title || "",
          Pinned: s.is_pinned ? "Yes" : "",
        },
      };
    },
    [dbRevisions, loadRevisionSnapshot, seriesList],
  );

  const handleDeleteRevision = useCallback(
    async (index: number) => {
      const rev = dbRevisions[index];
      if (!rev) return false;
      return deleteRevision(rev.id);
    },
    [dbRevisions, deleteRevision],
  );

  const handleRevert = useCallback(() => {
    setForm(initialFormRef.current);
    setStatus(te("reverted"));
    setStatusType("info");
    setStatusTimestamp(undefined);
  }, [te]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerateSummary = useCallback(async () => {
    const id = savedId.current ?? post?.id;
    if (!id) return;
    setRegeneratingSummary(true);
    try {
      const res = await fetch(`/api/posts/${id}/ai-summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const raw = data.error ?? "";
        const status = res.status;
        const msg = raw.includes("not configured") || status === 503 ? te("summaryNoKey")
          : status === 429 || raw.includes("429") ? te("summaryRateLimit")
          : status === 401 || status === 403 || raw.includes("401") || raw.includes("403") ? te("summaryAuthError")
          : status === 400 || raw.includes("400") ? te("summaryBadRequest")
          : te("summaryFailed");
        setError(msg);
        return;
      }
      setStatus(te("generateSummaryDone"));
      setStatusType("success");
    } catch {
      setError(te("summaryFailed"));
    } finally {
      setRegeneratingSummary(false);
    }
  }, [post?.id, te]); // eslint-disable-line react-hooks/exhaustive-deps

  const shellLabels = useMemo(
    () => ({
      delete: te("delete"),
      deleting: te("deleting"),
      deleteConfirm: te("deleteConfirm"),
      deleteConfirmInput: te("deleteConfirmInput"),
      deleteCancel: te("deleteCancel"),
      preview: te("preview"),
      saving: te("saving"),
      saveDraft: te("saveDraft"),
      update: te("update"),
      publish: te("publish"),
      revert: te("revert"),
      revisionHistory: te("revisionHistory"),
      restore: te("restore"),
      retranslate: te("retranslate"),
      retranslateAll: te("retranslateAll"),
      retranslateDisabled: te("retranslateDisabled"),
      generateSummary: te("generateSummary"),
      generateSummaryDisabled: te("generateSummaryDisabled"),
    }),
    [te]
  );

  const retranslateOptions = useMemo(
    () => [
      { key: "title", label: te("title") },
      { key: "excerpt", label: te("excerpt") },
      { key: "content", label: te("content") },
    ],
    [te]
  );

  const handleInsertTemplate = useCallback(() => {
    const lang = editorLang;
    const key = lang === "ko" ? "content" : "content_en";
    const current = form[key as keyof PostFormData] as string;

    const applyTemplate = (tmpl: PostTemplate) => {
      const md = lang === "ko" ? tmpl.content.ko : tmpl.content.en;
      const content = form.content_type === "richtext"
        ? postProcessMarkedHtml(marked.parse(md, { async: false }) as string)
        : md;

      if (current.trim()) {
        const divider = form.content_type === "richtext" ? "<hr />" : "\n\n---\n\n";
        updateField(key as keyof PostFormData, current + divider + content);
      } else {
        updateField(key as keyof PostFormData, content);
      }
    };

    openModal(
      <div className={styles.templateModal}>
        <p className={styles.templateModalDesc}>{te("templateDesc")}</p>
        <div className={styles.templateList}>
          {POST_TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.id}
              type="button"
              className={styles.templateItem}
              onClick={() => {
                if (current.trim()) {
                  openModal(
                    <ModalConfirm
                      desc={te("templateConfirm")}
                      cancelText={te("cancel")}
                      confirmText={te("insertTemplate")}
                      onConfirm={() => { applyTemplate(tmpl); closeAll(); }}
                    />,
                    { header: { title: te("insertTemplate") }, closeButton: true, width: "360px" },
                  );
                } else {
                  applyTemplate(tmpl);
                  closeAll();
                }
              }}
            >
              <span className={styles.templateItemLabel}>{lang === "ko" ? tmpl.label.ko : tmpl.label.en}</span>
              <span className={styles.templateItemDesc}>{lang === "ko" ? tmpl.desc.ko : tmpl.desc.en}</span>
            </button>
          ))}
        </div>
      </div>,
      { header: { title: te("insertTemplate") }, closeButton: true, width: "420px" },
    );
  }, [editorLang, form, updateField, te, openModal, closeAll]);

  const titleKey = editorLang === "ko" ? "title" : "title_en";
  const contentKey = editorLang === "ko" ? "content" : "content_en";
  const excerptKey = editorLang === "ko" ? "excerpt" : "excerpt_en";

  const koStarted = !!(form.title.trim() || form.content.trim());
  const enStarted = !!(form.title_en.trim() || form.content_en.trim());
  const titleFieldError = showErrors && (
    (editorLang === "ko" && koStarted && !form.title.trim()) ||
    (editorLang === "en" && enStarted && !form.title_en.trim())
  );
  const contentFieldError = showErrors && (
    (editorLang === "ko" && koStarted && !form.content.trim()) ||
    (editorLang === "en" && enStarted && !form.content_en.trim())
  );

  return (
    <>
    <AdminEditorShell
      backHref="/admin/posts"
      backLabel={te("backToPosts")}
      editorLang={editorLang}
      onEditorLangChange={handleEditorLangChange}
      isEdit={isEdit}
      isDirty={isDirty}
      saving={saving || translating}
      deleting={deleting}
      published={form.published}
      onDelete={handleDelete}
      deleteTargetName={post?.title}
      onSaveDraft={() => handleSave()}
      onPublish={() => handleSave(true)}
      onPreview={handlePreview}
      status={status}
      statusType={statusType}
      statusTimestamp={statusTimestamp}
      error={error}
      labels={shellLabels}
      revisions={dbRevisions.map((r) => ({
        timestamp: r.timestamp,
        title: r.title,
      }))}
      onRevert={handleRevert}
      onRestoreRevision={handleRestoreRevision}
      onLoadRevisionDetail={handleLoadRevisionDetail}
      onDeleteRevision={handleDeleteRevision}
      onRetranslate={serviceStatus.translation ? handleRetranslate : undefined}
      retranslateOptions={retranslateOptions}
      retranslateDisabled={!serviceStatus.loading && !serviceStatus.translation}
      onGenerateSummary={isEdit || !!savedId.current ? (serviceStatus.aiSummary ? handleGenerateSummary : undefined) : undefined}
      aiSummaryDisabled={!serviceStatus.loading && !serviceStatus.aiSummary && (isEdit || !!savedId.current)}
      generatingSummary={generatingSummary}
      currentSnapshot={(() => {
        const stripHtml = (html: string) =>
          html
            .replace(/<\/?(p|div|br|li|tr|h[1-6]|blockquote)[^>]*>/gi, "\n")
            .replace(/<[^>]+>/g, "")
            .replace(/&nbsp;/g, " ")
            .replace(/\n{3,}/g, "\n\n")
            .trim();
        return {
          title: form.title || form.title_en,
          excerpt: form.excerpt || form.excerpt_en || "",
          content: stripHtml(form.content || form.content_en || ""),
          meta: {
            Category: form.category || "",
            Tags: form.tags?.join(", ") || "",
            Series: seriesList.find((x) => x.id === form.series_id)?.title || "",
            Pinned: form.is_pinned ? "Yes" : "",
          },
        };
      })()}
      topBarSecondRowLeft={
        <Checkbox
          checked={form.is_pinned}
          onChange={(v) => updateField("is_pinned", v)}
          shape="square"
          label={te("pinLabel")}
        />
      }
    >
      <div className={styles.meta}>
        {/* ── 필수 입력 ── */}
        <div className={es.field}>
          <label className={`${es.fieldLabel}${titleFieldError ? ` ${es.fieldLabelError}` : ""}`}>{te("title")}</label>
          <input
            className={`${es.titleInput}${titleFieldError ? ` ${es.titleInputError}` : ""}`}
            type="text"
            value={form[titleKey]}
            onChange={(e) => updateField(titleKey, e.target.value)}
            placeholder={te("titlePlaceholder")}
          />
        </div>

        <div className={es.row}>
          <div className={es.field} style={{ gridColumn: "1 / -1" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "var(--spacing-xs)" }}>
              <label className={`${es.fieldLabel}${showErrors && (!form.slug.trim() || validateSlug(form.slug)) ? ` ${es.fieldLabelError}` : ""}`}>{te("slug")}</label>
              {form.slug.trim() && validateSlug(form.slug) && (
                <span className={styles.slugHint}>{te(`slugError.${validateSlug(form.slug)}`)}</span>
              )}
            </div>
            <input
              className={`${es.fieldInput}${showErrors && (!form.slug.trim() || validateSlug(form.slug)) ? ` ${es.fieldInputError}` : ""}`}
              type="text"
              value={form.slug}
              onChange={(e) => {
                setSlugManual(true);
                updateField("slug", e.target.value);
              }}
              placeholder="post-url-slug"
            />
          </div>

        </div>

        {/* ── 선택 입력 (접기/펼치기) ── */}
        <div className={styles.optionalSection}>
          <button
            type="button"
            className={styles.optionalToggle}
            onClick={() => setOptionalOpen((v) => !v)}
          >
            <span>{te("optionalFields")}</span>
            <svg
              width="12" height="12" viewBox="0 0 12 12" fill="none"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: optionalOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
            >
              <polyline points="2.5 4.5 6 8 9.5 4.5" />
            </svg>
          </button>

          {/* 시리즈 — 항상 표시 */}
          <div className={es.field} onFocusCapture={() => { if (!optionalOpen) setOptionalOpen(true); }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
              <label className={es.fieldLabel}>{te("series")}</label>
              <a href="/admin/settings?tab=content&sub=posts" target="_blank" rel="noopener noreferrer" className={styles.manageLink}>
                {te("seriesManage")}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
              </a>
            </div>
            <Select
              value={form.series_id ?? ""}
              options={[
                { value: "", label: te("seriesNone") },
                ...seriesList.map((s) => ({ value: s.id, label: `${s.title} (${s.post_count ?? 0})${s.category ? ` — ${s.category}` : ""}` })),
              ]}
              onChange={(v) => {
                updateField("series_id", v || null);
                if (v) {
                  const selected = seriesList.find((s) => s.id === v);
                  if (selected?.category) updateField("category", selected.category);
                }
              }}
            />
          </div>
          <div ref={optionalContentRef} className={`${styles.optionalContent}${optionalOpen ? ` ${styles.optionalContentOpen}` : ""}`}>
            <div ref={optionalInnerRef} style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
              {form.series_id && seriesPostsLoading && (
                <div className={es.field}>
                  <label className={es.fieldLabel}>{te("seriesOrder")}</label>
                  <div className={styles.seriesOrderList}>
                    {[1, 2].map((i) => (
                      <div key={i} className={styles.seriesOrderItem} style={{ opacity: 0.4 }}>
                        <span className={styles.seriesOrderNum}>{i}</span>
                        <span className={styles.seriesOrderTitle} style={{ background: "var(--bg-tertiary)", borderRadius: "var(--radius-sm)", height: "1em", width: `${60 + i * 20}px` }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {form.series_id && !seriesPostsLoading && (() => {
                const currentPostId = post?.id ?? "__new__";
                const otherPosts = seriesPosts.filter((p) => p.id !== post?.id);
                const currentItem = { id: currentPostId, title: form.title || te("currentPost"), series_order: form.series_order };
                const allItems = [...otherPosts, currentItem].sort((a, b) => a.series_order - b.series_order);

                const reorder = (fromIdx: number, toIdx: number) => {
                  if (fromIdx === toIdx) return;
                  const reordered = [...allItems];
                  const [moved] = reordered.splice(fromIdx, 1);
                  reordered.splice(toIdx, 0, moved);
                  // 전체 순서 재할당 (1-based)
                  const updates: { id: string; series_order: number }[] = [];
                  reordered.forEach((item, i) => {
                    const newOrder = i + 1;
                    if (item.id === currentPostId) {
                      updateField("series_order", newOrder);
                    } else if (item.series_order !== newOrder) {
                      updates.push({ id: item.id, series_order: newOrder });
                    }
                  });
                  // 다른 게시물 순서 업데이트 (seriesPosts 로컬 상태도 반영)
                  if (updates.length) {
                    setSeriesPosts((prev) => prev.map((p) => {
                      const u = updates.find((x) => x.id === p.id);
                      return u ? { ...p, series_order: u.series_order } : p;
                    }));
                    // API로 다른 게시물 순서 저장
                    updates.forEach((u) => {
                      fetch(`/api/posts/${u.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ series_order: u.series_order }),
                      });
                    });
                  }
                };

                const dragIdxRef = { current: -1 };
                const handleDragStart = (e: React.DragEvent, idx: number) => {
                  dragIdxRef.current = idx;
                  e.dataTransfer.effectAllowed = "move";
                };
                const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
                const handleDrop = (e: React.DragEvent, targetIdx: number) => {
                  e.preventDefault();
                  reorder(dragIdxRef.current, targetIdx);
                  dragIdxRef.current = -1;
                };

                return (
                  <div className={es.field}>
                    <label className={es.fieldLabel}>{te("seriesOrder")}</label>
                    <div className={styles.seriesOrderList}>
                      {allItems.map((item, idx) => {
                        const isCurrent = item.id === currentPostId;
                        return (
                          <div
                            key={item.id}
                            className={`${styles.seriesOrderItem} ${isCurrent ? styles.seriesOrderItemCurrent : ""}`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, idx)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, idx)}
                          >
                            <span className={styles.seriesOrderNum}>{idx + 1}</span>
                            <span className={styles.seriesOrderGrip}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <circle cx="9" cy="6" r="1" fill="currentColor" /><circle cx="15" cy="6" r="1" fill="currentColor" />
                                <circle cx="9" cy="12" r="1" fill="currentColor" /><circle cx="15" cy="12" r="1" fill="currentColor" />
                                <circle cx="9" cy="18" r="1" fill="currentColor" /><circle cx="15" cy="18" r="1" fill="currentColor" />
                              </svg>
                            </span>
                            <span className={styles.seriesOrderTitle}>{item.title || "Untitled"}</span>
                            {isCurrent && (
                              <div className={styles.seriesOrderBtns}>
                                <button type="button" className={styles.numberBtn} disabled={idx === 0} onClick={() => reorder(idx, idx - 1)}>
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6" /></svg>
                                </button>
                                <button type="button" className={styles.numberBtn} disabled={idx === allItems.length - 1} onClick={() => reorder(idx, idx + 1)}>
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
              {/* 줄2: [카테고리 + 태그] */}
              <div className={es.row}>
                <div className={es.field}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <label className={`${es.fieldLabel}${showErrors && !form.category.trim() ? ` ${es.fieldLabelError}` : ""}`}>{te("category")}</label>
                    {form.series_id && (
                      <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-tertiary)", fontFamily: "var(--font-space-grotesk)" }}>{te("categoryFromSeries")}</span>
                    )}
                  </div>
                  <Select
                    value={isManagedCat(form.category) ? (findCat(form.category)?.ko ?? form.category) : (categories[0]?.ko ?? "")}
                    options={categories.map((cat) => ({ value: cat.ko, label: language === "ko" ? cat.ko : cat.en }))}
                    onChange={(v) => updateField("category", v)}
                    disabled={!!form.series_id}
                  />
                </div>
                <div className={es.field} style={{ flex: 1 }}>
                  <label className={es.fieldLabel}>{te("tags")}</label>
                  <div>
                    <div className={styles.tagInputRow}>
                      <input className={es.fieldInput} type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown} placeholder={te("tagsPlaceholder")} />
                      <button type="button" className={styles.tagAddBtn} onClick={addTag} disabled={!tagInput.trim()}>+</button>
                    </div>
                    {form.tags.length > 0 && <TagsList tags={form.tags} onRemove={removeTag} />}
                  </div>
                </div>
              </div>
              {/* 줄3: [요약 + 커버이미지] */}
              <div className={es.row}>
                <div className={es.field}>
                  <label className={es.fieldLabel}>{te("excerpt")}</label>
                  <textarea
                    className={styles.excerptInput}
                    value={form[excerptKey]}
                    onChange={(e) => updateField(excerptKey, e.target.value)}
                    placeholder={te("excerptPlaceholder")}
                    rows={2}
                  />
                </div>

                <div className={es.field}>
                  <label className={es.fieldLabel}>{te("coverImage")}</label>
                  {form.cover_image ? (
                    <div className={styles.coverPreview}>
                      <Image
                        src={form.cover_image}
                        alt="Cover"
                        width={80}
                        height={50}
                        className={styles.coverThumb}
                      />
                      <button
                        type="button"
                        className={styles.coverRemove}
                        onClick={() => {
                          updateField("cover_image", "");
                          setShowCoverPicker(false);
                        }}
                      >
                        {te("remove")}
                      </button>
                    </div>
                  ) : (
                    <div className={styles.coverActions}>
                      <button
                        type="button"
                        className={es.uploadBtn}
                        onClick={handleCoverUpload}
                      >
                        {te("upload")}
                      </button>
                      <button
                        type="button"
                        className={es.uploadBtn}
                        onClick={() => setShowCoverPicker((v) => !v)}
                      >
                        {showCoverPicker ? te("closePicker") : te("chooseCover")}
                      </button>
                    </div>
                  )}
                  {showCoverPicker && !form.cover_image && (
                    <CoverImagePicker
                      onSelect={(url) => {
                        updateField("cover_image", url);
                        setShowCoverPicker(false);
                      }}
                      onClose={() => setShowCoverPicker(false)}
                      postContext={{
                        title: form.title,
                        tags: form.tags,
                        excerpt: form.excerpt,
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.editorSection}>
        <div className={es.editorHeader}>
          <div className={styles.editorHeaderLeft}>
            <span className={`${styles.editorLabel}${contentFieldError ? ` ${styles.editorLabelError}` : ""}`}>{te("content")}</span>
            <button
              type="button"
              className={styles.templateBtn}
              onClick={handleInsertTemplate}
            >
              {te("insertTemplate")}
            </button>
            <button
              type="button"
              className={styles.editorHelpBtn}
              onClick={() => openModal(<ShortcutsModalContent />, { id: "shortcuts-help", header: { title: "단축키 및 기능 안내" }, closeButton: true })}
              title="단축키 및 기능 안내"
            >
              ?
            </button>
            {form.content_type === "markdown" && (
              <button
                type="button"
                className={`${styles.editorHelpBtn} ${showMdHelp ? styles.editorHelpBtnActive : ""}`}
                onClick={() => setShowMdHelp(!showMdHelp)}
                title="Markdown"
              >
                MD
              </button>
            )}
          </div>
          <EditorToggle
            value={form.content_type}
            onChange={handleContentTypeChange}
          />
        </div>

        <div className={styles.editorWrap}>
        {converting ? (
          <div className={styles.editorSkeleton}>
            <div className={styles.editorSkeletonBar} style={{ width: "60%" }} />
            <div className={styles.editorSkeletonBar} style={{ width: "90%" }} />
            <div className={styles.editorSkeletonBar} style={{ width: "75%" }} />
            <div className={styles.editorSkeletonBar} style={{ width: "85%" }} />
            <div className={styles.editorSkeletonBar} style={{ width: "40%" }} />
          </div>
        ) : form.content_type === "markdown" ? (
          <MarkdownEditor
            key={editorLang}
            value={form[contentKey]}
            onChange={(v) => updateField(contentKey, v)}
            onImageUpload={handleImageUpload}
            editLabel={te("editorLabel")}
            previewLabel={te("previewLabel")}
            showHelp={showMdHelp}
          />
        ) : (
          <Editor
            key={editorLang}
            value={form[contentKey]}
            onChange={(v) => {
              updateField(contentKey, v);
              // 이미지 목록 동기화
              requestAnimationFrame(() => {
                const imgs = plateRef.current?.getImages();
                if (imgs) setEditorImages(imgs);
              });
            }}
            onImageUpload={handleImageUpload}
            editorRef={plateRef}
            postLang={editorLang}
          />
        )}
        </div>
      </div>

      {/* ── 첨부 이미지 패널 ── */}
      {form.content_type === "markdown" ? (
        (() => {
          const mdImages = extractMarkdownImages(form[contentKey]).map((url, i) => ({
            url, path: [i], mediaType: "img" as const,
          }));
          return (
            <div className={styles.attachedImagesSection}>
              <ImagePanel
                images={mdImages}
                onSelect={() => {}}
                onReorder={() => {}}
                onRemove={() => {}}
                onImageUpload={async (file) => {
                  const url = await handleImageUpload(file);
                  // 마크다운 본문 끝에 이미지 삽입
                  const content = form[contentKey] as string;
                  updateField(contentKey, `${content}\n![image](${url})\n`);
                  return url;
                }}
              />
            </div>
          );
        })()
      ) : (
        <div className={styles.attachedImagesSection}>
          <ImagePanel
            images={editorImages}
            onSelect={(path) => plateRef.current?.selectImageAt(path)}
            onReorder={(from, to) => plateRef.current?.reorderImage(from, to)}
            onRemove={(path) => plateRef.current?.removeImage(path)}
            onImageUpload={async (file) => {
              const url = await handleImageUpload(file);
              plateRef.current?.insertImageByUrl(url);
              requestAnimationFrame(() => {
                const imgs = plateRef.current?.getImages();
                if (imgs) setEditorImages(imgs);
              });
              return url;
            }}
            onVideoUpload={async (file) => {
              const url = await handleImageUpload(file);
              plateRef.current?.insertMediaByUrl(url);
              return url;
            }}
            onBulkInsert={(paths) => {
              for (const path of paths) {
                plateRef.current?.selectImageAt(path);
              }
            }}
            onReinsert={(url, mediaType) => {
              if (mediaType === "media_embed") plateRef.current?.insertMediaByUrl(url);
              else plateRef.current?.insertImageByUrl(url);
            }}
            onRemoveDetached={(url) => plateRef.current?.removeDetached(url)}
          />
        </div>
      )}

    </AdminEditorShell>

</>
  );
}
