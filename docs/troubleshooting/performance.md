# Trouble Shooting: 성능

[← 전체 목차](../troubleshooting.md)

<details>
<summary><strong>22. 서드파티 지연 로딩: reCAPTCHA 를 초기 로드에서 빼기</strong></summary>

<p align="center">
  <img src="../../public/images/screenshots/pc/home-light.png" width="100%" alt="Home — Lighthouse" />
</p>

**문제**

Lighthouse 모바일 Performance 점수 48점. LCP 17.1초, TTI 18.2초로 심각한 성능 저하

**원인**

Lighthouse 보고서(Desktop/Mobile)를 분석한 결과 주요 병목:

1. **reCAPTCHA v3 즉시 로딩**: `GoogleReCaptchaProvider`가 앱 전체를 감싸며 초기 로드 시 ~784KB JS를 즉시 다운로드. 메인 스레드 280ms 차단
2. **Preconnect 미설정**: Google 도메인에 대한 사전 연결 없이 요청 시작 → 400ms 지연
3. **색상 대비 미달**: `#6b7280` on `#f8f6f0` (4.47:1, 기준 4.5:1 미달), `#ff4f9d` on `#f8f6f0` (2.83:1)
4. **접근성**: heading 순서 건너뜀 (h1 → h3), aria-label과 표시 텍스트 불일치

**해결**

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

**인사이트**

- 서드파티 스크립트(reCAPTCHA, Analytics 등)는 초기 로드에서 제외하고 유저 인터랙션 후 로드하면 LCP/TTI에 큰 영향
- 개발 서버(Turbopack)에서의 Lighthouse 결과는 unminified JS, devtools 등으로 인해 프로덕션보다 훨씬 낮게 측정됨
- `mix-blend-mode: difference` 사용 시 Lighthouse가 blend 전 색상으로 대비를 계산하므로 실제 시각적 결과와 다를 수 있음


</details>

<details>
<summary><strong>23. 리소스 인벤토리: 미사용 폰트 제거와 로딩 전략</strong></summary>

| PC | Tablet | Mobile |
|:---:|:---:|:---:|
| <img src="../../public/images/screenshots/pc/home-light.png" width="100%" alt="Home PC" /> | <img src="../../public/images/screenshots/tablet/home-light.png" width="100%" alt="Home Tablet" /> | <img src="../../public/images/screenshots/mobile/home-light.png" width="100%" alt="Home Mobile" /> |
<sub>최적화 대상: Home 페이지 — 3개 디바이스에서 Performance 98점 달성</sub>

**문제**

1차 최적화 후 Lighthouse 모바일 Performance 60점. LCP 7.3초, TTI 13.7초, 페이지 용량 1,489KB, 네트워크 요청 63건

**원인**

Lighthouse CLI로 프로덕션 빌드를 직접 측정하여 병목 파악:

1. **미사용 폰트 4개 로드**: IBM Plex Mono(5 weights), Bebas Neue, Cormorant Garamond(5 weights), Abril Fatface가 CSS에서 미참조인데도 12개 폰트 파일을 다운로드
2. **reCAPTCHA 4초 타이머**: 지연 로딩에 `setTimeout(4000)` 폴백이 있어 Lighthouse 테스트 중 여전히 ~740KB 로드
3. **scroll 이벤트 트리거**: reCAPTCHA가 scroll 이벤트에도 반응하여 불필요하게 조기 로드
4. **font-display 미명시**: 폰트 표시 정책이 버전 기본값에 맡겨져 있었음
5. **미사용 Preconnect**: reCAPTCHA가 초기 로드에서 제외되었으므로 Google 도메인 preconnect가 "unused" 경고 유발
6. **Inter 과다 가중치**: 7개 가중치(300-900) 중 800, 900은 미사용

**해결**

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

결과 (Lighthouse CLI, 3회 측정 중앙값):

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

**인사이트**

- `next/font/google`로 등록한 폰트는 CSS에서 미참조여도 폰트 파일이 다운로드됨. 정기적으로 실제 사용 여부를 검증해야 함
- 서드파티 지연 로딩의 타이머 폴백은 성능 측정 도구에서 의도치 않게 트리거될 수 있음. 의도적 인터랙션(click/touch/keydown)만 사용하는 것이 안전
- 현재 next/font 의 `display` 기본값은 `swap` 이라 지금은 명시가 필수는 아니다. 다만 명시해 두면 기본값과 무관하게 의도가 고정된다


</details>

<details>
<summary><strong>24. 메인 스레드 vs 컴포지터: 애니메이션·리렌더·GPU 메모리</strong></summary>

| PC | Tablet | Mobile |
|:---:|:---:|:---:|
| <img src="../../public/images/screenshots/pc/home-dark.png" width="100%" /> | <img src="../../public/images/screenshots/tablet/home-dark.png" width="100%" /> | <img src="../../public/images/screenshots/mobile/home-dark.png" width="100%" /> |

**문제**

프로젝트 성능 감사 결과, 다수의 최적화 포인트 발견: 메인 스레드 애니메이션, 60fps React 리렌더, GPU 메모리 누수, 미사용 리소스, CSS 충돌

**원인**

1. **Hero 타원·마퀴**: Framer Motion/GSAP의 무한 반복 애니메이션이 메인 스레드 RAF로 실행
2. **useMagneticRepel**: `mousemove`마다 `setMagneticOffsets()` → 60fps React state 업데이트 → WorksSection 전체 리렌더
3. **Three.js**: `DoubleSide`로 양면 렌더링, `isMobile` 변경 시 geometry 미해제(GPU 메모리 누수)
4. **미사용 리소스**: paper.png(17MB), grain.png(5.2MB) 미참조, npm 패키지 2개 미사용
5. **CSS 충돌**: `scroll-behavior: smooth`가 Lenis와 이중 스무딩, `cursor: none`이 터치 디바이스에도 적용
6. **useSoundManager**: mount 시 AudioContext 생성 + typing.mp3 즉시 fetch

**해결**

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

**인사이트**

- 단순 무한 반복 애니메이션(rotate, translateX)은 CSS animation이 JS 기반보다 더 효율적 — 컴포지터 스레드에서 메인 스레드 차단 없이 실행됨
- 고빈도 이벤트(mousemove)에서 React state를 업데이트하면 프레임당 전체 컴포넌트 트리가 재조정됨. ref + 직접 DOM 조작이 적절한 패턴
- Three.js의 `useMemo`로 생성한 geometry/material은 React의 GC 대상이지만 GPU 버퍼는 자동 해제되지 않음. 명시적 `dispose()` 필수


</details>

<details>
<summary><strong>25. 클라이언트 이미지 압축: 전송 전에 줄이는 파이프라인</strong></summary>

**문제**

사용자가 선택한 이미지를 압축 없이 원본 그대로 업로드하여, 스마트폰 사진(5–15MB)은 10MB 제한에 걸려 실패하고, 제한 이하 파일도 불필요하게 큰 원본이 전송됨

**원인**

업로드 함수에 클라이언트 압축 로직이 없었고, 서버에서 용량 초과를 거부하는 것이 유일한 방어선

**해결**

업로드 전 브라우저에서 단계적 압축 파이프라인 실행:

```
1. SVG/GIF → 스킵 (벡터/애니메이션은 Canvas 변환 불가)
2. 용량 이하 → 스킵
3. WebP 변환 (canvas.toBlob, quality 0.85)
4. 해상도 축소 (긴 변 최대 2560px)
5. 품질 단계적 하향 (0.05씩, 최저 0.7)
```

`compressImage()` 유틸리티를 dynamic import로 불러와 번들 크기에 영향 없음

**인사이트**

이미지 압축은 서버보다 클라이언트에서 하는 것이 합리적 — 전송 전에 크기를 줄여 대역폭과 스토리지를 동시에 절약. WebP는 AVIF보다 압축률은 낮지만 브라우저 인코딩 속도가 3–10배 빠르고 지원률도 높아 클라이언트 처리에 적합


</details>
