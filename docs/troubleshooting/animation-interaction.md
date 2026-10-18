# Trouble Shooting: 애니메이션 · 인터랙션

[← 전체 목차](../troubleshooting.md)

<details>
<summary><strong>53. 라이브러리의 진실 소스: Lenis velocity 는 이벤트 안에서 읽는다</strong></summary>

**증상**: 홈 작업물 섹션의 이미지에 스크롤 속도에 따른 패럴랙스 효과가 적용되지 않았다.

**원인**: 처음에는 wheel 이벤트를 직접 감지했는데, 값이 불안정하고 Lenis 와 충돌했다. 이어서 requestAnimationFrame 루프에서 스크롤 위치의 차이로 속도를 계산했는데, 프레임 간격이 일정하지 않아 값이 부정확했다. Lenis 인스턴스의 `velocity` 속성을 이벤트 밖에서 읽었을 때는 값이 갱신되지 않은 상태였다. Lenis 는 내부에서 velocity 를 계산해 인스턴스 속성으로 두지만, 정확한 값은 scroll 이벤트 핸들러 안에서 읽어야 했다.

**해결**: Lenis 의 `on("scroll")` 핸들러 안에서 인스턴스의 `velocity` 를 읽는다.

```tsx
const handleScroll = () => {
  const velocity: number = (lenis as unknown as { velocity: number }).velocity;
  if (Math.abs(velocity) > 0.05) {
    /* 화면 폭에 따라 줄인 최대값으로 자른 offset 을 motion value 에 넣는다 */
    workImageOffsetY.set(offset);
  }
};
lenis.on("scroll", handleScroll);
```

`src/hooks/useScrollVelocity.ts` 의 코드를 줄인 것이다. `velocity` 는 Lenis 의 공개 타입에 없어서 타입 단언이 필요하다. 일정 시간 스크롤이 없으면 offset 을 0 으로 되돌린다.

**결론**: 라이브러리가 내부에서 계산하는 값은 직접 다시 계산하지 말고, 라이브러리가 그 값을 갱신하는 이벤트 안에서 읽어야 정확하다.


</details>

<details>
<summary><strong>54. 스크롤 위치 래핑: 세트 복제보다 위치 순환</strong></summary>

**증상**: Works 페이지의 가로 스크롤 갤러리는 프로젝트 목록을 여러 세트 반복해 무한 스크롤처럼 보이게 했다. 그런데 끝까지 스크롤하면 빈 화면이 나타났다.

**원인**: 반복 세트 수가 유한하면 양쪽 방향 모두 끝이 있다. 애니메이션 루프에서 `scrollX` 가 계속 누적되어 콘텐츠 범위를 벗어났다. 세트 수를 늘리면 DOM 노드가 지나치게 많아진다. 끝에서 `window.scrollTo` 로 처음 위치로 옮기는 방식은 이동이 눈에 보였다.

**해결**: 인트로 요소 두 개의 `offsetLeft` 차이로 한 세트의 너비(`oneSetWidth`)를 구하고, 애니메이션 루프에서 `scrollX` 와 `targetScrollX` 를 그 너비만큼 함께 빼거나 더해 범위 안으로 되돌린다.

```tsx
if (infiniteScroll && oneSetWidth > 0) {
  while (scrollX > oneSetWidth * WRAP_SETS) {
    scrollX -= oneSetWidth;
    targetScrollX -= oneSetWidth;
  }
  while (scrollX < -oneSetWidth * WRAP_SETS) {
    scrollX += oneSetWidth;
    targetScrollX += oneSetWidth;
  }
}
```

`src/app/works/_hooks/useWorksHorizontalScroll.ts` 의 코드다. 목록은 3세트(`INFINITE_SCROLL_SETS`)만 그리고, 가운데 세트에서 시작해 한 세트(`WRAP_SETS`)를 넘어가면 위치를 되돌린다. 세트 내용이 같으므로 되돌려도 화면은 바뀌지 않는다.

**결론**: 무한 스크롤은 복제 세트를 늘리는 대신 스크롤 위치 자체를 한 세트 너비로 순환시키면 DOM 부담 없이 양방향으로 구현할 수 있다. 현재값과 목표값을 같은 양만큼 함께 옮겨야 보간이 끊기지 않는다.


</details>

<details>
<summary><strong>55. 뷰포트 의존 초기화: key 리마운트로 재계산</strong></summary>

**증상**: 데스크톱, 태블릿, 모바일 사이로 창 크기를 바꾸면 GSAP ScrollTrigger 의 pin 과 requestAnimationFrame 기반 이동 계산이 이전 뷰포트 기준으로 남아 레이아웃이 깨졌다.

**원인**: ScrollTrigger 의 `start`, `end`, `pin` 은 생성 시점의 뷰포트 크기로 계산된다. requestAnimationFrame 기반 계산도 초기 너비 값을 기준으로 동작한다. 뷰포트가 바뀌어도 기존 인스턴스는 갱신되지 않는다. 컴포넌트마다 resize 리스너로 effect 를 다시 실행하는 방식은 코드가 중복되고 빠지는 곳이 생겼다. `ScrollTrigger.refresh()` 는 가로 배치와 세로 배치가 바뀌는 것처럼 DOM 구조가 바뀌는 경우를 처리하지 못했다.

**해결**: `BreakpointGuard` 가 브레이크포인트 경계를 넘을 때 자식 전체를 `key` 로 다시 마운트한다. 이 컴포넌트 위의 Provider 는 그대로 유지되므로 전역 상태는 잃지 않는다. 처음에는 루트 레이아웃에 두었고, 지금은 `src/app/profile/page.tsx` 만 쓴다.

지금의 구현은 두 가지가 바뀌었다. 판정 기준은 너비(1024px)와 높이(640px)를 함께 본다. `key` 는 브레이크포인트 이름이 아니라 경계를 넘은 횟수(`generation`)다. 예전에는 key 를 `"desktop-tall"` 로 시작해 첫 effect 에서 실제 값을 넣었다. 그래서 모바일에서는 방문하자마자 key 가 바뀌어 페이지 전체가 한 번 다시 만들어졌고, 이미 그려진 히어로가 새 노드로 다시 그려지면서 LCP 가 늦어졌다. 지금은 첫 effect 에서 기준값만 기록하고 key 는 바꾸지 않는다. 경계를 넘으면 같은 렌더에서 불투명한 덮개를 띄우고 `generation` 을 올린다. 150ms 뒤 덮개를 450ms 동안 걷고, 그 사이 다시 바뀐 브레이크포인트가 있으면 한 번 더 처리한다.

**결론**: 생성 시점의 뷰포트에 의존하는 애니메이션은 부분 갱신보다 `key` 를 바꿔 다시 마운트하는 편이 안정적이다. 리마운트 범위는 Provider 아래로 한정하고, 첫 마운트에서는 key 를 바꾸지 않아야 한다.


</details>

<details>
<summary><strong>56. 상태와 동기 ref: 모드 전환의 잔상 리셋</strong></summary>

**증상**: 에디터 이미지와 열 블록의 리사이즈 핸들에 커스텀 커서(↔, ↕, ⤡ 등)를 적용했더니 마우스 이동 방향에 따라 커서 화살표가 회전하거나 찌그러졌다.

**원인**: CursorTrail 의 애니메이션 루프는 마우스 속도에 따라 `angleRef`(회전)와 `scaleRef`(스케일)를 계산한다. 리사이즈 모드에 들어가도 이전 값이 그대로 남아 있었다. 또 리사이즈 여부를 classList 로 판단하면 React 렌더 시점과 어긋나 1~2프레임 늦게 반영됐다.

**해결**: `setCursorType` 과 함께 갱신하는 동기 ref `cursorTypeRef` 를 추가했다. 리사이즈 커서로 바뀌는 순간 `angleRef` 와 `scaleRef` 를 0 으로 되돌린다. 애니메이션 루프는 `cursorTypeRef.current` 로 리사이즈 여부를 판단해 회전과 스케일을 끈다.

**결론**: 모드가 자주 바뀌는 애니메이션 값은 state 와 동기 ref 를 함께 두고, 모드에 들어가는 시점에 이전 값을 명시적으로 초기화해야 잔상이 남지 않는다.


</details>

<details>
<summary><strong>57. enter/leave 비대칭: transition-delay 의 한계와 hover 영역</strong></summary>

**증상**: `/posts` 의 시리즈 카드에 hover 하면 덱처럼 펼쳐지며 소속 글 레이어가 차례로 나타나야 했다. 초기 구현에서는 펼쳐지는 순간 덱이 한 번 사라졌다 나타나는 듯 깜빡였고, hover 직후 너무 빨리 펼쳐졌으며, 레이어가 차례대로가 아니라 한꺼번에 나타났다. 펼친 뒤 레이어와 레이어 사이를 마우스가 지나가면 hover 가 끝나 덱이 닫혔다가 다시 펼쳐졌다.

**원인**:

1. 레이어 등장 순서를 CSS `transition-delay` 로 주었다. hover 가 끝나면 모든 delay 가 동시에 취소되어 레이어가 한꺼번에 사라졌다.
2. transform 의 easing 이 overshoot 계열 `cubic-bezier(0.34, 1.45, ...)` 이라 펼치기 직전부터 이미 조금 벌어진 상태로 보였다.
3. 펼침 시작 delay 가 0 이라 마우스가 들어오자마자 펼쳐졌다.
4. 펼칠 때 다음 카드를 밀어내려고 `margin-right` 를 늘렸다. margin 은 보이는 배치만 바꾸고 요소의 hit 영역은 넓히지 않는다. 그래서 레이어 사이 빈 공간에서는 카드 밖으로 판정되어 hover 가 끝났다.

**해결**:

1. 펼침 시작은 JS 가 정한다. `useSeriesDeck` 이 hover 가 800ms(`HOVER_OPEN_MS`) 유지되면 열림 상태로 바꾸고, hover 가 끝나면 타이머만 취소한다.
2. 레이어마다 `--deck-i` 를 주고 `transition-delay: calc((var(--deck-i, 1) - 1) * 0.18s)` 로 순서대로 펼친다. 펼침은 JS 가 시작하므로 CSS 에는 기본 delay 가 없다.
3. easing 은 overshoot 없는 `--ease-standard` 로 바꿨다.
4. 카드에 `::after` 를 두고, 열렸을 때 그 너비를 펼친 레이어 폭(`var(--deck-count) * 176px`)으로 바로 늘린다. 이 영역도 카드의 hover 영역이므로 레이어 사이를 지나가도 hover 가 유지된다.

**결론**: CSS `transition-delay` 는 enter 와 leave 에 똑같이 적용되므로 "잠깐 기다렸다가 펼치고, 떠나면 바로 닫기" 같은 비대칭 동작은 JS 타이머로 시작 시점을 정해야 한다. 정지 후 움직임이 분명해야 하는 동작에는 overshoot easing 이 맞지 않는다. margin 은 hit 영역을 넓히지 않으므로 hover 영역을 넓히려면 pseudo 요소를 써야 한다.


</details>

<details>
<summary><strong>58. 포인터 캡처와 클릭: 캡처는 드래그가 시작된 뒤에 건다</strong></summary>

**증상**: 드래그로 움직이는 컨테이너 안에서 자식 클릭이 동작하지 않았다. 가로 캐러셀 안의 팀원 폴라로이드 카드를 눌러도 뒤집히지 않았다. 카드에는 `onClick` 이 정상으로 붙어 있었다. 관계 선택기(`RelationPicker`)의 칩 순서를 HTML5 드래그 앤 드롭으로 바꾸는 기능도 드래그가 시작되지 않거나 한쪽 방향으로만 동작했다.

**원인**: 캐러셀은 마우스 드래그 스크롤을 위해 `onPointerDown` 에서 바로 `el.setPointerCapture()` 를 호출했다. 포인터가 캡처되면 이후 pointer 이벤트가 모두 캐러셀로 전달되므로, 자식 카드의 click(pointerdown 과 pointerup 한 쌍)이 카드에 도달하지 않는다. 드래그를 위한 캡처가 탭과 클릭까지 가져갔다.

칩 정렬은 HTML5 드래그 앤 드롭의 특성 때문에 실패했다. 브라우저는 DOM `draggable` 속성을 드래그 시작 시점에 한 번만 읽는다. `draggable={dragId === id}` 처럼 state 로 바꾸면 갱신이 늦어 드래그가 시작되지 않았다. 드래그 원본 노드가 재조정으로 옮겨지거나 언마운트되면 드래그 세션이 취소됐다.

**해결**: 캡처는 실제 드래그가 시작된 뒤에만 건다.

```tsx
const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
  const dx = e.clientX - state.startX;
  if (Math.abs(dx) > 4 && !state.moved) {
    state.moved = true;
    el.setAttribute("data-cursor", "grab");
    el.setPointerCapture(e.pointerId);
  }
  el.scrollLeft = state.startLeft - dx;
};
```

`HorizontalCarousel` 의 코드를 줄인 것이다. `onPointerDown` 에서는 시작 좌표만 기록하고, 4px 을 넘게 움직였을 때 캡처한다. 4px 미만으로 떼면 캡처가 일어나지 않아 click 이 자식에 전달된다. `onClickCapture` 는 `moved` 가 참일 때만 click 을 막아 드래그 끝의 의도하지 않은 클릭을 차단한다.

자식 클릭이 중요한 다른 곳은 캡처를 쓰지 않는다. `TagCloud3D` 는 document 수준의 `pointermove` 와 `pointerup` 리스너로 회전을 추적하고 이동 거리 임계값으로 드래그를 판정한다. `RelationPicker` 의 칩은 HTML5 드래그 앤 드롭 대신 pointer 기반으로 다시 만들었다. 핸들의 `pointerdown` 에서 document 에 리스너를 달고, `pointermove` 마다 `document.elementFromPoint()` 와 `closest("[data-chip-id]")` 로 대상 칩을 찾고, `pointerup` 에서 배열을 splice 해 순서를 바꾼다.

**결론**: `setPointerCapture` 를 pointerdown 에서 바로 호출하면 클릭과 드래그를 구분할 기회가 없어진다. 이동 임계값을 넘기 전에는 캡처하지 않거나, document 수준 리스너와 거리 판정을 쓰면 자식 클릭을 유지할 수 있다. 같은 페이지 안의 작은 항목 순서 변경은 HTML5 드래그 앤 드롭보다 pointer 이벤트로 구현하는 편이 일관되게 동작한다.


</details>

<details>
<summary><strong>59. drag 중의 이벤트 정지: dragover 로 좌표를 잇는다</strong></summary>

**증상**: 관리자 화면의 정렬 목록 등에서 HTML5 드래그를 시작하면 커스텀 커서(CursorTrail)가 마우스를 따라가지 않고 제자리에 멈췄다. 드래그 중 마우스가 다른 요소 위를 지나갈 때마다 커서 모양이 "text", "big" 등으로 바뀌었다.

**원인**: 브라우저는 HTML5 드래그 중에는 `pointermove` 와 `mousemove` 를 보내지 않고 `dragover` 를 보낸다. CursorTrail 은 `pointermove` 만 듣고 있었으므로 좌표가 갱신되지 않았다. 또 `runHitTest` 는 `elementFromPoint` 결과로 커서 모양을 정하는데, 드래그 중에도 그대로 동작해 지나가는 요소마다 모양이 바뀌었다.

**해결**: 두 가지를 함께 고쳤다. `dragover` 이벤트를 받아 `handleMouseMove` 로 넘긴다. DragEvent 와 PointerEvent 가 공통으로 가진 `clientX`, `clientY` 만 쓰므로 타입을 단언해 넘긴다. 드래그가 시작되면 커서 모양을 고정한다.

```ts
let isHtml5Dragging = false;
const onDragStart = () => {
  isHtml5Dragging = true;
  cursorTypeRef.current = "grab";
  setCursorType("grab");
};
document.addEventListener("dragstart", onDragStart, true);

const runHitTest = (mx: number, my: number) => {
  if (isHtml5Dragging) return;
  // …
};
```

`CursorTrail.tsx` 의 코드다. `dragend` 와 `drop` 에서 `isHtml5Dragging` 을 다시 `false` 로 바꾼다.

**결론**: HTML5 드래그가 진행되는 동안 pointer 이벤트는 멈춘다. 좌표는 `dragover` 로 받을 수 있지만, 드래그의 시작과 끝을 따로 추적하지 않으면 hit-test 가 드래그 중인지 알 수 없다. hover 마다 모드를 바꾸는 컴포넌트는 드래그 시작에서 모드를 고정하고 끝에서 풀어야 한다.


</details>

<details>
<summary><strong>60. 축 기반 휠 라우팅: 통짜 prevent 는 세로까지 막는다</strong></summary>

**증상**: 코드블록 위에 마우스를 두고 세로로 휠을 굴리면 페이지가 움직이지 않았다.

**원인**: 넓은 코드의 가로 스크롤을 살리려고 코드블록 `<pre>` 전체에 `data-lenis-prevent` 를 걸었다. Lenis 는 이 표시가 있는 요소 위의 wheel 을 처리하지 않는다. 블록이 세로로 넘치지 않을 때도 세로 휠이 무시되어 페이지가 움직이지 않았다. Lenis 를 쓰는 페이지에서는 body 의 기본 세로 스크롤로도 넘어가지 않는다.

**해결**: 블록 전체를 막는 대신 휠의 축을 보고 처리한다(`highlightCodeBlocks.ts` 의 `attachWheelRouting`).

1. 가로 제스처(`|deltaX| > |deltaY|` 또는 shift+wheel)이고 블록이 가로로 넘치면 블록을 가로로 스크롤한다.
2. 세로 제스처이면 블록이 세로로 스크롤 가능하고 그 방향 끝이 아닐 때만 블록을 스크롤한다. 아니면 이벤트를 그대로 둔다.
3. Lenis 는 window 에서 버블 단계로 wheel 을 듣는다. 블록이 처리한 경우에만 `stopPropagation()` 을 호출하므로, 그대로 둔 이벤트는 Lenis 가 받아 페이지를 스크롤한다. 터치는 `data-lenis-prevent-touch` 로 기본 스크롤을 유지한다.

**결론**: 부드러운 스크롤 라이브러리 위에서 특정 영역만 자체 스크롤하게 할 때 영역 전체를 막으면 세로 스크롤까지 막힌다. 축과 끝 위치를 보고 필요한 방향만 처리하고 나머지는 라이브러리로 넘겨야 중첩 스크롤이 자연스럽다.


</details>

<details>
<summary><strong>61. 라이브러리 규약 밖의 이벤트: preventDefault 와 opt-out 표시의 짝</strong></summary>

**증상**: 가로 스크롤 섹션에서 패널은 좌우로 넘어가는데 페이지도 함께 세로로 밀렸다.

**원인**: 전역 Lenis 는 window 에 자기 wheel 리스너를 달고, 델타를 받아 `scrollTo` 로 페이지를 직접 스크롤한다. Lenis 1.0.42 의 `onVirtualScroll` 은 `event.defaultPrevented` 를 확인하지 않는다. `preventDefault()` 는 브라우저 기본 스크롤만 막는다.

**해결**: 휠을 가로채는 요소에 `data-lenis-prevent-wheel` 표시를 붙였다. Lenis 는 이벤트 경로(`composedPath`)에서 이 표시를 찾으면 그 이벤트를 처리하지 않는다. 가로 스크롤이 끝에 닿아 세로 스크롤로 넘겨야 할 때는 표시를 떼서 Lenis 가 이어받게 한다. 정리 함수에서 표시를 지우지 않으면 모바일 배치에서 세로 스크롤이 동작하지 않는다.

**결론**: 스크롤 라이브러리는 브라우저의 기본 이벤트 규약과 별개로 동작한다. `preventDefault` 와 라이브러리 전용 opt-out 표시를 짝으로 관리해야 한다.


</details>

<details>
<summary><strong>62. 링크가 공짜로 주는 것들: 캔버스에선 전부 다시 만든다</strong></summary>

<p align="center">
  <img src="../../public/images/screenshots/pc/works-cylinder-light.png" width="100%" alt="Works Cylinder: 3D 원통 배치" />
</p>

**증상**: 원통 배치의 작업물 판을 가운데 버튼으로 클릭해도 새 탭이 열리지 않았다. 키보드로는 판에 접근할 방법이 없었다.

**원인**: 브라우저는 가운데 클릭에 `click` 대신 `auxclick` 을 보내고, react-three-fiber 는 `auxclick` 을 처리하지 않는다. 캔버스를 `<a>` 로 감싸는 방법은 쓸 수 없었다. 커스텀 커서(CursorTrail)가 `closest("a, button")` 로 판정하므로 판이 없는 자리까지 링크 커서로 그려졌다.

**해결**: 메시의 `onPointerDown` 과 `onPointerUp` 에서 `button === 1` 인 누름과 뗌을 같은 메시끼리 짝지어 클릭으로 처리하고, `onPointerLeave` 에서 기록을 지운다. 보조 키 클릭이나 가운데 클릭은 `window.open(href, "_blank", "noopener")` 로 연다. 키보드 사용자를 위해 초점을 받으면 보이는 링크 목록을 두고, 초점이 옮겨질 때 원통을 그 판으로 돌린다.

**결론**: 캔버스 위의 상호작용을 링크처럼 만들려면 브라우저가 링크에 기본으로 제공하는 동작(가운데 클릭, 보조 키, 키보드 초점)을 하나씩 직접 구현해야 한다. 하나라도 빠지면 접근성에 빈틈이 생긴다.


</details>
