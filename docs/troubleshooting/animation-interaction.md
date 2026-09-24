# Trouble Shooting: 애니메이션 · 인터랙션

[← 전체 목차](../troubleshooting.md)

<details>
<summary><strong>67. 라이브러리의 진실 소스: Lenis velocity 는 이벤트 안에서 읽는다</strong></summary>

<p align="center">
  <img src="../../public/images/screenshots/pc/works-dark.png" width="100%" alt="Works — Scroll Velocity" />
</p>

**문제**

Works 섹션의 이미지에 스크롤 속도 기반 패럴랙스 효과가 적용되지 않음

실패한 시도:

1. **wheel 이벤트 직접 감지**: 불안정하고 Lenis와 충돌
2. **RAF 폴링으로 scroll delta 계산**: 부정확한 velocity 측정
3. **Lenis velocity 속성 직접 타입 단언**: 스크롤 이벤트 외부에서 접근 시 값이 갱신되지 않음

**원인**

- RAF 폴링 방식으로 스크롤 위치를 직접 계산하면 프레임 간 delta가 일정하지 않아 velocity 값이 부정확하게 측정됨
- Lenis는 내부적으로 velocity를 계산하여 인스턴스 속성으로 제공하지만, 스크롤 이벤트 핸들러 내에서만 정확한 값에 접근 가능

**해결**

Lenis의 네이티브 `on('scroll')` 이벤트를 사용하여 인스턴스에서 직접 velocity 속성 접근

```tsx
// ❌ 잘못된 방법 - RAF 폴링
useEffect(() => {
  const updateOffset = () => {
    const currentScroll = lenis.scroll;
    const delta = currentScroll - prevScrollRef.current; // 부정확한 velocity
    prevScrollRef.current = currentScroll;
    rafIdRef.current = requestAnimationFrame(updateOffset);
  };
  rafIdRef.current = requestAnimationFrame(updateOffset);
}, []);

// ✅ 올바른 방법 - Lenis scroll event
useEffect(() => {
  const handleScroll = () => {
    const velocity = (lenis as any).velocity; // 정확한 velocity
    if (Math.abs(velocity) > 0.05) {
      const offset = Math.max(-50, Math.min(50, velocity * 30));
      workImageOffsetY.set(offset);
    }
  };
  lenis.on("scroll", handleScroll);
  return () => lenis.off("scroll", handleScroll);
}, [lenis]);
```

**인사이트**

Lenis는 내부적으로 velocity를 계산하여 인스턴스 속성으로 제공하므로, 직접 delta를 계산하는 것보다 정확함


</details>

<details>
<summary><strong>68. inline transform 충돌: Framer Motion 과 CSS 가 한 속성을 다툰다</strong></summary>

**문제**

이미지 중앙 정렬에 CSS `transform: translate(-50%, -50%)`를 사용하면 Framer Motion의 `y` 속성이 작동하지 않음

**원인**

- Framer Motion의 `style={{ y }}` 속성은 inline `transform: translateY()`를 생성
- CSS의 `transform` 속성이 이미 설정되어 있으면 Framer Motion의 transform이 덮어씌워지거나 충돌

**해결**

margin 기반 중앙 정렬로 변경하여 CSS transform을 사용하지 않음

```css
/* ❌ 잘못된 방법 - CSS transform 사용 */
.workImageInner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%); /* Framer Motion과 충돌 */
}

/* ✅ 올바른 방법 - margin 기반 정렬 */
.workImageInner {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 130%;
  height: 130%;
  margin-left: -65%; /* width의 절반 */
  margin-top: -65%; /* height의 절반 */
}
```

**인사이트**

Framer Motion의 style 속성은 inline transform을 생성하므로, CSS transform과 분리하여 사용해야 함


</details>

<details>
<summary><strong>69. 무한 스크롤의 수학: 텔레포트 대신 modulo 루프</strong></summary>

<p align="center">
  <img src="../../public/images/screenshots/pc/works-dark.png" width="49%" alt="Works — Dark" />
  <img src="../../public/images/screenshots/pc/works-light.png" width="49%" alt="Works — Light" />
</p>

**문제**

Works 페이지의 수평 스크롤이 끝에 도달하면 역방향으로 스크롤되어 무한 스크롤처럼 보이지 않음

실패한 시도:

1. **스크롤 위치 텔레포트**: 끝에 도달 시 `window.scrollTo`로 처음으로 이동 → 점프가 눈에 보임
2. **Bridge 섹션 분리**: 별도 섹션으로 Bridge 추가 → 수평에서 수직 스크롤로 전환되어 흐름 깨짐
3. **Lenis infinite + 텔레포트**: Lenis와 ScrollTrigger 동시 제어 시 충돌 발생

**원인**

- GSAP ScrollTrigger는 `end` 속성으로 정의된 유한한 스크롤 범위를 가짐
- 스크롤 위치를 직접 변경하면 사용자에게 점프가 보임
- 수평 스크롤은 수직 스크롤을 가로 이동으로 변환하는 방식이므로, 별도 섹션 추가 시 수직 스크롤 구간이 생김

**해결**

스크롤 거리를 매우 길게 설정하고, modulo 연산으로 컨테이너 위치만 순환시킴

```tsx
// 콘텐츠를 3배로 복제
const allProjects = [...projects, ...projects, ...projects];

// 스크롤 거리를 10배로 설정 (사실상 무한)
const scrollDistance = oneSetWidth * 10;

gsap.to(container, {
  scrollTrigger: {
    end: () => `+=${scrollDistance}`,
    onUpdate: (self) => {
      // modulo로 위치 순환 - 스크롤은 계속 진행되지만 시각적으로 루프
      const totalProgress = self.progress * scrollDistance;
      const loopedX = totalProgress % oneSetWidth;
      gsap.set(container, { x: -loopedX });
    },
  },
});
```

**인사이트**

스크롤 위치 텔레포트보다 긴 스크롤 범위 + 시각적 위치 루프 방식이 더 자연스러운 무한 스크롤 경험 제공


</details>

<details>
<summary><strong>70. 스크롤 위치 래핑: 세트 복제보다 위치 순환</strong></summary>

**문제**

Works 페이지의 가로 스크롤 갤러리에서 프로젝트를 10세트 반복했지만, 끝까지 스크롤하면 흰 화면이 나타나 진정한 무한 스크롤이 아님

실패한 시도:

1. **세트 수 증가**: 반복 세트를 더 늘리면 DOM 노드가 과다해져 성능 저하
2. **끝에서 처음으로 텔레포트**: 스크롤 위치 점프가 눈에 보임

**원인**

- 유한한 반복 세트(10세트)로는 양쪽 방향 모두 끝이 존재
- GSAP의 requestAnimationFrame 루프에서 scrollX가 계속 누적되어 콘텐츠 범위를 벗어남

**해결**

인트로 요소들의 `offsetLeft` 차이로 한 세트 너비(`oneSetWidth`)를 계산하고, `while` 루프로 scrollX/targetScrollX를 래핑

```tsx
// 한 세트 너비 계산 (연속된 인트로 간 거리)
const introEls = slider.querySelectorAll(`.${styles.intro}`);
let oneSetWidth = 0;
if (introEls.length >= 2) {
  oneSetWidth = introEls[1].offsetLeft - introEls[0].offsetLeft;
}

// 애니메이션 루프에서 양방향 래핑
if (oneSetWidth > 0) {
  while (scrollX > oneSetWidth * 3) {
    scrollX -= oneSetWidth;
    targetScrollX -= oneSetWidth;
  }
  while (scrollX < -oneSetWidth * 3) {
    scrollX += oneSetWidth;
    targetScrollX += oneSetWidth;
  }
}
```

**인사이트**

콘텐츠 복제 세트 수를 늘리는 것보다, 스크롤 위치 자체를 래핑하는 방식이 DOM 부담 없이 진정한 무한 스크롤을 구현할 수 있음


</details>

<details>
<summary><strong>71. 뷰포트 의존 초기화: key 리마운트로 재계산</strong></summary>

| PC | Tablet | Mobile |
|:---:|:---:|:---:|
| <img src="../../public/images/screenshots/pc/works-dark.png" width="100%" /> | <img src="../../public/images/screenshots/tablet/works-dark.png" width="100%" /> | <img src="../../public/images/screenshots/mobile/works-dark.png" width="100%" /> |

**문제**

데스크톱↔태블릿↔모바일 간 뷰포트 리사이즈 시 GSAP ScrollTrigger pin, RAF counter-translation 등의 애니메이션이 이전 뷰포트 기준으로 고정되어 레이아웃이 깨짐

**원인**

- GSAP ScrollTrigger의 `start`, `end`, `pin` 설정이 생성 시점의 뷰포트 크기로 계산됨
- RAF 기반 counter-translation도 초기 `extraWidth` 값을 기준으로 동작
- 뷰포트 크기가 변해도 기존 인스턴스가 자동으로 갱신되지 않음

실패한 시도:

1. **개별 컴포넌트에서 breakpoint 추적**: 각 패널에서 resize listener + effect 재실행 → 코드 중복, 일부 패널 누락
2. **ScrollTrigger.refresh()**: 일부 케이스에서 작동하지만, 가로↔세로 레이아웃 전환처럼 근본적인 DOM 구조 변경은 처리 불가

**해결**

root layout에 `BreakpointGuard` 컴포넌트를 추가하여 breakpoint 변경 시 페이지 콘텐츠 전체를 remount

```tsx
// src/components/common/BreakpointGuard.tsx
function getBreakpoint(): "desktop" | "tablet" | "mobile" {
  const w = window.innerWidth;
  if (w > 1024) return "desktop";
  if (w >= 768) return "tablet";
  return "mobile";
}

export default function BreakpointGuard({ children }) {
  const [bp, setBp] = useState("desktop");

  useEffect(() => {
    const check = () => setBp(getBreakpoint());
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return <div key={bp}>{children}</div>; // key 변경 → children remount
}

// src/app/layout.tsx
<main>
  <BreakpointGuard>{children}</BreakpointGuard>
</main>;
```

Provider(Theme, Language, Lenis) 위에 배치하면 상태가 초기화되므로, Provider 안쪽 `<main>` 내부에 배치하여 Provider 상태는 유지하면서 페이지 콘텐츠만 remount

부수 효과 및 해결:

- 비디오 요소가 DOM에서 제거되면서 `play()` Promise가 AbortError로 reject됨 → `.catch(() => {})` 추가
- 모든 컴포넌트의 `useState` 초기값이 리셋됨 → 모듈 레벨 플래그(예: `hasCompletedInitialLoad`)로 보완

**인사이트**

GSAP ScrollTrigger처럼 생성 시점의 뷰포트에 의존하는 애니메이션은 `ScrollTrigger.refresh()`로 부분 갱신하기보다, React의 `key` prop을 활용한 완전 remount가 더 안정적. Provider를 remount 범위 밖에 배치하면 전역 상태 손실 없이 페이지 단위 재초기화가 가능


</details>

<details>
<summary><strong>72. 가림과 시작 신호: 로딩 화면 아래에서 미리 도는 애니메이션</strong></summary>

**문제**

About 페이지 진입 시 로딩 스크린이 표시되는 동안 HeroPanel의 콘텐츠(텍스트, 애니메이션)가 뒤에서 이미 렌더링·재생되어, 로딩이 끝났을 때 첫 인상이 의도한 것과 다름

**원인**

HeroPanel의 진입 애니메이션이 컴포넌트 마운트 시 즉시 시작되었음. 로딩 화면은 `z-index`로 위에 덮고 있을 뿐, 아래 레이어에서 애니메이션은 이미 진행·완료됨

**해결**

`heroReady` 클래스를 로딩 완료 후에만 부여하고, HeroPanel의 진입 애니메이션과 콘텐츠 표시를 이 클래스에 의존하도록 변경. 로딩이 끝나기 전까지 패널은 **시각적으로 비활성 상태**를 유지

**인사이트**

로딩 화면 아래의 콘텐츠는 **z-index로 가리는 것만으로 부족**. 애니메이션 시작 시점을 로딩 완료에 연동해야 의도한 첫 인상을 보장할 수 있음


</details>

<details>
<summary><strong>73. 상태와 동기 ref: 모드 전환의 잔상 리셋</strong></summary>

**문제**

에디터 이미지·열블록 리사이즈 핸들에 커스텀 커서(↔, ↕, ⤡ 등)를 적용했더니, 마우스 이동 방향에 따라 커서 화살표가 회전·찌그러짐

**원인**

CursorTrail의 애니메이션 루프가 마우스 속도에 따라 `angleRef`(회전)와 `scaleRef`(스케일)를 계산하는데, 리사이즈 모드 진입 시에도 이전 값이 그대로 남아 있었음. 또한 리사이즈 감지를 classList로 하면 React 렌더 타이밍과 어긋나서 1~2프레임 지연 발생

**해결**

`cursorTypeRef`(동기 ref)를 추가하여 `setCursorType`과 동시에 갱신. 리사이즈 모드 진입 시 `angleRef`·`scaleRef`를 즉시 0으로 리셋하고, 애니메이션 루프에서 `cursorTypeRef.current`로 리사이즈 여부를 판단하여 회전·스케일을 완전히 비활성화

**인사이트**: 모드 전환이 잦은 애니메이션 값은 state 와 동기 ref 를 짝으로 들고, 모드에 들어가는 시점에 이전 값을 명시적으로 리셋해야 잔상이 남지 않는다.


</details>

<details>
<summary><strong>74. 자리표시자 크기: 스켈레톤이 첫 레이아웃 계산을 정한다</strong></summary>

**문제**: About 페이지를 열면 첫 패널이 화면 밖에서 시작하거나 어긋난 자리에서 멈췄다.

**원인**: 동적 import 로 불러오는 패널의 스켈레톤 폭과 실제 폭이 달랐다. ErdPanel 은 스켈레톤이 350vw 로 잡혀 있었고 실제는 100vw 였다. 여기에 React strict mode 의 두 번째 마운트에서 GSAP 이 transform 을 초기화하면서 계산이 한 번 더 어긋났다.

**해결**: 스켈레톤 폭을 실제 폭과 맞추고, cleanup 에서 transform 을 되돌리지 않도록 바꿨다. 초기화가 두 번 도는 것은 `initializedRef` 가드로 막았다.

**인사이트**: 가로 스크롤 계산은 자리표시자의 크기에 의존한다. 스켈레톤이 실제와 다른 크기면 첫 계산이 통째로 틀어진다.


</details>

<details>
<summary><strong>75. 애니메이션 콜백의 침묵: 값이 같으면 발화하지 않는다</strong></summary>

**문제**: PostCard → 포스트 상세로 이동할 때, **이미지가 hero 크기로 축소된 뒤 오버레이가 사라지지 않고 영원히 hold 상태로 남는** 현상. 추가로 축소 직후 그 아래로 `loading.tsx` 의 스켈레톤이 그대로 보여 "이미지가 작아지고 → 스켈레톤이 한참 동안 보이는" 어색한 시퀀스 발생

**원인**: 두 가지가 겹침

1. 원래 설계는 `expand → morph(히어로) → hold` 자동 진행 후, DetailLayout 의 hero `motion.div` 에 걸린 `onAnimationStart` 콜백이 `endTransition()` 을 호출해 dismissal 트리거. 그런데 `initial={{ opacity: isTransitioning ? 1 : 0 }}` + `animate={{ opacity: 1 }}` 가 isTransitioning=true 일 때 둘 다 `1` → framer-motion 이 "값 변화 없음" 으로 판정해 **콜백이 발화되지 않고** phase 가 "hold" 에 영원히 머무름
2. morph 가 클릭 후 ~1s 시점 고정 타이밍 → **새 페이지가 준비되기 전에 오버레이가 작아져버림**. Suspense fallback (`loading.tsx`) 이 morph 직후 노출됨

**해결**: 전환 상태 머신 재설계

1. **dismissal 트리거 변경** — `onAnimationStart` 의존 제거, DetailLayout 의 `useEffect` 에서 mount 시 `endTransition()` 호출
2. **backdrop fullscreen 유지** — hold 단계에서 backdrop 이 화면 전체를 덮어 morph 후에도 스켈레톤을 가림 (이전엔 backdrop 도 hero 영역만 채웠음)
3. **`SAFETY_MS = 5000` 안전망** — 어떤 이유로든 endTransition 이 호출되지 않으면 PageTransitionProvider 가 강제 dismiss
4. **`endRequestedRef` short-circuit** — 빠른 mount(데이터 캐시 hit) 시 expand/morph 진행 중에 endTransition 이 호출되면 hold 를 건너뛰고 완료 시점에 곧장 done 으로 진입

**인사이트**: ① **애니메이션 라이프사이클 콜백(onAnimationStart, onAnimationComplete) 을 critical state transition 의 단독 트리거로 사용하면 안 됨** — initial===animate 같은 "값 변화 없음" 케이스에서 silent 실패 가능. 항상 useEffect 기반 fallback 이나 setTimeout 안전망과 함께 설계해야 함. ② Suspense fallback 환경에서 "morph-into-hero" 같은 모핑 전환을 설계할 때는 **오버레이가 축소되면 그 아래가 노출된다는 시각 계약을 항상 의식**해야 함. 해결책은 (a) **backdrop 으로 morph 후에도 화면 전체를 덮어두기**, 또는 (b) **새 페이지 mount 시점까지 morph 를 지연** 두 가지뿐


</details>

<details>
<summary><strong>76. enter/leave 비대칭: transition-delay 의 한계</strong></summary>

**문제**: `/posts` 의 Series row 카드를 hover 하면 deck 형태로 펼쳐지면서 소속 글 4개가 layer 로 등장해야 하는데, 초기 구현은 (1) 펼쳐지는 순간 deck 이 한 번 사라졌다 나타나는 듯한 깜빡임 (2) hover 직후 너무 빨리 펼쳐져 의도된 deck 멈춤이 안 보임 (3) 펼친 상태에서 layer 가 한 장씩 순차 등장하지 않고 동시에 등장하는 문제 다발

**원인**:

1. layer 등장에 CSS `transition-delay` 로 stagger 를 줬는데, **hover-out 시 모든 delay 가 동시에 cancel** 되어 layer 들이 한꺼번에 사라짐 → "사라졌다 나타나는" 듯한 시각 효과
2. transform 의 ease 가 overshoot 계열 `cubic-bezier(0.34, 1.45, ...)` 이라 펼치기 시작 직전부터 미리 약간 벌어진 상태로 보임 → "이미 펼쳐진 것처럼 보임"
3. CSS `transition-delay: 0s` 라 마우스 진입 즉시 펼쳐짐 → "deck 이 멈춰있다가 펼쳐지는" 의도된 시퀀스 부재

**해결**: stagger / delay / easing 셋을 모두 JS state 기반으로 재설계

1. **펼침 트리거를 JS state 로** — `setTimeout(() => setOpen(true), 800)` 으로 800ms 의도된 hold 후 `data-deck-open` flip. CSS `transition-delay` 가 아닌 state 변경 시점이 분명하므로 hover-out 시 timer 만 clear 하면 깔끔히 취소됨
2. **layer 별 stagger 도 CSS 변수로** — `--deck-i` 를 layer index 로 부여하고 `transition-delay: calc(1s + (var(--deck-i, 1) - 1) * 0.4s)` 로 각 layer 가 직전 layer 펼침이 끝난 뒤 시작되도록 명시 (총 4 layer × 0.4s = 1.6s 의 시각적 명확성)
3. **easing 을 standard ease 로** — `cubic-bezier(0.4, 0, 0.2, 1)` 로 교체해 미리 펼친 듯한 overshoot 제거
4. **opacity fade** — layer label / title 도 같은 stagger 로 fade-in 시켜 "한 장씩 들춰지는" 느낌 강화

**인사이트**: ① **CSS `transition-delay` 는 enter 와 leave 에 똑같이 적용된다** — "동시 사라짐 + 순차 등장" 같은 비대칭 시퀀스는 CSS 만으론 어렵다. JS state + 명시적 timer 로 enter/leave 타이밍을 분리해야 의도대로 동작. ② Hover 펼침처럼 "잠깐 hold 후 등장" 시퀀스는 `transition-delay` 보다 `setTimeout + state flip` 이 의미가 명확하고 cancel 도 깔끔. ③ Overshoot easing 은 마이크로 모션에서 "이미 시작된 것처럼" 보이게 만드므로, **stop → animate 가 분명해야 하는 시퀀스에는 standard ease 가 더 적합**


</details>

<details>
<summary><strong>77. 포인터 캡처와 히트 영역: margin 은 hit-area 가 아니다</strong></summary>

**문제**: deck 이 펼쳐진 상태에서 (1) layer 카드를 클릭하면 SeriesCard 의 click 이 전혀 발화되지 않음 (2) layer 와 layer 사이 마진을 마우스가 지나갈 때 hover 가 종료되어 deck 이 닫히고, 다시 layer 위에 들어가면 펼침이 재시작되는 flicker 발생

**원인**:

1. 부모 row 가 가로 스크롤 + 드래그 지원 때문에 `setPointerCapture(e.pointerId)` 를 사용했는데, **pointer 가 캡처된 동안에는 자식의 click 이 부모로 흡수**되어 layer 의 onClick 이 발화되지 않음
2. 펼침 시 next 카드를 밀어내려고 `margin-right: 660px` 같은 식으로 visual 만 확장했는데, `box-sizing: border-box` 와 무관하게 margin 은 element 의 hit-area 를 늘리지 않음. 따라서 layer 와 layer 사이의 gap(16px) 위에 마우스가 올라가면 카드 밖으로 인식되어 hover 종료

**해결**:

1. `setPointerCapture` 자체를 제거하고 **document-level `pointermove` / `pointerup` 리스너** 로 드래그 추적. click suppression 은 별도 flag(`draggedRef.current = movement > 5px`)로 구현
2. 펼침 상태일 때만 `::after { position: absolute; left: 0; top: 0; bottom: 0; width: <펼쳐진 너비>; }` pseudo 를 부여해 layer 끝까지 hit-area 확장. pseudo 는 layer 의 자손이 아니므로 click 을 가로채지 않으면서 hover 만 잡아둠

```css
.card.deckOpen {
  margin-right: 660px;  /* visual 영역 확장 — next 카드 밀어내기 */
}
.card.deckOpen::after {
  content: "";
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: calc(100% + 660px); /* hit-area 확장 — flicker 방지 */
  pointer-events: auto;
}
```

**인사이트**: ① `setPointerCapture` 는 **드래그 추적 시 편리하지만 자식 click 을 모두 흡수**한다. 자식 클릭이 필요한 컴포넌트라면 document-level pointer 리스너 + 거리 기반 click suppression 이 더 안전. ② **margin 은 visual 위치만 바꾸고 hit-area 는 안 늘린다.** Hover 영역을 확장하려면 `padding-right`(box-sizing: content-box) 또는 `::after` pseudo 가 표준 패턴. content-box 는 다른 layout 부수효과가 크므로 pseudo 가 더 깔끔. ③ Hover 기반 멀티 스텝 인터랙션(deck 펼침 등)은 마우스가 layer 사이를 지나가는 micro-second 라도 hover 가 끊기면 즉시 flicker — **hover area 는 시각적 boundary 보다 한 단계 더 넓게** 잡아야 안정적


</details>

<details>
<summary><strong>78. drag 중의 이벤트 정지: dragover 로 좌표를 잇는다</strong></summary>

**문제**: RelationPicker / SortOrderDragList / 시리즈 정렬 등에서 HTML5 드래그를 시작하면 (1) `CursorTrail` 이 마우스 위치를 따라가지 않고 그 자리에 멈추고, (2) drag 중 마우스가 다른 요소 위를 지나갈 때마다 cursor type 이 "text" / "big" / "" 등으로 바뀌어 시각적으로 산만함

**원인**: 브라우저는 HTML5 drag 진행 중에는 **`pointermove` / `mousemove` 발화를 의도적으로 억제**하고 그 자리를 `dragover` 가 대신 채움. CursorTrail 의 위치 추적은 `pointermove` 만 listen 했으므로 좌표가 업데이트되지 않음. 또 `runHitTest` 가 60ms throttle 로 elementFromPoint 결과를 기반으로 cursor type 을 갱신하는데, drag 중에도 그대로 동작하면 "내가 지금 잡고 있는 것" 의 cursor 가 hover 한 요소에 따라 매번 바뀌어 일관성 깨짐

**해결**: 두 가지 패치를 함께

1. **`dragover` 를 `handleMouseMove` 로 forward** — DragEvent 와 PointerEvent 가 `clientX/Y` 만 공유한다는 점만 활용해 캐스팅 후 호출. 좌표 stream 복원
2. **drag 시작 시점에 cursor type lock** — `dragstart` 에서 `isHtml5Dragging = true` + `cursorTypeRef.current = "grab"` + `setCursorType("grab")`, `runHitTest` 진입부에서 dragging 중이면 즉시 return. `dragend` / `drop` 에서 flag 해제

```ts
let isHtml5Dragging = false;
const onDragStart = () => {
  isHtml5Dragging = true;
  cursorTypeRef.current = "grab";
  setCursorType("grab");
};
document.addEventListener("dragstart", onDragStart, true);
window.addEventListener("dragover", (e) => handleMouseMove(e as unknown as PointerEvent));

const runHitTest = (mx: number, my: number) => {
  if (isHtml5Dragging) return; // grab 고정 — hover 한 요소에 따라 흔들리지 않음
  // ...
};
```

**인사이트**: HTML5 native drag 가 활성이면 pointer 이벤트는 **시스템 차원에서 정지**한다. `dragover` 로 좌표는 받을 수 있지만, drag 시작 자체와 끝을 따로 추적하지 않으면 hit-test 가 "이 사람이 뭔가 잡고 있다" 는 의미를 모름. 커스텀 커서처럼 hover 마다 모드를 바꾸는 컴포넌트는 **drag 시작점에 modes 를 동결, drag 끝점에 해제** 하는 ref 기반 lock 이 필수


</details>

<details>
<summary><strong>79. HTML5 D&D 의 한계: micro-reorder 는 pointer 로</strong></summary>

**문제**: RelationPicker 의 chip 순서 변경 / SortOrderDragList 의 페이지네이션 항목 정렬에서 HTML5 D&D 가 다음 세 가지 문제를 동시에 일으킴

1. `draggable={dragId === id}` 같은 state 토글 패턴이 React batching 때문에 DOM `draggable` 속성 갱신 시점이 늦어 드래그가 시작 안 됨
2. 같은 코드인데도 "뒤→앞" 은 잘 되고 "앞→뒤" 만 작동 안 하는 비대칭
3. 페이지네이션된 리스트에서 source chip 이 페이지 전환으로 unmount 되면 브라우저가 즉시 drag cancel

**원인**: HTML5 D&D 는 DOM `draggable` 속성을 **drag 시작 시점에 한 번 읽고**, 이후 변경에 반응하지 않음. 또 source 노드가 unmount 되면 drag session 자체가 취소됨. "앞→뒤" 비대칭은 같은 row 안에서 chip 순서가 바뀌면 React 가 key 기반으로 reconcile 할 때 source DOM 이 다른 위치로 옮겨지면서 drag tracking 이 끊기는 동일 메커니즘. 결국 작은 컴포넌트(chip / list item)에서 D&D 를 쓰면 quirks 의 합산이 너무 큼

**해결**: 두 컴포넌트 모두 **pointer-based drag** 로 교체

1. **handle 의 `pointerdown` → document-level 추적** — `pointermove` 에서 매 frame `elementFromPoint(ev.clientX, ev.clientY)` → `closest("[data-chip-id]")` 로 hover target id 추적. `pointerup` 에서 `selectedIds` 를 splice 해 onChange
2. **페이지네이션 리스트의 edge 처리** — list 상하 60px 영역 hover 시 `apply()` 로 source 를 인접 페이지의 첫/끝 위치로 **실제로 reorder**. 단순 setPage 는 source 가 unmount 되어 cancel 되므로, 위치 이동 자체로 source 가 새 페이지에 자연스럽게 살아남도록 함
3. **`setPointerCapture` 사용 안 함** — 자식 click 을 흡수해 chip 의 onClick(× 제거) 이 죽음

```tsx
onPointerDown={(e) => {
  if (e.button !== 0) return;
  e.preventDefault();
  const sourceId = id;
  setDragId(sourceId);
  let lastTargetId: string | null = null;
  const onMove = (ev: PointerEvent) => {
    const elem = document.elementFromPoint(ev.clientX, ev.clientY);
    const tId = elem?.closest("[data-chip-id]")?.getAttribute("data-chip-id") ?? null;
    if (tId && tId !== sourceId && tId !== lastTargetId) {
      lastTargetId = tId;
      setDragOverId(tId);
    }
  };
  const onUp = (ev: PointerEvent) => { /* splice + onChange */ };
  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onUp);
}}
```

**인사이트**: HTML5 native D&D 는 "이미지 / 파일을 OS 수준에서 다른 앱으로 끌어 가는" 케이스에 최적화되어 있고, **같은 페이지 안에서 작은 항목 순서를 바꾸는 용도로는 quirks 의 합이 너무 큼.** state-driven `draggable` 토글, source unmount 시 cancel, 자식 click 차단 (`setPointerCapture` 시), "앞→뒤" 비대칭 등은 전부 D&D 표준의 부산물. **chip / list item 같은 micro-reorder 는 처음부터 pointer events 로 짜는 게** 결과적으로 코드 양도 적고 동작도 일관적


</details>

<details>
<summary><strong>80. 지연 캡처: 이동 임계값 전엔 클릭을 살려 둔다</strong></summary>

**문제**: 가로 캐러셀 안에 든 팀원 폴라로이드(플립) 카드를 클릭해도 토글이 안 됨. 카드 자체엔 `onClick` 이 정상으로 붙어 있는데도 이벤트가 도달하지 않음

**원인**: 캐러셀이 마우스 드래그 스크롤을 위해 `onPointerDown` 에서 **즉시 `el.setPointerCapture()`** 를 호출

- 포인터가 캡처되면 이후 pointer 이벤트가 전부 캐러셀로 redirect 되고, 그 결과 자식 카드의 `click`(= pointerdown→up 한 쌍) 이 카드까지 전달되지 않음
- 즉 "드래그하려고 캡처" 가 "탭/클릭" 까지 같이 삼켜 버린 것

**해결**: 캡처를 **pointerdown 시점이 아니라 실제 드래그가 시작된 시점으로 미룸**

1. `onPointerDown` 에선 시작 좌표만 기록(`active: true`) — 캡처는 하지 않음
2. `onPointerMove` 에서 이동량이 **4px 을 넘긴 순간** 비로소 `setPointerCapture()` + `data-cursor="grab"` 설정 → 진짜 드래그로 판정
3. 4px 미만으로 떼면 캡처가 일어나지 않아 `click` 이 자식에 정상 전달. `onClickCapture` 는 `moved` 플래그가 섰을 때만 click 을 막아, 드래그 끝의 의도치 않은 클릭을 차단

**인사이트**:

① `setPointerCapture` 를 pointerdown 에서 바로 부르면 **클릭과 드래그를 구분할 기회 자체가 없어진다** — 캡처가 자식 이벤트를 통째로 가져감
② "이동 임계값(4px)을 넘기 전까진 캡처하지 않는다" 가 클릭과 드래그를 공존시키는 표준 패턴 (TagCloud3D·Series Deck 와 동일한 원인·해법)


</details>

<details>
<summary><strong>81. 축 기반 휠 라우팅: 통짜 prevent 는 세로까지 막는다</strong></summary>

**문제**: 코드블록 위에 마우스를 두고 세로로 휠을 굴리면 페이지가 안 움직였다 — 코드블록만 스크롤을 삼키는 느낌.

**원인**: 코드블록 `<pre>` 에 `data-lenis-prevent` 를 통째로 걸었다. 가로 스크롤(넓은 코드)을 살리려는 의도였는데, Lenis 가 그 요소 위 wheel 을 아예 무시하다 보니 블록이 세로로 안 넘칠 때 세로로 굴려도 페이지가 안 움직였다(Lenis 는 body 를 직접 스크롤하지 않아 native 세로 스크롤로도 안 빠진다).

**해결**: 통짜 prevent 대신 축(axis) 기반 wheel 라우팅으로 교체.

1. 가로 제스처(`|deltaX|>|deltaY|` 또는 shift+wheel) → 블록이 가로로 넘치면 블록을 가로 스크롤
2. 세로 제스처 → 블록이 세로로 스크롤 가능하고 끝이 아니면 블록을, 아니면 이벤트를 그냥 흘려보냄(fall-through)
3. Lenis 는 window(bubble)에서 wheel 을 듣고 `composedPath` 로 처리 — 블록 내부에서 `stopPropagation` 하면 Lenis 가 그 이벤트를 건너뛰고, 안 하면 Lenis 가 페이지를 굴린다. 터치는 `data-lenis-prevent-touch` 로 네이티브 유지

**인사이트**: 스무스 스크롤 위에서 "특정 영역만 자기 스크롤" 을 만들 때 통짜 prevent 는 세로 통과까지 막는다 — 축·경계를 판단해 필요한 방향만 가로채고 나머지는 라이브러리로 흘려보내야 중첩 스크롤이 자연스럽다


</details>

<details>
<summary><strong>82. 라이브러리 규약 밖의 이벤트: preventDefault 와 opt-out 표시의 짝</strong></summary>

**문제**: 가로 스크롤 섹션에서 패널은 좌우로 도는데 페이지도 같이 세로로 밀렸다.

**원인**: 전역 Lenis 는 window 에 자기 휠 리스너를 달고 델타를 받아 `scrollTo` 로 페이지를 직접 굴린다. Lenis 1.0.42 의 `onVirtualScroll` 은 `event.defaultPrevented` 를 확인하지 않는다. `preventDefault()` 가 막는 것은 브라우저 기본 스크롤뿐이다.

**해결**: 휠을 가로채는 요소에 `data-lenis-prevent-wheel` 표시를 붙였다. Lenis 는 `composedPath` 에서 이 표시를 찾으면 물러난다. 끝에 닿아 세로로 넘겨야 할 때는 표시를 떼서 Lenis 가 이어받게 한다. 정리 함수에서 표시를 걷지 않으면 모바일 배치에서 세로 스크롤이 죽는다.

**인사이트**: 스크롤 라이브러리는 브라우저의 이벤트 규약 밖에서 돈다. `preventDefault` 와 라이브러리 전용 표시를 짝으로 관리해야 한다.


</details>

<details>
<summary><strong>83. 링크가 공짜로 주는 것들: 캔버스에선 전부 다시 만든다</strong></summary>

<p align="center">
  <img src="../../public/images/screenshots/pc/works-cylinder-light.png" width="100%" alt="Works Cylinder — 3D 원통 배치" />
</p>

**문제**: 원통 배치의 작업물 판을 가운데 클릭해도 새 탭이 열리지 않았다. 키보드로는 판에 접근할 방법이 없었다.

**원인**: 브라우저는 가운데 클릭에 `click` 대신 `auxclick` 을 쏘고 react-three-fiber 는 auxclick 을 듣지 않는다. 캔버스를 `<a>` 로 감싸는 방법은 커스텀 커서(CursorTrail)가 `closest("a, button")` 로 판이 없는 자리까지 링크 커서로 그려 쓸 수 없었다.

**해결**: 메시의 `onPointerDown` 과 `onPointerUp` 에서 `button === 1` 을 같은 메시로 짝지어 처리하고, `onPointerLeave` 에서 기록을 지운다. 보조 키 클릭은 `window.open(href, "_blank", "noopener")` 로 연다. 키보드는 초점이 오면 보이는 링크 목록을 두고 초점 이동에 맞춰 원통을 돌린다.

**인사이트**: 캔버스 위 상호작용을 링크처럼 만들려면 브라우저가 링크에 공짜로 주는 것들(가운데 클릭, 보조 키, 키보드 초점)을 하나씩 직접 구현해야 한다. 어느 하나라도 빠지면 접근성 구멍이 된다.


</details>
