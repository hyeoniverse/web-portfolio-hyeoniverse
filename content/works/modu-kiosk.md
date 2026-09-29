---
title: "모두의 키오스크"
title_en: "Kiosk for Everyone"
slug: modu-kiosk
subtitle: "키오스크가 낯선 사람이 카페 주문을 미리 연습해 보는 iOS 키오스크 시뮬레이터"
subtitle_en: "An iOS kiosk simulator where people unfamiliar with kiosks can practice ordering at a café"
category: 모바일 앱
category_en: Mobile App
nature: 공모전 / 콘테스트 / 해커톤
nature_en: Contest / Hackathon
order: 4
year: 2022
tech: [Swift, UIKit, Storyboard, CocoaPods, Parchment]
description: "키오스크 앞에서 망설이는 사람이 실제 매장에 가기 전에 주문 과정을 연습해 볼 수 있는 iOS 앱입니다. 여러 카페 키오스크의 공통 흐름을 모아 3인 팀이 2022년 여름에 만들었습니다."
description_en: "An iOS app that lets people who hesitate in front of kiosks practice the ordering flow before visiting a store. Built by a team of three in summer 2022 from the common flow of several café kiosks."
role: "iOS 개발 · 메뉴와 옵션 데이터 설계 · 화면 구현"
role_en: "iOS development · Menu and option data design · Screens"
image: /content/works/modu-kiosk/slide-01.jpg
github_url: https://github.com/choigahyun/2022-IOS-KioskSimulator
---

![모두의 키오스크: 키오스크가 낯선 모든 이들에게](/content/works/modu-kiosk/slide-01.jpg)

## 한눈에 보기

| 항목 | 내용 |
| --- | --- |
| 기간 | 2022.07 ~ 2022.08 |
| 인원 | 3인 |
| 역할 | iOS 개발, 메뉴·옵션 데이터 구조 설계, 메뉴·옵션·장바구니 화면 구현 |
| 대상 | 키오스크가 어려운 사람, 특히 50대 이상 중장년층과 그 가족 |

> [!TIP]
> 메뉴마다 다른 옵션을 화면이 아니라 데이터 한 곳에서 관리하도록 설계해, 약 70개 메뉴의 옵션 화면을 하나로 처리했습니다.

## 개요

키오스크는 인건비를 줄이고 대면 접촉을 줄여 빠르게 늘었지만, 단계가 복잡해 익숙하지 않은 사람은 주문 앞에서 멈추게 됩니다. 뒤에 줄이 서 있으면 천천히 익힐 여유도 없습니다.

모두의 키오스크는 이 연습을 집에서 할 수 있게 만든 시뮬레이터입니다. 매장마다 화면은 조금씩 다르지만, 여러 카페 키오스크에 공통으로 있는 흐름을 모아 하나의 앱으로 재현했습니다. 부모님께 키오스크 사용법을 알려 드리고 싶은 자녀도 대상으로 삼았습니다.

![핵심 타깃: 키오스크가 어려운 사람이라면 누구나](/content/works/modu-kiosk/slide-03.jpg)

## 설계한 주문 흐름

실제 카페 키오스크의 순서를 그대로 따라가도록 화면을 설계했습니다.

1. 시작하기와 도움말
2. 매장에서 먹을지 포장할지 선택
3. 카테고리별 메뉴 선택
4. 온도, 얼음, 당도, 샷 추가 같은 옵션 선택
5. 장바구니 확인
6. 결제 수단 선택과 영수증
7. 처음 화면으로 돌아가기

![프로그램 구조도](/content/works/modu-kiosk/slide-04.jpg)

## 주요 구현

- **카테고리 탭** CocoaPods 의 Parchment 로 시즌메뉴, 커피, 논커피, 아이스 블렌디드, 티, 디저트 여섯 개 탭을 만들고, 탭마다 메뉴를 격자(UICollectionView)로 보여 줍니다. 상단에는 실제 키오스크처럼 넘어가는 광고 배너를 두었습니다.
- **메뉴별 옵션** 약 70개 메뉴마다 가능한 옵션(HOT/ICE, 얼음 종류와 양, 당도, 하프샷, 휘핑, 시럽, 샷 추가, 펄 추가)을 데이터로 정의했습니다. 선택할 수 없는 옵션은 값 `-1` 로 표시해, 메뉴에 따라 옵션 화면이 달라지게 했습니다.
- **옵션 화면** 기본, 무료 옵션, 유료 옵션 세 구역으로 나눈 표(UITableView)에 옵션 종류별 셀 11가지를 만들어, 실제 키오스크처럼 항목을 골라 담는 화면을 구성했습니다.
- **장바구니와 영수증** 담은 메뉴를 목록으로 보여 주고, 영수증 화면에서 처음 화면으로 돌아가게 했습니다.

![메뉴 선택: 카테고리 탭과 메뉴 격자](/content/works/modu-kiosk/slide-08.jpg)

![옵션 선택: 무료·유료 옵션 구역](/content/works/modu-kiosk/slide-09.jpg)

![영수증 화면](/content/works/modu-kiosk/slide-12.jpg)

## 맡은 일

- Xcode 프로젝트를 만들고 메뉴 선택, 옵션 선택, 장바구니, 영수증 화면의 Swift 코드를 작성했습니다.
- 메뉴마다 가능한 옵션이 다른 문제를 화면마다 분기하지 않고 **데이터 한 곳에서 관리** 하도록 메뉴·옵션 구조를 설계했습니다.

## 돌아보며

키오스크의 어려움은 버튼이 작아서가 아니라 단계가 많고 메뉴마다 선택지가 달라서 생긴다는 점에 주목했습니다. 그래서 화면을 예쁘게 만드는 것보다 메뉴별 옵션의 차이를 데이터로 정리하는 데 가장 많은 시간을 썼습니다. 방학 기간 안에 결제까지의 흐름을 모두 연결하지는 못했고, 카페 외의 매장 화면과 단계별 도움말 팝업은 개선 과제로 남겼습니다.
