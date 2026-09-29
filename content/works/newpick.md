---
title: "NewPick"
title_en: "NewPick"
slug: newpick
subtitle: "관심 분야만 골라 AI 가 요약해 주는 맞춤형 뉴스레터 서비스"
subtitle_en: "A personalized newsletter where AI summarizes the news in the fields you pick"
category: 웹앱
category_en: Web App
nature: 부트캠프 프로젝트
nature_en: Bootcamp Project
order: 7
year: 2024
tech: [Next.js 15, React 19, TypeScript, styled-components, React Query, Zustand, NestJS, Prisma, MySQL, OpenAI API, Vercel, AWS EC2]
description: "관심 분야를 고르면 최신 뉴스를 수집해 OpenAI 로 요약한 뉴스레터를 웹과 이메일로 받아 보는 서비스입니다. 프로그래머스 데브코스 최종 프로젝트로 5인 팀이 6주 동안 만들었습니다."
description_en: "Pick your interests and get the latest news, collected and summarized with OpenAI, as a newsletter on the web and by email. Built in six weeks by a team of five as a Programmers DevCourse final project."
role: "기획 · 프론트엔드 셋업 · 유저 인증 · API 연동 · 릴리스 관리"
role_en: "Planning · Frontend setup · Authentication · API integration · Release management"
image: https://rqebkijkxkvsiyhdtvui.supabase.co/storage/v1/object/public/posts/posts/97cc84a3-74af-443d-ac84-3e4fa8d26640.jpg
live_url: https://newpick-tan.vercel.app
github_url: https://github.com/Devcourse-NewPick
---

![NewPick 홈: AI 뉴스레터 서비스](/content/works/newpick/newpick_main.jpg)

## 한눈에 보기

| 항목 | 내용 |
| --- | --- |
| 기간 | 2024.12.26 ~ 2025.02.05 (6주) |
| 인원 | 5인 (프론트엔드 2, 백엔드 3) |
| 역할 | 기획, 프론트엔드 초기 구성, 유저 인증, API 연동, 릴리스 관리 |
| 기여 | 프론트엔드 저장소 커밋 약 280개 (전체의 약 75%) |
| 과정 | 프로그래머스 데브코스 「타입스크립트로 함께하는 웹 풀 사이클 개발」 최종 프로젝트 |

> [!TIP]
> 5인 팀에서 프론트엔드 커밋의 약 75% 를 맡아 인증 흐름과 API 연동을 이끌고, 3주 동안 21개 버전을 배포했습니다.

## 개요

뉴스는 많고 읽을 시간은 부족합니다. NewPick 은 관심 있는 분야만 고르면, 그 분야의 최신 뉴스를 모아 AI 가 요약한 뉴스레터를 보내 주는 서비스입니다. 분야는 IT, 정치, 경제, 사회, 생활, 세계 여섯 가지입니다.

서버는 매일 아침 뉴스를 수집해 OpenAI 로 요약하고, 매주 월요일 구독자에게 이메일로 발송합니다. 웹에서는 카테고리별 뉴스레터와 상세 기사, 북마크, 구독 관리를 제공합니다. 프론트엔드는 Next.js, 백엔드는 NestJS 와 Prisma 로 만들었습니다.

## 주요 기능

- **Google 로그인** 과 쿠키 기반 인증
- **카테고리별 뉴스레터** 목록과 상세 페이지. 상세에서는 관련 기사를 링크 미리보기 카드로 보여 줍니다.
- **구독 관리** 관심 분야를 골라 구독하고, 마이페이지에서 오늘의 뉴스레터를 보고 구독을 켜고 끕니다.
- **AI 뉴스레터 체험** 가입하지 않아도 관심 분야를 골라 AI 요약을 미리 받아 봅니다.
- **북마크**, 조회수, 다크 모드와 모바일·태블릿 반응형

![카테고리별로 요약된 뉴스레터](/content/works/newpick/about_send.jpg)

![구독자에게 발송되는 요약 메일](/content/works/newpick/about_newsletter-mail.jpg)

## 맡은 일

- 서비스 기획과 함께 이슈·PR 템플릿을 먼저 만들었습니다. 같은 템플릿을 백엔드 저장소에서도 썼습니다.
- React 로 시작한 프로젝트를 **Next.js 로 전환** 하고, 레이아웃과 공통 컴포넌트의 뼈대를 만들었습니다. 이후 첫 화면의 데이터는 서버에서 불러오게 바꿨습니다.
- Google 로그인, 로그인이 필요한 페이지의 접근 제한, 로그인 방식을 팝업에서 리다이렉트로 바꾸는 작업까지 **인증 흐름** 을 맡았습니다.
- 구독, AI 체험, 조회수, 사용자 API 호출 모듈을 만들고, 홈·카테고리·상세·마이페이지를 실제 데이터에 연결했습니다.
- 백엔드에도 오늘의 트렌드 조회 엔드포인트, 구독 시작 시 관심사를 함께 저장하는 흐름, 정렬 없는 조회의 페이지네이션을 추가했습니다.
- `develop` 에서 `main` 으로 합치는 **릴리스 PR** 을 대부분 맡아, v1.0.0 부터 v1.3.7 까지 21개 버전을 배포했습니다.

## 기술적 도전

### 새로고침하면 풀리던 로그인과 끝나지 않던 로딩

**증상** 로그인한 상태에서 페이지를 새로고침하면 사용자 정보가 비어 로그아웃된 것처럼 보였습니다. 로그인하지 않은 방문자에게는 로딩 화면이 끝나지 않는 경우가 있었습니다.

**원인** 사용자 정보를 클라이언트 상태에만 들고 있어 새로고침하면 초기화됐습니다. 또 사용자 정보가 없는 상태에서도 사용자 정보, 북마크, 구독 조회가 실행돼, 인증 쿠키가 없는 방문자는 실패한 요청을 기다리며 로딩에 머물렀습니다.

**해결** 초기 사용자 데이터를 서버에서 불러오게 바꾸고, 쿠키가 없을 때의 분기를 따로 처리했습니다. 사용자에 딸린 조회는 React Query 의 `enabled: !!user` 조건으로 로그인한 경우에만 실행되게 하고, 자주 바뀌지 않는 조회에는 5분 캐시를 두었습니다.

**결론** 새로고침해도 로그인 상태가 유지되고, 비로그인 방문자는 불필요한 요청 없이 바로 화면을 봅니다. 서버 상태 라이브러리를 쓰더라도 언제 요청할지는 직접 조건으로 정해야 한다는 점을 확인했습니다.

### 서버와 브라우저의 화면이 달라 생긴 하이드레이션 오류

**증상** Next.js 로 전환한 뒤 여러 화면에서 서버가 그린 HTML 과 브라우저가 그린 결과가 다르다는 하이드레이션 오류가 났습니다.

**원인** 링크 안에 버튼을 넣은 잘못된 구조와, 브라우저에서만 알 수 있는 값으로 첫 화면을 바꾸는 코드가 원인이었습니다.

**해결** 버튼을 링크 밖으로 옮겨 구조를 바로잡고, 브라우저 전용 값은 컴포넌트가 화면에 붙은 뒤에 읽도록 바꿨습니다. 처음에는 서버 렌더링을 끄는 방식으로 막았다가, 서버 렌더링의 이점을 살리기 위해 마운트 여부로 분기하는 방식으로 다시 고쳤습니다.

**결론** 오류 없이 서버에서 그린 첫 화면을 그대로 이어 쓰게 됐습니다.

## 돌아보며

6주 중 앞의 열흘가량을 주제 선정, 기능 정의, 와이어프레임, 디자인에 썼습니다. 이슈·PR 템플릿을 먼저 정해 두니, 이후 한 달 동안 5명이 두 저장소에서 작업해도 PR 흐름이 흔들리지 않았고 짧은 주기로 21개 버전을 배포할 수 있었습니다. 프론트엔드를 맡았지만 필요한 조회가 없을 때는 백엔드에 직접 엔드포인트를 더하며 경계를 넘어 일하는 방법도 익혔습니다.
