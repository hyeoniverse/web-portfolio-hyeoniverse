# .md 파일 가이드 — 업로드 · 동기화 · 내보내기

Admin UI 업로드, 프로젝트 폴더 동기화, DB에서 .md 내보내기 세 가지 방식을 지원합니다.
Posts와 Works 모두 지원하며, frontmatter 필드가 다릅니다.

---

## 1. Admin UI 업로드

Admin > Posts 또는 Works 목록에서 `.md 업로드` 버튼으로 마크다운 파일을 일괄 업로드할 수 있습니다.

### Posts

- 파일명이 포스트 제목으로 사용됩니다 (확장자 제외)
- 파일 내용이 마크다운 콘텐츠로 들어갑니다
- 발행 상태는 `비공개(draft)`로 설정됩니다
- 커버 이미지가 없으면 자동으로 랜덤 프리셋 이미지가 생성됩니다
- 등록되지 않은 카테고리가 있으면 생성 여부를 확인합니다

### Works

- 파일명이 작업물 제목으로 사용됩니다 (확장자 제외)
- 파일 내용이 `content_ko` 필드로 들어갑니다
- 발행 상태는 `비공개(draft)`로 설정됩니다
- 대표 이미지(`image`)가 없으면 자동으로 랜덤 프리셋 이미지가 생성됩니다

---

## 2. 프로젝트 폴더 동기화 (Jekyll-style)

`content/posts/` 또는 `content/works/` 폴더에 `.md` 파일을 두면, CLI 명령으로 Supabase DB에 동기화할 수 있습니다.

### 사용법

```bash
# Posts
pnpm sync-posts:dry    # 미리보기 (DB 쓰기 없음)
pnpm sync-posts        # 실행

# Works
pnpm sync-works:dry    # 미리보기
pnpm sync-works        # 실행

# 전체
pnpm sync-all          # Posts + Works 한번에
```

### 동작 방식

| | Posts | Works |
|---|---|---|
| 디렉토리 | `content/posts/` | `content/works/` |
| 매칭 기준 | **slug** (frontmatter 또는 제목에서 생성) | **title** (slug 없음) |
| 새 항목 | INSERT (비공개 초안) | INSERT (비공개 초안) |
| 기존 항목 | 파일 mtime > DB updated_at 일 때만 UPDATE | 파일 mtime > DB updated_at 일 때만 UPDATE |
| UPDATE 범위 | 본문 + 메타만 (published, is_pinned 유지) | 본문 + 메타만 (published, sort_order 유지) |
| 삭제 | DB에 있지만 파일 없는 항목은 건드리지 않음 | 동일 |

### 파일 구조

```
content/
  posts/          ← 블로그 포스트 (.md)
    my-first-post.md
    nextjs-migration.md
  works/          ← 작업물 (.md)
    portfolio-site.md
    mobile-app.md
```

### CI/CD 연동

Vercel 등에서 빌드 전 자동 동기화하려면 `package.json`의 build 스크립트를 수정:

```json
{
  "scripts": {
    "build": "tsx scripts/sync-posts.ts && tsx scripts/sync-works.ts && next build"
  }
}
```

이렇게 하면 GitHub push → Vercel 빌드 → 자동 동기화 → SSG/ISR 반영 순서로 Jekyll처럼 동작합니다.

### 환경변수

동기화 스크립트는 다음 환경변수가 필요합니다:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

환경변수가 없으면 동기화를 건너뛰므로, Supabase 없이 빌드할 때도 안전합니다.

---

## 3. DB → .md 내보내기

Admin > Posts/Works 목록에서 내보내기할 수 있습니다:

- **전체 내보내기**: 표 하단 버튼으로 전체 다운로드
- **선택 내보내기**: 체크박스 선택 후 bulk bar에서 ".md 내보내기"
- **개별 내보내기**: 각 행의 관리 열 다운로드 아이콘 클릭
- **시리즈 내보내기**: 시리즈 체크박스 선택 → 해당 시리즈 포스트 전체 다운로드

### API

```
# Posts
GET /api/posts/export?id=<post-id>          # 단일 포스트 .md 다운로드
GET /api/posts/export?all=true              # 전체 포스트 JSON 반환
GET /api/posts/export?series_id=<series-id> # 시리즈 내 포스트 JSON 반환

# Works
GET /api/works/export?id=<work-id>          # 단일 작업물 .md 다운로드
GET /api/works/export?all=true              # 전체 작업물 JSON 반환
```

내보낸 파일은 `content/posts/` 또는 `content/works/`에 그대로 넣으면 동기화 대상이 됩니다.

---

## Frontmatter — Posts

파일 상단에 YAML frontmatter를 작성하면 메타데이터가 자동으로 반영됩니다.

### 예시

```markdown
---
title: Next.js 15 마이그레이션 가이드
slug: nextjs-15-migration
category: Development
tags: [Next.js, React, Migration]
excerpt: Next.js 14에서 15로 마이그레이션 정리
cover_image: https://example.com/image.jpg
date: 2024-03-15
---

## 개요

본문 내용...
```

### 지원 필드

| 필드 | 타입 | 설명 | 기본값 |
|------|------|------|--------|
| `title` | string | 포스트 제목 | 파일명 |
| `slug` | string | URL 슬러그 | 제목에서 자동 생성 |
| `category` | string | 카테고리 (사이트에 등록된 카테고리명) | 기타 |
| `tags` | string[] | 태그 목록 | 없음 |
| `excerpt` | string | 요약/발췌문 | 없음 |
| `cover_image` | string | 커버 이미지 URL | 없음 |
| `date` | string | 작성 날짜/시간 (ISO 8601 또는 `YYYY-MM-DD` 형식) | 업로드 시점 |

### 날짜/태그 작성법

```yaml
# 날짜
date: 2024-03-15
date: 2024-03-15T14:30:00+09:00

# 태그 — 배열 또는 단일
tags: [React, Next.js, TypeScript]
tags: React
```

---

## Frontmatter — Works

Works는 Posts와 필드가 다릅니다. 본문은 `content_ko`로 저장됩니다.

### 예시

```markdown
---
title: 포트폴리오 웹사이트
subtitle: 인터랙티브 웹 포트폴리오
category: 웹
year: 2024
tech: [Next.js, TypeScript, GSAP, Three.js]
description: GSAP 가로 스크롤 갤러리와 Three.js 3D 오브젝트를 활용한 포트폴리오
role: 풀스택 개발
image: https://example.com/thumb.jpg
live_url: https://example.com
github_url: https://github.com/user/repo
---

## 프로젝트 개요

본문 내용...
```

### 지원 필드

| 필드 | 타입 | 설명 | 기본값 |
|------|------|------|--------|
| `title` | string | 프로젝트명 | 파일명 |
| `subtitle` | string | 부제목 | 없음 |
| `category` | string | 카테고리 | 없음 |
| `year` | string | 연도 | 없음 |
| `tech` | string[] | 기술 스택 (예: `[React, TypeScript]`) | 없음 |
| `description` | string | 프로젝트 설명 | 없음 |
| `role` | string | 역할 | 없음 |
| `image` | string | 대표 이미지 URL | 없음 |
| `live_url` | string | 라이브 URL | 없음 |
| `github_url` | string | GitHub URL | 없음 |

> **참고**: Works는 `slug` 필드가 없습니다. 동기화 시 `title`로 기존 항목을 매칭합니다. 동일 제목의 작업물이 이미 DB에 있으면 업데이트됩니다.

---

## GitHub Pages 마이그레이션

기존 Jekyll/Hugo 등 GitHub Pages 블로그에서 마이그레이션하는 경우:

1. `_posts/` 디렉토리의 `.md` 파일들을 `content/posts/`에 복사
2. `pnpm sync-posts:dry`로 미리보기 확인
3. `pnpm sync-posts`로 DB에 동기화
4. Admin 에디터에서 카테고리, 태그 등을 확인/수정
5. 확인 후 발행 상태를 변경하면 완료

> **참고**: Jekyll의 `layout`, `permalink` 등 이 사이트에서 지원하지 않는 필드는 무시됩니다. `date`, `title`, `tags`, `categories` 필드는 자동 인식됩니다.
