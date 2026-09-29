---
title: "QRU"
title_en: "QRU"
slug: qru
subtitle: "QR 코드 하나로 나를 소개하는 디지털 명함, 서버 없이 Firebase 로 만든 웹앱"
subtitle_en: "A digital business card shared with a single QR code, built on Firebase without a server"
category: 웹앱
category_en: Web App
nature: 사이드 프로젝트
nature_en: Side Project
order: 9
year: 2024
tech: [React, TypeScript, Vite, styled-components, Redux Toolkit, React Query, Firebase, Firestore, Firebase Auth, Firebase Hosting, GitHub Actions, Playwright]
description: "\"QR\" 과 \"Who Are You\" 를 합친 이름의 디지털 명함 웹앱입니다. 자기 소개를 입력하면 QR 코드가 담긴 명함이 만들어지고, 링크나 QR 로 공유하거나 다른 사람의 공개 명함을 무작위로 둘러볼 수 있습니다."
description_en: "A digital business card web app named after \"QR\" and \"Who Are You\". Enter a few details to get a card with a QR code, share it by link or QR, or browse other people's public cards at random."
role: "1인 개발 · 기획 · 프론트엔드 · Firebase 설계와 보안 규칙 · 배포"
role_en: "Solo · Planning · Frontend · Firebase design and security rules · Deployment"
image: /content/works/qru/home.jpg
live_url: https://qryou-app.web.app
github_url: https://github.com/hyeoniverse/QRU
---

![QRU 홈](/content/works/qru/home.jpg)

## 한눈에 보기

| 항목 | 내용 |
| --- | --- |
| 기간 | 2024.12 (설계와 기반), 2026.09 (핵심 기능 완성) |
| 인원 | 1인 |
| 역할 | 기획, 프론트엔드, Firebase 데이터 설계와 보안 규칙, 배포 자동화 |
| 규모 | 커밋 207개 |
| 배포 | Firebase Hosting, [qryou-app.web.app](https://qryou-app.web.app) |

> [!TIP]
> 서버 없이 Firestore 보안 규칙만으로 공개 범위를 지키고, 필터를 늘릴 때마다 두 배로 늘던 복합 색인을 0개로 만들었습니다.

## 개요

QRU 는 "QR" 과 "Who Are You" 를 합친 이름입니다. 이름, 한 줄 소개, 이메일, SNS, MBTI, 취미 같은 정보를 입력하면 QR 코드가 담긴 디지털 명함이 만들어집니다. 명함은 링크와 QR 이미지로 공유하고, 공개로 설정한 명함은 다른 사람이 무작위로 둘러볼 수 있습니다.

별도 서버 없이 Firebase 만으로 만들었습니다. 데이터는 Firestore 에, 로그인은 Firebase Authentication 에 맡기고, 접근 제어는 전부 Firestore 보안 규칙으로 처리합니다. 2024년 12월에 설계와 기반을 만들고, 2026년 9월에 명함 조회, 공유, 둘러보기, 보안 규칙을 더해 완성했습니다.

## 주요 기능

- **명함 만들기** 기본 항목에 추가 항목을 최대 5개까지 더할 수 있고, 취미 같은 항목에는 추천 값을 칩으로 보여 줍니다. 항목마다 공개 여부를 따로 정합니다.
- **사진** 위치와 크기를 편집하고, 긴 변 512px, 150KB 이하로 줄여 저장합니다.
- **공유** 명함 주소(`/cards/{id}`)와 QR PNG 다운로드, 링크 복사, 일련번호(예: `7K3FM-9P2XR`) 복사를 지원합니다. 헤더 검색에 일련번호를 넣으면 그 명함으로 갑니다.
- **내 명함 관리** 목록에서 수정과 삭제를 하고, 수정해도 주소, QR, 일련번호는 그대로 유지됩니다.
- **명함 찾기** 공개 명함 5장을 무작위로 뽑고, 공개된 항목 조건으로 거르거나 부분 일치로 검색합니다.
- **개인정보 보호** 명함과 찾기 페이지는 검색 엔진에 색인되지 않게 막았습니다. 다크 모드와 모바일, 태블릿, 데스크톱 레이아웃을 지원합니다.

![명함: QR, 링크, 일련번호로 공유](/content/works/qru/card.jpg)

![명함 찾기: 공개 명함 5장을 무작위로 보여 준다](/content/works/qru/shuffle.jpg)

## 기술적 도전

### 필드 하나를 가릴 수 없는 보안 규칙

**증상** 항목별로 공개 여부를 정하게 했지만, 명함 문서를 읽을 수 있으면 비공개 항목까지 함께 내려받을 수 있었습니다.

**원인** Firestore 보안 규칙은 문서 단위로만 동작합니다. 문서를 읽게 허용하면 그 안의 모든 필드가 함께 전달되고, 필드 하나만 가릴 수는 없습니다.

**해결** 명함을 세 문서로 나눴습니다. 누구나 읽는 공개 문서에는 공개로 정한 항목만 담고, 입력 원본과 공개 설정은 소유자만 읽는 하위 문서(`cards/{id}/private/card`)에 두었습니다. 일련번호는 그 자체를 문서 ID 로 쓰는 길잡이 문서(`serials/{일련번호}`)로 만들어, 목록 조회를 열지 않고도 번호로 명함을 찾게 했습니다.

![명함 한 장이 저장되는 모습: 공개 문서, 소유자 전용 문서, 일련번호 길잡이 문서](/content/works/qru/data-model.jpg)

**결론** 규칙만으로 공개 범위를 지킬 수 있게 됐습니다. 서버가 없는 구조에서는 권한이 데이터 모양을 결정한다는 점을 설계 단계에서 확인했습니다.

### 필터를 늘릴수록 두 배로 불어나던 색인

**증상** 공개 명함을 무작위로 뽑으면서 조건으로 거르게 하자, 필터를 하나 더할 때마다 Firestore 가 요구하는 복합 색인이 두 배로 늘었습니다.

**원인** 처음에는 난수 이상인 값을 범위로 질의하고 정렬해 무작위로 뽑았습니다. 범위 질의에 여러 조건을 붙이면 조합마다 복합 색인이 필요해, 필터 2개에 8개, 3개에 16개, 4개에 32개가 필요했습니다.

**해결** 서버 질의에는 "같음" 조건만 쓰고, 후보를 최대 50장 가져와 클라이언트에서 무작위로 고르게 바꿨습니다. 배열 안의 값으로는 거를 수 없는 Firestore 의 제약은 정규화한 값을 따로 담는 `search` 맵으로 풀었습니다. 그 결과 색인 설정 파일을 통째로 지울 수 있었습니다.

**결론** 필요한 복합 색인이 0개가 됐습니다. 이 과정에서 드롭다운은 원본 값(`female`)을, 색인은 라벨(`여성`)을 가지고 있어 필터가 하나도 걸리지 않던 버그도 찾아 값을 라벨로 통일했습니다.

### 로그인 없이 만든 명함의 주인 확인

**증상** 비회원이 만든 명함은 비밀번호를 받아 두었지만, 서버가 없어 그 비밀번호를 검증할 방법이 없었습니다.

**원인** 보안 규칙은 요청자가 누구인지(`request.auth`)만 볼 수 있고, 사용자가 입력한 비밀번호를 비교할 수는 없습니다. Cloud Functions 로 검증하려면 유료 요금제가 필요했습니다.

**해결** Firebase 익명 인증으로 비회원에게도 사용자 ID 를 발급하고, 나중에 Google 로 로그인하면 같은 ID 에 계정을 연결하게 했습니다.

**결론** 기존의 "작성자 ID 가 요청자 ID 와 같을 때만 수정" 규칙을 그대로 쓸 수 있어, 보안 규칙은 한 줄도 바뀌지 않았습니다.

## 개발 방식

혼자 만들었지만 컨벤션 문서, 이슈와 PR 템플릿을 두고 변경을 PR 단위로 올렸습니다. `main` 에 합쳐지면 GitHub Actions 가 빌드해 Firebase Hosting 에 배포하고, PR 마다 미리보기 주소가 따로 생깁니다. PR 에 붙이는 화면 캡처는 Playwright 스크립트로 자동 생성했습니다.

## 돌아보며

서버가 없는 구조에서는 권한과 질의 제약이 곧 데이터 구조가 됩니다. 문서를 어떻게 나눌지, 어떤 값을 한 번 더 저장할지를 규칙과 질의에 맞춰 먼저 정하고 나서야 화면을 만들 수 있었습니다. 대량 생성을 막는 App Check 적용과, 익명 계정이 정리된 뒤 남는 명함 처리는 앞으로 다룰 과제로 남아 있습니다.
