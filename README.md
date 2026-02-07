# Web Portfolio - Oval

개인 포트폴리오 웹사이트입니다. Next.js 15, React 19, TypeScript로 구축되었으며, GSAP, Framer Motion, Lenis를 활용한 인터랙티브 애니메이션이 특징입니다.

## 기술 스택

- **Framework**: Next.js 15 (App Router)
- **Library**: React 19
- **Language**: TypeScript
- **Animation**: GSAP + ScrollTrigger, Framer Motion
- **Scroll**: Lenis Smooth Scroll
- **Styling**: CSS Modules, CSS Variables
- **Typography**: Instrument Serif, Space Grotesk

## 주요 기능

- **Infinite Scroll Loop**: Lenis smooth scroll과 Bridge Section을 결합한 무한 순환 스크롤
- **Mouse Parallax**: Framer Motion useSpring/useTransform 기반 마우스 반응형 패럴랙스
- **Scroll-Triggered Animations**: GSAP ScrollTrigger를 활용한 스크롤 기반 등장 애니메이션
- **Scroll Velocity Parallax**: Lenis velocity를 활용한 스크롤 속도 기반 이미지 패럴랙스
- **Mix-Blend Navigation**: mix-blend-mode: difference를 활용한 자동 반전 네비게이션
- **StaggerText**: 호버 시 글자별 순차 애니메이션 효과 컴포넌트

## 시작하기

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

[http://localhost:3000](http://localhost:3000)에서 결과를 확인할 수 있습니다.

---

## Components

### StaggerText

텍스트를 개별 문자로 분리하여 호버 시 순차적으로 외곽선 애니메이션을 적용하는 컴포넌트입니다.

**경로**: `src/components/effects/StaggerText`

**기능**:
- 호버 시 첫 글자부터 순차적으로 외곽선(stroke)으로 변경
- 호버 해제 시 마지막 글자부터 역순으로 색상이 채워짐 (stroke 유지)
- 커스텀 스트로크 색상 및 두께 지원
- 글자당 딜레이 시간 조절 가능

**사용법**:

```tsx
import StaggerText from "@/components/effects/StaggerText";

// 기본 사용
<StaggerText>Hello World</StaggerText>

// 커스텀 옵션
<StaggerText
  className={styles.title}
  strokeColor="var(--text-primary)"  // 스트로크 색상
  strokeWidth={2}                     // 스트로크 두께 (기본: 1px)
  delayPerChar={0.05}                 // 글자당 딜레이 (기본: 0.04초)
  hoverEffect={false}                 // 호버 효과 비활성화
>
  Custom Text
</StaggerText>
```

**Props**:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `string` | (필수) | 표시할 텍스트 |
| `className` | `string` | - | 추가 CSS 클래스 |
| `strokeColor` | `string` | `currentColor` | 스트로크 색상 (CSS 변수 또는 색상값) |
| `strokeWidth` | `number` | `1` | 스트로크 두께 (px) |
| `delayPerChar` | `number` | `0.04` | 글자당 딜레이 (초) |
| `hoverEffect` | `boolean` | `true` | 호버 효과 활성화 여부 |

---

## Trouble Shooting

### 1. Lenis Scroll Velocity 효과 미작동

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
    const delta = currentScroll - prevScrollRef.current;  // 부정확한 velocity
    prevScrollRef.current = currentScroll;
    rafIdRef.current = requestAnimationFrame(updateOffset);
  };
  rafIdRef.current = requestAnimationFrame(updateOffset);
}, []);

// ✅ 올바른 방법 - Lenis scroll event
useEffect(() => {
  const handleScroll = () => {
    const velocity = (lenis as any).velocity;  // 정확한 velocity
    if (Math.abs(velocity) > 0.05) {
      const offset = Math.max(-50, Math.min(50, velocity * 30));
      workImageOffsetY.set(offset);
    }
  };
  lenis.on("scroll", handleScroll);
  return () => lenis.off("scroll", handleScroll);
}, [lenis]);
```

#### 핵심 교훈
Lenis는 내부적으로 velocity를 계산하여 인스턴스 속성으로 제공하므로, 직접 delta를 계산하는 것보다 정확함

---

### 2. Framer Motion transform과 CSS transform 충돌

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
  transform: translate(-50%, -50%);  /* Framer Motion과 충돌 */
}

/* ✅ 올바른 방법 - margin 기반 정렬 */
.workImageInner {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 130%;
  height: 130%;
  margin-left: -65%;  /* width의 절반 */
  margin-top: -65%;   /* height의 절반 */
}
```

#### 핵심 교훈
Framer Motion의 style 속성은 inline transform을 생성하므로, CSS transform과 분리하여 사용해야 함

---

### 3. TypeScript useRef 타입 에러

#### 문제
`useRef<ReturnType<typeof setTimeout>>()`에서 "Expected 1 arguments, but got 0" 타입 에러 발생

#### 원인
- `useRef`는 초기값이 필수 파라미터
- `ReturnType<typeof setTimeout>`은 `null`을 포함하지 않으며, `clearTimeout`은 `null`을 허용하지 않음

#### 해결
`undefined`를 초기값으로 명시적으로 제공하고 타입에 포함

```tsx
// ❌ 잘못된 방법
const resetTimerRef = useRef<ReturnType<typeof setTimeout>>();  // 에러: 초기값 필요
const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);  // clearTimeout 타입 에러

// ✅ 올바른 방법
const resetTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
```

#### 핵심 교훈
`clearTimeout`은 `undefined`를 허용하지만 `null`은 허용하지 않음. Timer ref는 `undefined`로 초기화해야 함

---

### 4. GSAP ScrollTrigger 수평 무한 스크롤 구현

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

#### 핵심 교훈
스크롤 위치 텔레포트보다 긴 스크롤 범위 + 시각적 위치 루프 방식이 더 자연스러운 무한 스크롤 경험 제공

---

### 5. Lighthouse 성능 최적화 — reCAPTCHA 지연 로딩

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

| 토큰 | 변경 전 | 변경 후 | 대비 변화 |
|------|---------|---------|-----------|
| `--color-neutral-600` | `#6b7280` | `#656c79` | 4.47:1 → ~4.9:1 |
| `--text-accent-secondary-alt` | `var(--color-accent-light)` (#ff4f9d) | `var(--color-accent)` (#d40063) | 2.83:1 → ~4.8:1 |

**4. 접근성 수정**
- ServicesSection: `<h3>` → `<h2>`로 heading 순서 정상화
- 언어 토글: `aria-label`에 표시 텍스트("KO"/"EN") 포함

#### 핵심 교훈
- 서드파티 스크립트(reCAPTCHA, Analytics 등)는 초기 로드에서 제외하고 유저 인터랙션 후 로드하면 LCP/TTI에 큰 영향
- 개발 서버(Turbopack)에서의 Lighthouse 결과는 unminified JS, devtools 등으로 인해 프로덕션보다 훨씬 낮게 측정됨
- `mix-blend-mode: difference` 사용 시 Lighthouse가 blend 전 색상으로 대비를 계산하므로 실제 시각적 결과와 다를 수 있음

---

### 6. reCAPTCHA 배지 z-index 문제

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

#### 핵심 교훈
서드파티가 삽입하는 DOM 요소는 커스텀 overlay/modal과 z-index 충돌이 발생할 수 있음. 동적으로 z-index를 관리해야 함

---

### 7. Lighthouse 심화 성능 최적화 — 미사용 폰트 제거 및 리소스 경량화

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
import { IBM_Plex_Mono, Inter, Playfair_Display, JetBrains_Mono,
         Bebas_Neue, Space_Grotesk, Cormorant_Garamond, Abril_Fatface,
         Instrument_Serif } from "next/font/google";

// ✅ 개선 - 5개 폰트 패밀리 (5개 폰트 파일)
import { Inter, Playfair_Display, JetBrains_Mono,
         Space_Grotesk, Instrument_Serif } from "next/font/google";
```

미사용 확인 방법: CSS 전체에서 `var(--font-ibm-plex)`, `var(--font-bebas)`, `var(--font-cormorant)`, `var(--font-abril)` 검색 → 0건. `useFontMorph.ts`에서 참조하지만 해당 컴포넌트가 어떤 페이지에서도 import되지 않음

**2. font-display: swap 추가**

```tsx
const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],  // 800, 900 제거
  display: "swap",  // 폰트 렌더링 차단 해제
});
```

**3. reCAPTCHA 로딩 전략 개선**

```tsx
// ❌ 기존 - 타이머 + scroll 포함
const timer = setTimeout(load, 4000);  // Lighthouse 테스트 중 트리거됨
const events = ["scroll", "click", "touchstart", "keydown"];

// ✅ 개선 - 의도적 인터랙션만
const events = ["click", "touchstart", "keydown"];  // 타이머/scroll 제거
```

**4. 미사용 Preconnect 제거**

```html
<!-- ❌ 기존 - reCAPTCHA가 초기 로드에서 제외되어 unused 경고 -->
<link rel="preconnect" href="https://www.google.com" />
<link rel="preconnect" href="https://www.gstatic.com" crossorigin="anonymous" />

<!-- ✅ 개선 - 제거 -->
```

#### 결과 (Lighthouse CLI, 3회 측정 중앙값)

| 메트릭 | Before | After | 변화 |
|--------|--------|-------|------|
| Performance | 60 | **98** | **+38점** |
| FCP | 2,573ms | 1,979ms | -594ms |
| LCP | 7,294ms | **1,979ms** | **-5,315ms** |
| TBT | 430ms | **0ms** | -430ms |
| CLS | 0.012 | 0 | -0.012 |
| TTI | 13,731ms | **1,979ms** | **-11,752ms** |
| 요청 수 | 63 | 28 | -35 |
| 페이지 용량 | 1,489KB | **449KB** | **-70%** |
| 폰트 파일 | 19개 | 5개 | -14개 |

#### 핵심 교훈
- `next/font/google`로 등록한 폰트는 CSS에서 미참조여도 폰트 파일이 다운로드됨. 정기적으로 실제 사용 여부를 검증해야 함
- 서드파티 지연 로딩의 타이머 폴백은 성능 측정 도구에서 의도치 않게 트리거될 수 있음. 의도적 인터랙션(click/touch/keydown)만 사용하는 것이 안전
- `font-display: swap`은 next/font에서 기본값이 아니므로 명시적으로 설정해야 함

---

## 배포

[Vercel Platform](https://vercel.com)을 통해 쉽게 배포할 수 있습니다.

자세한 내용은 [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying)을 참고하세요.

## 커밋 컨벤션

이 프로젝트는 [Conventional Commits](https://www.conventionalcommits.org/ko/v1.0.0/) 규칙을 따릅니다.

### 커밋 메시지 형식

```
<타입>(<범위>): <제목>
```

### 주요 타입

| 타입 | 설명 |
|------|------|
| `feat` | 새로운 기능 추가 |
| `fix` | 버그 수정 |
| `docs` | 문서 수정 |
| `style` | 코드 포맷팅 |
| `refactor` | 리팩토링 |
| `perf` | 성능 개선 |
| `test` | 테스트 추가/수정 |
| `chore` | 빌드, 설정 변경 |

### 예시

```bash
feat: 무한 스크롤 기능 추가
fix(animation): 스크롤 애니메이션 깜빡임 수정
docs: README 설치 방법 추가
refactor(hooks): 커스텀 훅 분리
```

자세한 내용은 [COMMIT_CONVENTION.md](./COMMIT_CONVENTION.md)를 참고하세요.

---

## 라이선스

MIT License
