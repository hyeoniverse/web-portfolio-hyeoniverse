# 레이아웃 프리미티브 로드맵

CSS Modules 로 굳어진 코드베이스(~140개 `*.module.css`)에서 반복되는 레이아웃 패턴을
공통 프리미티브로 추출하기 위한 설계·채택 계획. **먼저 합의하고 착수한다.**

관련: [refactoring-guide.md](./refactoring-guide.md) · [components.md](./components.md) · [design-system.md](./design-system.md)

---

## 1. 배경 (스캔 결과)

도메인 전반을 CSS **정의 구조**(클래스명 아님)로 스캔한 결과:

**이미 공통화된 것**
| 컴포넌트 | 위치 | 채택 |
|---|---|---|
| `SegmentedControl` | `ui/` | 32곳 (탭/세그먼트) |
| `SectionHeader` | `admin/.../settings/_components/` | 15곳 (**admin 전용**) |
| `FieldRow` | `ui/FieldRow/` | 7곳 (폼 행) |
| `ButtonGroup` · `Section` · `PageTitle` | `ui/` | — |

**없는 것**: 범용 `Stack` · `Cluster` · `Grid` · `Sidebar` · `Card`.

**핵심 통찰** — gap·radius·padding 은 이미 **토큰 스케일**(`--spacing-*`, `--radius-*`)을 쓴다.
즉 문제는 "px 난장판"이 아니라 **컴포넌트마다 어떤 토큰을 골랐는지가 제각각**(gap 이 어디는 `md`,
어디는 `xl`)인 것. 따라서 프리미티브가 **토큰 스케일 prop**(`gap="md"`)을 노출하면 구조 추출과
토큰 선택 통일이 동시에 된다.

`--spacing-*` 스케일: `zero · 4xs · 3xs · 2xs · xs · sm · md · lg · xl · 2xl · 3xl · 4xl · 5xl · 6xl`

---

## 2. 원칙

1. **토큰 스케일 prop** — 자유 px/rem 이 아니라 `gap="md"` 처럼 스케일 이름을 받는다. 편차를 스케일로 되돌린다.
2. **rule of three** — 미리 다 만들지 않는다. 3곳+ 반복이 확인된 것만 추출한다(스캔으로 확인 완료).
3. **점진 채택** — 프리미티브 신설과 전면 마이그레이션은 분리한다. 만들어 두고 **새 코드·리팩토링 시** 갈아탄다. 118곳을 한 번에 바꾸지 않는다.
4. **id 선택자 안 씀** — 레이아웃은 반복되므로 재사용 가능한 class/컴포넌트로. (유일한 page-shell 은 예외지만 이 프로젝트는 컴포넌트 방향)
5. **구조 vs 미시** — 구조 레이아웃(SectionHeader·Sidebar·Tabs)은 컴포넌트, 미시 레이아웃(Stack·Cluster·Grid)도 컴포넌트로 하되 얇게.

---

## 3. 프리미티브 API 설계

공통 타입:
```ts
type SpacingToken = "zero" | "4xs" | "3xs" | "2xs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
// gap 등은 이 토큰 → var(--spacing-{token}) 로 매핑
```
모든 프리미티브는 `as?` (렌더 태그 override), `className?` (추가 클래스 조합)을 받는다.

### Stack — 세로 나열 (118곳)
```tsx
<Stack gap="md" align="stretch">…</Stack>
```
| prop | 값 | 기본 |
|---|---|---|
| `gap` | SpacingToken | 필수 |
| `align` | `stretch \| start \| center \| end` | `stretch` |
| `justify?` | `start \| center \| between …` | — |
```css
display: flex; flex-direction: column;
gap: var(--spacing-{gap});
align-items: {align};
```

### Cluster — 가로 wrap (칩/버튼, 61곳)
```tsx
<Cluster gap="sm" align="center">…</Cluster>
```
| prop | 값 | 기본 |
|---|---|---|
| `gap` | SpacingToken | 필수 |
| `align` | `center \| start \| end \| baseline` | `center` |
| `justify?` | — | — |
```css
display: flex; flex-wrap: wrap;
gap: var(--spacing-{gap});
align-items: {align};
```

### Grid — 2-col / auto-fit (~36곳)
```tsx
<Grid cols={2} gap="md">…</Grid>            // 고정 컬럼
<Grid minItemWidth="220px" gap="md">…</Grid> // 반응형 auto-fit
```
| prop | 값 | 비고 |
|---|---|---|
| `cols?` | number | 고정 컬럼 수 |
| `minItemWidth?` | string | `repeat(auto-fit, minmax(min({v},100%), 1fr))` — 모바일 오버플로우 방지 내장 |
| `gap` | SpacingToken | |

> `minItemWidth` 는 스캔에서 60px~440px 로 편차가 컸던 min-track 을 한 곳에서 관리. `min({v}, 100%)` 로 감싸 모바일 가로 오버플로우를 기본 방지(#397 에서 겪은 이슈).

### Sidebar — 고정폭 side + 가변 main (~9~20곳)
```tsx
<Sidebar side="left" sideWidth="280px" contentMin="0">
  <nav>…</nav>
  <main>…</main>
</Sidebar>
```
| prop | 값 | 비고 |
|---|---|---|
| `side` | `left \| right` | side 슬롯 위치 |
| `sideWidth` | string | 인스턴스마다 달라 prop 필수 |
| `contentMin?` | string | main 최소폭(0 이면 truncate 허용) |

> 인스턴스가 가장 이질적(폭 제각각)이라 prop 이 많다. 우선순위를 낮게 둔 이유.

### Card — border+radius+padding+bg (~38곳)
2안 중 택1(로드맵에서 결정):
- **A. 컴포넌트** `<Card padding="md" radius="2xl">`
- **B. 토큰 표준화** `--radius-card` · `--card-padding` 신설 + 공유 클래스(`composes`)

> 스캔에서 `--_radius-card` 를 6곳이 임의로 만들어 쓰고 있었음 → 표준 토큰이 필요하다는 신호. B(토큰) 를 먼저 깔고 A(컴포넌트)가 그 토큰을 쓰는 하이브리드가 유력.

### SectionHeader — 승격 (admin 15곳 + public ~60곳 인라인 중복)
새로 만들지 않고 **`admin/.../settings/_components/` → `src/components/ui/` 로 이동**.
API 유지(`title` · `extra`(제목 아래 hint) · actions). public(about/posts/works)의 인라인 중복을 이걸로 교체.

### Tabs — SegmentedControl 로 통합 (~6곳 hand-rolled)
새 프리미티브 아님. `SegmentedControl` 에 `variant="underline"` 추가해 밑줄형 탭(`CategoryNav` 등)까지 흡수.

---

## 4. 채택 순서 (effort-to-payoff)

| # | 작업 | 근거 | 리스크 |
|---|---|---|---|
| 1 | **SectionHeader 승격** | 이미 검증(admin 15곳), ~60곳 중복 제거 | 낮음 (import 경로 + public 채택) |
| 2 | **Stack 신설** | 118곳, 최대 볼륨 | 낮음 (신설), 채택은 점진 |
| 3 | **Cluster 신설** | 61곳 | 낮음 |
| 4 | **Card 토큰 표준화(+컴포넌트)** | `--_radius-card` 신호 | 낮음 |
| 5 | **Grid 신설** | ~36곳, min-track 편차 | 중 (반응형 검증) |
| 6 | **Sidebar 신설** | ~9~20곳, 폭 이질적 | 중 (prop 많음) |
| 7 | **Tabs 통합** | ~6곳 → SegmentedControl | 중 (variant 추가 + 마이그레이션) |

각 프리미티브 **신설 = 1 PR**(컴포넌트 + module.css + design-system 프리뷰 + 소수 파일럿 채택).
전면 마이그레이션은 별도로, 도메인 리팩토링 때 rule of three 로 점진 진행한다.

---

## 5. 마이그레이션 전략

- 신설 PR 에는 **파일럿 2~3곳만** 채택해 실사용을 검증(FieldRow 를 ServicesTab 파일럿으로 검증했던 방식과 동일).
- 이후 각 도메인 슬라이스(admin → posts → works → about) 리팩토링 시 해당 도메인의 반복을 프리미티브로 흡수.
- 시각 회귀(admin baseline)로 픽셀 무변화 확인. 값-복사 매핑이라 대부분 무변화.

## 6. 열린 결정 (합의 필요)

- **Card**: 컴포넌트(A) vs 토큰 표준화(B) vs 하이브리드 — 어디까지?
- **align/justify prop 이름**: `start/center/end` 축약 vs `flex-start` 정식 — 컨벤션 통일.
- **프리미티브 위치**: `src/components/ui/` (기존 UI 컴포넌트 옆) vs `src/components/layout/` (page-chrome 과 섞임 주의).
- **채택 강제 범위**: 신규 코드만 강제 vs 기존도 점진 마이그레이션 목표 설정.
