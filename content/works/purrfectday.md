---
title: "PurrFectday"
title_en: "PurrFectday"
slug: purrfectday
subtitle: "할 일을 끝낼 때마다 고양이와 방이 자라는, 꾸미기 게임을 더한 iOS 투두리스트"
subtitle_en: "An iOS to-do list with a decorating game, where your cat and room grow every time you finish a task"
category: 모바일 앱
category_en: Mobile App
nature: 학교 과제 / 졸업작품 / 캡스톤
nature_en: Academic / Thesis / Capstone
order: 3
year: 2024
tech: [Swift, UIKit, SpriteKit, SnapKit, Firebase Auth, Firebase Realtime Database, FSCalendar, CocoaPods]
description: "할 일을 완료하면 포인트를 받아 고양이를 입양하고 방을 꾸미는 iOS 앱입니다. 반복되는 할 일 체크를 게임처럼 즐겁게 만들기 위해 서울여자대학교 소프트웨어융합학과 졸업 프로젝트로 2인 팀이 만들었습니다."
description_en: "An iOS app where finishing tasks earns points to adopt cats and decorate a room. Built by a team of two as a Software Convergence graduation project at Seoul Women's University, to make checking off repeated tasks feel like a game."
role: "iOS 구현 주도 · 할 일과 목표 · Firebase 인증과 데이터 · 마이홈 연출 · 소셜"
role_en: "Lead iOS development · Tasks and goals · Firebase auth and data · My Home effects · Social"
image: /content/works/purrfectday/cover.jpg
github_url: https://github.com/PurrFectDay/PurrFectDay.
---

![PurrFectday.: 나만의 귀여운 고양이와 함께하는 투두리스트](/content/works/purrfectday/slide-01.jpg)

## 한눈에 보기

| 항목 | 내용 |
| --- | --- |
| 기간 | 2024.03.26 ~ 2024.06.11 |
| 인원 | 2인 |
| 역할 | iOS 구현 주도, 할 일·목표·루틴, Firebase 인증과 데이터 설계, 마이홈 연출, 소셜 기능 |
| 기여 | 개발 저장소 커밋 138개, Swift 코드 약 2만 7천 줄 추가 |
| 시연 | [시연 영상 (YouTube)](https://youtu.be/J1HNExVYT9w) |

> [!TIP]
> 2인 팀의 iOS 구현을 주도해 개발 저장소 커밋 138개, Swift 코드 약 2만 7천 줄을 작성했습니다.

## 개요

계획은 세웠지만 끝까지 지키지 못하거나, 기록하러 앱을 여는 것부터 귀찮아 지나치는 일이 많습니다. 매일 같은 할 일을 체크하는 것은 금방 지루해집니다.

PurrFectday 는 이 체크를 조금 더 즐겁게 만드는 iOS 앱입니다. 할 일을 완료하면 포인트가 쌓이고, 그 포인트로 고양이를 입양하고 방을 꾸밉니다. 할 일을 미루면 방이 더러워집니다. 이름은 고양이가 기분 좋을 때 내는 소리 Purr 와 Perfect Day 를 합치고, 하루를 잘 마치라는 뜻으로 마침표를 붙였습니다.

## 주요 기능

### 할 일

- 월, 주, 전체 세 가지 모드로 할 일을 봅니다. 전체 모드는 아직 끝내지 않은 일만 모아 보여 줍니다.
- 목표 아래에 할 일과 루틴을 두고, 목표를 추가, 수정, 보관합니다. 보관한 목표는 완료일 이후 숨겨집니다.
- 탭해서 고치고, 왼쪽으로 밀어 지우고, 길게 눌러 순서를 바꿉니다. 오늘의 완료도는 진행 막대로 보여 줍니다.

![할 일: 월·주·전체 모드와 목표별 정리](/content/works/purrfectday/slide-11.jpg)

### 마이홈

- SpriteKit 으로 만든 방에서 고양이가 돌아다닙니다. 고양이를 터치하면 응원 메시지가, 문지르면 하트 이펙트와 그르릉 소리가 나옵니다.
- 오늘의 할 일을 끝내면 10포인트를 받고, 체크를 해제하면 회수됩니다.
- 그날 할 일을 다 하지 못하거나 오래 접속하지 않으면 방이 더러워지고, 포인트로 청소합니다.

![마이홈: 고양이가 돌아다니는 방](/content/works/purrfectday/slide-12.jpg)

### 상점과 도감

- 벽지, 바닥, 창문, 러그, 소파, 조명, 식물, 캣타워 등 11가지 종류의 인테리어를 사서 배치합니다. 종류마다 하나씩 놓을 수 있습니다.
- 도감에는 고양이 12마리가 있고, 아직 입양하지 않은 고양이는 흐리게 보입니다. 입양한 고양이는 프로필로 쓸 수 있습니다.

![상점: 인테리어를 사서 배치](/content/works/purrfectday/slide-15.jpg)

### 소셜

- 이메일로 친구를 찾아 서로이웃을 맺고, 이웃의 방과 오늘의 할 일, 완료도를 봅니다.
- 이웃에게 응원 메시지를 보내면, 상대가 접속 중일 때 방 안에 실시간 말풍선으로 나타납니다.

![소셜: 이웃의 방과 오늘의 할 일, 응원 메시지](/content/works/purrfectday/slide-16.jpg)

![앱 구조도](/content/works/purrfectday/slide-08.jpg)

## 맡은 일

팀원이 달력과 할 일 목록의 기본 골격, 상점과 도감의 초기 화면을 만든 뒤, 그 위에 기능 대부분을 이어서 구현했습니다.

- 이메일 인증을 포함한 **회원 관리** 와 런치 화면, 배경음과 효과음 설정을 만들었습니다.
- 할 일의 드래그 순서 변경, 목표별 섹션, 전체 모드, 달력 모드 전환 애니메이션, 날짜별 할 일 개수 표시, **루틴** 까지 할 일 화면을 완성했습니다.
- 로컬 저장(UserDefaults)으로 시작한 데이터를 **Firebase Realtime Database** 로 옮기고, 할 일, 목표, 포인트, 인벤토리, 방 청결도, 친구 관계의 저장 구조를 설계했습니다.
- 마이홈의 하트 이펙트, 할 일을 체크할 때 뜨는 말풍선, **방 청결도** 로직을 만들었습니다.
- 상점 데이터베이스를 다시 짜고, 도감의 미입양 고양이 표시와 **친구 화면, 실시간 응원 말풍선** 을 구현했습니다.

## 기술적 도전

### 로그아웃해도 남아 있던 이전 사용자의 데이터

**증상** 로그아웃하거나 탈퇴한 뒤 다른 계정으로 로그인하면 이전 사용자의 할 일과 방이 그대로 보였습니다.

**원인** 처음에는 데이터를 기기의 UserDefaults 에 저장했습니다. 이 저장소는 계정과 상관없이 기기에 남기 때문에, 계정이 바뀌어도 이전 데이터가 읽혔습니다.

**해결** 데이터 저장을 사용자별 경로를 가진 Firebase Realtime Database 로 옮기고, 로그아웃과 탈퇴 시 기기에 남은 값을 정리하게 했습니다.

**결론** 계정마다 데이터가 분리되고, 다른 기기에서 로그인해도 같은 방과 할 일이 보이게 됐습니다.

### 데이터보다 먼저 그려지던 방

**증상** 앱을 열면 방이 빈 상태로 그려지거나, 고양이와 가구가 늦게 나타났습니다.

**원인** 게임 화면(SpriteKit 씬)이 데이터베이스에서 인벤토리와 청결도를 다 읽기 전에 먼저 만들어졌습니다. 네트워크에서 데이터를 받는 일은 비동기로 끝나는데, 화면은 그 순서를 기다리지 않았습니다.

**해결** 데이터베이스 유틸리티의 초기화가 끝난 뒤에 게임 씬을 다시 불러오도록 순서를 맞췄습니다.

**결론** 방과 고양이가 저장된 상태 그대로 처음부터 그려지게 됐습니다.

## 돌아보며

투두리스트를 자주 바꿔 쓰던 경험에서 시작한 프로젝트였습니다. 게임 요소를 더하니 기능보다 데이터의 흐름이 먼저 복잡해졌습니다. 할 일 하나를 체크하면 포인트, 방 청결도, 이웃에게 보이는 완료도가 함께 바뀌어야 했고, 이 연결을 한 곳의 데이터베이스 유틸리티로 모아 관리한 것이 기능을 끝까지 늘려 갈 수 있게 한 바탕이었습니다.
