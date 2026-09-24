# Trouble Shooting: 컴포넌트 · 기타

[← 전체 목차](../troubleshooting.md)

<details>
<summary><strong>84. 타입 정의 읽기: clearTimeout 은 undefined 만 받는다</strong></summary>

**문제**

`useRef<ReturnType<typeof setTimeout>>()`에서 "Expected 1 arguments, but got 0" 타입 에러 발생

**원인**

- `useRef`는 초기값이 필수 파라미터
- `ReturnType<typeof setTimeout>`은 `null`을 포함하지 않으며, `clearTimeout`은 `null`을 허용하지 않음

**해결**

`undefined`를 초기값으로 명시적으로 제공하고 타입에 포함

```tsx
// ❌ 잘못된 방법
const resetTimerRef = useRef<ReturnType<typeof setTimeout>>(); // 에러: 초기값 필요
const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null); // clearTimeout 타입 에러

// ✅ 올바른 방법
const resetTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
  undefined,
);
```

**인사이트**

`clearTimeout`은 `undefined`를 허용하지만 `null`은 허용하지 않음. Timer ref는 `undefined`로 초기화해야 함


</details>

<details>
<summary><strong>85. 서드파티 DOM 과 z-index: 겹침은 동적으로 관리한다</strong></summary>

**문제**

Contact Drawer가 열렸을 때 reCAPTCHA v3 배지가 overlay 아래에 가려져 보이지 않음

**원인**

- Contact Drawer의 backdrop이 `z-index: var(--z-overlay)` (40)로 fixed 포지셔닝
- Google이 삽입하는 `.grecaptcha-badge` 요소의 z-index가 backdrop보다 낮아 가려짐

**해결**

Drawer 열릴 때 배지에 `z-index: 9999`를 동적으로 설정, 닫힐 때 제거:

```tsx
badge.style.zIndex = isOpen ? "9999" : "";
```

**인사이트**

서드파티가 삽입하는 DOM 요소는 커스텀 overlay/modal과 z-index 충돌이 발생할 수 있음. 동적으로 z-index를 관리해야 함


</details>

<details>
<summary><strong>86. 연속 입력과 transition: resize 스트림 중엔 snap</strong></summary>

**문제**: PC 레이아웃에서 navigation 메뉴는 `position: absolute; left: 50%; transform: translateX(-50%)` 로 viewport 정중앙에 고정되어 있었는데, 우측 navActions(언어/사운드/테마/email/Bell/Logout) 가 길어지면 메뉴와 겹치는 너비 구간이 발생. flex 로 바꿔 좌·우 사이 가운데로 옮겼더니 이번엔 active link 를 가리키는 sliding indicator 가 창 너비 변경 중 ~300ms 의 transition lag 으로 메뉴 위치를 따라가지 못해 계속 어긋난 채로 끌려옴

**원인**:

1. 정중앙 고정은 좌측 로고 폭과 우측 actions 폭이 서로 다르거나 `--page-px` 가 작아질 때 절대 위치가 고려되지 못해 자연스럽게 겹침
2. flex 전환 후 lag 은 `.navIndicator { transition: left var(--duration-moderate) ease, width ... }` 가 항상 활성이라, 매 resize event 가 새 left/width 를 전달해도 indicator 는 이전 값에서 새 값으로 천천히 이동 → 사용자에겐 "메뉴는 즉시 옮겨가는데 indicator 만 뒤따라옴"

**해결**:

1. **레이아웃** — `.navCenter` 를 `position: relative; flex: 1; justify-content: center` 로 전환. 좌측 로고와 우측 actions 가 각자 자기 폭을 점유하고, 그 사이 남는 공간의 가운데에 메뉴가 자연스럽게 자리잡음
2. **indicator transition 인스턴트화** — window `resize` + `ResizeObserver(navCenter + nav)` 양쪽 모두 listen. 발화 시 `setIndicatorInstant(true)` + `updateIndicator()` 호출 후 120ms 디바운스로 다시 false. resize 중엔 `style={{ ...indicatorStyle, transition: "none" }}` 가 inline 으로 들어가 즉시 snap, resize 끝나면 hover/네비게이션용 transition 복원

```tsx
const [indicatorInstant, setIndicatorInstant] = useState(false);
useEffect(() => {
  let endTimer: ReturnType<typeof setTimeout> | null = null;
  const tick = () => {
    setIndicatorInstant(true);
    updateIndicator();
    if (endTimer) clearTimeout(endTimer);
    endTimer = setTimeout(() => setIndicatorInstant(false), 120);
  };
  const ro = new ResizeObserver(tick);
  ro.observe(navCenterRef.current!);
  if (navEl) ro.observe(navEl);
  window.addEventListener("resize", tick);
  // ...
}, [updateIndicator]);

// JSX
<span style={indicatorInstant ? { ...indicatorStyle, transition: "none" } : indicatorStyle} />
```

**인사이트**:

① **viewport 절대중앙은 양쪽 영역의 폭을 모름** — 좌·우가 비대칭이거나 동적이면 flex `flex: 1; justify-content: center` 가 "가운데" 의 의미를 정확히 표현
② **CSS transition 은 "한 번의 사용자 의도" 에 적합하지, 연속 입력에는 부적합** — resize / scroll 같은 연속 stream 동안엔 transition 을 꺼서 매 frame snap 시키고, stream 종료 후 transition 을 복원해야 "부드러운 이동" 의 의미가 유지됨. 인라인 `transition: "none"` 으로 짧게 끄는 패턴이 가장 가벼운 해법


</details>

<details>
<summary><strong>87. 정적 데이터의 key 충돌: 중복 key 는 데이터 중복의 신호</strong></summary>

**문제**: 이모지 picker 개편 중 React 가 `two children with the same key: weather` 경고를 던짐

**원인**: 기존 `ICON_CATEGORIES` 에 이미 weather/shapes/dev 카테고리가 있었는데, 신규 아이콘을 추가하면서 같은 id 로 카테고리를 **중복 생성**

**해결**: 중복 카테고리 제거 + 신규 아이콘을 기존 카테고리에 병합

1. 같은 id 의 중복 카테고리(weather/shapes/dev)를 제거하고 신규 아이콘을 기존 카테고리에 병합
2. 글로벌 아이콘 id 중복도 함께 제거

**인사이트**: 카테고리/아이콘 같은 정적 리스트를 확장할 땐 기존 id 와의 충돌부터 확인해야 한다 — key 중복은 곧 데이터 중복의 신호


</details>

<details>
<summary><strong>88. 글리프 존재 판별: 폭 측정과 path 로 굳히기</strong></summary>

**문제**: 탭 아이콘의 로고 기호(✦)가 설정한 브랜드 글꼴 모양이 아니라 기기마다 다른 모양으로 나왔다.

**원인**: 두 겹이었다. 브라우저는 탭 아이콘을 그릴 때 웹폰트를 받아오지 않아서 SVG 의 `font-family` 이름은 기기 글꼴로 대체된다. 그리고 브랜드 글꼴(Instrument Serif)에는 U+2726 글리프가 아예 없다(.notdef). 사이트 로고의 기호도 사실은 시스템 대체 글꼴이 그리고 있었다.

**해결**: 기호 글꼴(Noto Sans Symbols 2)에서 쓸 기호만 추려 base64 모듈로 굳히고, 파비콘 라우트는 opentype.js 로 외곽선을 뽑아 `<path>` 로 넣는다. 페이지도 같은 글꼴을 `@font-face` 로 얹되 serif 같은 총칭 이름보다 앞에 둔다. 뒤에 두면 serif 가 먼저 걸린다.

**인사이트**: `document.fonts.check()` 는 대체 글꼴로 그릴 수 있어도 true 라 판별에 쓸 수 없다. 어느 글꼴이 그렸는지는 같은 글자를 스택별로 렌더해 폭을 재서 갈랐다. 탭처럼 웹폰트가 닿지 않는 표면의 글자는 path 로 굳히는 것이 확실하다.


</details>
