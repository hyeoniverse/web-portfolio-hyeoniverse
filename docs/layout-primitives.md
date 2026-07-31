# 레이아웃 프리미티브 (폐기 — Tailwind v4 로 대체)

> **상태: 폐기됨.** 이 문서가 제안했던 React 레이아웃 프리미티브(`Stack`/`Row`/`Center`/`Grid`)는
> 실제로 만들었다가 **Tailwind v4 유틸리티 + `--grid-cols-*` 토큰으로 대체**하며 제거했다.
> 결정 배경 기록용으로만 남긴다.

관련: [design-system.md](./design-system.md) · [refactoring-guide.md](./refactoring-guide.md)

---

## 무엇을 하려 했나

CSS Modules 로 굳어진 코드베이스에서 반복되는 flex/grid 패턴을 `<Stack gap="md">` 같은
타입드 React 프리미티브로 추출하려 했다. 실제로 `src/components/ui/layout/` 에 구현까지 했다.

## 왜 폐기했나

1. **프리미티브는 "그냥 컨테이너"에만 이득이고, 스타일 입은 영역엔 손해.** 측정 결과 flex/grid
   컨테이너 클래스 2368개 중 순수 레이아웃은 22%(순수+standalone 16%)뿐이었다. 나머지 78%는
   padding·border·position 등이 얽혀 있어, 프리미티브로 감싸면 `<Row className={styles.x}>` 처럼
   클래스가 여전히 뚱뚱한 채 레이아웃만 props 로 빠져 오히려 가독성이 나빠졌다.
2. **자작 프리미티브를 박스 props 까지 키우는 건 "하프-Chakra".** 그건 성숙한 시스템(Tailwind/Panda)을
   불완전하게 재구현하는 것이라, 진짜를 도입하거나 CSS Modules 를 유지하는 것보다 품질이 낮다.

## 무엇으로 대체했나

- **순수 레이아웃** → Tailwind v4 유틸(`tw:flex tw:flex-col tw:gap-sm`). 순수+standalone 250곳을
  전환하며 CSS 클래스를 삭제. 사용 규칙은 [design-system.md](./design-system.md) §2 "Tailwind v4 병용".
- **등분 grid** → `--grid-cols-2/3/4/5/7` 토큰(overflow-safe `repeat(N, minmax(0,1fr))`).
- **혼합(스타일 입은) 클래스** → 그대로 CSS Modules 유지.
