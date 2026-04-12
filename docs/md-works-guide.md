# Works .md 가이드 — 업로드 · 동기화 · 내보내기

---

## 1. Admin UI 업로드

Admin > Works 목록에서 `.md 업로드` 버튼으로 마크다운 파일을 일괄 업로드하여 작업물을 생성할 수 있습니다.

- 파일명이 작업물 제목으로 사용됩니다 (확장자 제외)
- 파일 내용이 `content_ko` 필드로 들어갑니다
- 발행 상태는 `비공개(draft)`로 설정됩니다
- 대표 이미지(`image`)가 없으면 자동으로 랜덤 프리셋 이미지가 생성됩니다

---

## 2. 프로젝트 폴더 동기화

`content/works/` 폴더에 `.md` 파일을 두면 CLI 명령으로 Supabase DB에 동기화할 수 있습니다.

### 사용법

```bash
pnpm sync-works:dry    # 미리보기 (DB 쓰기 없음)
pnpm sync-works        # 실행
```

> Posts와 함께 동기화하려면 `pnpm sync-all`

### 동작 방식

1. `content/works/*.md` 파일을 스캔
2. frontmatter + 본문 파싱
3. **title 기준**으로 DB 조회 (Works는 slug가 없으므로 제목으로 매칭):
   - 없으면: INSERT (비공개 초안)
   - 있으면: 파일 수정 시간 > DB updated_at 일 때만 UPDATE (본문+메타만, published/sort_order 유지)
4. DB에 있지만 파일이 없는 작업물은 건드리지 않음 (삭제 안 함)

### CI/CD 연동

```json
{
  "scripts": {
    "build": "tsx scripts/sync-works.ts && next build"
  }
}
```

> Posts도 함께: `"build": "tsx scripts/sync-posts.ts && tsx scripts/sync-works.ts && next build"`

### 환경변수

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

환경변수가 없으면 동기화를 건너뛰므로, Supabase 없이 빌드할 때도 안전합니다.

---

## 3. DB → .md 내보내기

- **전체 내보내기**: 표 하단 버튼
- **선택 내보내기**: 체크박스 선택 후 bulk bar ".md 내보내기"
- **개별 내보내기**: 각 행의 다운로드 아이콘 클릭

### API

```
GET /api/works/export?id=<work-id>    # 단일 작업물 .md 다운로드
GET /api/works/export?all=true        # 전체 작업물 JSON 반환
```

내보낸 파일은 `content/works/`에 그대로 넣으면 동기화 대상이 됩니다.

---

## Frontmatter

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
