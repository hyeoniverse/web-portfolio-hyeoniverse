# Trouble Shooting

> 개발 과정에서 마주친 주요 이슈들과 해결 과정입니다. 각 항목은 접어두었습니다.

<details>
<summary><strong>1. Lenis Scroll Velocity 효과 미작동</strong></summary>

<p align="center">
  <img src="../public/images/screenshots/pc/works-dark.png" width="100%" alt="Works — Scroll Velocity" />
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
  <img src="../public/images/screenshots/pc/works-dark.png" width="49%" alt="Works — Dark" />
  <img src="../public/images/screenshots/pc/works-light.png" width="49%" alt="Works — Light" />
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
  <img src="../public/images/screenshots/pc/home-light.png" width="100%" alt="Home — Lighthouse" />
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
| <img src="../public/images/screenshots/pc/home-light.png" width="100%" alt="Home PC" /> | <img src="../public/images/screenshots/tablet/home-light.png" width="100%" alt="Home Tablet" /> | <img src="../public/images/screenshots/mobile/home-light.png" width="100%" alt="Home Mobile" /> |
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
  <img src="../public/images/screenshots/pc/home-dark.png" width="100%" alt="Home — Loading Screen" />
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
| <img src="../public/images/screenshots/pc/works-dark.png" width="100%" /> | <img src="../public/images/screenshots/tablet/works-dark.png" width="100%" /> | <img src="../public/images/screenshots/mobile/works-dark.png" width="100%" /> |

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
| <img src="../public/images/screenshots/pc/home-dark.png" width="100%" /> | <img src="../public/images/screenshots/tablet/home-dark.png" width="100%" /> | <img src="../public/images/screenshots/mobile/home-dark.png" width="100%" /> |

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
<summary><strong>33. CTA 버튼의 backdrop-filter 가 Chrome 에서 동작하지 않음</strong></summary>

**문제**: 홈 CTA 버튼에 건 `backdrop-filter` 가 Chrome 에서 아무 효과도 내지 않았다.

**원인**: `.home` 의 등장 애니메이션이 `y` transform 으로 돌아가면서 상위에 합성 레이어가 생겼다. 그 레이어가 backdrop 샘플링 범위를 잘라서 버튼이 참조할 배경이 사라졌다. `-webkit-backdrop-filter` 접두사도 Chrome 의 선언 파싱을 어긋나게 해 효과를 함께 죽였다.

**해결**: 등장 애니메이션을 transform 대신 `marginTop` 으로 바꿔 합성 레이어를 만들지 않도록 하고, 접두사 선언을 제거했다.

**핵심 인사이트**: `backdrop-filter` 는 자기 선언만으로 결정되지 않는다. 조상이 만든 합성 레이어가 샘플링 범위를 자르므로, 효과가 안 보이면 조상의 transform 부터 확인한다.

</details>

<details>
<summary><strong>34. Portal 기반 드롭다운에서 CSS transition 이 걸리지 않음</strong></summary>

**문제**: Portal 로 띄우는 드롭다운이 열릴 때 전환 없이 즉시 나타났다.

**원인**: 마운트 시점에 이미 열림 상태 클래스가 붙어 있어 전환의 시작값과 끝값이 같았다. 브라우저는 값이 바뀌지 않은 속성에 전환을 걸지 않는다.

**해결**: `animateOpen` 상태를 따로 두고 `requestAnimationFrame` 두 번으로 마운트, 닫힘, 열림 순서를 보장했다. 전역 테마 전환 규칙에 밀리지 않도록 복합 선택자로 특이도를 올렸다.

**핵심 인사이트**: 전환은 값이 바뀌어야 일어난다. 마운트와 동시에 최종 상태로 그리면 전환할 구간 자체가 없으므로, 초기 상태를 한 프레임 이상 유지해야 한다.

</details>

<details>
<summary><strong>35. mix-blend-mode: difference 안에서 자식 색을 개별 지정할 수 없음</strong></summary>

**문제**: 히어로 영역에 `mix-blend-mode: difference` 를 걸었더니 그 안 모든 글자가 함께 반전돼, 설명 문구만 원래 색으로 두는 것이 불가능했다.

**원인**: 부모에 blend 를 걸면 자식 전체가 한 덩어리로 합성된다. 자식에서 색을 다시 지정해도 합성 결과가 그 위에 적용되므로 개별 예외를 만들 수 없다.

**해결**: difference 를 적용할 제목과 카테고리만 별도 요소에 두고, 설명과 상세는 형제 오버레이로 분리했다. 두 요소의 위치는 rAF 에서 맞춘다.

**핵심 인사이트**: blend 는 요소 단위로만 예외를 만들 수 있다. 일부만 합성해야 하면 DOM 을 나눠야 한다.

</details>

<details>
<summary><strong>36. About 페이지 첫 패널이 잘못된 위치에서 시작</strong></summary>

**문제**: About 페이지를 열면 첫 패널이 화면 밖에서 시작하거나 어긋난 자리에서 멈췄다.

**원인**: 동적 import 로 불러오는 패널의 스켈레톤 폭과 실제 폭이 달랐다. ErdPanel 은 스켈레톤이 350vw 로 잡혀 있었고 실제는 100vw 였다. 여기에 React strict mode 의 두 번째 마운트에서 GSAP 이 transform 을 초기화하면서 계산이 한 번 더 어긋났다.

**해결**: 스켈레톤 폭을 실제 폭과 맞추고, cleanup 에서 transform 을 되돌리지 않도록 바꿨다. 초기화가 두 번 도는 것은 `initializedRef` 가드로 막았다.

**핵심 인사이트**: 가로 스크롤 계산은 자리표시자의 크기에 의존한다. 스켈레톤이 실제와 다른 크기면 첫 계산이 통째로 틀어진다.

</details>

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

<details>
<summary><strong>49. 에디터 top bar 가 sticky 로 안 붙음 — `position: sticky` → `position: fixed` 전환</strong></summary>

**문제**: 에디터 상단 바(BackLink·저장·리비전 등)를 `position: sticky` 로 화면 상단에 고정하려 했으나, 스크롤해도 핀이 걸리지 않고 본문과 함께 위로 사라짐

**원인**: 에디터 본문이 `height: 60vh` + `data-lenis-prevent` 로 감싼 **내부 스크롤 영역**이라, 정작 페이지(document) 자체는 거의 스크롤되지 않음

- `position: sticky` 는 **스크롤 컨테이너가 실제로 스크롤될 때** 핀이 걸리는데, 본문 안에서 휠을 굴려도 페이지 스크롤 위치는 그대로라 sticky 가 발동할 조건이 안 생김
- 또 `scroll` 이벤트는 버블하지 않아서, 일반 listener 로는 중첩된 본문 영역의 스크롤을 잡지 못함

**해결**: sticky 를 버리고 `position: fixed` 로 직접 제어

1. **(고정) `position: fixed; top: var(--header-height)`** — 전역 Navigation 바로 아래에 항상 고정. 접힘/펼침은 `transform: translateY()` 로
2. **(flow 예약) `ResizeObserver` spacer** — fixed 라 flow 에서 빠진 만큼 본문이 위로 밀려 가려지므로, top bar 높이를 `ResizeObserver` 로 측정해 같은 높이의 `.topBarSpacer` 로 자리를 예약
3. **(스크롤 감지) capture 단계 listener** — `window.addEventListener("scroll", onScroll, true)` 로 capture 단계에서 듣고, target 이 document 면 페이지 스크롤, `HTMLElement` 면 중첩 본문 스크롤로 분기. 두 경우 모두 방향(delta)을 누적해 임계값(6px) 도달 시 접기/펼치기 토글 — 느린 스크롤도 같은 방향으로 모이면 동작

**핵심 인사이트**:

① `position: sticky` 는 "조상 중 실제로 스크롤되는 컨테이너" 가 있어야 동작 — 내부 스크롤 패턴(`60vh` + `lenis-prevent`)에선 페이지가 안 움직이므로 sticky 가 무의미
② `scroll` 이벤트는 **버블하지 않는다** → 중첩 스크롤 영역까지 한 listener 로 잡으려면 **capture 단계**(`useCapture=true`)로 들어야 함
③ `fixed` 는 flow 에서 빠지므로, 가려짐을 막으려면 spacer 로 높이를 **명시적으로 예약**해야 한다 (`ResizeObserver` 로 동기화)

</details>

<details>
<summary><strong>50. HorizontalCarousel 안의 카드 클릭이 안 먹음 — `setPointerCapture` 가 자식 click 을 가로챔</strong></summary>

**문제**: 가로 캐러셀 안에 든 팀원 폴라로이드(플립) 카드를 클릭해도 토글이 안 됨. 카드 자체엔 `onClick` 이 정상으로 붙어 있는데도 이벤트가 도달하지 않음

**원인**: 캐러셀이 마우스 드래그 스크롤을 위해 `onPointerDown` 에서 **즉시 `el.setPointerCapture()`** 를 호출

- 포인터가 캡처되면 이후 pointer 이벤트가 전부 캐러셀로 redirect 되고, 그 결과 자식 카드의 `click`(= pointerdown→up 한 쌍) 이 카드까지 전달되지 않음
- 즉 "드래그하려고 캡처" 가 "탭/클릭" 까지 같이 삼켜 버린 것

**해결**: 캡처를 **pointerdown 시점이 아니라 실제 드래그가 시작된 시점으로 미룸**

1. `onPointerDown` 에선 시작 좌표만 기록(`active: true`) — 캡처는 하지 않음
2. `onPointerMove` 에서 이동량이 **4px 을 넘긴 순간** 비로소 `setPointerCapture()` + `data-cursor="grab"` 설정 → 진짜 드래그로 판정
3. 4px 미만으로 떼면 캡처가 일어나지 않아 `click` 이 자식에 정상 전달. `onClickCapture` 는 `moved` 플래그가 섰을 때만 click 을 막아, 드래그 끝의 의도치 않은 클릭을 차단

**핵심 인사이트**:

① `setPointerCapture` 를 pointerdown 에서 바로 부르면 **클릭과 드래그를 구분할 기회 자체가 없어진다** — 캡처가 자식 이벤트를 통째로 가져감
② "이동 임계값(4px)을 넘기 전까진 캡처하지 않는다" 가 클릭과 드래그를 공존시키는 표준 패턴 (TagCloud3D·Series Deck 와 동일한 원인·해법)

</details>

<details>
<summary><strong>51. 에디터 미리보기가 게시 상세와 레이아웃이 어긋남 — 공용 Article 뷰 컴포넌트로 추출</strong></summary>

**문제**: admin 에디터의 미리보기(preview) 화면이 실제 게시된 상세 페이지와 레이아웃·간격·코드블록 처리가 미묘하게 계속 어긋남

**원인**: preview 가 detail 과 **별개로 만든 단순화 버전**이었음

- detail 의 마크업/스타일이 바뀔 때마다 preview 를 따로 맞춰야 했고, 한쪽만 고치면 곧바로 어긋남 — 같은 화면을 두 번 구현한 구조적 중복
- richtext(코드 하이라이팅·embed·heading id) 처리도 서로 다른 코드 경로라 출력이 달랐음

**해결**: 상세 페이지의 article 뷰를 **공용 프레젠테이션 컴포넌트로 추출**해 detail·preview 가 같은 컴포넌트를 렌더하게 함

1. `PostArticleView` / `WorkArticleView` 에서 `Header` / `Body` / `Team` 을 export → `PostDetailClient`·`WorkDetailClient`(상세)와 `posts/preview`·`works/preview`(미리보기)가 **동일 컴포넌트**를 사용. 댓글·뒤로가기처럼 preview 에 없는 chrome 만 detail 쪽에서 추가
2. richtext HTML 처리를 `src/utils/processRichtextHtml.ts` 한 곳으로 공유 — heading id 주입 → embed URL 변환 → wrap 토글 라벨 → img `data-cursor="zoom"` 순서를 양쪽이 똑같이 거침 → 코드블록까지 100% 동일

**핵심 인사이트**:

① "미리보기" 가 본화면과 다르면 미리보기로서의 가치가 없다 — 단순화 버전을 따로 두는 순간 **두 화면이 silent 하게 drift** 한다
② 해법은 동기화가 아니라 **단일 소스화**: 같은 출력이 필요하면 같은 컴포넌트·같은 처리 함수를 쓰게 만들어, 한쪽만 바뀌는 상태를 구조적으로 불가능하게 한다

</details>

<details>
<summary><strong>52. float 이미지가 상세 페이지에서 텍스트와 딱 붙음 (간격 0)</strong></summary>

**문제**: 본문 옆으로 흘린 float 이미지가 상세 페이지에서 인접 텍스트와 **간격 없이 딱 붙어** 렌더됨

**원인**: plateSerializer 가 float figure 를 `style="float:left;margin:0"` 처럼 **인라인 style 로 margin:0** 을 박아 저장

- 가로 여백이 0이라 텍스트가 이미지에 달라붙음
- 게다가 **인라인 style 은 우선순위가 높아** `.prose figure` 같은 일반 CSS 규칙으로는 덮을 수 없었음

**해결**: 직렬화 값 자체를 고치고, CSS 로도 `!important` 강제

1. `plateSerializer.ts` — float figure 직렬화 margin 을 `0 24px 24px 0`(left) / `0 0 24px 24px`(right) 로 변경. 옆·아래 여백을 직렬화 단계에서 부여
2. `PostDetail.module.css` / `WorkDetail.module.css` — `.prose figure[style*="float:left"]` / `.sectionProse figure[style*="float:right"]` 에 `margin: ... !important` 로 옆·아래 간격(`--spacing-lg`)을 강제. **과거에 `margin:0` 으로 저장된 콘텐츠도** 일관되게 간격이 적용되도록(직렬화 값과 무관하게 커버)

**핵심 인사이트**:

① 직렬화가 인라인 style 을 박으면, 그 값은 외부 CSS 보다 **우선순위가 높아** 나중에 덮기 어렵다 — 직렬화 단계에서 올바른 값을 넣는 게 1차 방어
② 이미 잘못 저장된 과거 데이터까지 책임지려면, attribute selector(`[style*="float"]`) + `!important` 로 **인라인 값을 무력화**하는 2차 방어를 둔다

</details>

<details>
<summary><strong>53. 에디터 폼 input 에서 한글 IME 입력이 깨짐</strong></summary>

**문제**: poll/tab 블록 등 에디터 내부 폼 input 에 한글을 입력하면 조합 중인 글자가 깨지거나 사라짐

**원인**: Slate 가 IME 조합 도중에 re-render 하면 조합 상태가 끊김

**해결**: poll/tab 입력을 void element + 공용 `EditorTextInput` 로 격리

1. `EditorTextInput` 은 `contentEditable=false` + commit-on-blur 방식 — Slate 의 편집 모델 밖에서 동작해 조합 중 re-render 영향을 받지 않음
2. `onMouseDown` 에서 `nativeEvent.stopImmediatePropagation()` 으로 Slate 의 selection 처리를 차단
3. 이미지 caption 과 동일 패턴

**핵심 인사이트**: 에디터 내부의 폼 input 은 에디터의 편집 모델과 분리해야 IME 조합이 안전하다 — caption 에서 검증된 패턴을 poll/tab 에 재사용

</details>

<details>
<summary><strong>54. 블록 드래그가 HTML5 native drag 에 가로채여 pointer 드래그가 안 됨</strong></summary>

**문제**: 에디터 블록을 핸들로 드래그할 때 브라우저의 HTML5 native drag 가 끼어들어 커스텀 pointer 드래그가 동작하지 않음

**해결**: native drag 를 끄고 커스텀 드래그 레이어로 대체

1. `useDraggable` 의 preview 를 disable + 핸들 `draggable={false}` 로 native drag 차단
2. 커스텀 `BlockDragLayer` 가 DOM 을 복제한 고스트를 커서를 따라 그리고, 에디터 가장자리에서 자동 스크롤
3. 커서 모양은 CSS `cursor` 가 아니라 `data-cursor` 속성(CursorTrail 시스템)으로 지정

**핵심 인사이트**: pointer 기반 커스텀 드래그를 쓰려면 HTML5 native drag 를 명시적으로 꺼야 한다 — 둘이 공존하면 native 가 pointer 이벤트를 삼킨다

</details>

<details>
<summary><strong>55. EmojiPicker 에서 "two children with the same key: weather" 에러</strong></summary>

**문제**: 이모지 picker 개편 중 React 가 `two children with the same key: weather` 경고를 던짐

**원인**: 기존 `ICON_CATEGORIES` 에 이미 weather/shapes/dev 카테고리가 있었는데, 신규 아이콘을 추가하면서 같은 id 로 카테고리를 **중복 생성**

**해결**: 중복 카테고리 제거 + 신규 아이콘을 기존 카테고리에 병합

1. 같은 id 의 중복 카테고리(weather/shapes/dev)를 제거하고 신규 아이콘을 기존 카테고리에 병합
2. 글로벌 아이콘 id 중복도 함께 제거

**핵심 인사이트**: 카테고리/아이콘 같은 정적 리스트를 확장할 땐 기존 id 와의 충돌부터 확인해야 한다 — key 중복은 곧 데이터 중복의 신호

</details>

<details>
<summary><strong>56. EmojiPicker 를 inline→CSS 모듈로 바꾸니 hover/슬라이드 transition 이 안 먹음</strong></summary>

**문제**: EmojiPicker 를 inline 스타일에서 CSS 모듈로 옮기자 인디케이터 슬라이드·카테고리 opacity 같은 transition 이 동작하지 않음

**원인**: 전역 룰 `html[data-theme-ready] *`(specificity `(0,1,1)`)의 transition 이 단일 클래스 `(0,1,0)` 컴포넌트 transition 을 덮어씀

**해결**: 전역 룰에 없는 속성은 compound 선택자로 specificity 확보

1. 인디케이터 슬라이드·카테고리 opacity 처럼 전역 transition 룰에 없는 속성을 `.tabHeader .indicator`, `.picker .catBtn` 같은 compound 선택자 `(0,2,0)` 로 지정

**핵심 인사이트**: 전역 theme transition 룰 `(0,1,1)` 이 단일 클래스 컴포넌트 transition 을 덮으므로, transform/opacity 등 전역 룰에 없는 속성은 compound 선택자로 specificity 를 올려야 한다

</details>

<details>
<summary><strong>57. ViewModeToggle 로 데스크톱에서 "모바일 모드" 가 무효</strong></summary>

**문제**: ViewModeToggle 로 데스크톱에서 "모바일 모드" 를 켜도 아무 변화가 없음

**원인**: 데스크톱 브라우저는 viewport meta 의 `width` 를 무시함 (모바일 브라우저 전용 동작)

**해결**: 토글을 터치 기기에서만 노출

1. viewport 오버라이드는 모바일에서 "PC 버전 보기" 용으로만 유효하므로, 토글을 터치 기기(`pointer:coarse`)에서만 노출

**핵심 인사이트**: viewport meta `width` 오버라이드는 모바일 브라우저에서만 효과가 있다 — 데스크톱에서 모바일 폭을 강제할 수단이 아니므로, 기능을 터치 기기로 한정하는 게 맞다

</details>

<details>
<summary><strong>58. highlight.js 가 브라우저에서만 죽음 — 빌드·tsc·테스트는 전부 통과</strong></summary>

**문제**: 에디터 코드블록에서 **HTML(xml) 만** 색이 안 붙음. 언어 감지는 정상이라 라벨엔 "HTML / XML" 이 뜨는데 코드는 무채색. CSS 등 다른 언어는 멀쩡. `npm run build`·`tsc`·테스트 전부 통과하고 **브라우저에서만** 재현

**원인**: 세 가지가 겹쳐야 터진다.

1. hljs `xml.js` 가 태그명을 `/[\p{L}_]/u` 로 정의
2. **번들러가 그걸 전개** — browserslist 가 최신(chrome 148)인데도 Next 는 node_modules 를 보수적 타깃으로 컴파일한다. `\p{L}` 이 실제 코드포인트 범위로 풀리고 거기엔 **아스트랄 영역(`\u{10000}-…`)** 이 섞인다. 중괄호 형태라 `u` flag 없이는 파싱 자체가 불가능
3. hljs `countMatchGroups` 가 `new RegExp(re.toString() + "|")` 로 **flag 없이 재파싱** → `SyntaxError`

```
SyntaxError: Invalid regular expression: /<(?=[A-Z…\u{10000}-\u{1000B}…
    at countMatchGroups (core.js:456)
```

Plate 가 이 throw 를 catch 해서 **조용히 plaintext 로 떨구므로** 화면엔 "색이 안 붙는다" 로만 보이고 원인은 콘솔에만 있다. CSS 가 멀쩡했던 건 `css.js` 에 `\p{}` 가 하나도 없어서.

**node 에선 재현되지 않는다** — node 는 트랜스파일 안 된 원본(`\p{L}` + `u` flag)을 쓰므로 멀쩡하다. 전개된 형태는 **브라우저 번들에만 존재**한다. 그래서 DOM·클래스·CSS·서빙 청크까지 다 검증해도 안 나왔고, 브라우저 콘솔 스택트레이스로만 잡혔다.

**해결**: 두 단계.

1. **리더뷰·댓글 → Prism**. 유니코드 속성 이스케이프를 안 쓰므로 함정이 없고 이미 의존성에 있었다. `utils/prismHighlight.ts` 를 단일 진입점으로 두고 `highlightCodeBlocks.ts` 의 hljs import 를 전부 걷어냄 (Prism 번들에 없는 bash 는 직접 정의)
2. **에디터 → 문법 패치**. Plate 의 code-block 플러그인이 **lowlight 인스턴스를 API 로 받아** Prism 으로 못 바꾼다. 그래서 등록 시 문법 객체를 훑어 아스트랄 이스케이프를 걷어내고 `u` flag 를 뗀다(`lowlightInstance.ts` 의 `browserSafeGrammar`). 아스트랄 "문자" 는 태그명에 실질적으로 안 쓰이고 BMP(한글·CJK·라틴 확장)는 그대로 남는다. Plate 도 python 에 같은 우회(`ensureStablePythonGrammar`)를 갖고 있어 이게 표준 대응이다

**함정**: 처음엔 `RegExp` 인스턴스만 변환했는데 아무것도 안 고쳐졌다. hljs `regex.concat()` 이 **RegExp 가 아니라 소스를 이어붙인 문자열**을 반환하기 때문(`core.js: return joined`) — 아스트랄은 문자열 안에 있었다.

**검증**: node 로는 실물 재현이 안 되므로 **번들된 형태를 합성**해서 테스트했다 (`plate/__tests__/browserSafeGrammar.test.ts`) — (1) 합성 입력이 실제로 재파싱을 깨뜨리는지 (2) 변환 후엔 견디는지 (3) 한글이 안 깨지는지.

**교훈**: **"테스트가 통과한다" 가 "동작한다" 는 뜻이 아니다.** 테스트가 도는 환경(node)과 코드가 실행되는 환경(브라우저 번들)이 다르면, 그 틈에 사는 버그는 테스트가 구조적으로 못 잡는다. 라이브러리가 **삼켜버리는 예외**도 위험을 키운다 — 증상과 원인의 거리가 멀수록 추측 대신 증거를 먼저 확보해야 한다.

**핵심 인사이트**: 라이브러리 소스가 정상이어도 번들러의 다운레벨 변환이 런타임 전용 폭탄을 만들 수 있다 — 모듈 top-level 에서 throw 하는 코드는 import 한 페이지 전체를 죽이므로, 빌드 통과를 안전 신호로 착각하면 안 된다

</details>

<details>
<summary><strong>59. 댓글 마크다운 체크박스가 불릿으로만 렌더 — DOMPurify 가 URL 도 아닌 `type` 속성을 지움</strong></summary>

**문제**: 댓글 마크다운의 `- [ ] 할 일` 이 체크박스가 아니라 그냥 불릿으로 렌더. `ALLOWED_ATTR` 에 `type` 을 넣어뒀는데도 동일

**원인**: DOMPurify 는 "URI-safe 로 알려진 속성" 이 아니면 그 **값**을 `ALLOWED_URI_REGEXP` 로 검사함. 기본 URI-safe 목록(alt/class/title/value 등)에 `type` 이 없어서 `type="checkbox"` 의 값이 `/^(?:https?:|mailto:)/i` 에 걸려 조용히 제거됨 → 훅이 "체크박스 아님" 으로 판정해 `<input>` 을 삭제 → 불릿만 남음. 같은 이유로 표의 `align` 도 죽어 있어 마크다운 표 정렬이 통째로 무시되고 있었음

**해결**: URL 이 아닌 inert 속성임을 별도로 선언

1. `ADD_URI_SAFE_ATTR: ["type", "checked", "disabled", "align"]` 추가 — URI 검사 대상에서 제외
2. `ALLOWED_ATTR` 등록만으로는 무의미 — 두 옵션은 축이 다름 (허용 여부 vs 값 검사 방식)

**핵심 인사이트**: 허용 목록(`ALLOWED_ATTR`)과 값 검사 정책(`ADD_URI_SAFE_ATTR`)은 별개 축이다 — "허용했는데 사라진다" 면 필터가 그 속성의 **값**을 URL 로 오해하고 있는지 의심해야 한다

</details>

<details>
<summary><strong>60. task list `:has()` — 과소 매칭과 과다 매칭 양쪽 함정</strong></summary>

**문제**: 체크박스 목록의 불릿을 지우는 `:has()` 규칙이, 어떤 목록에선 안 먹고(불릿이 남음) 어떤 목록에선 너무 먹음(멀쩡한 불릿까지 사라짐)

**원인**: `marked` 는 tight list 를 `<li><input>` 으로, loose list(항목 사이 빈 줄)를 `<li><p><input>` 으로 만든다. `:has(> li > input)` 만 쓰면 loose 에서 빗나가고, `:has(input)` 자손 조합자로 퉁치면 일반 불릿 목록 안에 체크박스 하위목록이 있을 때 **부모 목록의 불릿까지** 사라짐

**해결**: 직계 경로 두 개만 명시

1. `:has(> li > input[type="checkbox"], > li > p > input[type="checkbox"])` — tight/loose 두 형태만 잡고 자손 매칭은 배제

**핵심 인사이트**: `:has()` 는 조합자 선택이 곧 매칭 범위 — 자손 조합자로 넓히면 중첩 구조에서 조상까지 오염된다. 마크다운 렌더러가 만드는 **실제 DOM 형태를 전부 열거**해 직계 경로로 못 박는 편이 안전하다

</details>

<details>
<summary><strong>61. 전역 input reset 이 native 체크박스를 아예 안 그림</strong></summary>

**문제**: sanitize 를 통과해 `<input type="checkbox">` 가 DOM 에 살아 있는데도 화면에 체크박스가 안 보임. `appearance: auto` 를 줘도 동일

**원인**: `src/styles/globals/_base.css` 의 전역 리셋 `input { border: none; background: none }` 이 UA 기본 스타일을 지워, native 체크박스가 그려질 표면 자체가 없어짐

**해결**: UA 기본 스타일 복원

1. 해당 체크박스에 `background: revert; border: revert` — `appearance` 가 아니라 리셋으로 지운 두 속성을 되돌리는 게 핵심
2. `background` / `border` 는 shorthand 라 stylelint `declaration-strict-value` 대상이 아님 — 토큰 규칙과 충돌 없음

**핵심 인사이트**: `appearance: auto` 는 "네이티브 위젯으로 그려라" 일 뿐, 이미 리셋으로 지워진 `background`/`border` 를 되살리지 않는다 — 전역 리셋이 있는 프로젝트에서 네이티브 컨트롤을 되살릴 땐 `revert` 로 UA 스타일 자체를 복원해야 한다

</details>

<details>
<summary><strong>62. 툴바 마크다운 삽입 — 빈 줄·블록 문법에서 의도한 요소가 안 나옴</strong></summary>

**문제**: 댓글 툴바의 체크박스 버튼을 빈 줄에서 누르면 체크박스가 아니라 불릿이 됨. `---` 구분선 버튼은 앞 줄에 글이 있으면 구분선이 아니라 **제목**이 됨

**원인**: 두 가지 GFM 파싱 규칙

1. 체크박스: GFM 은 `- [ ] ` 마커 **뒤에 텍스트가 있어야** task list 로 파싱 — 빈 줄에 마커만 넣으면 `<li>[ ]</li>` 불릿
2. `---`: 앞 줄에 텍스트가 붙어 있으면 hr 이 아니라 **setext h2**(밑줄 제목 문법) 로 해석됨. 코드펜스·표도 줄머리에서만 파싱

**해결**: 삽입 액션이 문맥을 만들고 넣도록

1. prefix 액션에 placeholder 추가 — 빈 줄이면 예시 텍스트를 채우고 그 부분을 선택 상태로
2. 블록 삽입 시 앞에 빈 줄을 확보한 뒤 삽입

**핵심 인사이트**: 마크다운 삽입 버튼은 문자열을 꽂는 게 아니라 **파서가 그 문법을 인식할 문맥까지 만들어야** 한다 — 마커만 넣으면 "버튼이 안 먹는" 것처럼 보인다

</details>

<details>
<summary><strong>63. Popover 내부 텍스트별 `mix-blend-mode: difference` 가 backdrop-filter 와 양립 불가</strong></summary>

**문제**: 배경이 뭐든 읽히는 popover 를 만들려고 패널에 `backdrop-filter` 를, 내부 텍스트엔 `difference` 를 걸었는데 blend 가 배경을 못 봄

**원인**: `backdrop-filter` / `isolation: isolate` 는 Backdrop Root 를 만들어 backdrop-filter 가 볼 수 있는 범위를 잘라냄. 게다가 `backdrop-filter` 의 출력은 자손·형제에게 blendable backdrop 으로 제공되지 않아, **popover 내부 텍스트별 difference 는 원리적으로 불가**

**해결**: 색 반전 트릭으로 우회 후, 기본값은 다른 방식 채택

1. 콘텐츠에 `filter: invert(1)` + 패널에 `mix-blend-mode: difference` → `|배경 − (1−색)|` 로 원래 색 복원
2. 다만 이 조합은 제약이 많아 **기본은 glass(반투명 + blur)** 로 가고, `difference` 는 `Popover` 의 variant 로 남김

**핵심 인사이트**: `backdrop-filter` 와 `mix-blend-mode` 는 같은 "뒷배경" 을 보는 것 같지만 서로의 입력이 되지 못한다 — 한 요소에서 둘을 조합하려 하기 전에 Backdrop Root 가 어디서 잘리는지부터 확인해야 한다

</details>

<details>
<summary><strong>64. dev 서버를 띄운 채 `npm run build` 하면 ChunkLoadError</strong></summary>

**문제**: 개발 중 빌드 검증을 하려고 `npm run build` 를 돌리면 열려 있던 dev 사이트가 `ChunkLoadError` 로 깨짐

**원인**: `next dev` 와 `next build` 가 같은 `.next` 디렉터리를 공유 — 빌드가 dev 산출물을 덮어써서 브라우저가 들고 있던 청크 해시가 사라짐

**해결**: dev 서버가 떠 있는 동안엔 빌드를 돌리지 않음 (또는 별도 `distDir` 로 분리)

**핵심 인사이트**: 두 프로세스가 같은 산출물 디렉터리를 쓰면 "빌드 검증" 이 곧 "dev 환경 파괴" 가 된다 — 빌드 통과 여부를 확인하려면 dev 를 내리거나 산출물 경로를 분리해야 한다

</details>

<details>
<summary><strong>65. Lenis 스무스 스크롤 환경에서 코드블록 위 세로 스크롤이 먹히던 문제</strong></summary>

**문제**: 코드블록 위에 마우스를 두고 세로로 휠을 굴리면 페이지가 안 움직였다 — 코드블록만 스크롤을 삼키는 느낌.

**원인**: 코드블록 `<pre>` 에 `data-lenis-prevent` 를 통째로 걸었다. 가로 스크롤(넓은 코드)을 살리려는 의도였는데, Lenis 가 그 요소 위 wheel 을 아예 무시하다 보니 블록이 세로로 안 넘칠 때 세로로 굴려도 페이지가 안 움직였다(Lenis 는 body 를 직접 스크롤하지 않아 native 세로 스크롤로도 안 빠진다).

**해결**: 통짜 prevent 대신 축(axis) 기반 wheel 라우팅으로 교체.

1. 가로 제스처(`|deltaX|>|deltaY|` 또는 shift+wheel) → 블록이 가로로 넘치면 블록을 가로 스크롤
2. 세로 제스처 → 블록이 세로로 스크롤 가능하고 끝이 아니면 블록을, 아니면 이벤트를 그냥 흘려보냄(fall-through)
3. Lenis 는 window(bubble)에서 wheel 을 듣고 `composedPath` 로 처리 — 블록 내부에서 `stopPropagation` 하면 Lenis 가 그 이벤트를 건너뛰고, 안 하면 Lenis 가 페이지를 굴린다. 터치는 `data-lenis-prevent-touch` 로 네이티브 유지

**핵심 인사이트**: 스무스 스크롤 위에서 "특정 영역만 자기 스크롤" 을 만들 때 통짜 prevent 는 세로 통과까지 막는다 — 축·경계를 판단해 필요한 방향만 가로채고 나머지는 라이브러리로 흘려보내야 중첩 스크롤이 자연스럽다

</details>

<details>
<summary><strong>66. 테두리 있는 인라인 코드는 여러 줄로 줄바꿈되지 않는다</strong></summary>

**문제**: 긴 인라인 코드가 컨테이너 폭을 넘어도 줄바꿈되지 않고 한 줄로 삐져나오거나 잘렸다.

**원인**: 인라인 코드 칩을 `display: inline-block` 으로 만들었다. inline-block 은 세로 padding 이 line box 에 반영돼 위아래 줄과 안 겹치는 장점이 있지만, **원자 박스라 내부에서 줄바꿈이 안 된다**.

**해결**: `display: inline` + `box-decoration-break` 로 바꾸고, 최종적으로 배경형(Notion 식)으로 재설계.

1. `display: inline` 이면 wrap 은 되지만 세로 padding 이 line box 를 못 넓혀 위아래 줄과 겹칠 위험 + 테두리 캡슐이 줄바꿈 지점에서 조각나거나(`clone`) 열린 채 끊긴다(`slice`)
2. 테두리를 없애고 은은한 배경만 남기니 wrap 돼도 하이라이트가 자연스럽게 흐른다 — 양끝만 캡슐(`slice`), line-height 는 문맥(1.6) 상속(하드코딩 X)

**핵심 인사이트**: "칩처럼 보이는 인라인 요소" 는 inline-block(안 wrap) vs inline(wrap 되나 padding 이 줄을 안 넓힘)의 트레이드오프가 있다 — 여러 줄 wrap 이 필요하면 테두리 캡슐보다 배경형이 근본적으로 맞다

</details>

<details>
<summary><strong>67. 삭제된 댓글을 복구하려는데 내용이 이미 지워져 있던 문제</strong></summary>

**문제**: 삭제(tombstone)된 댓글을 되살리는 기능을 만들려는데, `is_deleted` 만 되돌려도 내용이 빈 댓글이 복구됐다.

**원인**: 댓글 삭제가 tombstone 시 `content`·`password_hash`·`commenter_hash` 를 전부 빈 값으로 덮어썼다(프라이버시 목적). 복구할 원문 자체가 DB 에 없었다.

**해결**: 삭제 시 내용을 보존하되, 공개 API 에서 가린다.

1. tombstone 은 `is_deleted`/`deleted_by` 만 세팅하고 content 는 보존
2. 공개 GET 은 `is_deleted` 행의 `content`·`commenter_hash` 를 응답에서 빈 값으로 마스킹(UI 는 어차피 placeholder 를 그림), 관리자 GET 은 원문 유지 → 복구 미리보기에 사용
3. 복구 엔드포인트는 `is_deleted=true` 행만 매칭 — 하드 삭제로 행이 사라진 "완전 삭제" 는 자연히 404

**핵심 인사이트**: "복구" 는 "삭제 시 무엇을 지웠는가" 에 달렸다 — 되살릴 수 있으려면 삭제가 데이터를 파괴하지 않아야 하고, 그 대신 노출은 API 응답 레이어에서 가려야 프라이버시와 복구성이 양립한다

</details>

<details>
<summary><strong>68. 자동저장이 기존 글 내용을 옛 버전으로 되돌림</strong></summary>

**문제**: 기존 글에서 블록을 DnD 로 옮기거나 편집하면 자동저장 후 내용이 통째로 옛 버전으로 롤백.

**원인**: 서버(cross-device) 자동복원이 로드 시 "저장본보다 오래된 dismiss 안 된 revision" 을 복원. 기존 글의 과거 저장이 `posts.updated_at` 을 안 올려 stale 판정이 안 됐다.

**해결**: 서버 자동복원 비활성 → localStorage(같은 기기) 복원만 사용, `posts.content` 가 진실. 재활성화는 각 글 1회 저장(옛 revision dismiss + `updated_at` 갱신) 또는 `savedAt>updated_at` 가드 후 가능.

**핵심 인사이트**: 낙관적 복원은 "저장본이 최신" 이라는 신뢰 가능한 시각 비교가 있어야 안전하다.

</details>

<details>
<summary><strong>69. 새 글 자동저장이 전부 500 (revisions.entity_id uuid)</strong></summary>

**문제**: 새 글(아직 저장 안 됨)에서 자동저장 요청이 전부 500.

**원인**: `revisions.entity_id` 가 uuid 인데, 저장 전 새 글은 `posts.id` 가 없어 draft sentinel 문자열(`"draft-new-post"`) 을 `entity_id` 로 보냄 → uuid 캐스팅 실패.

**해결**: `revisions.entity_id` 를 text 로 변경(마이그레이션 `2026_08_05`). `setup.sql` 도 반영.

**핵심 인사이트**: 아직 존재하지 않는 엔티티의 임시 참조는 uuid 로 못 담는다 — sentinel 을 허용하려면 text.

</details>

<details>
<summary><strong>70. sticky 유리 헤더의 backdrop blur 가 안 걸리거나 옅음</strong></summary>

**문제**: 어드민 선택 액션 바를 sticky 유리로 만들었는데 뒤 행이 안 흐려지고(오른쪽 셀만 선명) frost 가 옅거나 누리끼리.

**원인**: 세 가지가 겹침

1. 프로스트를 `::before{ z-index:-1; backdrop-filter }` 로 뒀는데 부모 sticky 가 z-index 로 stacking context 를 만들어, `::before` 가 형제인 테이블 행을 backdrop 으로 못 잡음
2. full-bleed 를 `transform: translateX` 로 하면 transform 이 backdrop-filter 를 깸
3. saturate 가 뒤 행의 warm 색을 증폭해 누리끼리

**해결**: 격리를 없애고 요소에 직접 blur

1. backdrop-filter 를 `::before` 가 아니라 요소에 직접 — 자식 버튼은 안 흐려짐
2. full-bleed 는 margin/left-right(`-page-px`), `transform` 금지
3. saturate 제거하고 blur 만, 배경색은 투명

**핵심 인사이트**: backdrop-filter 는 "요소가 속한 stacking context 밖 형제" 를 backdrop 으로 못 본다 — 격리(z-index/transform) 주의.

</details>

<details>
<summary><strong>71. IME 조합 중 첫 글자가 두 번 입력</strong></summary>

**문제**: 한글 등 IME 조합 중 슬래시 메뉴/툴바 상호작용에서 첫 글자가 중복 입력.

**원인**: 조합 중 부모(에디터) 재렌더가 조합을 깨서 첫 글자가 재입력됨.

**해결**: 조합 중에는 `onOpenChange` 등 부모 상태 변경을 억제(`open` 자체는 얼리지 않음 — 검색 유지).

**핵심 인사이트**: IME 조합 중 부모 재렌더는 조합을 리셋한다 — 조합 이벤트 동안 상태 커밋을 미룬다.

</details>

<details>
<summary><strong>72. 툴바 줄간격 Select 가 제목에선 빈칸 + 중복 key 경고</strong></summary>

**문제**: 툴바 줄간격(line-height) Select 가 제목처럼 프리셋에 없는 값(예: 1.25)에선 값을 잡지 못해 빈칸으로 보이고, 콘솔에 옵션 중복 key 경고까지 났다.

**원인**: 값의 타입이 두 겹으로 어긋났다. `setLineHeight` 는 노드에 줄간격을 **숫자**(예: `1.6`)로 저장하는데, 툴바 프리셋 옵션과 비교는 **문자열**(`"1.6"`)이라 같은 값이 옵션에 두 번 들어가 중복 key 가 났다. 게다가 감지 로직(`resolvedLineHeight`)은 DOM 계산값에서 가장 가까운 프리셋을 찾되 근접(차이 < 0.05)하지 않으면 빈 문자열을 돌려줘서, 제목 1.25 처럼 프리셋과 안 맞는 값은 아예 표시되지 않았다.

**해결**: 노드 값을 `String(...)` 으로 정규화해 문자열 프리셋과 같은 타입으로 비교·렌더하도록 해 중복 key 를 없앴고, 프리셋에 근접하지 않는 값은 그 실제 비율을 Select 옵션 맨 위에 그대로 노출해 표시하도록 했다.

**핵심 인사이트**: Slate 노드에 숫자로 저장되는 값(line-height 등)은 문자열 기반 옵션과 비교·렌더하기 전에 반드시 `String` 으로 정규화한다. 프리셋 매칭은 "근접하면 프리셋, 아니면 실제값" 두 갈래를 모두 처리해야 빈칸이 생기지 않는다.

</details>

<details>
<summary><strong>74. 모바일에서 네비게이션 버튼이 로고 위에 겹침</strong></summary>

**문제**: 모바일에서 가운데 메뉴(`navCenter`)를 `display: none` 으로 숨기자, 오른쪽 버튼 묶음(`navActions`)이 왼쪽으로 이동해 fixed 로고와 같은 자리에 겹쳤다.

**원인**: `.nav` 는 `justify-content: space-between` 인데, 자식이 하나만 남으면 그 하나가 시작 쪽에 붙는다. 로고는 fixed 라 flex 흐름 밖에 있고 `left: var(--page-px)` 로 같은 자리에 그려진다.

**해결**: 모바일 미디어쿼리에서 `.nav { justify-content: flex-end }` 로 남은 자식을 오른쪽에 고정했다. 로고는 flex 흐름 밖이지만 buttons 가 오른쪽에 있으면 "로고, 여백, 버튼" 배치가 된다.

**핵심 인사이트**: `space-between` 은 자식 수가 줄면 정렬 결과가 달라진다. fixed 요소와 겹쳐 배치한 컨테이너라면 자식이 하나 남는 분기를 따로 명시해야 한다.

</details>

<details>
<summary><strong>77. task list 판별 `:has()` 의 과소 매칭과 과다 매칭</strong></summary>

**문제**: 체크박스 목록에서 불릿을 숨기는 `:has()` 선택자가, 항목 사이에 빈 줄이 있는 목록에서는 불릿을 남기고, 자손 조합으로 고치면 일반 목록의 불릿까지 지웠다.

**원인**: marked 는 tight list 를 `<li><input>` 으로, loose list 를 `<li><p><input>` 으로 만든다. `:has(> li > input)` 은 loose 형태를 놓치고, `:has(input)` 처럼 자손 조합자로 넓히면 체크박스 하위 목록을 품은 부모 목록까지 매칭된다.

**해결**: 렌더러가 만드는 두 직계 경로만 열거했다. `:has(> li > input[type="checkbox"], > li > p > input[type="checkbox"])`.

**핵심 인사이트**: `:has()` 는 조합자 선택이 곧 매칭 범위다. 렌더러가 실제로 만드는 DOM 형태를 전부 확인하고 직계로 못 박아야 안전하다.

</details>

<details>
<summary><strong>78. 전역 input 리셋이 네이티브 체크박스를 아예 그리지 않음</strong></summary>

**문제**: 댓글의 task list 체크박스가 화면에 그려지지 않았다.

**원인**: `_base.css` 의 `input { border: none; background: none }` 리셋이 UA 기본 스타일을 지워서 체크박스가 그려질 표면 자체가 없었다. `appearance: auto` 를 줘도 되살아나지 않았다.

**해결**: 체크박스에 `background: revert; border: revert` 를 줘 UA 스타일을 복원했다. shorthand 라 stylelint 의 토큰 강제 규칙에도 걸리지 않는다.

**핵심 인사이트**: `appearance: auto` 는 "네이티브 위젯으로 그려라" 라는 뜻일 뿐이고, 리셋이 지운 background 와 border 를 되살리지는 않는다. 되살리는 값은 `revert` 다.

</details>

<details>
<summary><strong>79. 툴바 마크다운 삽입이 빈 줄과 블록 문법에서 의도한 요소를 만들지 못함</strong></summary>

**문제**: 빈 줄에서 체크박스 버튼을 누르면 체크박스 대신 `[ ]` 글자가 든 불릿이 나왔다. 구분선 버튼은 앞 줄에 글이 있으면 구분선 대신 제목을 만들었다.

**원인**: GFM 은 `- [ ] ` 마커 뒤에 텍스트가 있어야 task list 로 파싱한다. `---` 는 바로 윗줄에 텍스트가 붙어 있으면 수평선이 아니라 setext h2 로 파싱된다.

**해결**: prefix 계열 버튼은 빈 줄이면 예시 텍스트를 채우고 선택 상태로 두는 placeholder 를 넣었다. 블록 삽입은 먼저 위에 빈 줄을 확보한다.

**핵심 인사이트**: 삽입 버튼은 문자열을 넣는 것으로 끝나지 않는다. 파서가 그 문법을 인식할 문맥까지 만들어야 한다.

</details>

<details>
<summary><strong>80. Popover 안 텍스트별 mix-blend-mode: difference 가 backdrop-filter 와 양립 불가</strong></summary>

**문제**: 유리(blur) 패널 안에서 글자마다 `mix-blend-mode: difference` 를 걸어 배경색을 반전시키려 했지만 어떤 조합으로도 되지 않았다.

**원인**: `backdrop-filter` 와 `isolation: isolate` 는 Backdrop Root 를 만들어 backdrop-filter 가 참조할 범위를 자른다. 그리고 backdrop-filter 의 출력은 자손이나 형제에게 blend 가능한 배경으로 제공되지 않는다. 원리적으로 불가능한 조합이다.

**해결**: 콘텐츠에 `filter: invert(1)` 을 주고 패널에 `mix-blend-mode: difference` 를 걸면 `|배경 − (1−색)|` 으로 원래 색이 복원된다. 최종적으로 기본 모양은 유리(반투명과 blur)로 정하고 difference 는 변형으로만 남겼다.

**핵심 인사이트**: 두 효과는 같은 배경을 보는 것 같지만 서로의 입력이 되지 못한다. 사양이 만든 경계는 우회 수식으로만 넘을 수 있다.

</details>

<details>
<summary><strong>81. 설치되지도 않는 Svelte 패키지 때문에 @vercel/analytics 설치가 실패</strong></summary>

**문제**: `npm i @vercel/analytics` 가 `@sveltejs/vite-plugin-svelte` 의 peer 충돌 ERESOLVE 로 실패했다. 이 프로젝트에 Svelte 는 없다.

**원인**: `@vercel/analytics` 는 프레임워크별 진입점을 위해 vue, nuxt, svelte 등을 optional peer 로 선언한다. npm 11 은 설치되지 않을 후보의 peer 까지 따라가 검증한다. 그 경로의 `@sveltejs/vite-plugin-svelte@5` 가 `vite ^6` 을 요구해 이 저장소의 vite 8 과 충돌했다.

**해결**: `overrides` 에 `"@sveltejs/vite-plugin-svelte": "^7"` 을 넣어 npm 이 검증하는 후보만 vite 8 지원 버전으로 바꿨다. 실제 설치 트리에는 svelte 관련 패키지가 하나도 들어오지 않는다. `--legacy-peer-deps` 는 검사 전체를 끄는 것이라 다른 진짜 충돌까지 놓치므로 쓰지 않았다.

**핵심 인사이트**: optional peer 는 "안 쓰면 무시" 가 아니라 "해결 가능해야 통과" 다. 충돌 지점만 overrides 로 바꾸면 검사를 살린 채 통과할 수 있다.

</details>

<details>
<summary><strong>82. 상세 페이지 전환 덮개가 걷힌 뒤에도 이전 페이지가 보임</strong></summary>

**문제**: 목록에서 상세로 넘어갈 때, 전환 덮개가 걷힌 뒤 약 0.5초 동안 떠나온 목록 화면이 그대로 보였다.

**원인**: morph 전환이 고정 시간표(확대 380ms 뒤 morph 260ms)로 돌았고 덮개는 640ms 에 무조건 걷혔다. 새 경로의 커밋 시각은 이 시간표와 무관하다. 목록 카드 링크는 선불러오기를 하지 않아 누른 뒤에야 RSC 페이로드를 받고, 배포본 실측 커밋은 1161ms 였다.

**해결**: 확대가 끝났는데 경로가 아직 안 바뀌었으면 화면을 덮은 채 기다리는 `cover` 단계를 추가하고, 커밋을 확인한 뒤 morph 를 시작한다. 커밋 신호는 오버레이 안에서 `usePathname()` 으로 받는다. 오버레이는 전환 중에만 떠 있어 구독도 그때만 생긴다.

**핵심 인사이트**: 전환 연출을 시간표로 짜면 네트워크가 어긋나는 순간 화면이 샌다. 덮개는 시간이 아니라 실제 경로 커밋에 맞춰 걷어야 한다. 검증은 Playwright 녹화 영상을 ffmpeg 콘택트 시트로 만들어 프레임 단위로 봤다.

</details>

<details>
<summary><strong>83. 가로 스크롤 구간에서 preventDefault 를 불러도 페이지가 세로로 밀림</strong></summary>

**문제**: 가로 스크롤 섹션에서 패널은 좌우로 도는데 페이지도 같이 세로로 밀렸다.

**원인**: 전역 Lenis 는 window 에 자기 휠 리스너를 달고 델타를 받아 `scrollTo` 로 페이지를 직접 굴린다. Lenis 1.0.42 의 `onVirtualScroll` 은 `event.defaultPrevented` 를 확인하지 않는다. `preventDefault()` 가 막는 것은 브라우저 기본 스크롤뿐이다.

**해결**: 휠을 가로채는 요소에 `data-lenis-prevent-wheel` 표시를 붙였다. Lenis 는 `composedPath` 에서 이 표시를 찾으면 물러난다. 끝에 닿아 세로로 넘겨야 할 때는 표시를 떼서 Lenis 가 이어받게 한다. 정리 함수에서 표시를 걷지 않으면 모바일 배치에서 세로 스크롤이 죽는다.

**핵심 인사이트**: 스크롤 라이브러리는 브라우저의 이벤트 규약 밖에서 돈다. `preventDefault` 와 라이브러리 전용 표시를 짝으로 관리해야 한다.

</details>

<details>
<summary><strong>84. 작업물을 전부 미발행으로 돌려도 목록에 데모 작업물이 나옴</strong></summary>

<p align="center">
  <img src="../public/images/screenshots/pc/works-grid-dark.png" width="100%" alt="Works Grid — 발행된 작업물 목록" />
</p>

**문제**: 관리자에서 작업물을 전부 미발행으로 내렸는데, 공개 목록에 코드에 든 정적 데모 목록이 대신 나타났다.

**원인**: `getWorks` 는 DB 없는 새 클론에서도 화면이 나오도록 정적 `data/projects.ts` 폴백을 둔다. 그런데 "표에 행이 없다" 와 "행은 있는데 전부 미발행이다" 가 똑같은 빈 배열로 온다. 길이만 보고 폴백하면 전부 내리는 순간 데모 목록이 그 자리를 채운다.

**해결**: 빈 결과를 만나면 `count: "exact", head: true` 조회로 전체 행 수를 한 번 더 센다. 행이 있으면 빈 목록을 그대로 내보낸다. 홈 쪽은 DB 접근 실패를 `null`, 발행 없음을 `[]` 로 갈라 앞의 경우에만 정적으로 돌아간다.

**핵심 인사이트**: 폴백 조건은 "결과가 비었다" 가 아니라 "원천을 쓸 수 없다" 로 정의해야 한다. 두 상태가 같은 값으로 돌아오면 한 번 더 물어서라도 갈라야 한다.

</details>

<details>
<summary><strong>85. 파비콘 기호가 설정한 글꼴과 다르게 그려짐</strong></summary>

**문제**: 탭 아이콘의 로고 기호(✦)가 설정한 브랜드 글꼴 모양이 아니라 기기마다 다른 모양으로 나왔다.

**원인**: 두 겹이었다. 브라우저는 탭 아이콘을 그릴 때 웹폰트를 받아오지 않아서 SVG 의 `font-family` 이름은 기기 글꼴로 대체된다. 그리고 브랜드 글꼴(Instrument Serif)에는 U+2726 글리프가 아예 없다(.notdef). 사이트 로고의 기호도 사실은 시스템 대체 글꼴이 그리고 있었다.

**해결**: 기호 글꼴(Noto Sans Symbols 2)에서 쓸 기호만 추려 base64 모듈로 굳히고, 파비콘 라우트는 opentype.js 로 외곽선을 뽑아 `<path>` 로 넣는다. 페이지도 같은 글꼴을 `@font-face` 로 얹되 serif 같은 총칭 이름보다 앞에 둔다. 뒤에 두면 serif 가 먼저 걸린다.

**핵심 인사이트**: `document.fonts.check()` 는 대체 글꼴로 그릴 수 있어도 true 라 판별에 쓸 수 없다. 어느 글꼴이 그렸는지는 같은 글자를 스택별로 렌더해 폭을 재서 갈랐다. 탭처럼 웹폰트가 닿지 않는 표면의 글자는 path 로 굳히는 것이 확실하다.

</details>

<details>
<summary><strong>86. 이메일 로그인 뒤 관리자 화면과 네비게이션이 로그인 상태를 모름</strong></summary>

**문제**: 이메일 로그인에 성공해도 admin 페이지 진입에 새로고침이 필요했고, 네비게이션의 로그인 상태 표시(이메일, 알림, 로그아웃)가 나타나지 않았다.

**원인**: 로그인이 서버 라우트에서 일어나 응답의 Set-Cookie 로 세션 쿠키만 심긴다. 브라우저 Supabase 클라이언트는 SIGNED_IN 이벤트를 받지 못한다. 이 상태에서 `router.push` 로 이동하면 서버 layout 의 `getUser()` 가 새 쿠키를 못 보고, 루트에 계속 마운트돼 있던 Navigation 의 훅은 마운트 시 한 번만 쿠키를 확인해서 다시 보지 않는다.

**해결**: 로그인 성공 후 이동을 `window.location.assign` 전체 리로드로 바꿨다. GitHub OAuth 의 서버 redirect 와 같은 방식이다. 전체 리로드가 Navigation 을 쿠키 실은 채 새로 마운트시켜 두 증상이 함께 사라진다.

**핵심 인사이트**: 서버가 심은 쿠키는 클라이언트 내비게이션으로 전파되지 않는다. 인증 상태를 바꾼 직후는 전체 내비게이션이 안전하다.

</details>

<details>
<summary><strong>87. 없는 주소의 404 화면에서 하이드레이션 불일치</strong></summary>

**문제**: `/admin/없는주소` 같은 404 화면에서 React #418(HTML 불일치) 오류가 났다. 공개 영역의 없는 주소는 괜찮았다.

**원인**: 매칭되지 않는 주소는 빌드 때 그려 둔 정적 `/_not-found` HTML 을 그대로 받는다. 이 HTML 은 경로 없이 그려져 공개용 네비게이션과 푸터가 들어 있다. 루트 레이아웃의 Navigation 과 Footer 는 경로 앞머리(`/admin`, `/design-system`)로 모양을 바꾸므로 브라우저에서 다시 그린 결과와 어긋난다.

**해결**: 경로로 모양이 바뀌는 앞머리마다 catch-all 라우트(`[...missing]`)를 두고 거기서 `notFound()` 를 부른다. 요청 시점에 그려져 경로가 일치한다. 루트 not-found 를 통째로 동적으로 만들면 모든 404 가 DB 를 조회하게 돼 기각했다.

**핵심 인사이트**: 루트 레이아웃이 경로를 보고 모양을 바꾸면, 그 모든 앞머리에 대해 404 도 같은 경로에서 그려져야 한다. 정적 404 는 "경로 없음" 상태로 그려진다는 사실을 잊기 쉽다.

</details>

<details>
<summary><strong>88. LCP 이미지가 낮은 우선순위로 받히고, 스트리밍 경계가 공개를 300ms 미룸</strong></summary>

**문제**: 모바일 글 목록과 상세의 LCP 가 회귀했다. 커버 이미지가 CSS, 글꼴과 회선을 나누며 늦게 도착했고, 도착한 뒤에도 화면 공개가 밀렸다.

**원인**: 둘이 겹쳤다. Next 16 의 `priority` 는 head preload 만 넣고 `fetchpriority` 속성을 붙이지 않아 LCP 이미지가 Low 로 요청된다. 그리고 React 19.2 는 셸이 먼저 칠해진 뒤 늦게 온 Suspense 경계를 첫 프레임 기준 300ms 뒤에 공개한다. loading.tsx 경계 안에 LCP 요소가 있으면 이 지연을 그대로 받는다.

**해결**: `priority` 를 주는 자리에 `fetchPriority="high"` 를 함께 넘긴다. 상세의 커버는 loading 경계 밖인 `[slug]/layout.tsx` 로 옮겨(DetailShell) 셸과 함께 칠해지게 했다.

**핵심 인사이트**: LCP 관문은 직렬로 걸린다. 요청 우선순위와 공개 시점 중 하나만 고치면 수치가 움직이지 않는다. LCP 요소는 스트리밍 경계 밖 레이아웃에 두는 것이 근본 해결이다.

</details>

<details>
<summary><strong>89. 칩 hover 규칙 하나가 타이핑마다 6천 개 요소 스타일 재계산</strong></summary>

**문제**: 작업물 편집기에서 글자를 칠 때마다 열 번에 두 번꼴로 요소 6,357개 전체 스타일 재계산이 일어나 입력 지연 p90 이 튀었다. 마우스만 움직여도 같은 일이 일어났다.

**원인**: `.chip:has([data-close-trigger]:hover) .label *` 규칙 하나였다. 글자를 치면 포인터 아래 요소가 바뀌어 hover 재계산이 일어나는데, `:has()` 안에 `:hover` 가 있고 뒤에 universal `*` 자손이 붙으면 Chrome 이 body 서브트리 전체를 무효화한다. `*` 를 뺀 같은 모양 선택자는 괜찮았다.

**해결**: 선택자 구조는 두고 조건만 JS 로 옮겼다. 닫기 버튼의 onPointerEnter 와 onPointerLeave 가 칩에 `data-remove-hover` 속성을 붙이고, CSS 는 `.chip[data-remove-hover] .label *` 로 매칭한다.

**핵심 인사이트**: 원인 규칙은 추측이 아니라 CSSOM 에서 규칙을 지워 가며 이분해서 찾았다. `:has(:hover)` 와 universal 자손의 조합은 전역 무효화를 부른다.

</details>

<details>
<summary><strong>90. 3D 원통의 판에서 가운데 클릭이 새 탭을 열지 않음</strong></summary>

<p align="center">
  <img src="../public/images/screenshots/pc/works-cylinder-light.png" width="100%" alt="Works Cylinder — 3D 원통 배치" />
</p>

**문제**: 원통 배치의 작업물 판을 가운데 클릭해도 새 탭이 열리지 않았다. 키보드로는 판에 접근할 방법이 없었다.

**원인**: 브라우저는 가운데 클릭에 `click` 대신 `auxclick` 을 쏘고 react-three-fiber 는 auxclick 을 듣지 않는다. 캔버스를 `<a>` 로 감싸는 방법은 커스텀 커서(CursorTrail)가 `closest("a, button")` 로 판이 없는 자리까지 링크 커서로 그려 쓸 수 없었다.

**해결**: 메시의 `onPointerDown` 과 `onPointerUp` 에서 `button === 1` 을 같은 메시로 짝지어 처리하고, `onPointerLeave` 에서 기록을 지운다. 보조 키 클릭은 `window.open(href, "_blank", "noopener")` 로 연다. 키보드는 초점이 오면 보이는 링크 목록을 두고 초점 이동에 맞춰 원통을 돌린다.

**핵심 인사이트**: 캔버스 위 상호작용을 링크처럼 만들려면 브라우저가 링크에 공짜로 주는 것들(가운데 클릭, 보조 키, 키보드 초점)을 하나씩 직접 구현해야 한다. 어느 하나라도 빠지면 접근성 구멍이 된다.

</details>

<details>
<summary><strong>91. 작업물 순서를 바꾸면 저장 전인데 다른 작업물 순서까지 뒤섞임</strong></summary>

**문제**: 편집기에서 정렬 순서를 바꾸면 저장 전인데도 다른 작업물의 순서가 바뀌었고, 저장하면 의도와 다른 순서가 됐다.

**원인**: 드래그 목록의 onChange 가 밀리는 작업물마다 PATCH 를 병렬로 보냈고, 서버는 sort_order PATCH 마다 전체를 읽어 1부터 다시 매겼다. 병렬 요청의 도착 순서에 따라 재할당 결과가 달라지는 경쟁이었다.

**해결**: 편집기는 순서 변경을 미리보기로만 반영하고 다른 작업물에는 요청을 보내지 않는다. 저장할 때 자기 위치 하나만 보내고, 서버의 배치 로직(`placeWork`)이 맨 뒤 삽입 후 받은 자리로 이동시킨다. 재현은 실제 라우트를 vitest 에서 메모리 표 가짜 클라이언트로 돌리고 읽기 지연을 호출마다 달리 줘 쓰기 순서를 뒤집는 방식으로 했다.

**핵심 인사이트**: "서버가 매번 전체를 재할당" 하는 API 에 병렬 쓰기를 보내면 결과가 도착 순서에 달린다. 순서 같은 파생 상태는 저장 시점에 한 요청으로 보내야 한다.

</details>

<details>
<summary><strong>92. 오피스 문서 미리보기 iframe 이 "gview 다운로드 실패" 를 띄움</strong></summary>

**문제**: 첨부한 오피스 문서 미리보기 iframe 이 수시로 비고, Chrome 이 "gview 다운로드 실패" 알림을 띄웠다.

**원인**: `docs.google.com/gview?embedded=true` 는 iframe 요청(Sec-Fetch-Dest: iframe)에 12번 중 5번꼴로 204 빈 응답을 돌려줬다. iframe 이 비고, Chrome 은 그 이동을 파일 다운로드 시도로 받아 실패 알림을 띄운다. 코드 문제가 아니라 서비스 자체의 동작이다.

**해결**: MS 뷰어(`view.officeapps.live.com/op/embed.aspx`)로 바꿨다. 같은 조건에서 8번 모두 200 이었다. 저장된 HTML 에 굳어 있는 예전 gview 주소는 그릴 때 `migrateOfficeViewerUrls` 가 바꾼다. MS 뷰어 콘솔의 `appChrome is not defined` 오류는 화면과 무관하다. 예전에 이 콘솔 오류만 보고 gview 로 옮겼다가 204 를 만났다.

**핵심 인사이트**: 외부 뷰어의 신뢰성은 콘솔 오류가 아니라 상태 코드 분포로 판단한다. curl 에 `Sec-Fetch-Dest: iframe` 헤더를 넣고 반복 호출해 실측했다.

</details>

<details>
<summary><strong>93. 서식을 지운 직후 Backspace 가 글자 대신 직전 편집을 되돌림</strong></summary>

<p align="center">
  <img src="../public/images/screenshots/pc/editor-light.png" width="100%" alt="Plate 편집기" />
</p>

**문제**: 마크다운 자동변환으로 만든 불릿을 지우고 계속 Backspace 를 누르면, 글자가 지워지는 대신 불릿이 되살아나거나 커서가 다른 줄로 이동했다.

**원인**: 자동변환 직후 Backspace 를 변환 취소로 처리하는 로직이 history 를 확인하지 않고 undo 를 불렀다. 변환 뒤에 다른 편집이 끼어 있으면 undo 가 그 편집을 되돌렸다. 문단 중간에서 친 스페이스를 변환으로 오판하는 판정 버그도 겹쳤다.

**해결**: trigger 를 넣기 전 history 위치를 적어 두고, 되돌리기 직전에 history 가 변환 직후 그대로인지 확인한다. 맞으면 그 이후 연산만 역적용해 마크다운 표시를 복원하고, 아니면 평범한 Backspace 로 동작한다. 블록 맨 앞 Backspace 는 자동변환 직후가 아니어도 마크다운 표시(`- `, `## `, `> `)로 되돌린다.

**핵심 인사이트**: `editor.undo()` 는 마지막 묶음을 통째로 되돌린다. "방금 그 변환만" 되돌리려면 history 시점을 스냅숏하고 그 이후 연산을 골라 역적용해야 한다.

</details>

<details>
<summary><strong>94. 기간으로 저장한 작업물 연도가 화면에 JSON 으로 노출</strong></summary>

**문제**: 작업물 카드의 연도 자리에 `{"start":{"year":2024,...}}` 같은 JSON 원문이 그대로 보였다.

**원인**: 편집기는 기간 입력을 JSON 문자열로 `year` 컬럼에 저장하는데, 목록 화면은 그 값을 그대로 출력했다. 기간을 문자열로 조립하는 로직은 편집기 미리보기에만 있었다.

**해결**: `parseStoredPeriod` 와 `formatWorkYear` 유틸을 분리해 저장값이 JSON 기간이면 언어에 맞는 기간 문자열로, 아니면 원문 그대로 보여 준다. 연도를 그리는 컴포넌트들이 이 유틸을 공유한다.

**핵심 인사이트**: 한 컬럼에 두 가지 표현(평문과 JSON)이 공존하면, 해석 로직은 유틸로 한 곳에 두고 모든 소비자가 공유해야 한다. 편집기에만 두면 공개 화면이 원문을 노출한다.

</details>

<details>
<summary><strong>95. 전역 strong 색이 본문에서 지정한 글자색을 덮음</strong></summary>

**문제**: 굵은 글씨에 글자색을 지정해도 본문에서는 항상 테마 강조색으로 보였다.

**원인**: 전역 `strong { color: var(--text-accent) }` 가 사이트 공통 기본값인데, 편집기와 본문에도 그대로 적용됐다. 저장된 HTML 은 색을 바깥 span 에 적으므로(`<span style="color: X"><strong>`), strong 자신에게 걸린 전역 색이 상속값을 이겼다.

**해결**: 본문 스코프(`.prose-content`)의 strong 은 `color: var(--_strong-color, inherit)` 로 두고, 색 선언으로 시작하는 span 안의 strong 만 `inherit` 로 그 색을 따르게 했다. 본문 글자색이 다른 곳(작업물 본문)은 `--_strong-color` 로 기본색을 넘긴다.

**핵심 인사이트**: 전역 기본값과 사용자 지정값이 같은 속성을 다투면, 스코프 변수에 fallback 을 태워 "지정 없으면 기본, 있으면 그 값" 을 CSS 만으로 가를 수 있다.

</details>
