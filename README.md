<div align="center">

**[English](./README.en.md)** | 한국어

# HYEONIVERSE

Next.js 16 · React 19 · TypeScript 로 만든 개인 포트폴리오입니다.
작업물과 글을 보여주는 공개 화면부터, 그 글을 직접 쓰고 고치는 관리자 화면까지 한 저장소에 들어 있습니다.

[![License](https://img.shields.io/badge/license-PolyForm%20NC%201.0-d40063?style=flat-square)](./LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)

**[www.hyeoniverse.com →](https://www.hyeoniverse.com)**

<br />

<img src="public/images/screenshots/pc/home-dark.png" alt="홈 — 다크" width="100%" />

</div>

---

## 미리보기

### 홈 — 다크 / 라이트

| 다크 | 라이트 |
|:---:|:---:|
| <img src="public/images/screenshots/pc/home-dark.png" alt="홈 다크" width="100%" /> | <img src="public/images/screenshots/pc/home-light.png" alt="홈 라이트" width="100%" /> |

홈 아래쪽은 작업물과 글을 차례로 스크롤로 훑는 구성입니다.

<img src="public/images/screenshots/pc/home-works-dark.png" alt="홈 작업물 섹션" width="100%" />

### 작업물

`?layout=` 쿼리나 관리자 설정으로 여섯 가지 레이아웃을 바꿔 끼웁니다 — Flow(기본) · Grid · Cylinder · Fullscreen · Cinematic · Split.

| Flow | Grid | Cylinder |
|:---:|:---:|:---:|
| <img src="public/images/screenshots/pc/works-light.png" alt="작업물 Flow" width="100%" /> | <img src="public/images/screenshots/pc/works-grid-dark.png" alt="작업물 Grid" width="100%" /> | <img src="public/images/screenshots/pc/works-cylinder-light.png" alt="작업물 Cylinder" width="100%" /> |

<details>
<summary><strong>나머지 레이아웃과 상세 화면</strong></summary>

<br />

| Fullscreen | Cinematic | Split |
|:---:|:---:|:---:|
| <img src="public/images/screenshots/pc/works-fullscreen-dark.png" alt="작업물 Fullscreen" width="100%" /> | <img src="public/images/screenshots/pc/works-cinematic-dark.png" alt="작업물 Cinematic" width="100%" /> | <img src="public/images/screenshots/pc/works-split-dark.png" alt="작업물 Split" width="100%" /> |

<img src="public/images/screenshots/pc/work-detail-light.png" alt="작업물 상세" width="100%" />

</details>

### 글

| 목록 | 상세 |
|:---:|:---:|
| <img src="public/images/screenshots/pc/posts-light.png" alt="글 목록" width="100%" /> | <img src="public/images/screenshots/pc/post-detail-light.png" alt="글 상세" width="100%" /> |

### 프로필 · 소개

| 프로필 (Three.js) | 소개 |
|:---:|:---:|
| <img src="public/images/screenshots/pc/profile-dark.png" alt="프로필" width="100%" /> | <img src="public/images/screenshots/pc/about-light.png" alt="소개" width="100%" /> |

### 편집기 · 디자인 시스템

Plate.js 로 만든 편집기입니다. 위 툴바는 작용 범위별로 묶여 있고, 글을 선택하면 떠오르는 바에서 글자색·배경색을 바로 입힙니다.

| 편집기 | 색 도구 |
|:---:|:---:|
| <img src="public/images/screenshots/pc/editor-light.png" alt="편집기" width="100%" /> | <img src="public/images/screenshots/pc/editor-color-light.png" alt="편집기 색 도구" width="100%" /> |

토큰과 컴포넌트는 `/design-system` 화면에서 바로 확인합니다.

| 디자인 시스템 | 모바일 |
|:---:|:---:|
| <img src="public/images/screenshots/pc/design-system-light.png" alt="디자인 시스템" width="100%" /> | <img src="public/images/screenshots/mobile/home-dark.png" alt="모바일 홈" width="49%" /> |

### 관리자 · CMS

> 아래 그림은 `npx tsx scripts/screenshots-cms.ts` 로 찍습니다(로그인 세션 필요 — [scripts/SCREENSHOTS.md](./scripts/SCREENSHOTS.md)). 번호는 그 스크립트의 장면 번호입니다. 연속 동작(재생 · 미리 듣기 · 녹음 편집 · PPTX 변환 · 번역)은 핵심 구간만 잘라 `.gif` 로 본문에 넣었습니다(원본 `.webm` 은 같은 폴더).

#### 대시보드

`/admin` 첫 화면은 운영 현황 한 장입니다. 위쪽 **빠른 작업**(새 글 · 새 프로젝트 · 설정 · 신고 · 알림 — 대기 중인 신고와 안 읽은 알림 수가 배지로)과 **서비스 호출 기록** 띠(최근 24시간 호출 · 실패 수, 꺼진 공급자)가 있고, **통계** 패널은 총 조회수(지난 7일 대비 변화율 + 스파크라인), 프로젝트 · 게시물의 발행 · 초안 수, 댓글 수를 셉니다. 옆의 도넛은 조회 기준 카테고리 분포입니다.

**일별 조회수**는 기간을 직접 골라(최대 90일) 곡선으로 보고, 아래 달력 히트맵에서 날짜를 누르면 그날의 순위 · 기간 평균 대비 · 같은 요일 대비 · 전일 대비와 그날 많이 본 글이 패널로 열립니다. 그 아래로 **최근 활동**(글 · 프로젝트 · 댓글), **신고 내역**, **인기**(게시물별 조회 · 좋아요 · 댓글, 참여도, 인기 태그), **트래픽** 요약(유입 경로 · 기기 · 30일 방문 · 신규/재방문 · 방문당 조회), 서비스 키 설정 여부가 이어집니다.

| 빠른 작업 · 통계 | 일별 조회수 — 날짜를 눌러 그날 분석 |
|:---:|:---:|
| <img src="public/images/screenshots/cms/17-dashboard-light.png" alt="관리자 대시보드 — 빠른 작업과 통계" width="100%" /> | <img src="public/images/screenshots/cms/18-dashboard-daily-views-light.png" alt="일별 조회수와 달력 히트맵, 선택한 날의 분석 패널" width="100%" /> |

#### 트래픽

방문은 IP 와 날짜로 하루 한 번만 기록하고, 함께 UA(기기 · 브라우저) · referrer · 랜딩 경로 · 국가 · `utm_*` 를 남깁니다. 로그인한 관리자 자신, 크롤러(봇), 운영자가 **내 IP** 로 지정한 주소는 세지 않고, 오늘 방문이 최근 7일 평균의 3배를 넘으면 **방문 급증** 알림을 하루 한 번 만듭니다. 지난 기록의 IP 는 예약 작업이 익명화합니다.

`/admin/traffic` 은 기간(7 · 14 · 30 · 90일)을 바꾸면 페이지 전체가 같이 바뀝니다 — 방문 요약(방문 · 신규 · 재방문 · 방문당 조회, 봇 제외 표시), 일별 방문 추이, 유입 경로, 기기, 국가, 랜딩 페이지, 인기 콘텐츠, 요일 × 시간대 히트맵, UTM 캠페인. **IP 분석**은 마스킹한 IP 별 방문 일수 · 첫/최근 방문 · 국가 · 기기를 보여 주고, 내 IP 로 지정하면 그 뒤 방문은 기록되지 않고 이미 쌓인 것도 집계에서 빠집니다. **UTM 링크 만들기**는 이력서 · LinkedIn · X · 카카오 · 이메일 같은 출처 프리셋으로 `utm_source/medium/campaign` 을 붙인 주소를 만들어 줍니다 — referrer 가 남지 않는 메신저 · PDF 경로도 유입이 구분됩니다.

| 방문 요약 · 추이 · 유입 경로 · 기기 | IP 분석 · UTM 링크 만들기 |
|:---:|:---:|
| <img src="public/images/screenshots/cms/19-traffic-light.png" alt="트래픽 — 기간 선택, 방문 요약, 일별 추이, 유입 경로, 기기" width="100%" /> | <img src="public/images/screenshots/cms/20-traffic-ip-utm-light.png" alt="트래픽 — IP 분석과 UTM 링크 만들기" width="100%" /> |

#### 글 · 작업물 관리

`/admin/posts` · `/admin/works` 목록은 검색 범위(제목+내용 · 제목 · 내용) · 정렬 · 카테고리 · 시리즈 · 연도 필터와 페이지 크기를 위쪽 유리 띠에 두고, 스크롤해도 따라옵니다. 상태 칩을 누르면 그 자리에서 **발행 ↔ 미발행**이 바뀌고, 체크박스 열에서 끌어 여러 행을 고른 뒤 **선택 삭제 · 카테고리 일괄 변경**을 합니다. 발행된 행은 공개 상세로 바로 가는 단추가, 미발행 행은 게시 화면과 똑같이 그리는 **미리보기**가 있습니다. 글은 **예약 발행**(시간이 되면 `pg_cron` 이 발행하고 알림 · 메일)과 상단 고정, **시리즈** 탭(순서 · 묶어서 내보내기)을 갖고, 작업물은 끌기 · 행 번호 클릭 · 행 메뉴(맨앞 · 맨뒤 · 위치)로 순서를 바꾸며 **GitHub 저장소의 README 를 작업물로 불러올** 수 있습니다.

**휴지통**은 soft delete 입니다. 일반 항목은 30일, 인기글(조회 · 좋아요 상위)은 90일 뒤 자동으로 영구 삭제되고, 행마다 남은 기간과 **연장(+30일)** 이 있습니다. 복구는 한 번에, 영구 삭제는 제목을 똑같이 입력해야 합니다. `.md` 는 **업로드**(frontmatter 포함, 새 카테고리는 만들지 물어봄)와 **내보내기**(전체 · 선택 · 개별 · 시리즈) 양쪽으로 오갑니다.

| 글 목록 — 필터 · 상태 칩 · 선택 작업 | 작업물 목록 — 순서 · GitHub 불러오기 · 휴지통 |
|:---:|:---:|
| <img src="public/images/screenshots/cms/21-posts-list-light.png" alt="관리자 글 목록" width="100%" /> | <img src="public/images/screenshots/cms/22-works-list-light.png" alt="관리자 작업물 목록" width="100%" /> |

#### 알림 · 신고 · 댓글 · 서비스 기록

**알림**(`/admin/notifications`)은 전체 · 댓글 · 시스템 · 신고 네 탭으로, 새 댓글 · 답글 · 좋아요 · 댓글 신고 · 권한 요청 · 새 기기 로그인 · 방문 급증과 시스템 알림(로그인 잠금 · 모든 기기 로그아웃 · AI 공급자 실패 · 메일 발송 실패 · 예약 작업 오류 · 설정 변경)을 받습니다. 처리가 필요한 것(권한 요청 · 새 기기)은 따로 묶이고, 알림을 눌러 넘어간 항목은 다음 조작 전까지 천천히 깜빡여 어디로 왔는지 알려 줍니다. **신고** 탭은 대기 · 처리됨 · 반려로 걸러 원본 댓글로 가거나 그 자리에서 댓글을 지웁니다. **댓글 관리**(`/admin/comments`)는 글과 작업물 댓글을 한 표에 모아 활성 · 삭제됨으로 거르고, 여러 개를 골라 지우거나 지운 댓글을 복구합니다.

**서비스 호출 기록**(`/admin/service-log`)은 AI(번역 · 요약 · TTS · 커버) · 이미지 검색 · Resend 메일 · GitHub API · 예약 작업 · 문의 첨부의 성공 · 실패를 새것부터 보입니다. 위에는 공급자 · 작업마다 성공 · 실패 수와 마지막 실패 원인(키 없음 · 한도 · 결제 · 서버 오류 …), 아래에는 기록 줄이고, 종류 · 공급자 · 결과로 거릅니다. 설정 › 서비스의 상태 패널과 대시보드에서 걸러진 채로 들어옵니다(`?provider=gemini` · `?result=fail`).

| 알림 — 네 탭, 처리 필요 그룹 | 서비스 호출 기록 — 공급자별 성공 · 실패 |
|:---:|:---:|
| <img src="public/images/screenshots/cms/23-notifications-light.png" alt="알림 페이지" width="100%" /> | <img src="public/images/screenshots/cms/24-service-log-light.png" alt="서비스 호출 기록" width="100%" /> |

<img src="public/images/screenshots/cms/25-comments-light.png" alt="댓글 관리 — 글 · 작업물 댓글 통합" width="100%" />

#### 설정

`/admin/settings` 는 여섯 탭입니다 — **일반**(개인 정보 · 브랜드와 로고 · SEO · 배경 음악), **콘텐츠**(홈의 히어로 · 인트로 · 작업물 묶음 · 마퀴 · 푸터 · 소셜 · 배너, 페이지네이션, 태그 · 카테고리, 작업물 인트로 영상, 그리고 PROFILE · ABOUT 서브탭 — ABOUT 은 실제 페이지 위에서 고치는 About Studio), **라이브러리**(달력 · 투표 · 커스텀 이모지 · 커버 이미지 기록 · 업로드한 파일), **외관**(디자인 시스템 미리보기 · 테마 색상 · 날짜 선택 스타일 · 타이포그래피와 폰트 업로드), **서비스**(기능별 공급자 우선순위 · 이메일 · 댓글 시스템과 giscus · 보안 · 업로드 형식과 크기 한도 · 공급자 상태 패널 · 환경 변수), **계정**(인증 · 이메일 변경 · 비밀번호 정책, 등록된 기기와 **모든 기기 로그아웃**, 멤버와 역할 — 소유자 · 관리자 · 저자).

저장은 탭 전체 또는 섹션 하나씩이고, 되돌리기와 코드 기본값이 있습니다. 비울 수 없는 값(사이트 제목 · 이름 · 테마 색 다섯 · 멤버 이름, giscus 를 고르면 저장소 정보)은 UI · API · DB 세 겹에서 막고, 코드 기본값이 바뀐 뒤에는 **충돌 리스트**가 섹션별로 새 값을 보여 주어 골라 반영합니다.

| 라이브러리 — 달력 · 투표 · 이모지 · 커버 · 파일 | 계정 — 보안 / 세션, 등록된 기기, 멤버 |
|:---:|:---:|
| <img src="public/images/screenshots/cms/26-settings-library-light.png" alt="설정 라이브러리 탭" width="100%" /> | <img src="public/images/screenshots/cms/27-settings-account-light.png" alt="설정 계정 탭" width="100%" /> |

#### 로그인과 보안

소유자는 이메일 · 비밀번호로, 초대받은 멤버는 **GitHub 로 로그인**합니다(OAuth 는 인증만 하고, 서버가 소유자 · 기존 역할 · 초대 행을 확인한 뒤에야 들여보냅니다). 5회 틀리면 15분 잠기고 남은 횟수와 카운트다운이 보입니다. 처음 보는 기기는 자동으로 로그아웃하고 이메일로 승인 링크(24시간)를 보내며, 한 탭에서 로그아웃하면 열린 탭이 모두 함께 나갑니다.

<img src="public/images/screenshots/cms/28-login-light.png" alt="관리자 로그인 — 이메일 · 비밀번호와 GitHub 로그인" width="60%" />

#### 발표 갤러리와 음성

작업물 상세의 슬라이드 갤러리는 장마다 **음성과 자막**을 붙일 수 있습니다. 음성은 미리 만든 파일(TTS · 녹음)을 먼저 틀고, 없으면 대본을 브라우저 음성으로 읽고, 둘 다 없으면 4초 뒤 넘어갑니다. 자막은 대본에서 글자 비율로 잘라 음성에 맞춰 나오고, 아래 진행 막대는 장마다 한 칸씩 채워집니다. 브라우저가 소리를 막으면 "음성과 함께 보기 / 음성 없이 보기"를 먼저 묻습니다.

<img src="public/images/screenshots/cms/01-gallery-captions-light.png" alt="작업물 상세 — 갤러리 재생 중, 자막 켜짐" width="100%" />

<img src="public/images/screenshots/cms/01-gallery-playing-light.gif" alt="음성에 맞춰 자막이 바뀌는 모습" width="100%" />

<sub>▶ 재생 중 — 음성에 맞춰 자막이 바뀌고 진행 막대가 채워집니다 · 🔊 소리까지 들으려면 [mp4 로 보기](public/images/screenshots/cms/01-gallery-playing-light.mp4) (갤러리가 실제로 트는 TTS 음성을 입힌 27초)</sub>

관리자 작업물 편집기의 **갤러리 음성 편집기**는 작업대(왼쪽 슬라이드 · 오른쪽 대본)와 아래 썸네일 줄로 되어 있습니다. 썸네일을 누르면 그 장이 작업대에 올라오고, 음성이 있는 장은 스피커, 대본만 있는 장은 글줄 표시가 붙습니다. 조작 막대에는 장 이동, 음성 이력, 녹음하기, 녹음 올리기, 음성 지우기, 대본 편집(지금 대본이 장 번호 제목으로 채워져 있어 고치거나 통째로 붙여 넣는다), 대본 번역, 읽기 사전이 있고, 오른쪽 끝에서 목소리(공급자 · 성별 · 톤)를 고른 뒤 **음성 만들기**를 누릅니다. 긴 대본은 600자 안팎으로 잘라 만든 뒤 하나로 합치고, 고른 공급자가 실패하면 설정의 대체 순서(Fish Audio → Google Cloud TTS → Edge)대로 같은 성별 목소리로 넘어갑니다. 미리 들을 때는 대본이 **가사처럼** 글자 단위로 채워지고, 낱말을 누르면 그 자리로 건너뜁니다.

| 대본 · 목소리 · 음성 만들기 | 미리 듣기 — 가사처럼 강조 |
|:---:|:---:|
| <img src="public/images/screenshots/cms/02-narration-editor-light.png" alt="갤러리 음성 편집기" width="100%" /> | <img src="public/images/screenshots/cms/03-narration-preview-light.png" alt="미리 듣기 — 대본 강조" width="100%" /> |

<img src="public/images/screenshots/cms/03-narration-preview-light.gif" alt="미리 듣기 — 재생을 따라 대본이 채워지는 모습" width="100%" />

<sub>▶ 미리 듣기 — 재생을 따라 대본이 가사처럼 채워집니다</sub>

**읽기 사전**은 `?all=true → 올 트루 조건` 처럼 대본 표기와 읽을 말을 짝지어 둡니다. 음성을 만들 때만 가장 긴 표기부터 바꿔 읽고, 자막은 원래 표기를 그대로 둡니다. 한국어 · 영어 대본에 사전이 따로 있고, 대본 안의 `[표기|읽을 말]` 이 사전보다 먼저입니다. 여러 줄을 `표기 = 읽을 말` 꼴로 붙여 넣어 한 번에 넣을 수도 있습니다.

**녹음 파형 편집기**는 마이크로 녹음한 뒤 파형을 눌러 커서를 두거나 끌어 구간을 고르고, 나누기 · 잘라내기 · 복사 · 붙여넣기 · 지우기 · 선택만 남기기 · 앞뒤 무음 자르기로 클립을 다듭니다(되돌리기 · 다시 하기 포함). 클립은 끌어서 순서를 바꾸고, 다른 장에 붙일 수도 있습니다. 완료하면 WAV 로 올라가 그 장의 음성이 됩니다(최대 6분).

| 읽기 사전 | 녹음 편집 — 구간 선택, 클립 나누기 |
|:---:|:---:|
| <img src="public/images/screenshots/cms/04-lexicon-light.png" alt="읽기 사전" width="100%" /> | <img src="public/images/screenshots/cms/05-recording-editor-light.png" alt="녹음 파형 편집기" width="100%" /> |

<img src="public/images/screenshots/cms/05-recording-split-light.gif" alt="녹음 → 구간 선택 → 나누기까지" width="100%" />

<sub>▶ 녹음 → 파형에서 구간 선택 → 나누기</sub>

**PPTX 를 갤러리에 끌어 놓으면** 브라우저 안에서 장마다 그림(JPEG, 최대 1600px)으로 그려 올리고, 각 장의 **발표자 노트는 그 장의 대본**으로 들어갑니다. 갤러리 제목 줄에 "파일 이름 — n/N쪽 그리는 중" 진행이 보이고, 끝나면 썸네일마다 대본 표시가 붙습니다. PDF 도 같은 길로 들어옵니다.

| 변환 중 — "n/N쪽 그리는 중" | 끝난 뒤 — 노트가 대본으로 들어간 장 |
|:---:|:---:|
| <img src="public/images/screenshots/cms/06-pptx-progress-light.png" alt="PPTX 변환 진행" width="100%" /> | <img src="public/images/screenshots/cms/07-pptx-thumbnails-light.png" alt="변환이 끝난 갤러리 썸네일" width="100%" /> |

<img src="public/images/screenshots/cms/06-pptx-import-light.gif" alt="PPTX 를 떨어뜨린 뒤 장마다 그려져 들어오는 모습" width="100%" />

<sub>▶ PPTX 를 떨어뜨리면 장마다 그려져 썸네일로 들어옵니다</sub>

#### 자동 번역과 AI 요약

편집기 위쪽의 KO/EN 스위치를 **EN 으로 바꾸면** 원문이 있고 영어 칸이 모두 비어 있을 때 제목 · 부제목 · 설명 · 본문 · 갤러리 대본까지 한 번에 채웁니다. 영어 칸이 일부 차 있으면 스위치 옆 **재번역** 단추에서 범위(전체 · 부제목 · 설명 · 본문 · 갤러리 대본)를 골라 다시 받습니다. 번역은 폼에만 들어오고 저장을 눌러야 남습니다. 공급자는 **설정 › 서비스**에서 기능마다(번역 · AI 요약 · TTS · AI 커버) 기본 공급자와 대체 순서를 정하고, 같은 원인으로 거듭 실패한 공급자는 상태 패널이 잠시 꺼 둡니다(아래 그림의 "실패 중 · 꺼짐" 배지).

| 편집기 — 재번역 › 전체로 영어 칸이 채워진 뒤 | 설정 › 서비스 — 공급자와 대체 순서 |
|:---:|:---:|
| <img src="public/images/screenshots/cms/08-translate-editor-light.png" alt="편집기 자동 번역" width="100%" /> | <img src="public/images/screenshots/cms/09-settings-services-light.png" alt="설정 서비스 탭" width="100%" /> |

<img src="public/images/screenshots/cms/08-translate-editor-light.gif" alt="번역 중 띠가 뜨고 영어 칸이 채워지는 모습" width="100%" />

<sub>▶ EN 으로 바꾸고 재번역 › 전체 — "번역 중…" 띠가 뜬 뒤 영어 칸이 채워집니다</sub>

공개 화면에서는 보는 언어의 본문이 없으면 **번역 배너**가 뜨고, 단추 하나로 그 자리에서 AI 번역을 받아 봅니다(글 · 작업물 상세 공통). 상세 위쪽의 **AI 요약** 상자는 발행할 때 만든 한국어 · 영어 요약을 보는 언어로 펼쳐 보여 주고, 접을 수 있습니다.

<img src="public/images/screenshots/cms/10-translate-banner-light.png" alt="번역 배너 — 영어 본문이 없는 작업물을 EN 으로 볼 때" width="100%" />

#### 테마

**설정 › 외관 › 테마 색상**에서 강조색과 라이트 · 다크의 배경 · 글자색 다섯을 정합니다. 프리셋 18종(Default · Ruby · Meadow · Coral · Azure · Sand · Harvest · Honey · Forest · Rosewood · Dusk · Arctic · Baltic · Sorbet · Twilight · Tropica · Petal · Slate)은 강조색끼리 ΔE 20 이상 떨어뜨려 두었고, 지금 고른 다섯 색은 **+** 로 내 프리셋으로 저장해 둘 수 있습니다. 색을 고르면 **대비 점검(WCAG)** 표가 라이트 · 다크에서 본문 · 흐린 글자 · 강조 링크 · 강조색 그래픽 · 버튼 글자의 대비와 링크↔본문 색 차이를 바로 셉니다. 강조색이 글자로 쓰일 때는 사이트가 명도만 옮겨 4.5:1 을 맞추고, 표에는 "자동 보정"으로 표시됩니다.

| 프리셋 목록 | 대비 점검 |
|:---:|:---:|
| <img src="public/images/screenshots/cms/12-theme-presets-light.png" alt="테마 프리셋" width="100%" /> | <img src="public/images/screenshots/cms/12-theme-contrast-light.png" alt="대비 점검 표" width="100%" /> |

**색 조합 추천**은 색상환(유사색 · 보색 · 분할 보색 · 삼각 · 단색)으로 뽑거나, 이미지를 올려 그 안의 색 여섯을 뽑아 후보로 만듭니다. 이미지는 브라우저 안에서만 읽고 올리지 않습니다.

| 색상환 추천 | 이미지에서 색 뽑기 |
|:---:|:---:|
| <img src="public/images/screenshots/cms/13-theme-wheel-light.png" alt="색상환 추천" width="100%" /> | <img src="public/images/screenshots/cms/13-theme-from-image-light.png" alt="이미지에서 색 뽑기" width="100%" /> |

같은 홈을 프리셋만 바꿔 본 모습입니다 — Arctic · Rosewood · Meadow 를 라이트와 다크로. 배경 · 글자 · 강조색 다섯 값만 바뀌고 나머지 무채색 단계는 그 값에서 사이트가 계산합니다.

<img src="public/images/screenshots/cms/14-home-presets-light.png" alt="홈 — Arctic · Rosewood · Meadow (라이트)" width="100%" />

<img src="public/images/screenshots/cms/14-home-presets-dark.png" alt="홈 — Arctic · Rosewood · Meadow (다크)" width="100%" />

#### 글과 작업물 잇기 · SEO 점검

작업물에는 관련 글 · 시리즈를, 글에는 관련 프로젝트를 검색해 붙입니다. 목록에는 번호 · 썸네일 · 연도가 함께 보이고 미발행 항목은 Draft 로 표시됩니다. 고른 칩은 끌어 순서를 바꾸고, 공개 상세의 정보 칸에 그대로 나옵니다. 편집기 오른쪽 아래 **SEO 점검** 알약은 제목 · 슬러그 · 요약(30자 이상) · 커버 · 카테고리 · 태그 여섯을 세어 "5/6" 처럼 보여 주고, 펼치면 보완할 항목과 완료한 항목이 나뉘어 나오며 항목을 누르면 그 칸으로 데려가 깜빡여 줍니다.

| 관련 프로젝트 연결 — 글 편집기 | SEO 점검 |
|:---:|:---:|
| <img src="public/images/screenshots/cms/15-relation-picker-light.png" alt="관련 프로젝트 고르기" width="100%" /> | <img src="public/images/screenshots/cms/16-seo-checklist-light.png" alt="SEO 점검 패널" width="100%" /> |

---

## 한눈에 보기

| 영역 | 핵심 |
|:---|:---|
| **인터랙션** | 무한 스크롤 루프, 마우스 패럴랙스, StaggerText, Three.js 3D 커피잔, 방향별 Scroll Cascade |
| **작업물** | 여섯 가지 레이아웃(Flow · Fullscreen · Cinematic · Grid · Split · Cylinder), 상세 페이지 |
| **글** | SSR + ISR, 시리즈, 배너 슬라이더, 여섯 가지 목록 레이아웃, 게스트 댓글(마크다운 + 이모지 반응) 또는 giscus |
| **관리자** | 대시보드(통계 · 일별 조회 · 인기 · 신고 · 서비스 상태) · 트래픽 분석(유입 · 기기 · 국가 · 랜딩 · IP · UTM) · 알림 · 서비스 호출 기록, Plate.js 편집기(다이어그램 · 코드 플레이그라운드 · 수식 블록, 색 도구, 발행 상태 전환), `.md` 동기화, AI 번역·요약, 발표 갤러리 음성(TTS · 녹음 · PPTX 발표자 노트), 테마 프리셋 + WCAG 대비 점검, 리비전 히스토리, 멤버 초대와 역할 |
| **성능** | Lighthouse 98 — LCP 1.9s, 초기 번들 449KB |
| **보안** | RLS 4단계 권한, CSRF Origin 체크(운영은 fail-closed), 로그인 5회 실패 잠금 + 새 기기 메일 승인 |
| **디자인 시스템** | 3층 토큰(Raw → Semantic → Component) + 역할 토큰, 전체 색 OKLCH |

---

## 기술 스택

| 분류 | 사용 |
|:---|:---|
| 프레임워크 | Next.js 16 (App Router, Turbopack) · React 19 · TypeScript 5 |
| 스타일 | CSS Modules + CSS 변수 3층 토큰 · stylelint 규칙으로 집행 |
| 애니메이션 | Framer Motion · GSAP · Lenis |
| 3D | Three.js · React Three Fiber · Drei |
| 백엔드 | Supabase (PostgreSQL · Auth · Storage · RLS) |
| 편집기 | Plate.js (Slate) + Markdown · React Flow · Sandpack · CodeMirror 6 · KaTeX |
| 댓글 | 자체 구현(marked + isomorphic-dompurify) 또는 giscus — 관리자에서 전환 |
| 외부 연동 | Unsplash · Pexels (커버 이미지), DeepL · OpenAI 등 (번역), Resend (메일), NanoBanana · Hugging Face (AI 이미지) |
| 테스트 | Vitest + Testing Library · Playwright 스모크 |

---

## 빠른 시작

```bash
npm install
cp .env.example .env.local   # Supabase URL·키 채우기
npm run dev                  # http://localhost:3000
```

Supabase 프로젝트가 있어야 글·작업물·관리자가 돕니다. 테이블 생성 SQL, Storage 버킷, 관리자 계정 만들기, 커버 이미지·번역 같은 선택 키까지 **[docs/supabase-setup.md](./docs/supabase-setup.md)** 에 순서대로 정리해 두었습니다.

자주 쓰는 명령:

```bash
npm run build          # 프로덕션 빌드
npm test               # 단위 테스트 (Vitest)
npm run test:smoke     # 스모크 e2e (빌드 산출물 필요)
npm run audit:full     # typecheck + eslint + stylelint + knip
npm run sync-all       # content/*.md ↔ DB 동기화
```

---

## 문서

| 문서 | 내용 |
|:---|:---|
| [기능](./docs/features.md) | 화면별 기능 전체 — 인터랙션, 작업물, 글, 관리자, 성능, 보안 |
| [Supabase 세팅](./docs/supabase-setup.md) | 환경변수, 테이블, Storage, 관리자 계정, 커버 이미지 |
| [배포](./docs/deploy.md) | Vercel, 도메인, 메일, 배포 후 점검 |
| [테스트](./docs/testing.md) | Vitest 목록, 스모크 e2e, admin 세션 준비 |
| [디자인 시스템](./docs/design-system.md) | 토큰 3층, 축별 규칙과 강제 상태, `@layer`·이행 계획 (토큰 값은 [자동 생성 표](./docs/tokens.md)) |
| [트러블슈팅](./docs/troubleshooting.md) | 막혔던 지점과 원인·해결 기록 |
| [컴포넌트](./docs/components.md) · [DB 설계](./docs/db-design.md) · [보안](./docs/security.md) · [사용자 흐름](./docs/user-flow.md) | 영역별 상세 |
| [편집기 가이드](./docs/editor-guide.md) · [글](./docs/md-posts-guide.md) · [작업물](./docs/md-works-guide.md) · [소개](./docs/md-about-guide.md) | 편집기 사용법과 `.md` 작성 규칙 |
| [리팩토링 가이드](./docs/refactoring-guide.md) · [성능 baseline](./docs/perf-baseline.md) | 구조 정리 기록과 성능 기준선 |

---

## 프로젝트 구조

```
src/
├─ app/           # App Router — (home) · works · posts · about · profile · admin · api
├─ components/    # 화면별 컴포넌트 + ui/ 공통 컴포넌트
├─ styles/        # tokens/ (Raw) · globals/ (Semantic · Component)
├─ providers/     # 테마 · 언어 · 스크롤
├─ lib/ hooks/ stores/ utils/
└─ locales/       # 한국어 · 영어
content/          # .md 원본 (posts · works · about) — sync 스크립트로 DB 왕복
docs/             # 문서
e2e/ scripts/     # 스모크 테스트 · 동기화와 스크린샷 스크립트
supabase/         # 마이그레이션 SQL
```

---

## 커밋 컨벤션

[Conventional Commits](https://www.conventionalcommits.org/ko/v1.0.0/) 를 따릅니다. 타입 목록과 예시는 **[docs/commit-convention.md](./docs/commit-convention.md)** 에 있습니다.

---

<div align="center">

## 라이선스

[PolyForm Noncommercial License 1.0.0](./LICENSE)

자유롭게 사용·수정·배포할 수 있으나, **상업적 이용은 불가**합니다.

</div>
