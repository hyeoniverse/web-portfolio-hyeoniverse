# 레이아웃 스타일링 결정 기록 (폐기 — CSS Modules 단일로 확정)

> **상태: 종결.** 반복되는 flex/grid 패턴을 어떻게 공통화할지 탐색하며 (1) React 레이아웃 프리미티브,
> (2) Tailwind v4 를 차례로 시도했다가 **둘 다 되돌리고 CSS Modules 단일 시스템으로 확정**했다.
> 현재 규칙은 [design-system.md](./design-system.md) §0. 이 문서는 그 결정 과정 기록용.

관련: [design-system.md](./design-system.md) · [refactoring-guide.md](./refactoring-guide.md)

---

## 1차 시도 — React 레이아웃 프리미티브 (`Stack`/`Row`/`Center`/`Grid`)

반복되는 flex/grid 를 `<Stack gap="md">` 같은 타입드 컴포넌트로 추출하려 `src/components/ui/layout/` 에 구현했다.

**폐기 이유**: 측정하니 flex/grid 컨테이너 2368개 중 순수 레이아웃은 16%(순수+standalone)뿐. 나머지 84%는
padding·border·position·하위셀렉터가 얽혀 있어 `<Row className={styles.x}>` 처럼 감싸도 클래스가 여전히
뚱뚱한 채 레이아웃만 props 로 빠져 오히려 가독성이 나빠졌다. 프리미티브에 박스 props 까지 붙이는 건
성숙한 시스템(Tailwind/Panda)의 불완전한 재구현("하프-Chakra")이라 더 나쁨.

## 2차 시도 — Tailwind v4 도입

"성숙한 시스템을 도입" 하는 게 낫다고 판단해 Tailwind v4 를 CSS Modules 옆에 얹고(`tw:` 프리픽스 +
`@theme` 토큰 브리지) 순수 레이아웃 250곳을 유틸로 전환했다.

**폐기 이유**: 막상 깔끔히 전환되는 건 순수 레이아웃 16%뿐이고 나머지는 CSS Modules 로 남아,
**같은 flex row 인데 어디는 `tw:flex`, 어디는 `styles.row` 인 split-brain** 상태가 됐다.
애초에 Tailwind 가 해결한 구체적 문제가 없었고(탐색이 도입으로 굴러간 것), 두 시스템의 인지 비용이
컸다. 업계 트렌드도 "한 시스템에 커밋" 이 핵심이지 반반 혼용이 아니다.

## 확정 — CSS Modules 단일 시스템

- 이 프로젝트는 커스텀 애니메이션·GSAP·Three.js·정교한 CSS 이펙트가 핵심이라 bespoke CSS 가 유리하고,
  이미 성숙한 CSS Modules + 토큰 시스템이 있다.
- **반복 레이아웃은 공유 CSS 유틸/프리미티브가 아니라 React 컴포넌트로 추출**(rule of three).
- **등분 grid → `--grid-cols-2/3/4/5/7` 토큰**(overflow-safe)은 Tailwind 와 무관하게 유용해 **유지**.
- 전체 규칙: [design-system.md](./design-system.md).
