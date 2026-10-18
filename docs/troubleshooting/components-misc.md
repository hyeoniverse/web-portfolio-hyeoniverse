# Trouble Shooting: 컴포넌트 · 기타

[← 전체 목차](../troubleshooting.md)

<details>
<summary><strong>63. 연속 입력과 transition: resize 스트림 중엔 snap</strong></summary>

**증상**: PC 레이아웃에서 네비게이션 메뉴는 `position: absolute; left: 50%; transform: translateX(-50%)` 로 뷰포트 정중앙에 고정되어 있었다. 오른쪽 버튼 묶음(`navActions`: 언어, 사운드, 테마, 이메일, 알림, 로그아웃)이 길어지면 특정 폭에서 메뉴와 겹쳤다. flex 배치로 바꿔 좌우 영역 사이의 가운데로 옮기자, 이번에는 현재 링크를 가리키는 슬라이딩 인디케이터가 창 폭을 바꾸는 동안 메뉴 위치를 따라가지 못하고 뒤처졌다.

**원인**:

1. 뷰포트 정중앙에 절대 배치하면 왼쪽 로고와 오른쪽 버튼 묶음의 폭을 고려하지 않는다. 두 영역의 폭이 다르거나 페이지 여백이 줄어들면 겹친다.
2. 인디케이터에는 `left` 와 `width` 의 transition 이 항상 걸려 있었다. resize 이벤트마다 새 위치를 넣어도 인디케이터는 이전 값에서 새 값으로 천천히 이동했다. 메뉴는 바로 옮겨 가고 인디케이터만 뒤따라오는 것처럼 보였다.

**해결**:

1. `.navCenter` 를 `position: relative; flex: 1; justify-content: center` 로 바꿨다. 로고와 버튼 묶음이 각자 폭을 차지하고, 남은 공간의 가운데에 메뉴가 놓인다.
2. window `resize` 와 `ResizeObserver`(navCenter, nav) 양쪽에서 변화를 받는다. 변화가 오면 `indicatorInstant` 를 `true` 로 바꾸고 인디케이터 위치를 갱신한 뒤, 마지막 변화 후 120ms 가 지나면 다시 `false` 로 바꾼다. `indicatorInstant` 가 `true` 인 동안에는 인라인 스타일로 `transition: "none"` 을 넣어 인디케이터가 바로 새 위치로 옮겨 간다.

```tsx
<span style={indicatorInstant ? { ...effStyle, transition: "none" } : effStyle} />
```

`Navigation.tsx` 의 인디케이터 렌더링이다. resize 가 끝나면 hover 와 페이지 이동에 쓰는 transition 이 다시 적용된다.

**결론**: 좌우 영역의 폭이 다르거나 바뀌는 경우에는 뷰포트 절대 중앙보다 `flex: 1; justify-content: center` 가 의도한 "가운데" 를 정확히 표현한다. CSS transition 은 한 번의 상태 변화에 맞는 도구이고, resize 나 scroll 처럼 연속으로 들어오는 입력에는 맞지 않는다. 연속 입력 중에는 transition 을 끄고, 입력이 끝나면 다시 켜야 한다.


</details>

<details>
<summary><strong>64. 글리프 존재 판별: 폭 측정과 path 로 굳히기</strong></summary>

**증상**: 탭 아이콘의 로고 기호(✦)가 설정한 브랜드 글꼴 모양이 아니라 기기마다 다른 모양으로 나왔다.

**원인**: 두 가지가 겹쳤다. 브라우저는 탭 아이콘을 그릴 때 웹폰트를 받지 않으므로 SVG 의 `font-family` 이름은 기기 글꼴로 대체된다. 또 브랜드 글꼴(Instrument Serif)에는 U+2726 글리프가 없다(.notdef). 사이트 로고의 기호도 실제로는 시스템 대체 글꼴이 그리고 있었다.

**해결**: 기호 글꼴(Noto Sans Symbols 2)에서 쓰는 기호만 추려 base64 모듈로 넣었다. 파비콘 라우트는 opentype.js 로 외곽선을 뽑아 `<path>` 로 그린다. 페이지에서도 같은 글꼴을 `@font-face` 로 불러오고, 글꼴 스택에서 serif 같은 총칭 이름보다 앞에 둔다. 뒤에 두면 serif 가 먼저 적용된다.

**결론**: `document.fonts.check()` 는 대체 글꼴로 그릴 수 있어도 true 를 돌려주므로 글리프 존재 판별에 쓸 수 없다. 어느 글꼴이 그렸는지는 같은 글자를 글꼴 스택별로 렌더링해 폭을 비교해 확인했다. 탭 아이콘처럼 웹폰트가 적용되지 않는 곳의 글자는 path 로 그려야 모양이 고정된다.


</details>
