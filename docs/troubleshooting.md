# Trouble Shooting

> 개발 과정에서 마주친 주요 이슈들과 해결 과정입니다. 각 항목은 접어두었습니다.

<details>
<summary><strong>1. Lenis Scroll Velocity 효과 미작동</strong></summary>

<p align="center">
  <img src="public/docs/screenshots/pc/works-dark.png" width="100%" alt="Works — Scroll Velocity" />
</p>

#### 문제

Works 섹션의 이미지에 스크롤 속도 기반 패럴랙스 효과가 적용되지 않음

#### 시도한 방법들 (실패)

1. **wheel 이벤트 직접 감지**: 불안정하고 Lenis와 충돌
2. **RAF 폴링으로 scroll delta 계산**: 부정확한 velocity 측정
3. **Lenis velocity 속성 직접 타입 단언**: 스크롤 이벤트 외부에서 접근 시 값이 갱신되지 않음

#### 원인

- RAF 폴링 방식으로 스크롤 위치를 직접 계산하면 프레임 간 delta가 일정하지 않아 velocity 값이 부정확하게 측정됨
- Lenis는 내부적으로 velocity를 계산하여 인스턴스 속성으로 제공하지만, 스크롤 이벤트 핸들러 내에서만 정확한 값에 접근 가능

#### 해결

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

#### TL;DR

Lenis는 내부적으로 velocity를 계산하여 인스턴스 속성으로 제공하므로, 직접 delta를 계산하는 것보다 정확함

---


</details>

<details>
<summary><strong>2. Framer Motion transform과 CSS transform 충돌</strong></summary>

#### 문제

이미지 중앙 정렬에 CSS `transform: translate(-50%, -50%)`를 사용하면 Framer Motion의 `y` 속성이 작동하지 않음

#### 원인

- Framer Motion의 `style={{ y }}` 속성은 inline `transform: translateY()`를 생성
- CSS의 `transform` 속성이 이미 설정되어 있으면 Framer Motion의 transform이 덮어씌워지거나 충돌

#### 해결

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

#### TL;DR

Framer Motion의 style 속성은 inline transform을 생성하므로, CSS transform과 분리하여 사용해야 함

---


</details>

<details>
<summary><strong>3. TypeScript useRef 타입 에러</strong></summary>

#### 문제

`useRef<ReturnType<typeof setTimeout>>()`에서 "Expected 1 arguments, but got 0" 타입 에러 발생

#### 원인

- `useRef`는 초기값이 필수 파라미터
- `ReturnType<typeof setTimeout>`은 `null`을 포함하지 않으며, `clearTimeout`은 `null`을 허용하지 않음

#### 해결

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

#### TL;DR

`clearTimeout`은 `undefined`를 허용하지만 `null`은 허용하지 않음. Timer ref는 `undefined`로 초기화해야 함

---


</details>

<details>
<summary><strong>4. GSAP ScrollTrigger 수평 무한 스크롤 구현</strong></summary>

<p align="center">
  <img src="public/docs/screenshots/pc/works-dark.png" width="49%" alt="Works — Dark" />
  <img src="public/docs/screenshots/pc/works-light.png" width="49%" alt="Works — Light" />
</p>

#### 문제

Works 페이지의 수평 스크롤이 끝에 도달하면 역방향으로 스크롤되어 무한 스크롤처럼 보이지 않음

#### 시도한 방법들 (실패)

1. **스크롤 위치 텔레포트**: 끝에 도달 시 `window.scrollTo`로 처음으로 이동 → 점프가 눈에 보임
2. **Bridge 섹션 분리**: 별도 섹션으로 Bridge 추가 → 수평에서 수직 스크롤로 전환되어 흐름 깨짐
3. **Lenis infinite + 텔레포트**: Lenis와 ScrollTrigger 동시 제어 시 충돌 발생

#### 원인

- GSAP ScrollTrigger는 `end` 속성으로 정의된 유한한 스크롤 범위를 가짐
- 스크롤 위치를 직접 변경하면 사용자에게 점프가 보임
- 수평 스크롤은 수직 스크롤을 가로 이동으로 변환하는 방식이므로, 별도 섹션 추가 시 수직 스크롤 구간이 생김

#### 해결

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

#### TL;DR

스크롤 위치 텔레포트보다 긴 스크롤 범위 + 시각적 위치 루프 방식이 더 자연스러운 무한 스크롤 경험 제공

---


</details>

<details>
<summary><strong>5. Lighthouse 성능 최적화 — reCAPTCHA 지연 로딩</strong></summary>

<p align="center">
  <img src="public/docs/screenshots/pc/home-light.png" width="100%" alt="Home — Lighthouse" />
</p>

#### 문제

Lighthouse 모바일 Performance 점수 48점. LCP 17.1초, TTI 18.2초로 심각한 성능 저하

#### 원인 분석

Lighthouse 보고서(Desktop/Mobile)를 분석한 결과 주요 병목:

1. **reCAPTCHA v3 즉시 로딩**: `GoogleReCaptchaProvider`가 앱 전체를 감싸며 초기 로드 시 ~784KB JS를 즉시 다운로드. 메인 스레드 280ms 차단
2. **Preconnect 미설정**: Google 도메인에 대한 사전 연결 없이 요청 시작 → 400ms 지연
3. **색상 대비 미달**: `#6b7280` on `#f8f6f0` (4.47:1, 기준 4.5:1 미달), `#ff4f9d` on `#f8f6f0` (2.83:1)
4. **접근성**: heading 순서 건너뜀 (h1 → h3), aria-label과 표시 텍스트 불일치

#### 해결

**1. reCAPTCHA 지연 로딩** — 가장 큰 영향

유저 인터랙션(scroll/click/touch/keydown) 또는 4초 경과 후에만 reCAPTCHA 스크립트를 로드하도록 변경:

```tsx
// ❌ 기존 - 앱 마운트 시 즉시 로드 (784KB)
<GoogleReCaptchaProvider reCaptchaKey={siteKey}>
  {children}
</GoogleReCaptchaProvider>

// ✅ 개선 - 유저 인터랙션 후 지연 로드
const [shouldLoad, setShouldLoad] = useState(false);

useEffect(() => {
  const load = () => setShouldLoad(true);
  const timer = setTimeout(load, 4000);
  const events = ["scroll", "click", "touchstart", "keydown"] as const;
  const handler = () => { load(); cleanup(); };
  // ...이벤트 리스너 등록 (once: true, passive: true)
}, []);

if (!shouldLoad) return <>{children}</>;
return <GoogleReCaptchaProvider ...>{children}</GoogleReCaptchaProvider>;
```

**2. Preconnect 힌트 추가**

```html
<link rel="preconnect" href="https://www.google.com" />
<link rel="preconnect" href="https://www.gstatic.com" crossorigin="anonymous" />
```

**3. 색상 대비 수정**

| 토큰                          | 변경 전                               | 변경 후                         | 대비 변화       |
| ----------------------------- | ------------------------------------- | ------------------------------- | --------------- |
| `--color-neutral-600`         | `#6b7280`                             | `#656c79`                       | 4.47:1 → ~4.9:1 |
| `--text-accent-secondary-alt` | `var(--color-accent-light)` (#ff4f9d) | `var(--color-accent)` (#d40063) | 2.83:1 → ~4.8:1 |

**4. 접근성 수정**

- ServicesSection: `<h3>` → `<h2>`로 heading 순서 정상화
- 언어 토글: `aria-label`에 표시 텍스트("KO"/"EN") 포함

#### TL;DR

- 서드파티 스크립트(reCAPTCHA, Analytics 등)는 초기 로드에서 제외하고 유저 인터랙션 후 로드하면 LCP/TTI에 큰 영향
- 개발 서버(Turbopack)에서의 Lighthouse 결과는 unminified JS, devtools 등으로 인해 프로덕션보다 훨씬 낮게 측정됨
- `mix-blend-mode: difference` 사용 시 Lighthouse가 blend 전 색상으로 대비를 계산하므로 실제 시각적 결과와 다를 수 있음

---


</details>

<details>
<summary><strong>6. reCAPTCHA 배지 z-index 문제</strong></summary>

#### 문제

Contact Drawer가 열렸을 때 reCAPTCHA v3 배지가 overlay 아래에 가려져 보이지 않음

#### 원인

- Contact Drawer의 backdrop이 `z-index: var(--z-overlay)` (40)로 fixed 포지셔닝
- Google이 삽입하는 `.grecaptcha-badge` 요소의 z-index가 backdrop보다 낮아 가려짐

#### 해결

Drawer 열릴 때 배지에 `z-index: 9999`를 동적으로 설정, 닫힐 때 제거:

```tsx
badge.style.zIndex = isOpen ? "9999" : "";
```

#### TL;DR

서드파티가 삽입하는 DOM 요소는 커스텀 overlay/modal과 z-index 충돌이 발생할 수 있음. 동적으로 z-index를 관리해야 함

---


</details>

<details>
<summary><strong>7. Lighthouse 심화 성능 최적화 — 미사용 폰트 제거 및 리소스 경량화</strong></summary>

| PC | Tablet | Mobile |
|:---:|:---:|:---:|
| <img src="public/docs/screenshots/pc/home-light.png" width="100%" alt="Home PC" /> | <img src="public/docs/screenshots/tablet/home-light.png" width="100%" alt="Home Tablet" /> | <img src="public/docs/screenshots/mobile/home-light.png" width="100%" alt="Home Mobile" /> |
<sub>최적화 대상: Home 페이지 — 3개 디바이스에서 Performance 98점 달성</sub>

#### 문제

1차 최적화 후 Lighthouse 모바일 Performance 60점. LCP 7.3초, TTI 13.7초, 페이지 용량 1,489KB, 네트워크 요청 63건

#### 원인 분석

Lighthouse CLI로 프로덕션 빌드를 직접 측정하여 병목 파악:

1. **미사용 폰트 4개 로드**: IBM Plex Mono(5 weights), Bebas Neue, Cormorant Garamond(5 weights), Abril Fatface가 CSS에서 미참조인데도 12개 폰트 파일을 다운로드
2. **reCAPTCHA 4초 타이머**: 지연 로딩에 `setTimeout(4000)` 폴백이 있어 Lighthouse 테스트 중 여전히 ~740KB 로드
3. **scroll 이벤트 트리거**: reCAPTCHA가 scroll 이벤트에도 반응하여 불필요하게 조기 로드
4. **font-display 미설정**: 모든 폰트가 렌더링을 차단
5. **미사용 Preconnect**: reCAPTCHA가 초기 로드에서 제외되었으므로 Google 도메인 preconnect가 "unused" 경고 유발
6. **Inter 과다 가중치**: 7개 가중치(300-900) 중 800, 900은 미사용

#### 해결

**1. 미사용 폰트 제거** — 가장 큰 영향

```tsx
// ❌ 기존 - 9개 폰트 패밀리 (19개 폰트 파일)
import {
  IBM_Plex_Mono,
  Inter,
  Playfair_Display,
  JetBrains_Mono,
  Bebas_Neue,
  Space_Grotesk,
  Cormorant_Garamond,
  Abril_Fatface,
  Instrument_Serif,
} from "next/font/google";

// ✅ 개선 - 5개 폰트 패밀리 (5개 폰트 파일)
import {
  Inter,
  Playfair_Display,
  JetBrains_Mono,
  Space_Grotesk,
  Instrument_Serif,
} from "next/font/google";
```

미사용 확인 방법: CSS 전체에서 `var(--font-ibm-plex)`, `var(--font-bebas)`, `var(--font-cormorant)`, `var(--font-abril)` 검색 → 0건. `useFontMorph.ts`에서 참조하지만 해당 컴포넌트가 어떤 페이지에서도 import되지 않음

**2. font-display: swap 추가**

```tsx
const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"], // 800, 900 제거
  display: "swap", // 폰트 렌더링 차단 해제
});
```

**3. reCAPTCHA 로딩 전략 개선**

```tsx
// ❌ 기존 - 타이머 + scroll 포함
const timer = setTimeout(load, 4000); // Lighthouse 테스트 중 트리거됨
const events = ["scroll", "click", "touchstart", "keydown"];

// ✅ 개선 - 의도적 인터랙션만
const events = ["click", "touchstart", "keydown"]; // 타이머/scroll 제거
```

**4. 미사용 Preconnect 제거**

```html
<!-- ❌ 기존 - reCAPTCHA가 초기 로드에서 제외되어 unused 경고 -->
<link rel="preconnect" href="https://www.google.com" />
<link rel="preconnect" href="https://www.gstatic.com" crossorigin="anonymous" />

<!-- ✅ 개선 - 제거 -->
```

#### 결과 (Lighthouse CLI, 3회 측정 중앙값)

| 메트릭      | Before   | After       | 변화          |
| ----------- | -------- | ----------- | ------------- |
| Performance | 60       | **98**      | **+38점**     |
| FCP         | 2,573ms  | 1,979ms     | -594ms        |
| LCP         | 7,294ms  | **1,979ms** | **-5,315ms**  |
| TBT         | 430ms    | **0ms**     | -430ms        |
| CLS         | 0.012    | 0           | -0.012        |
| TTI         | 13,731ms | **1,979ms** | **-11,752ms** |
| 요청 수     | 63       | 28          | -35           |
| 페이지 용량 | 1,489KB  | **449KB**   | **-70%**      |
| 폰트 파일   | 19개     | 5개         | -14개         |

#### TL;DR

- `next/font/google`로 등록한 폰트는 CSS에서 미참조여도 폰트 파일이 다운로드됨. 정기적으로 실제 사용 여부를 검증해야 함
- 서드파티 지연 로딩의 타이머 폴백은 성능 측정 도구에서 의도치 않게 트리거될 수 있음. 의도적 인터랙션(click/touch/keydown)만 사용하는 것이 안전
- `font-display: swap`은 next/font에서 기본값이 아니므로 명시적으로 설정해야 함

---


</details>

<details>
<summary><strong>8. Works 가로 갤러리 양방향 무한 스크롤 래핑</strong></summary>

#### 문제

Works 페이지의 가로 스크롤 갤러리에서 프로젝트를 10세트 반복했지만, 끝까지 스크롤하면 흰 화면이 나타나 진정한 무한 스크롤이 아님

#### 시도한 방법들 (실패)

1. **세트 수 증가**: 반복 세트를 더 늘리면 DOM 노드가 과다해져 성능 저하
2. **끝에서 처음으로 텔레포트**: 스크롤 위치 점프가 눈에 보임

#### 원인

- 유한한 반복 세트(10세트)로는 양쪽 방향 모두 끝이 존재
- GSAP의 requestAnimationFrame 루프에서 scrollX가 계속 누적되어 콘텐츠 범위를 벗어남

#### 해결

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

#### TL;DR

콘텐츠 복제 세트 수를 늘리는 것보다, 스크롤 위치 자체를 래핑하는 방식이 DOM 부담 없이 진정한 무한 스크롤을 구현할 수 있음

---


</details>

<details>
<summary><strong>9. 언어 전환 시 레이아웃 시프트</strong></summary>

#### 문제

Works 인트로 섹션에서 한국어↔영어 전환 시 텍스트 영역의 높이가 변하며 레이아웃이 살짝 움직임

#### 원인

- 한국어와 영어의 텍스트 길이 차이로 줄바꿈 위치가 달라짐
- `justify-content: center`가 적용된 flex 컨테이너에서 자식 높이 변화 시 공간이 재분배됨

#### 해결

`min-height`를 `em` 단위(줄 수 × line-height)로 설정하여 양쪽 언어 모두에서 일관된 공간을 확보

```css
/* 최대 줄 수 기준으로 min-height 예약 */
.introDesc {
  min-height: 4.95em;
} /* 3줄 × 1.65 line-height */
.introDetail {
  min-height: 6.6em;
} /* 4줄 × 1.65 line-height */
.introQuote {
  min-height: 3.3em;
} /* 2줄 × 1.65 line-height */

/* 모바일에서는 세로 스크롤이므로 불필요 */
@media (max-width: 768px) {
  .introDesc,
  .introDetail,
  .introQuote {
    min-height: auto;
  }
}
```

#### TL;DR

다국어 지원 시 텍스트 영역에 `min-height`로 최대 줄 수 기준의 공간을 예약하면 언어 전환 시 레이아웃 시프트를 방지할 수 있음. `em` 단위를 사용하면 font-size 변경에도 자동 대응됨

---


</details>

<details>
<summary><strong>10. 언어 전환 시 로딩 화면 재출현</strong></summary>

<p align="center">
  <img src="public/docs/screenshots/pc/home-dark.png" width="100%" alt="Home — Loading Screen" />
</p>

#### 문제

페이지에서 처음으로 언어를 전환하면 로딩 화면이 다시 나타남. 두 번째 전환부터는 정상 동작

#### 원인

- `RecaptchaProvider`가 첫 번째 클릭 이벤트에서 `shouldLoad`를 `false` → `true`로 변경
- 렌더 트리가 `<Fragment>{children}</Fragment>` → `<GoogleReCaptchaProvider>{children}</GoogleReCaptchaProvider>`로 변경됨
- React는 같은 위치에서 컴포넌트 타입이 바뀌면 하위 트리 전체를 unmount → remount함
- `useLoadingScreen()`의 `useState(true)` 초기값으로 인해 로딩 화면이 재출현

#### 해결

모듈 레벨 플래그로 초기 로딩 완료 여부를 추적하여 remount 시 로딩 화면을 건너뜀

```tsx
// 모듈 레벨: 컴포넌트 remount에도 유지됨
let hasCompletedInitialLoad = false;

export function useLoadingScreen() {
  // remount 시 이미 로딩 완료된 세션이면 false로 시작
  const [isLoading, setIsLoading] = useState(() => !hasCompletedInitialLoad);
  const hasCompletedRef = useRef(hasCompletedInitialLoad);

  const completeLoading = () => {
    hasCompletedRef.current = true;
    hasCompletedInitialLoad = true; // 모듈 플래그 동기화
    setIsLoading(false);
  };
}
```

#### TL;DR

서드파티 Provider를 조건부로 렌더링하면(`Fragment` ↔ `Provider`) React가 하위 트리를 remount함. `useState` 초기값에 의존하는 상태는 모듈 레벨 변수로 보완해야 remount에 안전함

---


</details>

<details>
<summary><strong>11. GSAP ScrollTrigger가 breakpoint 변경 시 레이아웃 깨짐</strong></summary>

| PC | Tablet | Mobile |
|:---:|:---:|:---:|
| <img src="public/docs/screenshots/pc/works-dark.png" width="100%" /> | <img src="public/docs/screenshots/tablet/works-dark.png" width="100%" /> | <img src="public/docs/screenshots/mobile/works-dark.png" width="100%" /> |

#### 문제

데스크톱↔태블릿↔모바일 간 뷰포트 리사이즈 시 GSAP ScrollTrigger pin, RAF counter-translation 등의 애니메이션이 이전 뷰포트 기준으로 고정되어 레이아웃이 깨짐

#### 원인

- GSAP ScrollTrigger의 `start`, `end`, `pin` 설정이 생성 시점의 뷰포트 크기로 계산됨
- RAF 기반 counter-translation도 초기 `extraWidth` 값을 기준으로 동작
- 뷰포트 크기가 변해도 기존 인스턴스가 자동으로 갱신되지 않음

#### 시도한 방법들

1. **개별 컴포넌트에서 breakpoint 추적**: 각 패널에서 resize listener + effect 재실행 → 코드 중복, 일부 패널 누락
2. **ScrollTrigger.refresh()**: 일부 케이스에서 작동하지만, 가로↔세로 레이아웃 전환처럼 근본적인 DOM 구조 변경은 처리 불가

#### 해결

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

#### 부수 효과 및 해결

- 비디오 요소가 DOM에서 제거되면서 `play()` Promise가 AbortError로 reject됨 → `.catch(() => {})` 추가
- 모든 컴포넌트의 `useState` 초기값이 리셋됨 → 모듈 레벨 플래그(예: `hasCompletedInitialLoad`)로 보완

#### TL;DR

GSAP ScrollTrigger처럼 생성 시점의 뷰포트에 의존하는 애니메이션은 `ScrollTrigger.refresh()`로 부분 갱신하기보다, React의 `key` prop을 활용한 완전 remount가 더 안정적. Provider를 remount 범위 밖에 배치하면 전역 상태 손실 없이 페이지 단위 재초기화가 가능

---


</details>

<details>
<summary><strong>12. 프로젝트 전체 성능 최적화</strong></summary>

| PC | Tablet | Mobile |
|:---:|:---:|:---:|
| <img src="public/docs/screenshots/pc/home-dark.png" width="100%" /> | <img src="public/docs/screenshots/tablet/home-dark.png" width="100%" /> | <img src="public/docs/screenshots/mobile/home-dark.png" width="100%" /> |

#### 문제

프로젝트 성능 감사 결과, 다수의 최적화 포인트 발견: 메인 스레드 애니메이션, 60fps React 리렌더, GPU 메모리 누수, 미사용 리소스, CSS 충돌

#### 원인 분석

1. **Hero 타원·마퀴**: Framer Motion/GSAP의 무한 반복 애니메이션이 메인 스레드 RAF로 실행
2. **useMagneticRepel**: `mousemove`마다 `setMagneticOffsets()` → 60fps React state 업데이트 → WorksSection 전체 리렌더
3. **Three.js**: `DoubleSide`로 양면 렌더링, `isMobile` 변경 시 geometry 미해제(GPU 메모리 누수)
4. **미사용 리소스**: paper.png(17MB), grain.png(5.2MB) 미참조, npm 패키지 2개 미사용
5. **CSS 충돌**: `scroll-behavior: smooth`가 Lenis와 이중 스무딩, `cursor: none`이 터치 디바이스에도 적용
6. **useSoundManager**: mount 시 AudioContext 생성 + typing.mp3 즉시 fetch

#### 해결

```
1. Hero 타원/마퀴: CSS animation으로 전환 → 컴포지터 스레드에서 실행
2. useMagneticRepel: useState → useRef + RAF 루프 + el.style.transform 직접 적용
3. Three.js: DoubleSide → FrontSide, useEffect cleanup에서 geometry.dispose()
4. 미사용 이미지 삭제(-22.2MB), npm uninstall react-scroll-parallax react-google-recaptcha-v3
5. scroll-behavior 제거, cursor:none을 @media (pointer: fine)로 제한
6. AudioContext/typing.mp3를 첫 인터랙션 시점으로 지연
7. next.config: poweredByHeader: false, image formats: AVIF+WebP
8. will-change: transform 영구 제거 (GPU 레이어 해제)
```

#### TL;DR

- 단순 무한 반복 애니메이션(rotate, translateX)은 CSS animation이 JS 기반보다 항상 더 효율적 — 컴포지터 스레드에서 메인 스레드 차단 없이 실행됨
- 고빈도 이벤트(mousemove)에서 React state를 업데이트하면 프레임당 전체 컴포넌트 트리가 재조정됨. ref + 직접 DOM 조작이 적절한 패턴
- Three.js의 `useMemo`로 생성한 geometry/material은 React의 GC 대상이지만 GPU 버퍼는 자동 해제되지 않음. 명시적 `dispose()` 필수


</details>

<details>
<summary><strong>13. 이미지 원본 무압축 업로드 — 용량 초과 실패 + 네트워크 낭비</strong></summary>

#### 문제

사용자가 선택한 이미지를 압축 없이 원본 그대로 업로드하여, 스마트폰 사진(5–15MB)은 10MB 제한에 걸려 실패하고, 제한 이하 파일도 불필요하게 큰 원본이 전송됨

#### 원인

업로드 함수에 클라이언트 압축 로직이 없었고, 서버에서 용량 초과를 거부하는 것이 유일한 방어선

#### 해결

업로드 전 브라우저에서 단계적 압축 파이프라인 실행:

```
1. SVG/GIF → 스킵 (벡터/애니메이션은 Canvas 변환 불가)
2. 용량 이하 → 스킵
3. WebP 변환 (canvas.toBlob, quality 0.85)
4. 해상도 축소 (긴 변 최대 2560px)
5. 품질 단계적 하향 (0.05씩, 최저 0.7)
```

`compressImage()` 유틸리티를 dynamic import로 불러와 번들 크기에 영향 없음

#### TL;DR

이미지 압축은 서버보다 클라이언트에서 하는 것이 합리적 — 전송 전에 크기를 줄여 대역폭과 스토리지를 동시에 절약. WebP는 AVIF보다 압축률은 낮지만 브라우저 인코딩 속도가 3–10배 빠르고 지원률도 높아 클라이언트 처리에 적합

---


</details>

<details>
<summary><strong>14. Richtext 게시물에서 코드 하이라이팅·줄바꿈 버튼이 사라짐</strong></summary>

#### 문제

Plate 에디터로 작성한 richtext 게시물의 코드블록에서 구문 하이라이팅과 줄바꿈/스크롤 토글 버튼이 표시되지 않음. Markdown 게시물에서는 정상 동작

#### 원인

코드 하이라이팅(highlight.js)과 버튼 라벨을 `useEffect`에서 **DOM을 직접 조작**하여 적용하고 있었음. 페이지 로드 후 API 호출(좋아요 수, 인접 게시물, 추천 게시물 등)이 완료되면 state 변경 → React 리렌더 → `dangerouslySetInnerHTML`이 원본 HTML로 DOM을 덮어쓰기 → hljs 클래스와 버튼 라벨 전부 소실. `useEffect` 의존성은 변하지 않아 재실행되지 않음

```
[초기 렌더]  dangerouslySetInnerHTML = 원본 HTML (하이라이트 없음)
     ↓
[useEffect]  highlight.js 적용 + 버튼 라벨 생성 ✓
     ↓
[API 완료]   setLikeCount / setAdjacentPosts → state 변경
     ↓
[리렌더]     dangerouslySetInnerHTML = 원본 HTML → DOM 덮어쓰기
     ↓
[결과]       하이라이트·버튼 라벨 사라짐, useEffect 재실행 안 됨 ✗
```

Markdown 게시물은 `MarkdownRenderer`가 서버에서 이미 하이라이팅을 적용한 HTML을 생성하므로 영향 없음

#### 해결

DOM 조작 대신 `useMemo` 단계에서 **HTML 문자열 자체에 하이라이팅과 버튼 라벨을 적용**:

```tsx
const processedHtml = useMemo(() => {
  let html = addIdsToHtml(displayContent);
  // 정규식으로 <pre><code> 블록을 찾아 hljs.highlight() 적용
  html = html.replace(/<pre><code ...>/, (code) => hljs.highlight(code).value);
  // 빈 <button data-wrap-btn> 에 라벨 span 삽입
  html = html.replace(/<button data-wrap-btn><\/button>/, labelHtml);
  return html;
}, [displayContent, t]);
```

`useEffect`는 **클릭 이벤트 위임만** 담당

#### TL;DR

`dangerouslySetInnerHTML`로 렌더하는 콘텐츠를 `useEffect`로 DOM 조작하면, 어떤 state 변경이든 리렌더 시 소실됨. HTML은 **렌더 전(useMemo/서버)에 완성**해야 함

---


</details>

<details>
<summary><strong>15. About Backend 패널 — dbMobileList가 데스크톱에서 노출</strong></summary>

#### 문제

About 페이지의 Backend 패널에서 모바일 전용 DB 목록(`dbMobileList`)이 데스크톱 뷰포트에서도 렌더링되어 레이아웃이 깨짐

#### 원인

`dbMobileList`에 `display: none` 미디어 쿼리가 누락되어, 데스크톱에서도 DOM에 공간을 차지하며 표시됨. 기능적으로는 문제없지만 레이아웃이 의도와 다르게 배치됨

#### 해결

CSS만으로 수정 — 데스크톱 브레이크포인트에서 `display: none`을 추가하여 모바일에서만 표시되도록 제한

#### TL;DR

반응형 전용 요소는 **반드시 반대 브레이크포인트에서 `display: none` 처리**해야 함. JS 분기 없이 CSS 미디어 쿼리만으로 충분한 경우가 많음

---


</details>

<details>
<summary><strong>16. About HeroPanel이 로딩 화면 뒤에서 미리 렌더링</strong></summary>

#### 문제

About 페이지 진입 시 로딩 스크린이 표시되는 동안 HeroPanel의 콘텐츠(텍스트, 애니메이션)가 뒤에서 이미 렌더링·재생되어, 로딩이 끝났을 때 첫 인상이 의도한 것과 다름

#### 원인

HeroPanel의 진입 애니메이션이 컴포넌트 마운트 시 즉시 시작되었음. 로딩 화면은 `z-index`로 위에 덮고 있을 뿐, 아래 레이어에서 애니메이션은 이미 진행·완료됨

#### 해결

`heroReady` 클래스를 로딩 완료 후에만 부여하고, HeroPanel의 진입 애니메이션과 콘텐츠 표시를 이 클래스에 의존하도록 변경. 로딩이 끝나기 전까지 패널은 **시각적으로 비활성 상태**를 유지

#### TL;DR

로딩 화면 아래의 콘텐츠는 **z-index로 가리는 것만으로 부족**. 애니메이션 시작 시점을 로딩 완료에 연동해야 의도한 첫 인상을 보장할 수 있음

---


</details>

<details>
<summary><strong>17. 자동저장 초기값 버그 — 수정 없이도 리비전 생성</strong></summary>

#### 문제

에디터를 열고 아무 수정도 하지 않았는데 30초 후 '자동저장됨' 표시가 나타나고, 다음 방문 시 '자동저장된 버전을 불러올까요?' 프롬프트가 표시됨

#### 원인

`useEditorAutoSave` 훅의 `lastAutoSaveJson` ref 초기값이 빈 문자열(`""`)이었음. 30초 debounce 후 현재 폼을 `JSON.stringify`한 결과와 `""`를 비교하면 항상 다르므로, **변경 없이도 리비전이 생성**됨

```
lastAutoSaveJson.current = ""    // 초기값
JSON.stringify(form)     = "{...}"  // 현재 폼
"" !== "{...}"           → 변경으로 판단 → 리비전 저장 ✗
```

#### 해결

초기값을 `JSON.stringify(formRef.current)`로 변경하여, 최초 폼 상태와 동일하면 저장을 건너뜀

#### TL;DR

비교 기준 ref의 초기값이 실제 데이터와 다른 타입/형태이면, **첫 비교가 항상 '변경됨'으로 판단**됨. 초기값은 반드시 실제 초기 상태를 반영해야 함

---

</details>

<details>
<summary><strong>18. Plate Editor 인라인 이미지 — 양옆에 커서 배치·텍스트 입력 불가</strong></summary>

#### 문제

Plate(Slate) 에디터에서 이미지를 인라인 void(`isInline: true, isVoid: true`)로 설정했으나, 이미지 양옆에 **클릭으로 커서를 놓거나 방향키로 이동하는 것이 불가능**하여 텍스트를 삽입할 수 없었음

#### 원인

Slate의 정규화는 인라인 void 주변에 빈 텍스트 노드(zero-width space)를 자동 삽입하지만, ImageElement 내부에서 `<div>` (BlockDropZone + wrapper)가 인라인 `<span>` (PlateElement) 안에 중첩되어 있었음. **`<div>`는 블록 요소라 인라인 흐름을 깨뜨려**, 브라우저가 인접 텍스트 노드에 대한 커서 접근을 차단함

```
❌ <span display="inline">          ← PlateElement (인라인)
     <div>                          ← BlockDropZone (블록!)
       <div contentEditable={false}> ← wrapper (블록!)
         <div>                       ← hover container (블록!)
           <img />
```

#### 해결

`imgLayout === "inline"`일 때 별도 렌더링 분기를 만들어 **모든 wrapper를 `<span>`으로 변경**하고 BlockDropZone을 제거함. 또한 이미지 양쪽에 absolute로 배치된 6px 너비의 `InlineCursorTarget` 컴포넌트를 추가하여, **클릭 시 `editor.api.before()`/`after()`로 커서를 정확히 배치**함

```
✅ <span display="inline">          ← PlateElement (인라인)
     <span display="inline-block">  ← 단일 wrapper (인라인!)
       <InlineCursorTarget left />  ← 클릭 → 커서 before
       <img />
       <InlineCursorTarget right /> ← 클릭 → 커서 after
```

#### TL;DR

인라인 void 요소 안에 `<div>`가 들어가면 **브라우저가 인라인 흐름을 파괴**하여, Slate가 자동 삽입한 빈 텍스트 노드에 커서를 배치할 수 없게 됨. 인라인 요소 내부에는 반드시 `<span>` 등 인라인 태그만 사용해야 함

---

</details>

<details>
<summary><strong>19. 테마 전환 글로벌 transition이 컴포넌트 애니메이션을 덮어쓰기</strong></summary>

#### 문제

다크/라이트 테마 전환 시 부드러운 색상 전환을 위해 글로벌 CSS에 `html[data-theme-ready] * { transition: background-color, color ... }` 규칙을 적용했으나, 에디터 toolbar 접기, 토글 열기 등 **`max-height`, `opacity`, `transform`을 사용하는 컴포넌트 transition이 모두 무시**됨

#### 원인

`transition`은 **shorthand 속성**으로, `transition: background-color 0.3s` 같은 선언이 컴포넌트의 `transition: max-height 0.3s, opacity 0.2s`를 **완전히 덮어씀**. 글로벌 셀렉터 `html[attr] *`의 specificity `(0,1,1)`이 CSS Module 단일 클래스 `(0,1,0)`보다 높아서 항상 우선함

```css
/* 글로벌 (0,1,1) — 승리 */
html[data-theme-ready] * { transition: background-color 0.3s, color 0.3s; }

/* 컴포넌트 (0,1,0) — 패배, max-height transition 사라짐 */
.toolbar { transition: max-height 0.3s ease; }
```

#### 해결

글로벌 transition을 `data-theme-transitioning` 속성으로 변경하여 **테마 전환 시 350ms 윈도우 동안만 적용**되도록 함. 평상시에는 글로벌 transition이 비활성이므로 컴포넌트 자체 transition이 정상 동작

```css
/* ✅ 테마 전환 순간만 활성 */
html[data-theme-transitioning] * {
  transition: background-color var(--duration-base) ease, ...;
}
```

#### TL;DR

CSS `transition`은 shorthand이므로, 글로벌에서 특정 속성만 지정해도 **컴포넌트의 다른 속성 transition을 전부 제거**함. 상시 적용 대신 속성 토글(`data-theme-transitioning`)로 필요한 순간에만 활성화해야 충돌을 방지할 수 있음

---

</details>

<details>
<summary><strong>20. 마크다운 각주 번호 꼬임 — heading renderer와 marked-footnote 실행 순서 충돌</strong></summary>

#### 문제

마크다운 렌더러에서 heading(`# 제목`)과 footnote(`[^1]`)를 함께 사용하면 **각주 번호가 꼬이거나 heading 안의 각주가 변환되지 않음**

#### 원인

커스텀 heading renderer가 `marked-footnote` 확장보다 **먼저 실행**되어, heading 내부의 `[^1]` 구문이 각주로 변환되기 전에 heading renderer가 원본 텍스트를 소비해버림. 결과적으로 heading 안의 각주 참조가 일반 텍스트로 남고, 나머지 각주의 번호 매핑이 틀어짐

```
# 제목 [^1]     ← heading renderer가 먼저 처리 → [^1] 변환 안 됨
본문 [^2]        ← 실제로는 [^1]이어야 하는데 번호 밀림
```

#### 해결

heading renderer를 제거하고 `postprocess` hook으로 대체. marked-footnote가 **먼저 모든 각주를 처리한 뒤**, postprocess에서 heading에 `id` 속성만 추가하는 방식으로 순서 보장. 추가로 `keepLabels: true` 옵션을 적용하여 사용자가 입력한 각주 번호(`[^2]` → 2)를 그대로 유지

#### TL;DR

marked 확장(extension)과 커스텀 renderer가 같은 구문을 처리할 때 **실행 순서가 결과를 결정**함. renderer 대신 postprocess hook을 사용하면 모든 확장이 먼저 처리된 후에 후처리할 수 있음

---

</details>

<details>
<summary><strong>21. 에디터 자동저장 — localStorage에서 DB 리비전으로의 진화</strong></summary>

#### 문제

초기 자동저장은 `localStorage`에 직접 저장하는 방식이었으나, 여러 문제가 복합적으로 발생:
1. **탭/기기 간 공유 불가** — localStorage는 같은 브라우저에서만 접근 가능
2. **새로고침 시 불필요한 저장** — 변경 없이도 "자동저장됨" 표시
3. **무시한 리비전과 동일 내용 재질문** — dismiss 후 같은 내용이 반복 알림

#### 원인

1. localStorage의 태생적 한계 (브라우저 로컬 저장소)
2. `lastAutoSaveJson` ref 초기값이 `""`(빈 문자열)이라 `JSON.stringify(form)`과 항상 다르게 판단
3. dismissed 리비전의 snapshot을 추적하지 않아, DB에 동일 내용 리비전이 다시 생성되면 재알림

#### 해결

**3단계에 걸쳐 개선:**
1. localStorage를 완전 제거하고 **DB `revisions` 테이블을 유일한 저장소**로 변경 — 탭/기기 간 공유 가능
2. `lastAutoSaveJson` 초기값을 `JSON.stringify(formRef.current)`로 설정하여 **최초 상태와 동일하면 저장 건너뜀**
3. dismissed 리비전의 snapshot을 `Set`으로 추적하여, **동일 내용이면 재질문하지 않음**

추가로 페이지 이탈 시 `navigator.sendBeacon`(브라우저 종료)과 `fetch({ keepalive: true })`(SPA 라우팅)를 사용하여 **마지막 상태가 절대 유실되지 않도록** 보장

#### TL;DR

자동저장은 단순히 "주기적으로 저장"이 아니라, **"언제 저장하지 않을지"가 핵심**. 비교 기준 초기화, 중복 감지, dismissed 추적까지 고려해야 불필요한 리비전 누적과 UX 혼란을 방지할 수 있음

---

</details>

<details>
<summary><strong>22. 열블록(Column) 스타일 round-trip 유실 — richtext↔markdown 변환 시 메타데이터 소실</strong></summary>

#### 문제

2열/3열 레이아웃 블록의 **배경색, 구분선, 열 비율** 등 스타일 속성이 richtext→markdown→richtext 변환 시 모두 사라짐

#### 원인

Plate의 Column 노드에는 `layout`, `columnBg`, `columnDivider` 같은 커스텀 속성이 저장되지만, HTML 직렬화 시 이 메타데이터를 보존하는 규칙이 없었음. 표준 HTML에는 열 레이아웃 개념이 없으므로, 단순 `<div>` 변환 시 **커스텀 속성이 모두 탈락**

#### 해결

직렬화 시 HTML 주석으로 메타데이터를 인코딩하고, 역직렬화 시 파싱하여 복원:

```html
<!-- columns 50,50 layout=side bg=var(--bg-tertiary) divider=solid -->
<div data-column-group data-layout="side" data-column-bg="...">
  <div data-column data-width="50%">...</div>
  <div data-column data-width="50%">...</div>
</div>
```

`data-*` 속성과 HTML 주석의 이중 인코딩으로, 주석이 제거되더라도 `data-*` 속성에서 복원 가능하도록 설계

#### TL;DR

표준 HTML에 없는 에디터 고유 속성은 직렬화 시 반드시 **명시적으로 인코딩**해야 round-trip이 보존됨. `data-*` 속성 + HTML 주석 이중 저장으로 강건성 확보

---

</details>

<details>
<summary><strong>23. YouTube/Vimeo embed URL — watch URL이 iframe에서 로드 실패</strong></summary>

#### 문제

에디터에서 YouTube 영상을 삽입할 때 사용자가 `youtube.com/watch?v=xxx` 형태의 URL을 입력하면, 이 URL이 그대로 `<iframe src="...">` 에 저장됨. **watch URL은 iframe에서 로드할 수 없어** 빈 화면이 표시되고, 게시물 디테일 페이지에서도 영상이 재생되지 않음

#### 원인

에디터 내부에서는 `parseEmbed()` 함수가 watch URL을 embed URL로 변환하여 **에디터 안에서는 정상 표시**되지만, `plateSerializer`는 노드의 `url` 속성(원본 watch URL)을 그대로 `<iframe src="...">` 로 직렬화. 즉 **에디터와 직렬화의 URL이 다른 상태**로 DB에 저장됨

```
에디터 표시: youtube.com/embed/xxx  (parseEmbed 변환) → 재생 OK
DB 저장:    youtube.com/watch?v=xxx (원본 그대로)     → iframe 로드 실패
```

#### 해결

`fixEmbedUrls()` 유틸리티를 만들어 HTML을 렌더링하기 직전에 **iframe src 속성의 watch/shorts URL을 embed URL로 일괄 변환**. 게시물 디테일 페이지와 미리보기 페이지 양쪽에 적용

```ts
// youtube.com/watch?v=xxx → youtube.com/embed/xxx
// youtu.be/xxx → youtube.com/embed/xxx
// vimeo.com/123 → player.vimeo.com/video/123
html.replace(/<iframe([^>]*)\ssrc="([^"]*)"([^>]*)>/gi, ...)
```

#### TL;DR

에디터 내부 변환(런타임)과 직렬화(저장) 사이의 **URL 불일치**는 "에디터에서는 보이는데 실제 페이지에서 안 보이는" 버그를 만듦. 렌더링 직전에 URL을 정규화하는 후처리 단계를 추가하여 해결

---

</details>

<details>
<summary><strong>24. 커스텀 커서 리사이즈 모드 — 마우스 방향에 따라 커서가 회전</strong></summary>

#### 문제

에디터 이미지·열블록 리사이즈 핸들에 커스텀 커서(↔, ↕, ⤡ 등)를 적용했더니, 마우스 이동 방향에 따라 커서 화살표가 회전·찌그러짐

#### 원인

CursorTrail의 애니메이션 루프가 마우스 속도에 따라 `angleRef`(회전)와 `scaleRef`(스케일)를 계산하는데, 리사이즈 모드 진입 시에도 이전 값이 그대로 남아 있었음. 또한 리사이즈 감지를 classList로 하면 React 렌더 타이밍과 어긋나서 1~2프레임 지연 발생

#### 해결

`cursorTypeRef`(동기 ref)를 추가하여 `setCursorType`과 동시에 갱신. 리사이즈 모드 진입 시 `angleRef`·`scaleRef`를 즉시 0으로 리셋하고, 애니메이션 루프에서 `cursorTypeRef.current`로 리사이즈 여부를 판단하여 회전·스케일을 완전히 비활성화

---

</details>

<details>
<summary><strong>25. 이미지 리사이즈 핸들 클릭 시 이미지가 삭제됨</strong></summary>

#### 문제

인라인 이미지의 리사이즈 핸들을 클릭하면, 리사이즈가 아닌 이미지 삭제(DnD 드롭)가 발생

#### 원인

인라인 이미지의 `onPointerDown` 핸들러가 DnD 드래그를 시작하는데, 리사이즈 핸들 위의 클릭도 이 핸들러가 가로채서 드래그→드롭으로 처리됨

#### 해결

`onPointerDown` 최상단에 `closest("[data-cursor^='resize']")` 체크를 추가하여 리사이즈 핸들 클릭 시 DnD를 비활성화. 히트박스와 시각적 핸들을 별개의 sibling 요소로 분리하여 감지 범위와 시각적 위치를 독립 조정

---

</details>

<details>
<summary><strong>26. 이미지 캡션 오버레이가 리사이즈 히트박스를 덮어 감지 불가</strong></summary>

#### 문제

이미지 하단 리사이즈 히트박스가 있어야 할 위치에서 마우스 커서가 리사이즈 모양으로 바뀌지 않고 감지 안 됨

#### 원인

캡션 오버레이(`zIndex: 3`)가 아래쪽 리사이즈 히트박스(`zIndex: 2`) 위에 렌더링되어 포인터 이벤트를 가로챔

#### 해결

히트박스의 `zIndex`를 4~5로 올려 캡션 오버레이보다 위에 위치시킴. 이미지 변 전체를 히트박스 영역으로 확장하여 Figma 스타일의 직관적인 리사이즈 UX 구현

---

</details>

<details>
<summary><strong>27. Tooltip auto placement — 스크롤 컨테이너 경계 미인식</strong></summary>

#### 문제

에디터에서 이미지에 Tooltip(크기 정보)을 표시할 때, 이미지가 에디터 영역 상단 밖으로 스크롤되면 Tooltip이 에디터 밖에 뜨거나 잘림

#### 원인

Tooltip의 `auto` placement 판정이 뷰포트 상단(`rect.top < 60`)만 기준으로 판단하여, 에디터 스크롤 컨테이너의 경계를 고려하지 않음

#### 해결

`measure()` 함수에서 trigger의 가장 가까운 overflow 부모(`overflow-y: auto|scroll|hidden`)를 탐색하여 스크롤 컨테이너 상단과 trigger 상단의 거리가 40px 미만이면 `bottom`으로 전환

---

</details>

<details>
<summary><strong>28. 에디터 툴바 active 상태 — wrapper 블록 감지 실패</strong></summary>

#### 문제

에디터에서 blockquote, code block, table 안에 커서를 놓아도 메인 툴바의 해당 버튼이 active 스타일로 바뀌지 않음

#### 원인

`useBlockInfo` 훅이 `editor.api.block()`으로 가장 가까운 블록을 가져오는데, wrapper 블록(blockquote, code_block, table) 안의 자식 블록(`p`, `code_line` 등)이 먼저 반환되어 `blockType`이 `"p"`나 `"code_line"`으로 설정됨

#### 해결

`blockType`이 `"p"` 또는 `"code_line"`일 때 `editor.api.above()`로 상위에 wrapper 블록이 있는지 추가 탐색. `["blockquote", "code_block", "table"]`을 순회하며 발견 시 `blockType`을 해당 타입으로 갱신

---

</details>

<details>
<summary><strong>29. 각주 참조/내용 정합성 — 한쪽 삭제 시 고아 노드 잔존</strong></summary>

#### 문제

에디터에서 각주 참조(`footnote_ref`)를 삭제해도 하단의 각주 내용(`footnote_content`)이 남아있고, 반대의 경우도 동일. 고아 노드가 직렬화되어 DB에 저장됨

#### 원인

각주 참조와 내용은 `footnoteId`로 연결되어 있지만, Plate의 normalizeNode는 이 관계를 인식하지 못하여 한쪽이 삭제되어도 다른 쪽이 유지됨

#### 해결

별도 `useEffect` + 300ms debounce로 에디터 변경 시 전체 각주를 스캔. `footnoteId`가 매칭되지 않는 고아 노드를 역순으로 삭제하여 path shift 문제 방지. `normalizeNode` 내부에서 직접 삭제 시 `Cannot find a descendant at path` 에러가 발생하여 effect로 분리

---

</details>

<details>
<summary><strong>30. 링크 클릭 시 즉시 이동 → 에디터에서 링크 편집 불가</strong></summary>

#### 문제

에디터 안의 링크를 클릭하면 즉시 새 탭으로 이동하여, 링크 URL을 수정하거나 텍스트를 편집할 수 없음

#### 원인

`LinkElement`의 `onClick`이 `window.open()`을 바로 호출하여 에디터 내 커서 배치가 불가능했음

#### 해결

클릭 → `e.preventDefault()`만 수행하여 커서를 링크 안에 배치하고 링크 편집 툴바를 자동 표시. 더블클릭 → 새 탭으로 이동. 링크→링크 이동 시 깜빡임 방지를 위해 `currentLinkKey`(링크 path 기반)로 동일 링크 여부를 판단하고, `useOutsideClick` 대신 에디터 본문 클릭을 무시하는 커스텀 핸들러 적용

---

</details>

<details>
<summary><strong>31. CSS 토큰 미정의 — 11개 파일에서 참조하지만 선언 없음</strong></summary>

#### 문제

`--box-3xs-xs` 토큰을 11개 CSS 파일에서 `padding: var(--box-3xs-xs)`로 사용하고 있었지만, `_spacing.css`에 실제 정의가 없어 해당 padding이 모두 무시됨

#### 원인

CSS 토큰 감사 과정에서 `padding: var(--spacing-3xs) var(--spacing-xs)` (2px 8px)를 box shorthand `var(--box-3xs-xs)`로 일괄 치환했으나, `_spacing.css`의 Compound 블록에 해당 토큰 정의를 추가하지 않았음. CSS `var()`는 미정의 시 오류 없이 해당 선언을 무효화하므로 **빌드·타입체크에서 감지되지 않음**

#### 해결

`_spacing.css`에 `--box-3xs-xs: var(--spacing-3xs) var(--spacing-xs)` 정의 추가. 향후 토큰 치환 시 **사용 파일 grep → 정의 파일 확인** 2단계 검증을 수행

---

</details>

<details>
<summary><strong>32. LoadingScreen이 SSR에 포함되지 않아 콘텐츠 flash 발생</strong></summary>

#### 문제

페이지 로드 시 콘텐츠가 잠깐 보인 후에 로딩 화면(검은 배경)이 나타남

#### 원인

`LoadingScreen`이 `ClientOverlays` 안에서 `dynamic(() => import(...), { ssr: false })`로 불러와져 서버 HTML에 포함되지 않았음. 브라우저가 JS 번들을 로드하고 React가 하이드레이션을 완료한 후에야 `LoadingScreen`이 마운트되어, 그 사이 콘텐츠가 노출됨

#### 해결

`LoadingScreen`만 일반 `import`로 변경하여 서버 HTML에 포함되도록 수정. `useLoadingScreen()` 훅의 초기값이 `isLoading: true`이므로 SSR 시점에 `opacity: 1` 검은 배경이 HTML에 포함됨. 나머지 오버레이(Modal, CursorTrail 등)는 서버에서 렌더할 필요가 없어 `ssr: false` 유지

---

</details>

---

<details>
<summary><strong>37. Plate 인라인 코드에서 방향키 커서 점프</strong></summary>

**문제**: 인라인 코드(`<code>` mark) 안에서 ArrowLeft로 두 번째 글자에서 첫 번째 글자로 이동할 때 커서가 이전 텍스트 노드로 점프

**원인**: `CodePlugin.configure({ rules: { selection: { affinity: "directional" } } })`로 Plate 기본값 `"hard"`를 덮어씀. `"hard"` affinity는 mark 경계에서 커서를 mark 안쪽에 유지하는데, `"directional"`은 브라우저 기본 동작에 위임하여 `<code>` 요소 경계에서 커서가 밖으로 점프

**해결**: affinity 오버라이드를 제거하고 Plate 기본값(`"hard"`)을 사용

```ts
// Before
CodePlugin.configure({ rules: { selection: { affinity: "directional" } } }),

// After
CodePlugin,
```

</details>

---

<details>
<summary><strong>38. Admin 테이블 모바일 가로 스크롤 시 row border 중간 끊김</strong></summary>

**문제**: 모바일에서 admin/posts·admin/works 테이블을 가로 스크롤하면 row border-bottom이 스크롤 끝까지 이어지지 않고 중간에서 끊김

**원인**: `.colTitle { min-width: 280px }`로 제목 열 너비를 확보했는데, `.row` / `.tableHeader` / `.bulkBar`는 각각 독립된 CSS Grid 컨테이너이므로 track 확장이 row별로 계산됨. 데이터 row에는 `col.className`이 적용돼 title track이 280px로 확장되었지만, header의 title `<span>`에는 className이 없어 1fr만 계산 → **row는 868px, header/bulkBar는 720px**의 너비 불일치가 발생. 스크롤 시 row border는 868px까지 그려지지만 header/bulkBar는 720px에서 끊김

**해결**: 두 가지 동시 수정

1. **헤더 `<span>`에도 `col.className` 적용** — `.colTitle`이 header title에 적용되도록 하여 header title track도 280px로 확장
2. **`.tableInner` wrapper 추가** — 스크롤 컨테이너(`.table`, `.tableScroll`) 내부에 wrapper를 추가하고 아래 CSS 적용:

```css
.tableInner {
  display: flex;
  flex-direction: column;
  min-width: 100%;
  width: max-content;
}
```

flex column에서 items는 cross-axis(가로)로 자동 stretch되고, `width: max-content`가 wrapper를 가장 넓은 자식의 max-content 너비(868px)로 사이징 → **모든 row/header/bulkBar가 동일한 868px로 정렬**됨. border-bottom이 스크롤 전 영역에 걸쳐 연속으로 그려짐

**핵심 인사이트**: 각 row가 독립된 grid 컨테이너이면 **track 확장이 row별로 따로 계산**되므로 하나의 row에 건 min-width가 다른 row에 전파되지 않는다. 가로 스크롤에서 border 연속성을 유지하려면 모든 row가 동일한 전체 너비를 가져야 하고, `width: max-content + min-width: 100%` 패턴의 wrapper로 가장 넓은 자식에 맞춰 통일된 너비를 강제해야 한다. 또한 `col.className`이 row에만 적용되고 header에는 빠진 **className 불일치**가 너비 차이의 가장 흔한 원인

</details>

---

<details>
<summary><strong>39. Page transition 이 hold 단계에서 멈추고 morph 후 skeleton 노출</strong></summary>

**문제**: PostCard → 포스트 상세로 이동할 때, **이미지가 hero 크기로 축소된 뒤 오버레이가 사라지지 않고 영원히 hold 상태로 남는** 현상. 추가로 축소 직후 그 아래로 `loading.tsx` 의 스켈레톤이 그대로 보여 "이미지가 작아지고 → 스켈레톤이 한참 동안 보이는" 어색한 시퀀스 발생

**원인**: 두 가지가 겹침

1. 원래 설계는 `expand → morph(히어로) → hold` 자동 진행 후, DetailLayout 의 hero `motion.div` 에 걸린 `onAnimationStart` 콜백이 `endTransition()` 을 호출해 dismissal 트리거. 그런데 `initial={{ opacity: isTransitioning ? 1 : 0 }}` + `animate={{ opacity: 1 }}` 가 isTransitioning=true 일 때 둘 다 `1` → framer-motion 이 "값 변화 없음" 으로 판정해 **콜백이 발화되지 않고** phase 가 "hold" 에 영원히 머무름
2. morph 가 클릭 후 ~1s 시점 고정 타이밍 → **새 페이지가 준비되기 전에 오버레이가 작아져버림**. Suspense fallback (`loading.tsx`) 이 morph 직후 노출됨

**해결**: 전환 상태 머신 재설계

1. **dismissal 트리거 변경** — `onAnimationStart` 의존 제거, DetailLayout 의 `useEffect` 에서 mount 시 `endTransition()` 호출
2. **backdrop fullscreen 유지** — hold 단계에서 backdrop 이 화면 전체를 덮어 morph 후에도 스켈레톤을 가림 (이전엔 backdrop 도 hero 영역만 채웠음)
3. **`SAFETY_MS = 5000` 안전망** — 어떤 이유로든 endTransition 이 호출되지 않으면 PageTransitionProvider 가 강제 dismiss
4. **`endRequestedRef` short-circuit** — 빠른 mount(데이터 캐시 hit) 시 expand/morph 진행 중에 endTransition 이 호출되면 hold 를 건너뛰고 완료 시점에 곧장 done 으로 진입

**핵심 인사이트**: ① **애니메이션 라이프사이클 콜백(onAnimationStart, onAnimationComplete) 을 critical state transition 의 단독 트리거로 사용하면 안 됨** — initial===animate 같은 "값 변화 없음" 케이스에서 silent 실패 가능. 항상 useEffect 기반 fallback 이나 setTimeout 안전망과 함께 설계해야 함. ② Suspense fallback 환경에서 "morph-into-hero" 같은 모핑 전환을 설계할 때는 **오버레이가 축소되면 그 아래가 노출된다는 시각 계약을 항상 의식**해야 함. 해결책은 (a) **backdrop 으로 morph 후에도 화면 전체를 덮어두기**, 또는 (b) **새 페이지 mount 시점까지 morph 를 지연** 두 가지뿐

</details>
