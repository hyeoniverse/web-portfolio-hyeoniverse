# 레이아웃 스타일링 결정 기록 (폐기 — CSS Modules 단일로 확정)

> **상태: 종결.** 반복되는 flex/grid 패턴을 어떻게 공통화할지 탐색하며 (1) React 레이아웃 프리미티브,
> (2) Tailwind v4, (3) CSS Modules `composes` 공유 유틸을 시도했다가 **모두 되돌리고 CSS Modules
> 단일 시스템(관용구는 각 module 에 인라인)으로 확정**했다. (3)은 코드에 남아 있어 #384 후속으로 되돌린다.
> 현재 규칙은 [design-system.md](./design-system.md) §0·§3. 이 문서는 그 결정 과정 기록용.

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

## 3차 시도 — CSS Modules `composes` 공유 유틸 (`u*`)

Tailwind 와 같은 PR(#433, 2026-07-31)에서 admin 설정의 `Settings.module.css` 상단에 `uCenter`·`uRow`·`uCol`
같은 flex/grid 유틸 12종을 두고, 시그니처가 같은 클래스 64개를 `composes: uRow` 로 묶었다. JSX 는 그대로 두고
CSS 안에서만 재사용하는 방식이라 Tailwind 취소(#435) 때 되돌리지 않았다. 컴포넌트별 CSS 분리(#437)가 옮기는
규칙의 composes 를 인라인으로 풀어 한때 26곳으로 줄었다가, #541·#543(8/4)이 분리된 컴포넌트 모듈 쪽에서
`composes: uColSm from "../Settings.module.css"` 로 다시 가져다 쓰며 22종·102규칙으로 늘렸다. 현재 Settings 안
26곳, 다른 모듈 25개에서 98곳이 쓴다.

**폐기 이유**: 파일을 나누는 리팩토링(#384)의 배포 빌드를 대조하다 세 가지가 드러났다.

- 가져온 유틸 클래스와 자기 클래스는 특이도가 `(0,1,0)` 으로 같아, 프로덕션에서는 Turbopack 청크 순서가 승자를
  정한다. `page.module.css` `.navSub` 의 `display: none` 이 composes 한 `.uCol` 의 `flex` 에 져서 태블릿 폭에서
  하위 내비가 새어 나왔다(#632). 개발 서버에서는 정상이라 배포 전에는 안 보인다.
- 같은 파일 안 두 단계 `composes`(`.title → .uRowSm → .uRow`)는 Turbopack 이 끝 클래스를 안 붙여 `display: flex`
  를 못 받는다.
- 모듈 25개가 거대 공유 파일 하나에 묶여, 파일을 다 나눠도 의존이 남는다.

얻는 것은 선언 몇 줄의 중복 제거뿐이고 값은 이미 토큰이 통일한다. 인라인으로 되돌린다(tsx 변경 0, #384 후속).

## 확정 — CSS Modules 단일 시스템

- 이 프로젝트는 커스텀 애니메이션·GSAP·Three.js·정교한 CSS 이펙트가 핵심이라 bespoke CSS 가 유리하고,
  이미 성숙한 CSS Modules + 토큰 시스템이 있다.
- **반복 레이아웃은 공유 CSS 유틸/프리미티브가 아니라 React 컴포넌트로 추출**(rule of three).
  파일 간 `composes` 도 공유 유틸에 든다 — [design-system.md](./design-system.md) §3.
- **등분 grid → `--grid-cols-2/3/4/5/7` 토큰**(overflow-safe)은 Tailwind 와 무관하게 유용해 **유지**.
- 전체 규칙: [design-system.md](./design-system.md).
