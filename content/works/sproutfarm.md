---
title: "Sprout Farm"
title_en: "Sprout Farm"
slug: sprout-farm
subtitle: "자정 전에 도망친 소와 닭을 모두 잡아라, 끝없이 펼쳐지는 들판의 2D 픽셀 농장 게임"
subtitle_en: "Catch every runaway cow and chicken before midnight in a 2D pixel farm game on an endless field"
category: 게임
category_en: Game
nature: 학교 과제 / 졸업작품 / 캡스톤
nature_en: Academic / Thesis / Capstone
order: 2
year: 2024
tech: [Unity 6, C#, URP 2D, Tilemap, A* Pathfinding Project, WebGL, Vercel Functions, Redis]
description: "농장 주인 파니가 자정 전에 도망친 소와 닭을 모두 잡아 울타리에 넣는 탑다운 2D 픽셀 게임입니다. 2024년 6월 컴퓨터그래픽스 기말 프로젝트로 혼자 만들고, 2026년 9월 Unity 6 로 다시 만들며 절차적 지형과 온라인 랭킹을 더해 웹에 배포했습니다."
description_en: "A top-down 2D pixel game where farmer Pani must herd every runaway cow and chicken back into the pen before midnight. Built solo in June 2024 as a Computer Graphics final project and rebuilt on Unity 6 in September 2026 with procedural terrain and an online leaderboard, deployed to the web."
role: "1인 개발 · 기획 · 게임 로직 · 절차적 지형 · 랭킹 서버 · 웹 배포"
role_en: "Solo · Planning · Game logic · Procedural terrain · Leaderboard server · Web deployment"
image: /content/works/sprout-farm/cover.jpg
live_url: https://sprout-farm-beta.vercel.app
github_url: https://github.com/hyeoniverse/SproutFarm
---

![농장: 파니와 흩어진 동물들](/content/works/sprout-farm/screenshot-farm.jpg)

## 한눈에 보기

| 항목 | 내용 |
| --- | --- |
| 기간 | 2024.06.10 ~ 2024.06.24 (첫 제작), 2026.09 (Unity 6 재작업) |
| 인원 | 1인 |
| 과목 | 컴퓨터그래픽스 기말 프로젝트 (설명 레포트 53쪽) |
| 역할 | 기획, 게임 로직, 동물 AI, 절차적 지형, 랭킹 서버, 웹 배포 |
| 플레이 | [sprout-farm-beta.vercel.app](https://sprout-farm-beta.vercel.app) (PC, 방향키 · Shift · Space) |
| 시연 | [시연 영상 (YouTube)](https://youtu.be/XFgvLMcFpRo) |

> [!TIP]
> 링크 하나로 누구나 플레이할 수 있습니다. 절차적 지형으로 끝없이 이어지는 들판과, 점수를 조작할 수 없는 온라인 랭킹을 직접 만들었습니다.

## 개요

농장 주인 **파니** 의 소와 닭이 울타리를 넘어 들판으로 흩어졌습니다. 자정이 되기 전에 모두 찾아 울타리 안에 넣으면 승리합니다. 시간은 오전 9시부터 흐르고, 해가 지면 화면이 저녁과 밤의 색으로 바뀝니다.

그래픽은 itch.io 의 Sprout Lands Asset Pack 을 썼고, 게임의 규칙과 동작은 직접 만들었습니다. 2024년에 Unity 2022 로 처음 만든 뒤, 2026년 9월 Unity 6 로 옮기며 지형, 체력, 랭킹, 배포를 새로 만들었습니다.

## 게임 규칙
![연못과 들판](/content/works/sprout-farm/screenshot-pond.jpg)

![밤이 되면 화면이 어두워진다](/content/works/sprout-farm/screenshot-night.jpg)


- 동물에게 다가가면 도망가고, 잡으면 뒤를 따라옵니다. 데리고 있는 동물이 많을수록 파니의 걸음이 느려집니다.
- 움직이면 **체력** 이 줄고, 멈추면 회복합니다. 체력이 바닥나면 게임 오버입니다.
- 들판의 **열매** 를 먹으면 체력이 차고 잠시 빨라집니다. 흙길에서는 체력이 덜 줄고 더 빨리 걷습니다.
- **집** 에 들어가 침대에서 자면 체력이 가득 차는 대신 시간이 한 시간 흐릅니다.
- 화면의 **나침반** 이 가장 가까운 동물 쪽을 가리킵니다.
- 끝나면 잡은 동물 수, 먹은 열매, 남은 시간, 체력으로 점수를 매겨 **온라인 랭킹** 에 올립니다.

![결과와 온라인 랭킹](/content/works/sprout-farm/screenshot-result.jpg)

## 2024: 첫 제작

컴퓨터그래픽스 과목의 기말 프로젝트로 2주 동안 혼자 만들고, 설계와 구현을 53쪽 분량의 설명 레포트로 정리했습니다.

- **끝없는 들판** 20×20칸 타일맵 네 장을 깔고, 플레이어가 경계를 벗어나면 가장 먼 한 장을 진행 방향 앞으로 옮겨 붙였습니다. 맵을 새로 만들지 않고 같은 네 장을 돌려 써서 들판이 끝없이 이어지게 했습니다.
![타일맵 네 장을 진행 방향으로 옮겨 붙여 끝없는 들판을 만든다](/content/works/sprout-farm/tech-infinite.jpg)

- **동물 AI** A* Pathfinding Project 로 장애물을 피해 움직이게 하고, 배회, 도망, 따라오기, 울타리 안 배회의 상태를 나눴습니다.
- **낮과 밤** 시간에 따라 새벽, 한낮, 노을, 밤의 색을 그라데이션으로 화면에 덮었습니다.
- 타이핑 효과가 있는 튜토리얼 대화, 오브젝트 풀링, 남은 동물 수 표시를 만들고 GitHub Pages 로 배포했습니다.

## 2026: Unity 6 재작업

### 저장하지 않아도 같은 자리엔 같은 풍경

네 장을 돌려 쓰는 방식은 풍경이 금방 반복됐습니다. 그래서 들판을 12칸 크기의 구역으로 나누고, 플레이어 주변 3×3 구역만 유지하는 **절차적 지형** 으로 바꿨습니다. 구역의 좌표를 해시해 숲, 바위밭, 꽃밭, 과수원, 연못, 빈터 중 하나를 정하므로, 아무것도 저장하지 않아도 같은 자리로 돌아오면 같은 풍경이 나옵니다. 연못 물가와 흙길 가장자리는 이웃 8칸을 보고 47가지 타일 중 맞는 것을 고릅니다.

![좌표로 정해지는 구역별 풍경: 숲, 바위밭, 꽃밭, 과수원, 연못, 빈터](/content/works/sprout-farm/tech-map.jpg)

![이웃 8칸을 보고 연못 물가와 흙길 가장자리를 고른다](/content/works/sprout-farm/tech-blob-result.jpg)

### 한 번에 만들지 않고 나눠 만들기

**증상** 새 구역에 들어서는 순간 화면이 멈칫했습니다. 한 프레임에 구역 전체를 만들 때 프레임 시간이 최대 377ms 까지 튀었습니다.

**원인** 수백 칸의 타일과 식물을 한 프레임 안에서 모두 만들고, 동물 길 찾기에 쓰는 격자도 맵 전체를 다시 계산했습니다.

**해결** 타일을 프레임마다 48칸씩 나눠 만들고, 길 찾기 격자는 새로 생긴 구역의 범위만 다시 계산하게 했습니다.

**결론** 튀는 프레임이 100ms 대로 줄어, 들판을 달리는 동안 끊김이 눈에 띄지 않게 됐습니다.

### 속이기 어려운 랭킹

랭킹은 Vercel 서버리스 함수와 Redis 정렬 집합으로 만들었습니다. 브라우저는 점수를 보내지 않고 잡은 동물 수, 열매 수, 남은 시간, 체력 같은 **기록만 보냅니다**. 서버가 각 값을 가능한 범위로 자른 뒤 점수를 다시 계산하므로, 점수를 직접 조작해 보내도 반영되지 않습니다. 이름은 10자, 같은 IP 의 제출은 10초에 한 번으로 제한했습니다.

### 웹에서 가볍게

WebGL 빌드를 Brotli 로 압축해 Vercel 에 올리고, 압축 파일이 제대로 풀리도록 응답 헤더를 따로 지정했습니다. 새 빌드를 배포해도 이전 캐시가 남아 옛 게임이 뜨지 않도록 서비스 워커를 네트워크 우선으로 두었습니다.

### 그 밖에 더한 것

- 열매, 들어갈 수 있는 집과 침대, 흙길, 튜토리얼 건너뛰기, 상호작용 힌트
- 동물이 울타리를 뛰어넘어 흩어지는 시작 연출과 동물 20마리
- 캐릭터, 동물, 나무, 꽃이 서로 앞뒤로 자연스럽게 겹치도록 Y 좌표 기준 그리기 순서 정리

![2024 설명 레포트: 레벨 디자인](/content/works/sprout-farm/report-51.jpg)

## 돌아보며

첫 제작에서는 끝없는 들판을 "같은 맵을 돌려 쓰는 것" 으로 풀었고, 2년 뒤에는 "좌표로 풍경을 계산하는 것" 으로 다시 풀었습니다. 같은 문제를 다른 방식으로 다시 풀어 보니, 무엇을 저장하지 않아도 되는지 정하는 것이 곧 설계라는 점이 분명해졌습니다. 게임 밖의 일인 랭킹과 배포까지 직접 붙여, 링크 하나로 누구나 플레이할 수 있는 상태로 마무리했습니다.
