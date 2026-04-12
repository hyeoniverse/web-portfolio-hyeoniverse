# .md 파일 가이드 — 업로드 · 동기화 · 내보내기

Admin UI 업로드, 프로젝트 폴더 동기화, DB에서 .md 내보내기 세 가지 방식을 지원합니다.

---

## 1. Admin UI 업로드

Admin > Posts 목록에서 `.md 업로드` 버튼으로 마크다운 파일을 일괄 업로드하여 포스트를 생성할 수 있습니다.

- 파일명이 포스트 제목으로 사용됩니다 (확장자 제외)
- 파일 내용이 마크다운 콘텐츠로 들어갑니다
- 발행 상태는 `비공개(draft)`로 설정됩니다
- 커버 이미지가 없으면 자동으로 랜덤 프리셋 이미지가 생성됩니다

---

## 2. 프로젝트 폴더 동기화 (Jekyll-style)

`content/posts/` 폴더에 `.md` 파일을 두면, CLI 명령으로 Supabase DB에 동기화할 수 있습니다.

### 사용법

```bash
# 변경 사항 미리보기 (DB 쓰기 없음)
pnpm sync-posts:dry

# 실제 동기화
pnpm sync-posts
```

### 동작 방식

1. `content/posts/*.md` 파일을 스캔
2. frontmatter + 본문 파싱
3. **slug 기준**으로 DB 조회:
   - 없으면: INSERT (비공개 초안)
   - 있으면: 파일 수정 시간 > DB 수정 시간일 때만 UPDATE (본문+메타만, published/is_pinned 등은 유지)
4. DB에 있지만 파일이 없는 포스트는 건드리지 않음 (삭제 안 함)

### 파일 구조

```
content/
  posts/
    my-first-post.md
    nextjs-migration.md
    react-server-components.md
```

### CI/CD 연동

Vercel 등에서 빌드 전 자동 동기화하려면 `package.json`의 build 스크립트를 수정:

```json
{
  "scripts": {
    "build": "tsx scripts/sync-posts.ts && next build"
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

Admin > Posts 목록에서 `전체 .md 내보내기` 버튼으로 모든 포스트를 frontmatter 포함 `.md` 파일로 다운로드할 수 있습니다.

### API

```
GET /api/posts/export?id=<post-id>    # 단일 포스트 .md 다운로드
GET /api/posts/export?all=true        # 전체 포스트 JSON 목록 반환
```

내보낸 파일은 `content/posts/`에 그대로 넣으면 동기화 대상이 됩니다.

---

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
| `category` | string | 카테고리 (사이트에 등록된 카테고리명) | 기타 |
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

---

## GitHub Pages 마이그레이션

기존 Jekyll/Hugo 등 GitHub Pages 블로그에서 마이그레이션하는 경우:

1. `_posts/` 디렉토리의 `.md` 파일들을 `content/posts/`에 복사
2. `pnpm sync-posts:dry`로 미리보기 확인
3. `pnpm sync-posts`로 DB에 동기화
4. Admin 에디터에서 카테고리, 태그 등을 확인/수정
5. 확인 후 발행 상태를 변경하면 완료

> **참고**: Jekyll의 `layout`, `permalink` 등 이 사이트에서 지원하지 않는 필드는 무시됩니다. `date`, `title`, `tags`, `categories` 필드는 자동 인식됩니다.
