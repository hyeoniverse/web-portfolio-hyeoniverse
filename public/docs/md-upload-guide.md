# .md 파일 업로드 가이드

Admin > Posts 목록에서 `.md 업로드` 버튼으로 마크다운 파일을 일괄 업로드하여 포스트를 생성할 수 있습니다.

## 기본 사용법

`.md` 파일을 선택하면 각 파일이 **비공개 초안**으로 생성됩니다. 여러 파일을 한번에 선택할 수 있습니다.

- 파일명이 포스트 제목으로 사용됩니다 (확장자 제외)
- 파일 내용이 마크다운 콘텐츠로 들어갑니다
- 발행 상태는 `비공개(draft)`로 설정됩니다

## Frontmatter 지원

파일 상단에 YAML frontmatter를 작성하면 제목, 카테고리, 태그 등을 자동으로 반영합니다.

### 형식

```markdown
---
title: 포스트 제목
slug: custom-slug
category: Development
tags: [React, Next.js, TypeScript]
excerpt: 포스트 요약 텍스트
cover_image: https://example.com/image.jpg
date: 2024-03-15
---

여기부터 본문 내용...
```

### 지원 필드

| 필드 | 타입 | 설명 | 기본값 |
|------|------|------|--------|
| `title` | string | 포스트 제목 | 파일명 |
| `slug` | string | URL 슬러그 | 제목에서 자동 생성 |
| `category` | string | 카테고리 (사이트에 등록된 카테고리명) | 없음 |
| `tags` | string[] | 태그 목록 | 없음 |
| `excerpt` | string | 요약/발췌문 | 없음 |
| `cover_image` | string | 커버 이미지 URL | 없음 |
| `date` | string | 작성 날짜/시간 (ISO 8601 또는 `YYYY-MM-DD` 형식) | 업로드 시점 |

### 날짜 작성법

```yaml
# 날짜만
date: 2024-03-15

# 날짜 + 시간
date: 2024-03-15T14:30:00

# 타임존 포함
date: 2024-03-15T14:30:00+09:00
```

### 태그 작성법

```yaml
# 배열 형태
tags: [React, Next.js, TypeScript]

# 또는 단일 태그
tags: React
```

## 예시

### 최소 형식 (frontmatter 없이)

```markdown
# 제목은 파일명으로 사용됩니다

본문 내용입니다.
```

파일명: `나의-첫-포스트.md` → 제목: `나의-첫-포스트`

### 전체 형식

```markdown
---
title: Next.js 15 마이그레이션 가이드
slug: nextjs-15-migration
category: Development
tags: [Next.js, React, Migration]
date: 2024-03-15
excerpt: Next.js 14에서 15로 마이그레이션하면서 겪은 이슈와 해결 방법을 정리합니다.
---

## 개요

Next.js 15가 출시되면서 여러 Breaking Change가 있었습니다...
```

## GitHub Pages 마이그레이션

기존 Jekyll/Hugo 등 GitHub Pages 블로그에서 마이그레이션하는 경우:

1. `_posts/` 디렉토리의 `.md` 파일들을 모두 선택
2. Jekyll frontmatter의 `title`, `tags`, `categories` 필드가 자동 인식됩니다
3. 업로드 후 Admin 에디터에서 카테고리, 태그 등을 확인/수정하세요
4. 확인 후 발행 상태를 변경하면 완료

> **참고**: Jekyll의 `date`, `layout`, `permalink` 등 이 사이트에서 지원하지 않는 필드는 무시됩니다.
