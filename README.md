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
