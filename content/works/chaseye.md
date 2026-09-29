---
title: "ChasEye"
title_en: "ChasEye"
slug: chaseye
subtitle: "웹캠과 네트워크를 함께 보고 비대면 시험의 부정행위를 실시간으로 찾아내는 데스크톱 프로그램"
subtitle_en: "A desktop program that watches the webcam and the network together to catch cheating in online exams in real time"
category: 데스크탑 앱, AI / ML
category_en: Desktop App, AI / ML
nature: 학교 과제 / 졸업작품 / 캡스톤
nature_en: Academic / Thesis / Capstone
order: 10
year: 2022
tech: [Python, PyQt5, MediaPipe, OpenCV, Scapy, Firebase]
description: "응시자의 웹캠 영상에서 얼굴과 홍채를 추적하고, 같은 네트워크의 응시자와 인터넷 사용을 함께 살펴 비대면 시험의 부정행위를 탐지합니다. 서울여자대학교 정보보호학과 졸업 프로젝트로 우수상을 받았고, 2023년 한국정보처리학회 춘계학술대회에 논문을 게재했습니다."
description_en: "Tracks the face and irises in the examinee's webcam feed while watching for shared networks and internet use, to detect cheating in online exams. A graduation project in Information Security at Seoul Women's University that won an excellence award and was published at the 2023 KIPS spring conference."
role: "MediaPipe 시선 추적 · 동일 네트워크 응시 탐지 · 프로그램 통합"
role_en: "MediaPipe gaze tracking · Same-network detection · Integration"
image: /content/works/chaseye/cover.jpg
github_url: https://github.com/hyeoniverse/BOSWU
---

![「실시간 영상자료 및 네트워크 시스템 분석을 이용한 온라인 시험 부정행위 탐지 서비스」 발표 표지](/content/works/chaseye/slide-01.jpg)

## 한눈에 보기

| 항목 | 내용 |
| --- | --- |
| 기간 | 2022 ~ 2023.05 |
| 인원 | 3인 |
| 역할 | MediaPipe 기반 시선 추적, 동일 네트워크 응시 탐지, 프로그램 구조 개편과 통합 |
| 성과 | 2022 졸업 프로젝트 평가회 우수상, 2023 춘계학술대회 논문 게재 |
| 정확도 | 시선 판별 정면 100%, 오른쪽 96%, 왼쪽 97% · 네트워크 탐지 86% (각 50회) |

> [!TIP]
> 2022 졸업 프로젝트 평가회 우수상 · 2023 한국정보처리학회 춘계학술대회 논문 게재. 시선 판별 정확도 96~100%.

## 개요

코로나19 이후 비대면 시험이 늘면서 부정행위도 함께 늘었습니다. 화상회의로 감독하면 감독관 한 명이 수십 개의 화면을 동시에 봐야 하고, 수강생이 많을수록 놓치는 장면이 생깁니다.

ChasEye 는 감독을 사람의 눈에만 맡기지 않고 프로그램이 함께 보게 하는 데스크톱 프로그램입니다. 응시자의 웹캠에서 얼굴과 시선을 추적하고, 네트워크에서는 같은 장소에서 함께 응시하는지와 시험 중 인터넷을 쓰는지를 살핍니다. 수상 이후 2023년 3월부터는 BOSWU(보슈)라는 이름으로 구조를 다시 짜 개선했습니다.

탐지 대상으로 정한 부정행위는 네 가지입니다.

- 시험 화면을 벗어나 다른 곳을 보는 행위
- 자리를 비우거나 다른 사람이 함께 있는 경우
- 같은 장소에 모여 함께 응시하는 집단 부정행위
- 시험 중 인터넷 검색이나 메신저로 답을 주고받는 행위

## 주요 기능
![시스템 설계: 영상과 네트워크 신호를 모아 탐지하고 경고한다](/content/works/chaseye/slide-05.jpg)


### 시선 추적

MediaPipe Face Mesh 로 홍채를 포함한 얼굴 랜드마크 478개를 찾습니다. 홍채 네 점으로 홍채 중심을 구하고, 눈의 양 끝 사이 거리에 대한 홍채 중심의 위치 비율로 왼쪽, 정면, 오른쪽을 판별합니다. 눈의 위아래 비율로 아래를 보는지, 눈을 감았는지도 가려냅니다.

![홍채 중심과 눈 양 끝의 거리 비율로 시선 방향을 판별한다](/content/works/chaseye/slide-13.jpg)

### 사람마다 다른 눈에 맞춘 보정

눈 모양은 사람마다 달라 기준 값 하나로는 오판이 생깁니다. 시험 전에 오른쪽, 왼쪽, 아래를 3초씩 바라보게 해 응시자별 비율 평균을 저장하고, 그 값을 기준으로 판별합니다.

### 한 번이 아니라 누적으로 경고

잠깐 고개를 돌린 것까지 부정행위로 보면 오탐이 많아집니다. 그래서 신호마다 가중치를 두고 누적해, 합이 기준을 넘을 때 경고합니다. 세 번째 경고부터는 감독관에게 알림이 가고, 경고 순간의 웹캠 영상을 증거로 저장합니다.

### 자리 비움과 외부인

얼굴이 하나도 잡히지 않으면 자리 비움으로, 두 명 이상 잡히면 외부인으로 판단해 경고합니다.

### 같은 네트워크에서의 응시

로그인할 때 응시자의 네트워크 대역을 저장하고, 다른 응시자가 같은 대역에서 접속하면 같은 장소에서 응시하는 것으로 보고 경고합니다. 이때는 주변을 비추도록 요청하고 약 10초 분량을 녹화합니다.

![같은 공유기에서 접속한 응시자를 찾아낸다](/content/works/chaseye/slide-15.jpg)

### 인터넷 사용

Scapy 로 패킷 수를 짧은 간격으로 세어, 시험 사이트와의 통신을 뺀 트래픽이 급증하면 검색 행위로 추정해 화면을 캡처합니다.

## 맡은 일

- 시선 추적을 초기의 dlib 기반 방식에서 **MediaPipe Face Mesh 의 홍채 비율 방식** 으로 바꾸고, 탐지 로직을 별도 모듈로 분리했습니다.
- 같은 네트워크에서 동시에 접속한 응시자를 찾는 **동일 네트워크 탐지** 를 구현했습니다.
- 시험 화면을 카메라 테스트, 시험 방 생성, 메인 화면으로 나눠 구조를 다시 짜고, 팀의 코드를 하나의 저장소로 정리했습니다.

## 결과

각 방향을 약 5초 이상 바라보는 테스트를 50회씩 진행해, 올바른 방향이 기록된 비율을 쟀습니다.

| 항목 | 정확도 |
| --- | --- |
| 정면 | 100% (50/50) |
| 오른쪽 | 96% (46/50) |
| 왼쪽 | 97% (47/50) |
| 네트워크 탐지 | 86% (43/50) |

![방향별 50회 테스트 결과](/content/works/chaseye/slide-17.jpg)

이 결과로 2022 졸업 프로젝트 평가회에서 학과 우수 프로젝트로 선정돼 우수상을 받았고, 2023년 한국정보처리학회 춘계학술대회(ASK 2023)에 「실시간 영상자료 및 네트워크 시스템 분석을 이용한 온라인 시험 부정행위 탐지 서비스」를 게재했습니다.

## 돌아보며

카메라가 정면에 있지 않으면 시선 정확도가 떨어지는 한계가 남았습니다. 탐지의 정확도만큼 중요한 것은 오탐을 줄이는 설계였습니다. 순간의 신호로 바로 경고하지 않고 누적하게 한 것, 사람마다 기준을 따로 보정하게 한 것이 실제로 쓸 수 있는 감독 도구와 그렇지 않은 도구를 가르는 부분이었습니다.
