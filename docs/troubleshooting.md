# Trouble Shooting

> 개발 과정에서 마주친 주요 이슈들과 해결 과정입니다. 각 항목은 접어두었습니다.

<details>
<summary><strong>1. Lenis Scroll Velocity 효과 미작동</strong></summary>

<p align="center">
  <img src="public/images/screenshots/pc/works-dark.png" width="100%" alt="Works — Scroll Velocity" />
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
  <img src="public/images/screenshots/pc/works-dark.png" width="49%" alt="Works — Dark" />
  <img src="public/images/screenshots/pc/works-light.png" width="49%" alt="Works — Light" />
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
  <img src="public/images/screenshots/pc/home-light.png" width="100%" alt="Home — Lighthouse" />
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
| <img src="public/images/screenshots/pc/home-light.png" width="100%" alt="Home PC" /> | <img src="public/images/screenshots/tablet/home-light.png" width="100%" alt="Home Tablet" /> | <img src="public/images/screenshots/mobile/home-light.png" width="100%" alt="Home Mobile" /> |
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
  <img src="public/images/screenshots/pc/home-dark.png" width="100%" alt="Home — Loading Screen" />
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
| <img src="public/images/screenshots/pc/works-dark.png" width="100%" /> | <img src="public/images/screenshots/tablet/works-dark.png" width="100%" /> | <img src="public/images/screenshots/mobile/works-dark.png" width="100%" /> |

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
| <img src="public/images/screenshots/pc/home-dark.png" width="100%" /> | <img src="public/images/screenshots/tablet/home-dark.png" width="100%" /> | <img src="public/images/screenshots/mobile/home-dark.png" width="100%" /> |

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

<details>
<summary><strong>40. Posts Bento — `grid-template-rows` 만으로는 카드별 높이 차이가 빈칸을 만듦</strong></summary>

**문제**: `/posts` bento 레이아웃이 wide / banner(21:9) / square(1:1) / portrait(3:4) / standard 5종 variant 를 섞어 쓰는데, 일반 CSS Grid 로는 row track 이 가장 큰 카드 기준으로 잡혀 작은 카드 옆에 **빈 셀**이 생김. `grid-auto-flow: dense` 만으로는 high-aspect 카드의 잔여 공간을 메우지 못함

**원인**: `grid-template-rows: auto` 또는 고정 비율로 row 를 정의하면 한 row 안의 모든 셀이 가장 큰 자식 높이로 정렬됨. 작은 카드(square)와 큰 카드(portrait) 가 같은 row 에 들어가면 square 아래에 portrait 와의 높이 차만큼 dead space 가 발생

**해결**: 진짜 masonry 를 JS + CSS Grid hybrid 로 구현

1. CSS — `grid-auto-rows: 1px` 로 row track 을 픽셀 단위까지 잘게 쪼개고 `grid-auto-flow: dense` + `gap: var(--bento-gap)` 만 지정
2. JS — `useEffect` 에서 모든 카드의 `firstElementChild.scrollHeight` 측정 → `span = ceil((h + gap) / (rowUnit + gap))` 계산해 각 카드에 `style.gridRow = span ${span}` 부여
3. ResizeObserver(grid) + 이미지 onLoad 마다 재계산 → 폰트/이미지 로드 후에도 정확
4. 모바일(`<= 640px`)에서는 모든 variant 비활성화 + 단일 16:10 비율로 통일해 JS 측정 비활성

```css
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-rows: 1px;
  grid-auto-flow: dense;
  gap: var(--bento-gap);
}
```

```ts
const recomputeRowSpans = () => {
  const grid = gridRef.current;
  if (!grid) return;
  const rowUnit = parseFloat(getComputedStyle(grid).gridAutoRows) || 1;
  const gap = parseFloat(getComputedStyle(grid).rowGap) || 0;
  itemRefs.current.forEach((el) => {
    const h = (el.firstElementChild as HTMLElement | null)?.scrollHeight ?? el.scrollHeight;
    const span = Math.max(1, Math.ceil((h + gap) / (rowUnit + gap)));
    el.style.gridRow = `span ${span}`;
  });
};
```

**핵심 인사이트**: CSS-only masonry 는 still 실험적(`grid-template-rows: masonry` 는 Chrome 미지원). 안정적으로 빈틈 없이 packing 하려면 **row track 을 픽셀 단위로 쪼갠 뒤 JS 가 측정한 높이로 span 을 부여**하는 패턴이 사실상 표준. 측정은 `firstElementChild.scrollHeight` 가 가장 정확하고(컨테이너 자체의 padding 영향 없음), 이미지 onLoad / ResizeObserver 두 시점에 모두 재계산해야 폰트/이미지 로드 이전 잘못 잡힌 높이를 보정 가능

</details>

<details>
<summary><strong>41. sticky filterBar IntersectionObserver — 인기글 사이드바와 1px 어긋남</strong></summary>

**문제**: `/posts` 의 filterBar 가 `position: sticky; top: var(--nav-height)` 로 붙는데, sentinel 의 IntersectionObserver `rootMargin` 을 고정값(`-44px 0px 0px 0px`)으로 두면 PC ↔ 모바일에서 nav 높이가 바뀌거나 filterBar 가 1행 → 2행으로 늘어나는 순간 anchor 시점이 어긋남. 결과적으로 인기글 위젯과 filterBar 가 1px 정도 겹치거나 떨어져 보임

**원인**: sticky `top` 은 CSS variable 로 동적이지만 IntersectionObserver `rootMargin` 은 객체 생성 시점의 정적 값. filterBar 의 height 가 search row 추가로 44px → 80px 로 변하면 sentinel 이 가리는 영역도 같이 변해야 하는데 observer 가 stale 인 상태

**해결**: `rootMargin` 을 컴포넌트의 실제 sticky `top` 값으로 동기화

1. `getComputedStyle(filterBar).top` 으로 실측한 값을 `rootMargin: -${stickyTop+1}px 0px 0px 0px` 로 계산 (1px 은 cross 시점 안전 마진)
2. `resize` 이벤트마다 observer 를 disconnect → 재생성해 nav-height 변화에도 정확히 anchor
3. filterBar 의 sibling 인 사이드바 `top` 도 같은 식 (`calc(var(--nav-height) + 80px + ...)`) 으로 통일해서 두 컴포넌트가 항상 같은 anchor 라인을 공유

```ts
useEffect(() => {
  const setup = () => {
    const top = parseFloat(getComputedStyle(filterBarRef.current!).top) || 0;
    const observer = new IntersectionObserver((entries) => {
      setStuck(!entries[0].isIntersecting);
    }, { rootMargin: `-${top + 1}px 0px 0px 0px`, threshold: 0 });
    observer.observe(sentinelRef.current!);
    return () => observer.disconnect();
  };
  let cleanup = setup();
  const onResize = () => { cleanup(); cleanup = setup(); };
  window.addEventListener("resize", onResize);
  return () => { cleanup(); window.removeEventListener("resize", onResize); };
}, []);
```

**핵심 인사이트**: sticky element 의 anchor 시점을 알아내는 IntersectionObserver 는 **rootMargin 이 실제 sticky top 과 정확히 일치해야** 한다. CSS variable / 미디어 쿼리로 sticky top 이 동적으로 변하는 환경에서는 observer 도 같이 재생성하는 게 유일한 정답. 정적 값으로 두면 한 viewport 에서는 맞는데 resize 직후 어긋나는 미묘한 버그가 됨

</details>

<details>
<summary><strong>42. Series Deck — hover 펼침이 "사라졌다 나타나는" 듯한 느낌</strong></summary>

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

**핵심 인사이트**: ① **CSS `transition-delay` 는 enter 만 stagger 하고 leave 도 같이 stagger 됨** — leave 도 staggered 면 OK 지만, "동시 사라짐 + 순차 등장" 같은 비대칭 시퀀스는 CSS 만으론 어렵다. JS state + 명시적 timer 로 enter/leave 타이밍을 분리해야 의도대로 동작. ② Hover 펼침처럼 "잠깐 hold 후 등장" 시퀀스는 `transition-delay` 보다 `setTimeout + state flip` 이 의미가 명확하고 cancel 도 깔끔. ③ Overshoot easing 은 마이크로 모션에서 "이미 시작된 것처럼" 보이게 만드므로, **stop → animate 가 분명해야 하는 시퀀스에는 standard ease 가 더 적합**

</details>

<details>
<summary><strong>43. Series Deck spread — `setPointerCapture` 가 자식 click 차단 + hit-area 공백으로 flicker</strong></summary>

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

**핵심 인사이트**: ① `setPointerCapture` 는 **드래그 추적 시 편리하지만 자식 click 을 모두 흡수**한다. 자식 클릭이 필요한 컴포넌트라면 document-level pointer 리스너 + 거리 기반 click suppression 이 더 안전. ② **margin 은 visual 위치만 바꾸고 hit-area 는 안 늘린다.** Hover 영역을 확장하려면 `padding-right`(box-sizing: content-box) 또는 `::after` pseudo 가 표준 패턴. content-box 는 다른 layout 부수효과가 크므로 pseudo 가 더 깔끔. ③ Hover 기반 멀티 스텝 인터랙션(deck 펼침 등)은 마우스가 layer 사이를 지나가는 micro-second 라도 hover 가 끊기면 즉시 flicker — **hover area 는 시각적 boundary 보다 한 단계 더 넓게** 잡아야 안정적

</details>

<details>
<summary><strong>44. HTML5 drag 가 pointermove 를 막아 커스텀 커서가 멈추고 type 도 계속 바뀜</strong></summary>

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

**핵심 인사이트**: HTML5 native drag 가 활성이면 pointer 이벤트는 **시스템 차원에서 정지**한다. `dragover` 로 좌표는 받을 수 있지만, drag 시작 자체와 끝을 따로 추적하지 않으면 hit-test 가 "이 사람이 뭔가 잡고 있다" 는 의미를 모름. 커스텀 커서처럼 hover 마다 모드를 바꾸는 컴포넌트는 **drag 시작점에 modes 를 동결, drag 끝점에 해제** 하는 ref 기반 lock 이 필수

</details>

<details>
<summary><strong>45. HTML5 D&D 의 quirks 회피 — chip 드래그 정렬을 pointer 기반으로 전환</strong></summary>

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

**핵심 인사이트**: HTML5 native D&D 는 "이미지 / 파일을 OS 수준에서 다른 앱으로 끌어 가는" 케이스에 최적화되어 있고, **같은 페이지 안에서 작은 항목 순서를 바꾸는 용도로는 quirks 의 합이 너무 큼.** state-driven `draggable` 토글, source unmount 시 cancel, 자식 click 차단 (`setPointerCapture` 시), "앞→뒤" 비대칭 등은 전부 D&D 표준의 부산물. **chip / list item 같은 micro-reorder 는 처음부터 pointer events 로 짜는 게** 결과적으로 코드 양도 적고 동작도 일관적

</details>

<details>
<summary><strong>46. Navigation 메뉴가 좁은 viewport 에서 우측 actions 와 겹침 + indicator 가 resize 중 메뉴 위치를 못 따라감</strong></summary>

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

**핵심 인사이트**:

① **viewport 절대중앙은 양쪽 영역의 폭을 모름** — 좌·우가 비대칭이거나 동적이면 flex `flex: 1; justify-content: center` 가 "가운데" 의 의미를 정확히 표현
② **CSS transition 은 "한 번의 사용자 의도" 에 적합하지, 연속 입력에는 부적합** — resize / scroll 같은 연속 stream 동안엔 transition 을 꺼서 매 frame snap 시키고, stream 종료 후 transition 을 복원해야 "부드러운 이동" 의 의미가 유지됨. 인라인 `transition: "none"` 으로 짧게 끄는 패턴이 가장 가벼운 해법

</details>

<details>
<summary><strong>47. 이미지 깨짐 placeholder — `dangerouslySetInnerHTML` 로 렌더된 markdown img 에는 React onError 가 안 붙음</strong></summary>

**문제**: 에디터/포스트/Works/Plate 패널 등 **모든 이미지에서** 로드 실패 시 `/images/placeholder.svg` 로 swap 하도록 통일하려 했는데, React 컴포넌트의 `<img onError>` 는 잘 작동하지만, MarkdownRenderer 처럼 marked → HTML → `dangerouslySetInnerHTML` 로 렌더된 img 와 useRichtextEnhance 가 적용되는 richtext 영역에서는 onError 가 전혀 발화되지 않아 깨진 이미지가 그대로 노출됨

**원인**:

1. `dangerouslySetInnerHTML` 로 삽입된 DOM 은 React 가 관리하지 않으므로 `onError` 같은 합성 이벤트 prop 이 attached 되지 않음
2. 이미 fetch 가 끝난 이미지(`complete && naturalWidth === 0`) 는 listener 를 늦게 부착하면 `error` 가 다시 발화되지 않아 영원히 깨진 상태로 남음
3. MarkdownRenderer 가 dynamic 하게 새 img 를 추가하는 경우(에디터 토글 / lazy 로드) 는 초기 querySelectorAll 만으로는 못 잡음

**해결**: `useRichtextEnhance` 훅과 MarkdownRenderer 양쪽에 `attachImageFallback(root)` 패턴 도입

1. **컨테이너 내 모든 `<img>` 에 listener 부착** — `data-fallback-bound` 로 중복 부착 방지. **이미 실패 상태(`complete && naturalWidth === 0`) 면 즉시 swap**
2. **`MutationObserver(root, { childList: true, subtree: true })`** — 이후 추가되는 img 도 동일 처리
3. **swap 시 `srcset` 도 함께 제거** — 안 그러면 브라우저가 srcset 후보를 먼저 시도해 다시 깨질 수 있음
4. **React 컴포넌트는 onError + state swap** — PostEditor cover / WorkEditor main·gallery / RelationPicker chip·option / Plate ImagePanel·ImageElement 모두 동일 패턴

```ts
function attachImageFallback(root: HTMLElement): () => void {
  const handle = (img: HTMLImageElement) => {
    if (img.dataset.fallbackBound === "1") return;
    img.dataset.fallbackBound = "1";
    img.addEventListener("error", () => swapToPlaceholder(img));
    if (img.complete && img.naturalWidth === 0) swapToPlaceholder(img);
  };
  root.querySelectorAll("img").forEach((el) => handle(el as HTMLImageElement));
  const mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;
        const el = node as Element;
        if (el.tagName === "IMG") handle(el as HTMLImageElement);
        el.querySelectorAll?.("img").forEach((img) => handle(img as HTMLImageElement));
      });
    }
  });
  mo.observe(root, { childList: true, subtree: true });
  return () => mo.disconnect();
}

function swapToPlaceholder(img: HTMLImageElement) {
  if (img.src.endsWith("/images/placeholder.svg")) return;
  img.src = "/images/placeholder.svg";
  img.removeAttribute("srcset");
}
```

**핵심 인사이트**:

① **`dangerouslySetInnerHTML` 로 들어온 DOM 은 React 합성 이벤트의 사각지대** — 이벤트 위임이 없으니 native `addEventListener` 가 유일한 선택
② 이미 로드(or 실패) 가 끝난 이미지는 `error` 가 retroactive 하게 발화되지 않으므로, listener 부착 직후 **`complete && naturalWidth === 0` 동기 체크가 필수**
③ `srcset` 을 두면 src 만 바꿔도 브라우저가 srcset 후보를 우선 시도해 다시 깨질 수 있으므로 swap 시 함께 제거
④ richtext 처럼 콘텐츠가 동적인 영역은 querySelectorAll 단발이 아니라 **MutationObserver 로 incremental** 처리해야 새로 들어온 img 도 안전

</details>

<details>
<summary><strong>48. float 이미지 — 독립 블록 분리 + 빈 줄 가리기 + 빈 자리 커서·클릭 차단</strong></summary>

**문제**: float 이미지를 본문 옆에 흘리면서 (1) 옆 텍스트 블록을 드래그·선택해도 이미지는 안 묶이고, (2) 이미지 위/아래에 빈 줄이 안 보이고, (3) 클릭·방향키가 보이지 않는 빈 자리에 커서를 안 떨어뜨리게 하려 했으나 이 셋이 서로 충돌

**원인**: CSS `float` 은 이미지를 흐름 밖으로 빼지만, Plate(Slate)에선 이미지가 inline void(`isInline: true, isVoid: true`)라 반드시 문단 안에 있고 양옆에 빈 텍스트(ZWSP)가 강제됨

1. 텍스트와 **같은 문단**이면 블록 드래그가 이미지+텍스트를 통째로 이동
2. **독립 문단**으로 분리하면 흐름엔 ZWSP 한 줄만 남아 빈 줄로 보임
3. 그 빈 줄을 `line-height:0` 등으로 접으면 블록이 0높이가 되며 커서·핸들이 깨지고, 다음 블록으로 덮으면 안 보이는 그 자리에 클릭·방향키로 커서가 들어가 깜빡임

**해결**: 데이터·레이아웃·입력 세 층을 함께 처리

1. **(데이터) 독립 블록화** — 변경마다 mixed 문단을 `splitNodes` 로 분리해 이미지를 자기 문단으로 → 드래그·선택이 텍스트와 독립
2. **(레이아웃) 빈 줄 가리기** — 이미지 블록을 0높이로 접는 대신 **다음 블록을 한 줄 끌어올림**(`margin-bottom: -1lh`). 이미지 블록은 그대로라 커서·핸들 정상. float wrapper 에 `z-index` 를 줘 이동 핸들이 안 가리게
3. **(입력) 빈 자리 진입 차단** — 클릭(mousedown)·방향키(keydown)를 **capture 단계**에서 가로채, 빈 자리로 갈 상황이면 이미지를 선택하거나 인접 블록으로 보냄. Slate 기본 이동보다 먼저 처리해 깜빡임 제거

**핵심 인사이트**:

① float(흐름 밖)과 inline void(문단 내 강제 텍스트)는 근본적으로 충돌 — 한 군데 수정으론 안 풀린다
② 빈 줄을 "없애는" 게 아니라 **다음 블록으로 덮고**, 그 자리에 **커서가 못 가게 막는** 조합으로 해결
③ Slate 기본 동작이 먼저 커서를 옮긴 뒤 교정하면 1프레임 깜빡임 → **capture 단계에서 선점**해야 깜빡임이 사라진다
④ inline void 의 강제 ZWSP 는 normalize 가 복원해 지울 수 없으므로, **안 보이게 + 안 닿게** 만드는 우회가 현실적

</details>
