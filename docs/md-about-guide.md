# About .md 가이드 — 원본 전환 · 동기화 · 파일 형식

About 페이지의 내용은 두 곳에서 올 수 있다. **설정 화면**(admin > Settings > Content > About)에서
고치거나, **`content/about/` 의 마크다운 파일**에서 가져오거나. 패널마다 따로 고른다.

착수 전 계획과 설계 근거는 [about-md-plan.md](about-md-plan.md) 에 있다.

---

## 1. 어느 패널이 md 를 쓸 수 있나

| 패널 | 파일 위치 |
| --- | --- |
| Design Decisions | `content/about/decisions/` |
| Security | `content/about/security/` |
| Features | `content/about/features/` |
| Process | `content/about/process/` |
| Overview | `content/about/overview.md` |
| Credits | `content/about/credits.md` |

나머지는 UI 전용이다. ERD · User Flow · Architecture 다이어그램 · Hero 는 그래프와 좌표
데이터라 md 로 옮기면 지금 편집기보다 나빠진다.

목록은 [`src/lib/about/contentSources.ts`](../src/lib/about/contentSources.ts) 한 곳에 있고
동기화 스크립트와 설정 화면이 같이 본다.

---

## 2. 쓰는 순서

### ① 지금 값을 파일로 꺼낸다

```bash
npm run sync-about:eject
```

설정에 저장된 값(없으면 코드의 기본값)을 `content/about/` 아래에 md 로 쓴다.
DB 없이도 돌아가므로 처음 옮길 때 그대로 쓰면 된다. **DB 는 건드리지 않는다.**

Design Decisions 는 About 페이지의 내보내기 버튼(상태바 오른쪽 ⤓)이 같은 형식을 뱉으므로
항목 하나만 꺼내 볼 수도 있다.

### ② 파일을 고치고 동기화한다

```bash
npm run sync-about:dry    # 무엇이 바뀌는지만 (DB 쓰기 없음)
npm run sync-about        # 실행
```

**더 최근에 손댄 쪽이 남는다.** 패널마다 파일 수정 시각과 마지막 화면 저장 시각을 견줘,
파일이 나중일 때만 덮는다. 화면에서 방금 고친 내용을 오래된 파일이 덮지 않는다.
`sync-posts` 가 mtime 과 `updated_at` 을 견주는 것과 같은 규칙이다.

폴더가 비어 있으면 **그 패널을 건드리지 않는다** — 지우지 않는다.
Supabase 환경변수가 없으면 통째로 건너뛴다.

**경고가 하나라도 있으면 쓰지 않고 멈춘다.** 경고는 전부 실수 신호다 — 모르는 소제목,
빈 단, 범위 밖 난이도, 겹친 id, 없는 이미지. 소제목 오타 하나가 배포된 화면의 빈 섹션이
되는 걸 막는다. `--dry` 는 어차피 쓰지 않으므로 경고만 보여 준다.

쓰기 직전에는 설정 화면 PATCH 와 **같은 검사**(`checkAboutContent`)를 한 번 더 지난다.
화면이 값을 믿고 바로 파고드는 자리(`problem` · `definition` · `cause` · `solution` ·
`keyInsight` · `difficulty`)가 비면 About 페이지가 통째로 안 뜨기 때문이다.

빌드에 물리려면 `sync-all` 에 이미 들어 있다.

```bash
npm run sync-all   # posts + works + about
```

---

## 3. 파일 형식

한 항목이 **파일 두 개**다 — `<이름>.md`(한국어)와 `<이름>.en.md`(영어).
`docs/` 가 이미 쓰는 규칙과 같다. en 파일이 없으면 ko 내용을 그대로 쓴다.

파일명 앞의 번호가 표시 순서다. 순서를 바꾸려면 번호만 고치면 된다.

### Design Decisions

```md
---
id: role-stored-in-app-metadata
section: 인증 / 인가
difficulty: 2
vizKey: perm-store
tags: [auth, jwt, rls]
---
# 권한 데이터의 신뢰 경계 설계

> 역할 정보를 어디에 저장할 것인가

## Context
...
## Considerations
...
## Decision
...
## Key Insight
...
```

| 키 | 뜻 |
| --- | --- |
| `id` | 항목 식별자. 없으면 파일명에서 번호를 뗀 값 |
| `section` | 탐색기 폴더 이름 |
| `difficulty` | 1(쉬움) · 2(보통) · 3(어려움). 범위 밖이면 경고하고 버린다(→ 멈춤) |
| `vizKey` | 항목에 붙는 도형 컴포넌트 키. **빠뜨리면 도형이 통째로 사라진다** |
| `tags` | 태그 목록 |

소제목 네 개는 **철자 그대로** 써야 한다(`Context` · `Considerations` · `Decision` ·
`Key Insight`). 다른 이름을 쓰면 그 단이 비고 경고가 떠서 동기화가 멈춘다.

본문의 `[[viz]]` 한 줄은 그 자리에 도형을 그리라는 표시다. 글자로는 뜻이 없지만 위치
정보라서 지우면 도형이 전부 섹션 끝으로 몰린다.

제목(`# `) 아래 인용 한 줄(`> `)은 증상 요약이다. 없으면 제목을 그대로 쓴다.

### Security · Features · Process

머리말 + 제목 한 줄 + 본문으로 끝난다.

```md
---
layer: SQL Injection
icon: db
scope: 모든 DB 쿼리
---
# SQL Injection 방지

모든 DB 쿼리에 Supabase **파라미터화 쿼리**를 사용합니다. …
```

| 패널 | 머리말 키 |
| --- | --- |
| Security | `layer` · `icon` · `scope` |
| Features | `icon` · `tech: [a, b]` · `image` |
| Process | `step` |

Features 의 `title` 은 언어를 나누지 않는 필드라 ko 파일의 제목을 쓴다.

### Overview · Credits

파일 하나로 끝난다. Overview 의 지표는 본문의 `## Stats` 표에 적는다.

```md
---
highlights: [Next.js 16, GSAP ScrollTrigger, Supabase]
---
# Overview

Claude와 함께 만든 풀스택 포트폴리오. …

## Stats

| value | label |
| --- | --- |
| 6 Mo+ | 개발 기간<br>(2/5 – 진행 중) |
| 250+ | 컴포넌트 |
```

카드 라벨의 줄바꿈은 `<br>` 로 적는다. 표 칸에는 실제 줄바꿈을 넣을 수 없다.

Credits 는 머리말 `names: [...]` 와 본문 한 줄 메모다. 글꼴·크기·정렬은 글이 아니라
설정이라 설정 화면에 남겨 뒀다.

---

## 4. 이미지

**주인이 하나면 그 항목 옆에, 여럿이 쓰면 `public/images/`.**

```
content/about/decisions/
  01-role-stored-in-app-metadata.md
  01-role-stored-in-app-metadata/
    permission-storage-flow.svg
```

md 안에서는 상대 경로로 참조한다. VS Code 미리보기에서 그대로 보이고, 항목을 지우면 폴더째
같이 지워진다.

```md
![권한 데이터 저장 위치 결정 흐름](./01-role-stored-in-app-metadata/permission-storage-flow.svg)

*세 기준을 차례로 적용하면 `app_metadata` 하나가 남는다.*
```

이미지 바로 다음 줄의 `*...*` 한 줄은 그 이미지의 캡션이 된다.
이미지가 **어느 소제목 아래 있는지가 곧 표시 위치**다 — 따로 적지 않는다.

Next 는 `content/` 를 서빙하지 않으므로 빌드·개발 서버 시작 전에 `public/content/` 로 복사한다
(`prebuild` 와 `dev` 에 붙어 있다). 수동 실행은 `npm run sync-content-assets`.
원본이 사라진 파일은 함께 정리하므로, md 에서 지운 이미지가 배포에 남지 않는다.
`public/content/` 는 생성물이라 git 에 넣지 않는다.

참조한 이미지가 없으면 동기화가 경고한다.

여러 패널이 함께 쓰는 스크린샷(`public/images/screenshots/` 100여 장)은 옮기지 않는다.
설정 화면의 이미지 선택기에 **Project** 탭이 있어 거기서 고르면 된다.

---

## 5. 값이 어디서 오나

패널은 세 단계로 고른다.

```
DB  →  폴백 (빌드 때 md 에서 구움)  →  빈값
```

- **DB** — 화면 편집이나 `npm run sync-about` 이 쓴 값. 재배포 없이 바뀐다.
- **폴백** — `src/data/generated/aboutContent.ts`. `content/about/` 의 md 를 빌드 전에
  구워 넣은 것이라 DB 가 없어도 내용이 뜬다. **자동 생성이므로 고치지 않는다.**
  (`npm run gen-about-fallback`, prebuild·dev 가 자동 실행)
- **빈값** — md 도 없으면 아무것도 안 그린다. 아직 쓴 게 없다는 뜻이다.

화면과 md 는 **둘 다 원본이다.** 어느 쪽을 쓸지 고르는 스위치는 없고, 동기화가 시각을 견줘
더 최근 쪽을 남긴다. 그래서 화면에서 고쳐도 되고 파일에서 고쳐도 된다.

손으로 쓰는 TS 정적 데이터는 없앴다. 예전에는 `src/data/about/*.ts` 에도 같은 글이
있었는데, `site.config` 의 기본값이 항상 이겨서 도달하지 않는 코드였고 실제로 개수가
어긋나 있었다(security 8 vs 9, features 9 vs 12).

---

## 6. 되돌리기

동기화가 덮은 게 마음에 안 들면 설정 화면에서 그냥 고치고 저장하면 된다. 저장 시각이
파일보다 나중이 되므로 다음 동기화가 그 패널을 건드리지 않는다.

반대로 파일 쪽을 다시 살리려면 md 를 고쳐 저장한다(수정 시각이 갱신된다). 내용을 안 바꾸고
시각만 올리려면 `touch content/about/<패널>/*.md`.

---

## 7. 걸리기 쉬운 것

**소제목 철자.** Design Decisions 의 네 소제목은 고정이다. `Solution` 이라고 쓰면 그 단이
비고 경고가 떠서 동기화가 멈춘다.

**`vizKey` 누락.** 도형이 사라진다. 경고 없이 조용히 빠지는 유일한 값이라 `--dry` 로 먼저 본다.

**같은 `id` 두 개.** 나중 파일을 건너뛰고 경고한다 — 경고가 있으면 쓰지 않으므로 실제로는 멈춘다.

**표는 왕복하지 않는다.** 항목의 `comparisons`(구조화된 비교표)는 내보낼 때 본문 표로 적히고,
되읽으면 그냥 본문 글자가 된다. 화면에 보이는 내용은 유지되지만 구조는 잃는다.
본문에 사람이 손으로 쓴 표는 그냥 본문이라 아무 영향이 없다.

**전환은 패널 단위다.** 한 패널을 md 와 화면으로 반씩 채울 수 없다. 설정을 읽을 때
배열을 통째로 갈아끼우기 때문이다.
