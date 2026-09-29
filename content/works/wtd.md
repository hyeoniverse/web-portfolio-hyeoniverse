---
title: "WTD"
title_en: "WTD"
slug: wtd
subtitle: "드래그로 정리하고, 반복되는 일은 루틴이 알아서 되돌리는 할 일 관리 웹앱"
subtitle_en: "A to-do web app where you arrange tasks by dragging and routines reset repeating work on schedule"
category: 웹앱
category_en: Web App
nature: 부트캠프 프로젝트
nature_en: Bootcamp Project
order: 6
year: 2024
tech: [React, JavaScript, Context API, react-beautiful-dnd, Axios, Tailwind CSS, styled-components, Node.js, Express, MySQL]
description: "할 일과 세부 할 일을 드래그 앤 드롭으로 관리하고, 요일과 시간을 정한 루틴은 자동으로 초기화되는 투두 웹앱입니다. 프로그래머스 데브코스 스프린트 과제로 7인 팀이 2주 동안 만들었습니다."
description_en: "A to-do web app for managing tasks and subtasks with drag and drop, where routines reset automatically on chosen days and times. Built in two weeks by a team of seven as a Programmers DevCourse sprint project."
role: "프론트엔드 · 상태 관리 · 백엔드 연동 · 드래그 앤 드롭"
role_en: "Frontend · State management · API integration · Drag and drop"
image: /content/works/wtd/banner.jpg
live_url: https://what-to-do-chi.vercel.app
github_url: https://github.com/Devcourse-WhatToDo
---

![WTD: 할 일 관리 웹 애플리케이션](/content/works/wtd/banner.jpg)

## 한눈에 보기

| 항목 | 내용 |
| --- | --- |
| 기간 | 2024.10.05 ~ 2024.10.18 (2주) |
| 인원 | 7인 (프론트엔드 4, 백엔드 3) |
| 역할 | 상태 관리, 백엔드 연동, 드래그 앤 드롭, README |
| 기여 | 프론트엔드 저장소 커밋 94개 (팀 전체의 약 80%) |
| 과정 | 프로그래머스 데브코스 「타입스크립트로 함께하는 웹 풀 사이클 개발」 스프린트 과제 |

> [!TIP]
> 7인 팀에서 프론트엔드 커밋의 약 80% 를 맡아, 상태 관리·드래그 앤 드롭·로그인 연동을 구현했습니다.

## 개요

WTD(What To Do)는 할 일을 목록으로 나누고, 각 할 일 아래에 세부 할 일을 두어 관리하는 웹앱입니다. 매일 또는 특정 요일에 반복되는 일은 **루틴** 으로 등록하면 정해진 시각에 완료 상태가 자동으로 초기화됩니다.

로그인하지 않아도 브라우저에 저장해 바로 쓸 수 있고, Google 계정으로 로그인하면 그동안 쓴 할 일이 서버로 옮겨집니다. 프론트엔드는 React, 백엔드는 Node.js 와 Express, MySQL 로 만들었습니다.

## 주요 기능

- **할 일과 세부 할 일** 추가, 수정, 삭제. 카드 상단을 끌어 순서를 바꾸고, 세부 할 일도 드래그로 정렬합니다.
- 완료한 세부 할 일은 **보관함** 으로 옮겨지고, 토글로 다시 볼 수 있습니다.
- 체크한 할 일만 **대시보드** 에 모아 보여 줍니다.
- **루틴** 은 지정한 요일과 시각에 할 일의 상태를 초기화합니다. 서버의 예약 작업(node-cron)이 매분 확인합니다.
- **비로그인 사용** 은 로컬 스토리지에 저장하고, 로그인하는 순간 서버와 동기화합니다.

![비로그인 상태에서 목록 추가](/content/works/wtd/add-list.gif)

![할 일 아래 세부 할 일 추가](/content/works/wtd/add-subtask.gif)

## 맡은 일

- `TaskContext`, `RoutineContext`, `AuthContext` 로 전역 상태를 나눠 설계했습니다.
- `react-beautiful-dnd` 로 할 일과 세부 할 일의 드래그 앤 드롭, 드래그 손잡이를 구현했습니다.
- Axios 로 할 일 API 8개와 루틴 API 4개의 호출 모듈을 만들고, Google 로그인과 401 인증 오류 처리를 연결했습니다.
- 비로그인 데이터와 로그인 사용자 데이터를 분리하고, 로그인할 때 일괄로 옮기는 흐름을 만들었습니다.
- 팀 README 를 작성했고, 백엔드에는 CORS 설정 PR 을 올렸습니다.

## 기술적 도전

### 로그인하면 사라지던 비로그인 할 일

**증상** 비로그인 상태에서 만든 할 일이 로그인 뒤에 보이지 않거나, 다른 사용자의 목록과 섞일 수 있었습니다.

**원인** 로컬 스토리지에 사용자 구분 없이 한 키로 저장하고 있었고, 로그인 시점에 이 데이터를 서버로 옮기는 과정이 없었습니다.

**해결** 저장 키를 비로그인은 `guestTasks`, 로그인 사용자는 `userTasks_${userId}` 로 나눴습니다. 로그인하면 `guestTasks` 를 한 번의 요청으로 서버에 일괄 등록하고, 성공하면 로컬 데이터를 지웁니다. 이 과정에서 서버 응답의 필드 이름(`insertedIds`)과 프론트가 기대한 이름(`insertIds`)이 달라 새로 받은 ID 가 비는 문제를 찾아 맞췄습니다.

**결론** 로그인 전후로 데이터가 이어지게 됐습니다. 프론트와 백엔드가 다른 사람의 손에서 동시에 만들어질 때는 응답 형식을 문서로 먼저 맞춰 두는 것이 필요하다는 점을 확인했습니다.

### 루틴 초기화가 화면에 늦게 반영되던 문제

**증상** 서버가 루틴을 초기화해도 화면의 체크 상태가 바로 바뀌지 않았습니다.

**원인** 서버의 예약 작업은 매분 0초에 실행되는데, 화면은 이 시점과 관계없이 조회하고 있었습니다. 또 주기적으로 도는 조회 함수가 처음 그려질 때의 할 일 목록을 계속 참조해, 목록이 바뀐 뒤에는 오래된 목록 ID 로 조회했습니다.

**해결** 첫 조회를 다음 정각의 1초 뒤로 맞춘 뒤 60초 간격으로 조회하게 했습니다. 목록 ID 는 상태 대신 매번 로컬 스토리지에서 읽어 최신 값을 쓰게 했습니다.

**결론** 서버가 초기화한 직후에 화면이 따라오게 됐습니다. 코드상 반영 지연은 최대 약 60초에서 약 1초로 줄어듭니다. 다만 타이머를 해제하는 정리 코드는 넣지 못해, 이후라면 효과 정리 함수로 함께 관리할 부분입니다.

## 돌아보며

2주 동안 7명이 프론트엔드와 백엔드를 나눠 만든 협업 프로젝트였습니다. 상태를 할 일, 루틴, 인증의 Context 로 나눠 두어, 기능을 나눠 맡은 팀원이 서로의 코드를 덜 건드리고 작업할 수 있었습니다. 반면 API 응답 형식이 어긋난 문제는 연동 막바지에야 드러났습니다. 짧은 기간일수록 API 명세를 먼저 합의해 두는 것이 연동 시간을 줄인다는 점을 배웠습니다.
