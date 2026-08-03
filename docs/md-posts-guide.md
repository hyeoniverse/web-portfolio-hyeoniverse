# Posts .md 가이드 — 업로드 · 동기화 · 내보내기

---

## 1. Admin UI 업로드

Admin > Posts 목록에서 `.md 업로드` 버튼으로 마크다운 파일을 일괄 업로드하여 포스트를 생성할 수 있습니다.

- 파일명이 포스트 제목으로 사용됩니다 (확장자 제외)
- 파일 내용이 마크다운 콘텐츠로 들어갑니다
- 발행 상태는 `비공개(draft)`로 설정됩니다
- 커버 이미지가 없으면 자동으로 랜덤 프리셋 이미지가 생성됩니다
- 등록되지 않은 카테고리가 있으면 생성 여부를 확인합니다

---

## 2. 프로젝트 폴더 동기화 (Jekyll-style)

`content/posts/` 폴더에 `.md` 파일을 두면 CLI 명령으로 Supabase DB에 동기화할 수 있습니다.

### 사용법

```bash
pnpm sync-posts:dry    # 미리보기 (DB 쓰기 없음)
pnpm sync-posts        # 실행
```

### 동작 방식

1. `content/posts/*.md` 파일을 스캔
2. frontmatter + 본문 파싱
3. **slug 기준**으로 DB 조회:
   - 없으면: INSERT (비공개 초안)
   - 있으면: 파일 수정 시간 > DB updated_at 일 때만 UPDATE (본문+메타만, published/is_pinned 유지)
4. DB에 있지만 파일이 없는 포스트는 건드리지 않음 (삭제 안 함)

### CI/CD 연동

```json
{
  "scripts": {
    "build": "tsx scripts/sync-posts.ts && next build"
  }
}
```

GitHub push → Vercel 빌드 → 자동 동기화 → SSG/ISR 반영.

### 환경변수

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

환경변수가 없으면 동기화를 건너뛰므로, Supabase 없이 빌드할 때도 안전합니다.

---

## 3. DB → .md 내보내기

- **전체 내보내기**: 표 하단 버튼
- **선택 내보내기**: 체크박스 선택 후 bulk bar ".md 내보내기"
- **개별 내보내기**: 각 행의 다운로드 아이콘 클릭
- **시리즈 내보내기**: 시리즈 체크박스 선택 → 해당 시리즈 포스트 전체 다운로드

### API

```
GET /api/posts/export?id=<post-id>          # 단일 포스트 .md 다운로드
GET /api/posts/export?all=true              # 전체 포스트 JSON 반환
GET /api/posts/export?series_id=<series-id> # 시리즈 내 포스트 JSON 반환
```

내보낸 파일은 `content/posts/`에 그대로 넣으면 동기화 대상이 됩니다.

---

## Frontmatter

### 예시

```markdown
---
title: Next.js 15 마이그레이션 가이드
title_en: Migrating to Next.js 15
slug: nextjs-15-migration
category: 개발
tags: [Next.js, React, Migration]
excerpt: Next.js 14에서 15로 마이그레이션 정리
icon: 🚀
github_url: https://github.com/me/next15-demo
pinned: true
cover_image: https://example.com/image.jpg
date: 2024-03-15
---

## 개요

본문 내용...
```

> 발행하려면 **제목 · 슬러그 · 카테고리 · 본문**이 필요합니다. 초안은 제목만 있어도 생성됩니다.

### 지원 필드

| 필드 | 타입 | 설명 | 기본값 |
|------|------|------|--------|
| `title` | string | 포스트 제목 | 파일명 |
| `title_en` | string | 영문 제목 | 없음 |
| `slug` | string | URL 슬러그 | 제목에서 자동 생성 |
| `category` | string | 카테고리 — 2단계 중 **소분류**(대분류는 자동 도출) | 기타 |
| `tags` | string[] | 태그 목록 | 없음 |
| `excerpt` / `excerpt_en` | string | 요약/발췌문 (한/영) | 없음 |
| `language` | `ko` \| `en` | 기본 언어 | ko |
| `icon` | string | 페이지 아이콘 (이모지 또는 이미지 URL) | 없음 |
| `github_url` | string | 연결할 GitHub URL | 없음 |
| `pinned` | boolean | 상단 고정 (`true`/`false`) | false |
| `cover_image` | string | 커버 이미지 URL | 없음 |
| `cover_position` | number | 커버 세로 위치 % (0~100) | 50 |
| `cover_zoom` | number | 커버 확대 배율 (1~2.5) | 1 |
| `date` | string | 작성 날짜/시간 (ISO 8601 또는 `YYYY-MM-DD`) | 업로드 시점 |

### 날짜/태그 작성법

```yaml
# 날짜
date: 2024-03-15
date: 2024-03-15T14:30:00+09:00

# 태그
tags: [React, Next.js, TypeScript]
tags: React
```

---

## GitHub Pages 마이그레이션

기존 Jekyll/Hugo 블로그에서 마이그레이션하는 경우:

1. `_posts/` 디렉토리의 `.md` 파일들을 `content/posts/`에 복사
2. `pnpm sync-posts:dry`로 미리보기 확인
3. `pnpm sync-posts`로 DB에 동기화
4. Admin 에디터에서 카테고리, 태그 등을 확인/수정
5. 확인 후 발행 상태를 변경하면 완료

> **참고**: Jekyll의 `layout`, `permalink` 등 미지원 필드는 무시됩니다. `date`, `title`, `tags`, `categories` 필드는 자동 인식됩니다.
