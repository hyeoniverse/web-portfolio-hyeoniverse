<a name="readme-top"></a>

<div align="center">

**[English](./README.en.md)** | 한국어

<br />

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="public/images/logo/wordmark-light.svg" />
  <img src="public/images/logo/wordmark-dark.svg" alt="HYEONIVERSE" width="360" />
</picture>

<br />
<br />

**작업물을 보여 주고, 글을 쓰고, 운영까지 하는 개인 사이트를 한 저장소로.**

공개 화면과 그 내용을 직접 쓰고 고치는 관리자 화면(CMS)이 함께 들어 있습니다.

<br />

[![License](https://img.shields.io/badge/license-PolyForm%20NC%201.0-d40063?style=flat-square)](./LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![Three.js](https://img.shields.io/badge/Three.js-R3F-000?style=flat-square&logo=threedotjs&logoColor=white)](https://threejs.org)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000?style=flat-square&logo=vercel&logoColor=white)](https://vercel.com)

**[✦ 사이트 보기](https://www.hyeoniverse.com)** &nbsp;·&nbsp; **[기능 전체](./docs/features.md)** &nbsp;·&nbsp; **[설계 결정](./docs/design-system-decisions.md)** &nbsp;·&nbsp; **[트러블슈팅](./docs/troubleshooting.md)**

<br />

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/images/readme-banner-dark.png" />
  <img src="docs/images/readme-banner-light.png" alt="hyeoniverse.com 데스크톱 · 모바일 홈" width="100%" />
</picture>

<sub><b>3,300+</b> 커밋 &nbsp;·&nbsp; <b>980+</b> 머지한 PR &nbsp;·&nbsp; <b>64</b> 트러블슈팅 기록 &nbsp;·&nbsp; <b>97.93%</b> 타입 커버리지 &nbsp;·&nbsp; <b>2026.02 ~</b> 운영 중</sub>

https://github.com/user-attachments/assets/731ed5f7-725d-421e-8baa-2f43283a342d

<details>
<summary><kbd>목차</kbd></summary>

<br />

<sub>01</sub> [기능](#-기능) &nbsp;·&nbsp; <sub>02</sub> [화면](#-화면) &nbsp;·&nbsp; <sub>03</sub> [관리자 · CMS](#-관리자--cms) &nbsp;·&nbsp; <sub>04</sub> [아키텍처](#-아키텍처) &nbsp;·&nbsp; <sub>05</sub> [문제 해결 사례](#-문제-해결-사례)<br />
<sub>06</sub> [만든 과정](#-만든-과정) &nbsp;·&nbsp; <sub>07</sub> [기술 스택](#-기술-스택) &nbsp;·&nbsp; <sub>08</sub> [프로젝트 구조](#-프로젝트-구조) &nbsp;·&nbsp; <sub>09</sub> [빠른 시작](#-빠른-시작) &nbsp;·&nbsp; <sub>10</sub> [문서](#-문서)

</details>

</div>

---

<sub>01 — FEATURES</sub>

## ✦ 기능

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/images/readme-works-dark.gif" />
  <img src="docs/images/readme-works-light.gif" alt="작업물 레이아웃 여섯 가지를 차례로 바꿔 보는 모습" width="100%" />
</picture>

### 작업물 레이아웃 여섯 가지

같은 작업물 목록을 Flow · Grid · Cylinder · Fullscreen · Cinematic · Split 여섯 가지 배치로 보여 줍니다. 관리자 설정에서 기본 배치를 고르고, 주소에 `?layout=` 을 붙이면 바로 바꿔 볼 수 있습니다.

- Cylinder 는 Three.js 로 그린 원통 배치입니다.
- 상세 페이지에는 슬라이드 갤러리(음성 · 자막)와 관련 글 · 시리즈가 붙습니다.

<br />

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/images/readme-home-dark.gif" />
  <img src="docs/images/readme-home-light.gif" alt="홈을 아래로 스크롤하며 3D 토러스가 따라 움직이는 모습" width="100%" />
</picture>

### 스크롤 · 3D 인터랙션

홈을 내려가면 3D 토러스가 스크롤을 따라 움직이고, 문장과 섹션이 스크롤 방향에 맞춰 차례로 들어옵니다.

- 무한 스크롤 루프, 마우스 패럴랙스, StaggerText, 방향별 Scroll Cascade, Lenis 부드러운 스크롤
- Three.js 3D: 홈 토러스 · 커피잔, 프로필 캐릭터

<br />

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/images/readme-readaloud-dark.png" />
  <img src="docs/images/readme-readaloud-light.png" alt="글 읽어 주기 — 제목을 읽는 중, 아래 조작 막대" width="100%" />
</picture>

### 글 읽어 주기

글과 작업물 상세의 **Listen** 단추를 누르면 브라우저 음성(Web Speech API)으로 글을 읽습니다. 서버 TTS 를 부르지 않아 비용이 들지 않습니다.

- 제목 → 요약 → 날짜 · 작성자 같은 정보 → 본문 블록 순서로 읽고, 읽는 블록을 강조하며 화면 밖이면 따라 스크롤합니다.
- 화면 아래 떠 있는 막대에서 이전 · 일시정지 · 다음 · 빠르기(1 · 1.25 · 1.5 · 0.75배, 고른 값은 기억) · 멈춤을 고릅니다. 문단을 누르면 거기서부터 읽습니다.
- 소리로 들어서는 소용없는 블록은 무엇인지만 알립니다. 코드 블록은 "코드 블록, 언어, N줄", 수식은 "수식", 동영상 · 삽입은 종류만 말합니다.
- 작은 표는 행마다 머리글을 붙여 읽고, 큰 표는 크기만 알린 뒤 누르면 행 단위로 펼쳐 읽습니다. 이미지는 대체 글과 캡션을 읽습니다.
- 닫힌 토글 안처럼 화면에 보이지 않는 것은 읽지 않습니다. 블록마다 한국어 · 영어 목소리를 따로 고릅니다.

<br />

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/images/readme-editor-dark.png" />
  <img src="docs/images/readme-editor-light.png" alt="Plate.js 편집기와 선택하면 떠오르는 색 도구" width="100%" />
</picture>

### Plate.js 편집기

Plate.js 로 만든 편집기입니다. 위 툴바는 작용 범위별로 묶여 있고, 글을 선택하면 떠오르는 바에서 글자색 · 배경색을 바로 입힙니다.

- 다이어그램(React Flow) · 코드 플레이그라운드(Sandpack) · 코드(CodeMirror 6) · 수식(KaTeX) 블록
- 자동저장과 리비전: 같은 기기 초안은 `localStorage`, 다른 기기에서 이어 쓰기는 DB 리비전으로
- `.md` 업로드(frontmatter 포함)와 내보내기(전체 · 선택 · 개별 · 시리즈)

<br />

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/images/readme-gallery-dark.gif" />
  <img src="docs/images/readme-gallery-light.gif" alt="음성에 맞춰 자막이 바뀌는 발표 갤러리" width="100%" />
</picture>

### 발표 갤러리 음성

작업물 상세의 슬라이드 갤러리는 장마다 **음성과 자막**을 붙일 수 있습니다. 자막은 대본에서 글자 비율로 잘라 음성에 맞춰 나오고, 아래 진행 막대는 장마다 한 칸씩 채워집니다. 🔊 소리까지 들으려면 [mp4 로 보기](public/images/screenshots/cms/01-gallery-playing-light.mp4)

- 미리 만든 음성(TTS · 녹음)을 먼저 틀고, 없으면 대본을 브라우저 음성으로 읽고, 둘 다 없으면 4초 뒤 넘어갑니다.
- 음성 편집기에서 목소리를 고르고 **음성 만들기**를 누릅니다. 고른 공급자가 실패하면 Fish Audio → Google Cloud TTS → Edge 순서로 넘어갑니다.
- 녹음 파형 편집기(나누기 · 잘라내기 · 무음 자르기)와 표기 · 읽을 말을 짝짓는 읽기 사전이 있습니다.
- PPTX 를 끌어 놓으면 장마다 그림으로 그려 올리고, 발표자 노트는 그 장의 대본으로 들어갑니다.

<br />

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/images/readme-translate-dark.gif" />
  <img src="docs/images/readme-translate-light.gif" alt="EN 으로 바꾸고 재번역을 누르면 영어 칸이 채워지는 모습" width="100%" />
</picture>

### AI 번역 · 요약

편집기 위쪽의 KO/EN 스위치를 **EN 으로 바꾸면** 제목 · 부제목 · 설명 · 본문 · 갤러리 대본까지 한 번에 채웁니다. 번역은 폼에만 들어오고 저장을 눌러야 남습니다.

- 기능마다(번역 · 요약 · TTS · 커버) 공급자 대체 순서를 두고, 같은 원인으로 거듭 실패한 공급자는 잠시 꺼서 요청을 보내지 않습니다.
- 공개 화면에서는 보는 언어의 본문이 없으면 번역 배너가 뜨고, 상세 위쪽 AI 요약 상자가 한국어 · 영어 요약을 보여 줍니다.

<br />

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/images/readme-theme-dark.png" />
  <img src="docs/images/readme-theme-light.png" alt="테마 프리셋" width="100%" />
</picture>

### 테마 · 브랜드

강조색과 라이트 · 다크의 배경 · 글자색 다섯으로 사이트 전체 테마를 바꿉니다.

- 프리셋 18종은 강조색끼리 ΔE 20 이상 떨어뜨려 두었고, 지금 고른 색은 내 프리셋으로 저장합니다.
- 대비 점검(WCAG) 표가 라이트 · 다크에서 본문 · 링크 · 버튼 글자의 대비를 바로 셉니다. 강조색이 글자로 쓰일 때는 명도만 옮겨 4.5:1 을 맞춥니다.
- 색상환(유사색 · 보색 · 분할 보색 · 삼각 · 단색)이나 올린 이미지에서 색 조합을 뽑습니다.
- 브랜드는 저장 전 설정으로 네비 · 브라우저 탭 · 로딩 화면을 미리 그려 보며 로고를 맞춥니다.

<br />

#### 영역별 요약

| 영역 | 핵심 |
|:---|:---|
| **인터랙션** | 무한 스크롤 루프, 마우스 패럴랙스, StaggerText, Three.js 3D(홈 토러스 · 커피잔, 프로필 캐릭터), 방향별 Scroll Cascade |
| **작업물** | 여섯 가지 레이아웃, 상세 페이지, 슬라이드 갤러리(음성 · 자막) |
| **글** | SSR + ISR, 시리즈, 배너 슬라이더, 여섯 가지 목록 레이아웃, 읽어 주기, 게스트 댓글(마크다운 + 이모지 반응) 또는 giscus |
| **관리자** | 대시보드 · 트래픽 분석 · 알림 · 서비스 호출 기록, Plate.js 편집기, `.md` 동기화, AI 번역 · 요약, 발표 갤러리 음성(TTS · 녹음 · PPTX 발표자 노트), 테마 프리셋 + WCAG 대비 점검, 리비전 히스토리, 멤버 초대와 역할 |
| **보안** | RLS 4단계 권한, CSRF Origin 체크(운영은 fail-closed), 로그인 5회 실패 잠금 + 2단계 인증(OTP 앱) 필수 |
| **디자인 시스템** | 3층 토큰(Raw → Semantic → Component) + 역할 토큰, 전체 색 OKLCH |

<div align="right"><sub><a href="#readme-top">↑ 맨 위로</a></sub></div>

---

<sub>02 — SCREENS</sub>

## ✦ 화면

| 홈 · 다크 | 홈 · 라이트 |
|:---:|:---:|
| <img src="docs/images/home-dark.png" alt="홈 다크" width="100%" /> | <img src="docs/images/home-light.png" alt="홈 라이트" width="100%" /> |

| 작업물 · Flow | 작업물 · Grid | 작업물 · Cylinder |
|:---:|:---:|:---:|
| <img src="public/images/screenshots/pc/works-light.png" alt="작업물 Flow" width="100%" /> | <img src="public/images/screenshots/pc/works-grid-dark.png" alt="작업물 Grid" width="100%" /> | <img src="public/images/screenshots/pc/works-cylinder-light.png" alt="작업물 Cylinder" width="100%" /> |
| **작업물 · Fullscreen** | **작업물 · Cinematic** | **작업물 · Split** |
| <img src="public/images/screenshots/pc/works-fullscreen-dark.png" alt="작업물 Fullscreen" width="100%" /> | <img src="public/images/screenshots/pc/works-cinematic-dark.png" alt="작업물 Cinematic" width="100%" /> | <img src="public/images/screenshots/pc/works-split-dark.png" alt="작업물 Split" width="100%" /> |

| 글 목록 | 글 상세 |
|:---:|:---:|
| <img src="docs/images/posts-light.png" alt="글 목록" width="100%" /> | <img src="docs/images/post-detail-light.png" alt="글 상세" width="100%" /> |
| **프로필 (Three.js)** | **소개 — 별자리 지도** |
| <img src="public/images/screenshots/pc/profile-dark.png" alt="프로필" width="100%" /> | <img src="docs/images/about-dark.png" alt="소개 — 별자리 지도" width="100%" /> |
| **디자인 시스템** | **모바일** |
| <img src="docs/images/design-system-light.png" alt="디자인 시스템" width="100%" /> | <img src="docs/images/home-mobile-dark.png" alt="모바일 홈" width="45%" /> |

<sub>글 목록 · 상세 캡처는 레이아웃 확인용 예시 글로 찍었습니다. 소개 페이지는 별자리 지도에서 별을 누르면 그 장으로 가고, 내용은 `content/about/*.md` 에서 빌드 때 만들어집니다.</sub>

<div align="right"><sub><a href="#readme-top">↑ 맨 위로</a></sub></div>

---

<sub>03 — ADMIN</sub>

## ✦ 관리자 · CMS

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/images/readme-dashboard-dark.png" />
  <img src="docs/images/readme-dashboard-light.png" alt="관리자 대시보드" width="100%" />
</picture>

`/admin` 에서 글 · 작업물 쓰기부터 방문 분석, 알림, 외부 서비스 상태, 사이트 설정까지 운영 전부를 다룹니다. 화면마다 어떻게 동작하는지는 **[docs/admin.md](./docs/admin.md)** 에 정리했습니다.

| 트래픽 — 방문 요약 · 유입 경로 · 기기 | 글 목록 — 필터 · 상태 칩 · 선택 작업 |
|:---:|:---:|
| <img src="public/images/screenshots/cms/19-traffic-light.png" alt="트래픽" width="100%" /> | <img src="public/images/screenshots/cms/21-posts-list-light.png" alt="관리자 글 목록" width="100%" /> |
| **알림 — 네 탭, 처리 필요 그룹** | **서비스 호출 기록 — 공급자별 성공 · 실패** |
| <img src="public/images/screenshots/cms/23-notifications-light.png" alt="알림" width="100%" /> | <img src="public/images/screenshots/cms/24-service-log-light.png" alt="서비스 호출 기록" width="100%" /> |
| **갤러리 음성 편집기 — 대본 · 목소리** | **테마 — WCAG 대비 점검** |
| <img src="public/images/screenshots/cms/02-narration-editor-light.png" alt="갤러리 음성 편집기" width="100%" /> | <img src="public/images/screenshots/cms/12-theme-contrast-light.png" alt="대비 점검 표" width="100%" /> |
| **라이브러리 — 여러 개 고르기 · 파일 미리보기** | **외관 — 브랜드 미리보기** |
| <img src="docs/images/settings-library-light.png" alt="설정 라이브러리" width="100%" /> | <img src="docs/images/settings-brand-dark.png" alt="설정 외관 브랜드" width="100%" /> |
| **로그인 — 5회 실패 잠금 · 2단계 인증** | **SEO 점검 — 여섯 항목** |
| <img src="public/images/screenshots/cms/28-login-light.png" alt="관리자 로그인" width="100%" /> | <img src="public/images/screenshots/cms/16-seo-checklist-light.png" alt="SEO 점검" width="100%" /> |

<div align="right"><sub><a href="#readme-top">↑ 맨 위로</a></sub></div>

---

<sub>04 — ARCHITECTURE</sub>

## ✦ 아키텍처

```mermaid
flowchart LR
    V["방문자 · 관리자<br/>브라우저"] --> P["proxy.ts<br/>CSRF Origin 확인 · 블로그 주소 · 세션 갱신"]
    P --> N["Next.js 16 App Router<br/>Server Components · ISR · Route Handlers"]
    N -->|"anon 키 + 세션"| DB[("Supabase Postgres<br/>RLS 4단계 권한")]
    N -->|"service role<br/>집계 · 알림 · 기록"| DB
    N --> ST["Supabase Storage<br/>이미지 · 음성 · 첨부"]
    N --> EXT["외부 공급자<br/>번역 · 요약 · TTS · 커버 · 메일"]
    CRON["pg_cron"] -->|"예약 발행 · 휴지통 정리 · 기록 익명화"| DB
    B["prebuild 생성기"] -.->|"ERD · API 지도 · 소개 콘텐츠"| N
```

- **렌더링.** 페이지는 서버 컴포넌트가 데이터를 읽어 그리고, 글 · 작업물 상세는 ISR 로 캐시합니다. 클라이언트 컴포넌트는 스크롤 · 3D · 편집기처럼 상호작용이 필요한 곳에만 둡니다.
- **데이터와 권한.** 공개 읽기와 로그인한 사용자의 요청은 anon 키와 세션으로 보내고, Postgres RLS 가 owner · admin · author · visitor 네 단계로 행을 거릅니다. 방문 집계 · 알림 · 서비스 기록처럼 사이트 전체를 다루는 일만 서버에서 service role 로 처리합니다.
- **요청 경로.** 모든 요청은 `src/proxy.ts` 를 지납니다. `/api/*` 의 쓰기 요청은 Origin/Referer 가 이 사이트여야 통과하고, 라우트마다 `requireAuth` · `requireRole` 로 권한을 다시 확인합니다([보안](./docs/security.md)).
- **사이트 설정.** `site_settings` 한 행(jsonb)에 코드 기본값과 **다른 부분(delta)만** 저장합니다. 저장할 때의 기본값도 함께 남겨서, 코드 기본값이 바뀌면 어느 키가 어긋났는지 충돌 리스트로 보여 줍니다(`src/lib/settingsDelta.ts`).
- **빌드 때 만드는 것.** `prebuild` 가 `supabase/setup.sql` 로 ERD, 라우트 파일로 API 지도, `content/about/*.md` 로 소개 페이지 데이터를 만듭니다. 문서와 화면이 코드에서 떨어져 낡지 않게 하려는 구조입니다([배포](./docs/deploy.md)).
- **예약 작업.** `pg_cron` 이 예약 발행 · 휴지통 정리 · 오래된 방문 기록의 IP 비우기 · 서비스 기록 정리를 DB 안에서 돌립니다.

#### 쓰기 요청이 거치는 세 겹

```mermaid
sequenceDiagram
    participant B as 브라우저
    participant P as proxy.ts
    participant R as Route Handler
    participant DB as Postgres (RLS)
    B->>P: POST /api/… (세션 쿠키)
    P->>P: Origin/Referer 가 이 사이트인가
    alt 다른 출처 · Origin 없음
        P-->>B: 403
    end
    P->>R: 통과 (세션 갱신)
    R->>R: requireAuth · requireRole
    alt 로그인 안 함 · 역할 부족
        R-->>B: 401 · 403
    end
    R->>DB: anon 키 + 사용자 세션으로 쿼리
    DB->>DB: RLS 정책이 행 단위로 거름
    DB-->>R: 허용된 행만
    R-->>B: 200
```

<div align="right"><sub><a href="#readme-top">↑ 맨 위로</a></sub></div>

---

<sub>05 — CASE STUDIES</sub>

## ✦ 문제 해결 사례

실측 수치는 각 PR 본문에 측정 조건과 함께 남겨 두었습니다.

### 관리자 글 목록 전송량 44MB → 0.9MB · [#974](https://github.com/hyeoniverse/web-portfolio-hyeoniverse/pull/974)

- **문제.** 목록의 표지 동영상 썸네일이 화면에 들어오기만 해도 원본 파일을 통째로 내려받았습니다. 15MB 표지 하나가 한 번 로드에 세 번 요청돼 43MB 가 되었고, 목록 전송량 44MB 의 대부분이었습니다.
- **원인.** `preload="metadata"` 와 `#t=0.1` 로 첫 프레임만 받는 방식은 moov atom 이 파일 앞에 있는 mp4 에서만 쌉니다. Pexels mp4 는 moov 가 파일 끝에 있어 프레임 하나를 그리려고 파일 전체를 받았습니다.
- **해결.** 썸네일을 `preload="none"` 으로 바꾸고 정지 프레임 대신 결정적 그라데이션을 깔았습니다. 마우스를 올렸을 때만 실제로 받아 재생합니다.
- **결과.** 목록 전송량 44MB → 0.9MB, 놀고 있을 때의 mp4 요청 3회 → 0회.

### 관리자 글 목록 LCP 1468ms → 1088ms · [#976](https://github.com/hyeoniverse/web-portfolio-hyeoniverse/pull/976)

- **문제.** 셸(필터 바 · 제목)은 750ms 무렵에 뜨는데 표의 행은 1.45초쯤에야 떠서, 그 사이 빈 스켈레톤만 보였습니다.
- **원인.** 라우트 진입점 `page.tsx` 가 통째로 `"use client"` 라 하이드레이션 → 클라이언트 fetch → 렌더가 직렬로 이어졌습니다.
- **해결.** 첫 목록을 서버에서 읽어 HTML 에 싣고, 필터 · 검색 · 정렬을 바꿀 때만 다시 조회합니다.
- **결과.** LCP 1468ms → 1088ms(3회 중앙값). 임계 경로의 `/api/posts` 왕복이 1회 → 0회가 되었습니다.

### 글 상세 LCP 를 FCP 와 같게 · [#949](https://github.com/hyeoniverse/web-portfolio-hyeoniverse/pull/949)

- **문제.** 커버 이미지를 이미 받아 두었는데도 글 상세의 LCP 가 FCP 보다 0.36~0.38초 늦었습니다.
- **원인.** 커버가 `loading.tsx` 가 만드는 Suspense 경계 안에 있었습니다. React 19.2 는 셸이 먼저 칠해진 뒤 도착한 경계를 첫 칠부터 300ms 가 지난 뒤에 공개합니다.
- **해결.** 커버를 경계 바깥인 상세 경로의 레이아웃에서 그려 셸과 함께 칠하게 했습니다. 레이아웃은 이미 같은 조회를 하고 있어 조회가 늘지 않습니다.
- **결과.** 모바일 느린 4G 에서 LCP 가 매번 FCP 와 같아졌고, LCP 중앙값이 1.86초 → 1.49초로 줄었습니다.

### 편집기 접근성 80 → 96 · [#981](https://github.com/hyeoniverse/web-portfolio-hyeoniverse/pull/981)

- **문제.** 글 편집 페이지의 Lighthouse 접근성 점수가 80, axe 위반이 77노드였습니다.
- **원인.** 아이콘만 있는 툴바 단추가 라벨을 시각 툴팁으로만 써서 스크린리더에 읽을 이름이 없었고(54개), 본문 · 코드 편집 영역에도 이름이 없었습니다. 블록 핸들은 16×22px 로 최소 터치 타깃(24×24)보다 작았습니다.
- **해결.** 단추와 편집 영역에 접근 가능한 이름을 주고, 핸들을 24×24 세로 스택으로 바꿨습니다.
- **결과.** Lighthouse 접근성 80 → 96~97, axe 위반 77노드 → 9노드. 남은 9노드는 저자가 넣은 글자색 · 제목 순서처럼 콘텐츠 쪽 항목입니다.

#### 그 밖의 구현 포인트

| 주제 | 어떻게 풀었나 | 더 보기 |
|:---|:---|:---|
| **권한 · 보안** | proxy 의 CSRF Origin 확인 → 라우트 가드 → RLS 세 겹. 로그인 5회 실패 시 15분 잠금, 관리 화면 · API · RLS 모두 2단계 인증(aal2) 세션만 허용 | [security.md](./docs/security.md) |
| **자동저장** | 같은 기기 초안은 `localStorage`, 다른 기기에서 이어 쓰기는 3초 debounce 로 DB 리비전에 저장. 불러오기 직후의 자동 변경과 10자 미만 변경은 저장하지 않고, 복원은 저장본보다 나중일 때만 적용 | [트러블슈팅 12](./docs/troubleshooting/architecture-data.md) |
| **AI 공급자 대체** | 기능마다(번역 · 요약 · TTS · 커버) 대체 순서를 두고, 같은 원인으로 이어 실패한 공급자는 자동으로 꺼서 요청을 보내지 않는다. 모든 호출은 서비스 기록에 남는다 | `src/lib/ai/health.ts` |
| **디자인 시스템 집행** | Raw → Semantic → Component 3층 토큰. 하드코딩 값은 stylelint 가 막고, 규칙 위반 수는 style-ratchet 기준선으로 늘지 못하게 잠근다 | [design-system.md](./docs/design-system.md) |
| **성능** | LCP 이미지의 우선순위와 스트리밍 공개 지연을 함께 풀고, `:has(:hover)` 처럼 전체 스타일 재계산을 부르는 선택자를 걷어 냈다 | [트러블슈팅 Top 10](./docs/troubleshooting/top10.md) |
| **다국어** | 화면 글은 한 · 영 사전, 콘텐츠는 한 · 영 칸을 따로 두고 비어 있으면 AI 번역으로 채운다. 공개 화면의 즉석 번역은 캐시해 다시 부르지 않는다 | [features.md](./docs/features.md) |

<div align="right"><sub><a href="#readme-top">↑ 맨 위로</a></sub></div>

---

<sub>06 — PROCESS</sub>

## ✦ 만든 과정

<p>
  <a href="https://github.com/hyeoniverse/web-portfolio-hyeoniverse/actions/workflows/ci.yml"><img src="https://github.com/hyeoniverse/web-portfolio-hyeoniverse/actions/workflows/ci.yml/badge.svg?branch=master" alt="CI" /></a>
  <img src="https://img.shields.io/badge/type--coverage-97.93%25%20locked-3178c6?style=flat-square" alt="type-coverage 97.93%" />
  <img src="https://img.shields.io/badge/ESLint%20warnings-locked-4b32c3?style=flat-square" alt="ESLint warnings locked" />
  <img src="https://img.shields.io/badge/commits-Conventional-fe5196?style=flat-square" alt="Conventional Commits" />
</p>

- **2026년 2월부터** 혼자 만들고 운영하고 있습니다. 커밋 3,300여 개, 머지한 PR 980여 개, 닫은 이슈 490여 개입니다(2026-10 기준).
- **작업 흐름.** 할 일은 이슈로 먼저 열고, 브랜치를 따서 PR 로 올립니다. 커밋은 Conventional Commits 를 commitlint 로 검사하고, 버전과 변경 기록은 release-please 가 만듭니다.
- **CI.** PR 마다 타입 검사, ESLint(경고 총량 잠금), Stylelint(토큰 규칙), Vitest, knip(미사용 코드 · 미등록 의존성), type-coverage(97.93% 잠금)를 돌립니다. 매주 한 번 감사 워크플로가 미사용 코드 · 오래된 패키지를 이슈로 정리합니다.
- **테스트.** Vitest 단위 테스트와 Playwright 스모크(데스크톱 · 모바일 · 관리자 · API)를 씁니다([testing.md](./docs/testing.md)).
- **리팩토링.** `src` 가 22만 줄을 넘었을 때 한 번에 한 축만 바꾸는 원칙으로 첫 라운드를 진행했습니다(#388). 안전망 기준선 → 품질 게이트 → 전 라우트 성능 → 구조 조사 → 도메인별 거대 파일 분해 → 규칙 잠금 순서이고, 2026-09-10 에 모두 마쳤습니다([refactoring-guide.md](./docs/refactoring-guide.md)).
- **기록.** 막혔던 문제는 증상 · 원인 · 해결 · 결론으로 [트러블슈팅](./docs/troubleshooting.md)에 64건 남겼습니다. 대표 10건은 번들 다운레벨링으로 브라우저에서만 죽는 정규식, CSS 무효화 범위, LCP 직렬 관문, 전환 덮개와 경로 커밋, 정적 404 하이드레이션 불일치 등입니다.

<div align="right"><sub><a href="#readme-top">↑ 맨 위로</a></sub></div>

---

<sub>07 — STACK</sub>

## ✦ 기술 스택

<p align="center">
  <img src="https://skillicons.dev/icons?i=nextjs,react,ts,supabase,postgres,threejs,vercel,githubactions,vitest&perline=9" alt="Next.js · React · TypeScript · Supabase · PostgreSQL · Three.js · Vercel · GitHub Actions · Vitest" />
</p>

| 분류 | 사용 |
|:---|:---|
| 프레임워크 | Next.js 16 (App Router, Turbopack) · React 19 · TypeScript 6 |
| 스타일 | CSS Modules + CSS 변수 3층 토큰 · stylelint 규칙으로 집행 |
| 애니메이션 | Framer Motion · GSAP · Lenis |
| 3D | Three.js · React Three Fiber · Drei |
| 백엔드 | Supabase (PostgreSQL · Auth · Storage · RLS) |
| 편집기 | Plate.js (Slate) + Markdown · React Flow · Sandpack · CodeMirror 6 · KaTeX |
| 댓글 | 자체 구현(marked + isomorphic-dompurify) 또는 giscus (관리자에서 전환) |
| 음성 | Fish Audio · Google Cloud TTS · Edge TTS (발표 갤러리), Web Speech API (읽어 주기 · 대본 대체) |
| 외부 연동 | Unsplash · Pexels (커버 이미지), DeepL · Google · Gemini · OpenAI · Claude · Groq (번역 · 요약), Resend (메일), NanoBanana · Hugging Face (AI 이미지) |
| 테스트 | Vitest + Testing Library · Playwright 스모크 |

<div align="right"><sub><a href="#readme-top">↑ 맨 위로</a></sub></div>

---

<sub>08 — STRUCTURE</sub>

## ✦ 프로젝트 구조

```
src/
├─ app/                 # App Router
│  ├─ (home) works posts about profile privacy design-system   # 공개 화면
│  ├─ admin/            # 관리자: (auth) 로그인 · (dashboard) 대시보드 · 글 · 작업물 · 설정 · 트래픽 …
│  └─ api/              # Route Handlers (28개 그룹)
├─ components/          # 화면별 컴포넌트 + ui/ 공통 컴포넌트(Button · Modal · Select …)
├─ lib/                 # 서버 · 공용 로직: api/(권한 가드 · 핸들러) · ai/(공급자 상태) · tts · supabase/
├─ hooks/ stores/ utils/ providers/   # 클라이언트 훅 · 전역 상태 · 테마 · 언어 · 사이트 설정
├─ styles/              # tokens/(Raw) · globals/(Semantic · Component) · layers.css
├─ config/              # site.config.ts: 사이트 설정의 코드 기본값
├─ data/generated/      # prebuild 생성물(ERD · API 지도 · 소개 콘텐츠)
├─ locales/             # 한 · 영 화면 글
└─ proxy.ts             # CSRF Origin 확인 · 블로그 주소 라우팅 · 세션 갱신
content/                # .md 원본: posts · works 는 DB 와 동기화, about 은 빌드 때 페이지 데이터로
supabase/               # setup.sql(테이블 26개 · RLS · pg_cron) · 마이그레이션
scripts/                # prebuild 생성기 · 동기화 · 화면 캡처
e2e/                    # Playwright 스모크
docs/                   # 문서 (docs/images: 문서 전용 이미지)
```

처음 읽는다면 이 파일들이 흐름을 잡기 좋습니다.

| 파일 | 내용 |
|:---|:---|
| `src/proxy.ts` | 모든 요청이 지나는 곳. CSRF · 블로그 주소 · 세션 |
| `src/lib/api/requireRole.ts` | 라우트의 권한 확인 |
| `supabase/setup.sql` | 테이블 · RLS 정책 · 예약 작업 전체 |
| `src/lib/getSiteConfig.ts` · `src/lib/settingsDelta.ts` | 코드 기본값 + DB 변경분으로 사이트 설정을 만드는 방법 |
| `src/components/posts/PlateEditor.tsx` · `src/hooks/useEditorAutoSave.ts` | 편집기와 자동저장 |
| `src/lib/ai/health.ts` | AI 공급자 상태 · 자동 끄기 · 대체 순서 |
| `src/styles/tokens/` | 디자인 토큰 Raw 층 |

<div align="right"><sub><a href="#readme-top">↑ 맨 위로</a></sub></div>

---

<sub>09 — QUICK START</sub>

## ✦ 빠른 시작

```bash
npm install
cp .env.example .env.local   # Supabase URL·키 채우기
npm run dev                  # http://localhost:3000
```

> [!IMPORTANT]
> Supabase 프로젝트가 있어야 글 · 작업물 · 관리자가 돕니다. 테이블 생성 SQL, Storage 버킷, 관리자 계정 만들기, 커버 이미지 · 번역 같은 선택 키까지 **[docs/supabase-setup.md](./docs/supabase-setup.md)** 에 순서대로 정리해 두었습니다.

```bash
npm run build          # 프로덕션 빌드
npm test               # 단위 테스트 (Vitest)
npm run test:smoke     # 스모크 e2e (빌드 산출물 필요)
npm run audit:full     # typecheck + eslint + stylelint + knip
npm run sync-all       # content/*.md ↔ DB 동기화 (소개 페이지는 DB 대신 빌드 때 md 에서 만든다)
```

<div align="right"><sub><a href="#readme-top">↑ 맨 위로</a></sub></div>

---

<sub>10 — DOCS</sub>

## ✦ 문서

| 문서 | 내용 |
|:---|:---|
| [기능](./docs/features.md) | 화면별 기능 전체(인터랙션, 작업물, 글, 관리자, 성능, 보안) |
| [관리자 · CMS](./docs/admin.md) | 대시보드 · 트래픽 · 글 관리 · 알림 · 설정 · 갤러리 음성 · 번역 · 테마 화면별 동작 |
| [Supabase 세팅](./docs/supabase-setup.md) | 환경변수, 테이블, Storage, 관리자 계정, 커버 이미지 |
| [배포](./docs/deploy.md) | Vercel, 도메인, 메일, 배포 후 점검 |
| [테스트](./docs/testing.md) | Vitest, 스모크 e2e, admin 세션 준비 |
| [디자인 시스템](./docs/design-system.md) · [결정 기록](./docs/design-system-decisions.md) | 토큰 3층, 축별 규칙과 강제 상태, `@layer` (토큰 값은 [자동 생성 표](./docs/tokens.md)) |
| [트러블슈팅](./docs/troubleshooting.md) | 막혔던 지점과 원인 · 해결 기록 |
| [컴포넌트](./docs/components.md) · [DB 설계](./docs/db-design.md) · [보안](./docs/security.md) · [사용자 흐름](./docs/user-flow.md) | 영역별 상세 |
| [편집기 가이드](./docs/editor-guide.md) · [.md 콘텐츠 안내](./docs/md-content-guide.md) | 편집기 사용법과 글 · 작업물 · 소개 `.md` 작성 규칙 |
| [리팩토링 가이드](./docs/refactoring-guide.md) · [성능 baseline](./docs/perf-baseline.md) · [커밋 컨벤션](./docs/commit-convention.md) | 구조 정리 기록, 번들 기준선, 커밋 규칙 |

커밋은 [Conventional Commits](https://www.conventionalcommits.org/ko/v1.0.0/) 를 따릅니다. 타입 목록과 예시는 **[docs/commit-convention.md](./docs/commit-convention.md)** 에 있습니다.

<div align="right"><sub><a href="#readme-top">↑ 맨 위로</a></sub></div>

---

<div align="center">

**[PolyForm Noncommercial License 1.0.0](./LICENSE)**

자유롭게 사용 · 수정 · 배포할 수 있으나, 상업적 이용은 불가합니다.

<br />

<sub>✦ Made by <a href="https://www.hyeoniverse.com">HYEONIVERSE</a></sub>

</div>
