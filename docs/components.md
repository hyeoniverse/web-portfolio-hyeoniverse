# 주요 컴포넌트

### StaggerText

텍스트를 개별 문자로 분리하여 호버 시 순차적으로 외곽선 애니메이션을 적용하는 컴포넌트입니다.

**경로**: `src/components/effects/StaggerText`

<p align="center">
  <img src="public/docs/screenshots/pc/home-dark.png" width="100%" alt="Home — StaggerText" />
</p>

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

| Prop           | Type      | Default        | Description                          |
| -------------- | --------- | -------------- | ------------------------------------ |
| `children`     | `string`  | (필수)         | 표시할 텍스트                        |
| `className`    | `string`  | -              | 추가 CSS 클래스                      |
| `strokeColor`  | `string`  | `currentColor` | 스트로크 색상 (CSS 변수 또는 색상값) |
| `strokeWidth`  | `number`  | `1`            | 스트로크 두께 (px)                   |
| `delayPerChar` | `number`  | `0.04`         | 글자당 딜레이 (초)                   |
| `hoverEffect`  | `boolean` | `true`         | 호버 효과 활성화 여부                |

---

### BreakpointGuard

뷰포트가 breakpoint 경계(768px, 1024px)를 넘을 때 페이지 콘텐츠를 자동으로 unmount/remount하여 GSAP ScrollTrigger, RAF 기반 애니메이션 등을 재초기화하는 컴포넌트입니다.

**경로**: `src/components/common/BreakpointGuard.tsx`

| PC | Tablet | Mobile |
|:---:|:---:|:---:|
| <img src="public/docs/screenshots/pc/home-dark.png" width="100%" /> | <img src="public/docs/screenshots/tablet/home-dark.png" width="100%" /> | <img src="public/docs/screenshots/mobile/home-dark.png" width="100%" /> |

**기능**:

- 뷰포트 너비 변화를 감지하여 `desktop` (>1024px) / `tablet` (768-1024px) / `mobile` (<768px) 분류
- breakpoint 변경 시 `key` prop을 통해 children을 remount
- Provider(Theme, Language, Lenis)는 상위에 위치하여 상태 유지

**적용 위치**: `src/app/layout.tsx`

```tsx
// root layout.tsx
<ThemeProvider>
  <LanguageProvider>
    <LenisProvider>
      <Navigation /> {/* 유지 */}
      <main>
        <BreakpointGuard>
          {" "}
          {/* breakpoint 변경 시 remount */}
          {children}
        </BreakpointGuard>
      </main>
    </LenisProvider>
  </LanguageProvider>
</ThemeProvider>
```

**Breakpoints**:

| Breakpoint | 범위           | 설명                     |
| ---------- | -------------- | ------------------------ |
| `desktop`  | > 1024px       | 가로 스크롤 레이아웃     |
| `tablet`   | 768px - 1024px | 세로 스크롤, 태블릿 간격 |
| `mobile`   | < 768px        | 세로 스크롤, 모바일 간격 |

---

### Modal (Bottom Sheet)

모바일에서 bottom sheet 패턴으로 동작하는 모달 컴포넌트. 데스크탑에서는 중앙 다이얼로그.

| PC (Desktop Dialog) | Tablet | Mobile (Bottom Sheet) |
|:---:|:---:|:---:|
| <img src="public/docs/screenshots/pc/work-detail-dark.png" width="100%" alt="PC" /> | <img src="public/docs/screenshots/tablet/work-detail-dark.png" width="100%" alt="Tablet" /> | <img src="public/docs/screenshots/mobile/work-detail-dark.png" width="100%" alt="Mobile" /> |

**경로**: `src/components/ui/Modal.tsx`

**모바일 동작**:

- 하단에서 슬라이드업으로 진입 (85vh 높이 제한)
- **핸들 아래로 드래그**: CSS `translate` 기반 dismiss (threshold 100px 초과 시 닫힘)
- **핸들 위로 드래그**: height 기반 전체화면 확장
- 닫기 버튼 숨김 — 핸들 드래그 또는 overlay 탭으로 닫기

**기술 결정**:

- 드래그 dismiss에 CSS `translate` 속성 사용 (framer-motion의 `transform`과 독립)
- framer-motion은 enter/exit 애니메이션만 담당, 드래그는 `--sheet-y` CSS 변수로 제어
- `ClientOverlays`에서 글로벌 1회 렌더링 (portal to body)

---
