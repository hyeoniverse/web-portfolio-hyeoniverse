---
title: "MacFolio"
title_en: "MacFolio"
slug: macfolio
subtitle: "macOS 데스크톱을 웹으로 옮긴 포트폴리오, 메모 앱이 곧 블로그이고 서버까지 직접 운영하는 풀스택 프로젝트"
subtitle_en: "A portfolio that brings the macOS desktop to the web, where the Notes app is the blog and the server is self-run"
category: 웹앱, 풀스택
category_en: Web App, Full-Stack
nature: 사이드 프로젝트
nature_en: Side Project
order: 12
year: 2026
icon: 🍎
tech: [React 19, TypeScript, Vite, Milkdown, NestJS, Prisma 7, PostgreSQL 17, pnpm, Turborepo, Vitest, Playwright, Cloudflare Workers, Oracle Cloud, Docker Compose, Cloudflare Tunnel, GitHub Actions]
description: "Dock 에서 앱을 열고, 창을 끌어 옮기고, 메모 앱에서 블로그를 읽는 macOS 모양의 포트폴리오입니다. 휴대폰으로 열면 iOS 홈 화면이 됩니다. 관리자는 GitHub 로 로그인해 메모 앱에서 바로 글을 쓰고, API 는 무료 Oracle VM 에서 SSH 외에는 포트를 열지 않고 운영합니다."
description_en: "A macOS-style portfolio where you open apps from the Dock, drag windows around, and read the blog in the Notes app. On a phone it becomes an iOS home screen. The admin signs in with GitHub and writes posts right in Notes, and the API runs on a free Oracle VM with no open port except SSH."
role: "1인 개발 · 기획 · 디자인 · 프론트엔드 · 백엔드 · 인프라 · CI/CD"
role_en: "Solo · Planning · Design · Frontend · Backend · Infrastructure · CI/CD"
image: /content/works/macfolio/desktop.jpg
live_url: https://macfolio.hyeoniverse.com
github_url: https://github.com/hyeoniverse/MacFolio
---

![MacFolio 데스크톱: 메뉴 막대, 메모 앱 창, 아래쪽 Dock](/content/works/macfolio/desktop.jpg)

## 한눈에 보기

| 항목 | 내용 |
| --- | --- |
| 기간 | 2024.08 ~ 2024.12 (원형), 2026.09 ~ 2026.10 (다시 만들기) |
| 인원 | 1인 |
| 역할 | 기획, 디자인, 프론트엔드, 백엔드, 인프라, CI/CD |
| 규모 | 브라우저 E2E 486개 · 단위 시험 659개, API 경로 64개 권한 고정, 앱 23개(내장 18 · 프로젝트 5), 개발기 201편 (2026.10.19 기준) |
| 배포 | Cloudflare Workers (프론트엔드), Oracle Cloud VM + Docker Compose + Cloudflare Tunnel (API) |
| 링크 | [macfolio.hyeoniverse.com](https://macfolio.hyeoniverse.com) · [API 문서](https://macfolio-api.hyeoniverse.com/docs) |

> [!TIP]
> 보이는 모양은 macOS 그대로, 안쪽은 실제로 운영하는 서비스입니다. API 경로 64개의 권한을 표 하나로 시험에 고정하고, SSH 외에는 포트를 열지 않은 무료 서버에서 운영하며, 만든 과정 201편을 사이트 안의 메모 앱에 남겼습니다.

## 개요

MacFolio 는 macOS 데스크톱을 웹으로 옮긴 포트폴리오입니다. Dock 에서 앱을 열고, 제목 막대를 끌어 창을 옮기고, 메모 앱에서 블로그를 읽습니다. 터미널에 `about`, `skills`, `projects` 를 치면 저를 소개하고, Safari 와 프로젝트 앱에서는 배포한 다른 작업물을 창 안에서 바로 실행합니다. 휴대폰으로 열면 iOS 홈 화면과 위젯, 제어 센터 스와이프로 바뀝니다.

2024년에 Create React App 과 Firebase 로 만든 원형은 보기만 하는 모형이었습니다. 관리자 비밀번호를 Firebase 에 두었는데 규칙이 열려 있어 누구나 평문으로 읽을 수 있었고, CRA 는 2025년 2월에 deprecated 되었습니다. 2026년 9월, Vite + NestJS + PostgreSQL 모노레포로 다시 짜면서 "모양은 macOS, 안쪽은 진짜 서비스" 를 목표로 삼았습니다.

## 주요 기능

- **데스크톱과 휴대폰** 창 끌기·크기 조절·최소화·전체 화면, 메뉴 막대, Launchpad, 바탕화면 아이콘. 휴대폰에서는 iOS 홈 화면과 제어 센터, 터미널 대신 단축어.
- **메모 = 블로그** 폴더·갤러리 보기, 태그, 검색과 찾기·대치. 관리자로 로그인하면 읽는 화면이 곧 편집기가 되고, 임시 저장·게시·예약·버전 기록을 남깁니다.
- **방문자 기능** 메시지 앱의 피드백, 블로그 댓글과 좋아요를 로그인 없이. 이름은 방문자 쿠키로 정해지고(🦊 날쌘 여우) 같은 브라우저에서만 지웁니다.
- **주소가 있는 앱** `/memo/<글>`, `/safari/<프로젝트>` 로 들어오면 그 앱이 그 화면으로 열리고, 주소 막대도 맨 앞 창을 따릅니다.
- **운영 도구** 메뉴 막대의 서버 상태, 쿠키 없는 트래픽 분석(활동 상태 보기), Finder 의 이력서·문서 미리보기, 관리자 배경화면 올리기.

![iPhone 과 Android 에서 본 홈 화면](/content/works/macfolio/mobile-devices.jpg)

![메모 앱 편집기: 읽는 화면이 곧 편집기](/content/works/macfolio/memo-editor.jpg)

## 구성

![구성도: Cloudflare Workers, Tunnel, Oracle VM 의 cloudflared · NestJS · PostgreSQL](/content/works/macfolio/architecture.jpg)

- **프론트엔드** React 19 SPA. 앱마다 폴더 하나, `manifest.ts` 한 곳이 Dock·Launchpad·터미널 `open`·모바일 홈의 단일 출처입니다. 창 관리·메모·음악 로직은 React 와 DOM 없이 테스트하는 `packages/desktop-core` 로 떼어 냈습니다.
- **백엔드** NestJS 11개 모듈, Prisma 7 + PostgreSQL 17. 모든 입력은 DTO 화이트리스트로 검사하고, 응답 모양은 `@macfolio/contracts` 의 zod 스키마 하나를 화면과 서버가 함께 씁니다.
- **인프라** 프론트엔드는 Cloudflare Workers 정적 자산, API 는 Oracle Always Free VM 의 Docker Compose. `cloudflared` 가 먼저 바깥으로 연결해 80·443 을 열지 않고, 같은 사이트의 하위 도메인이라 `SameSite=Lax` 세션 쿠키가 함께 갑니다.

## 기술적 도전

### 정적 사이트에서 관리자를 가리기

**증상** 원형은 관리자 비밀번호를 Firebase 에 두었고, 규칙이 열려 있어 누구나 평문으로 읽을 수 있었습니다. 화면에서 편집 버튼을 숨기는 것만으로는 아무것도 막지 못했습니다.

**원인** 정적 사이트에는 요청을 검증할 자리가 없습니다. 클라이언트가 가진 값은 모두 공개된 값입니다.

**해결** 검증을 서버로 옮겼습니다. 관리자 로그인은 GitHub OAuth 로 하고, 계정 이름 대신 바뀌지 않는 숫자 ID 로 가립니다. `state` 쿠키로 로그인 CSRF 를 막고, 세션은 `httpOnly`·`Secure`·`SameSite=Lax` 쿠키에 12시간, DB 에는 토큰의 SHA-256 해시만 둡니다. `AdminGuard` 가 요청마다 세션을 DB 에서 확인하고, API 경로 64개와 가드를 표 하나로 고정한 시험이 가드를 빠뜨리면 실패합니다.

**결론** 버튼을 숨기는 것은 안내일 뿐이고, 권한은 서버가 요청마다 확인합니다. 비밀번호가 없으니 해시·재설정도 만들 필요가 없었습니다.

### 바로 고치는 블로그에 임시 저장과 버전 붙이기

**증상** 메모 앱처럼 읽는 화면에서 바로 고치면 편하지만, 저장하는 순간 방문자에게 보이고 되돌릴 수 없었습니다.

**원인** 글 한 행에 내용이 한 벌뿐이라 "고치는 중" 과 "게시한 것" 을 나눌 수 없었습니다.

**해결** 게시한 내용과 임시 저장을 한 행에 두 벌 두고, 게시할 때마다 `PostRevision` 을 남깁니다. "게시했다면 제목·본문이 있어야 한다" 같은 규칙은 Prisma 스키마로 적을 수 없어 마이그레이션 SQL 의 CHECK 제약으로 DB 에서 한 번 더 겁니다. 저장소의 Markdown 글은 그대로 두고, 서버에서 고친 글만 같은 주소로 대신 보이게 했습니다.

![임시 저장과 게시 상태](/content/works/macfolio/drafts.jpg)

**결론** 고치는 동안은 임시 저장만 되고, 게시해야 방문자에게 보입니다. 미래 날짜로 게시하면 예약되고, 예전 버전은 되살릴 수 있습니다.

### 로그인 없이 남기되 원문은 남기지 않기

**증상** 메시지와 댓글은 쓸 때마다 이름과 비밀번호를 받았고, 서버에 IP 를 원문으로 남겼습니다.

**원인** 주인을 가릴 방법이 비밀번호뿐이었습니다.

**해결** 방문자 쿠키 토큰으로 주인을 가리고, 이름도 그 쿠키로 정합니다. 서버에는 토큰과 IP 의 HMAC 만 저장합니다. 쓰기 경로 33개에는 같은 방식(`@RateLimit`)의 IP별 요청 제한을 걸고, 필요하면 시스템 설정에서 Cloudflare Turnstile 사람 확인을 켭니다.

![메시지 앱](/content/works/macfolio/messages.jpg)

**결론** 방문자는 아무것도 입력하지 않고 남기고, 같은 브라우저에서 지울 수 있습니다. 서버에는 되돌려 읽을 수 있는 개인 정보가 남지 않습니다.

### 들어오는 문이 없는 무료 서버

**증상** Render 같은 무료 호스팅은 15분 동안 요청이 없으면 잠들어 깨어나는 데 1분쯤 걸렸고, 직접 VM 을 쓰면 80·443 을 열고 인증서를 갱신해야 했습니다.

**원인** 무료 플랫폼은 운영을 숨기는 대신 응답 시간을 잃고, 직접 운영은 공격면이 늘어납니다.

**해결** Oracle Always Free VM 에 Postgres, API, cloudflared 를 compose 로 함께 띄웠습니다. compose 에 `ports` 가 하나도 없고, 서버에서 열린 포트는 SSH 하나뿐입니다. API 이미지는 GitHub Actions 에서 amd64·arm64 로 빌드해 GHCR 에 올리고, 서버는 바꿔 끼우기만 합니다. 헬스 체크가 실패하면 자동으로 되돌리며, 일부러 깨진 이미지를 올려 되돌리기를 훈련했습니다. 매일 DB 를 R2 로 백업하고, 서버 자원·가동을 감시해 메일로 알립니다.

**결론** 잠들지 않는 서버를 비용 없이 운영하면서, 서버 IP 도 드러나지 않게 했습니다. 하드닝은 문서가 아니라 `ops/audit.sh` 스크립트로 남겨 언제든 다시 점검합니다.

### 열흘 동안 쌓인 중복을 일곱 단계로

**증상** 기능을 빠르게 붙이는 동안 화면이 응답 타입을 손으로 다시 적고, 12개 파일이 각자 `fetch` 를 부르고, `z-index` 가 23가지, `Memo.css` 가 4,166줄, ESLint 경고가 185개가 되었습니다.

**원인** 다음 기능을 붙일 때마다 고칠 곳이 여러 군데였고, 보안 설정도 기능마다 따로였습니다.

**해결** 타입 → 구조 → 공통 기반 → 컴포넌트 → 스타일 → 서버 → 보안의 일곱 단계로 나눴습니다. 1~6단계는 동작을 바꾸지 않는 것이 규칙이라, 빌드한 CSS 를 바이트로, 화면을 계산된 스타일로 비교해 "그대로" 를 증명했습니다. 동작이 바뀌는 보안 PR 은 리팩터링과 섞지 않았습니다.

**결론** 타입은 contracts 의 zod 스키마 하나, 서버 요청은 `client.ts` 하나, 순환 의존 0(CI 가 막음), 디자인 토큰 여섯 갈래, ESLint 경고 0개(`--max-warnings 0`)가 되었습니다. 사이트에는 CSP 와 iframe sandbox 를 붙이고 취약점 6건을 고쳤습니다.

## CRA → Vite 마이그레이션

| 항목 | CRA | Vite |
| --- | --- | --- |
| dev 서버 시작 | 5.05초 | 0.58초 |
| 프로덕션 빌드 | 6.33초 | 1.88초 |
| JS 번들 (gzip) | 138.2 KB | 127.7 KB |
| 설치 패키지 수 | 1,438개 | 171개 |

## 개발 방식

브랜치·커밋·PR 규칙을 문서로만 두지 않고 CI 의 `conventions` 검사로 지켰습니다. PR 과 main push 마다 포맷 → 린트 → 타입 체크 → 단위 테스트 → 빌드 → 실제 PostgreSQL 에 붙인 API e2e → 브라우저 E2E 를 차례로 돌리고, `check` 를 통과한 커밋만 Cloudflare Workers 에 배포됩니다. PR 마다 미리보기 주소가 생기고, 미리보기에는 CORS 로 읽기만 열어 관리자 쿠키를 주지 않습니다. Playwright 는 데스크톱 Chrome, iPhone, Android 세 화면에서 가짜 API(`page.route`)로 로그인·글쓰기·게시까지 확인하고, README 와 블로그의 스크린샷도 같은 코드로 찍었습니다.

만드는 과정은 전부 사이트 안의 메모 앱(개발기 폴더)에 201편으로 남겼습니다.

## 돌아보며

모형을 서비스로 바꾸는 일은 화면보다 그 뒤를 만드는 일이었습니다. 권한은 서버가 지키고, 규칙은 DB 와 시험이 한 번 더 지키고, 배포는 검사를 통과한 것만 나가게 해 두니 혼자서도 겁 없이 고칠 수 있었습니다. 무엇보다 숫자를 먼저 셌습니다. 공통 부품 후보 아홉은 세어 보니 셋이었고, 쓰지 않는 CSS 는 150개가 아니라 9개였습니다. 남은 과제로는 보류한 공통 부품 여섯과 이름 없는 hex 색 225곳 정리가 있습니다.
