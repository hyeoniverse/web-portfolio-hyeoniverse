# Trouble Shooting: Plate 에디터

[← 전체 목차](../troubleshooting.md)

<details>
<summary><strong>44. 인라인 흐름 보존: 인라인 void 안의 div 가 커서를 막는다</strong></summary>

**문제**

Plate(Slate) 에디터에서 이미지를 인라인 void(`isInline: true, isVoid: true`)로 설정했으나, 이미지 양옆에 **클릭으로 커서를 놓거나 방향키로 이동하는 것이 불가능**하여 텍스트를 삽입할 수 없었음

**원인**

Slate의 정규화는 인라인 void 주변에 빈 텍스트 노드(zero-width space)를 자동 삽입하지만, ImageElement 내부에서 `<div>` (BlockDropZone + wrapper)가 인라인 `<span>` (PlateElement) 안에 중첩되어 있었음. **`<div>`는 블록 요소라 인라인 흐름을 깨뜨려**, 브라우저가 인접 텍스트 노드에 대한 커서 접근을 차단함

```
❌ <span display="inline">          ← PlateElement (인라인)
     <div>                          ← BlockDropZone (블록!)
       <div contentEditable={false}> ← wrapper (블록!)
         <div>                       ← hover container (블록!)
           <img />
```

**해결**

`imgLayout === "inline"`일 때 별도 렌더링 분기를 만들어 **모든 wrapper를 `<span>`으로 변경**하고 BlockDropZone을 제거함. 또한 이미지 양쪽에 absolute로 배치된 6px 너비의 `InlineCursorTarget` 컴포넌트를 추가하여, **클릭 시 `editor.api.before()`/`after()`로 커서를 정확히 배치**함

```
✅ <span display="inline">          ← PlateElement (인라인)
     <span display="inline-block">  ← 단일 wrapper (인라인!)
       <InlineCursorTarget left />  ← 클릭 → 커서 before
       <img />
       <InlineCursorTarget right /> ← 클릭 → 커서 after
```

**인사이트**

인라인 void 요소 안에 `<div>`가 들어가면 **브라우저가 인라인 흐름을 파괴**하여, Slate가 자동 삽입한 빈 텍스트 노드에 커서를 배치할 수 없게 됨. 인라인 요소 내부에는 반드시 `<span>` 등 인라인 태그만 사용해야 함


</details>

<details>
<summary><strong>45. 직렬화 round-trip: 커스텀 속성은 인코딩해야 살아남는다</strong></summary>

**문제**

2열/3열 레이아웃 블록의 **배경색, 구분선, 열 비율** 등 스타일 속성이 richtext→markdown→richtext 변환 시 모두 사라짐

**원인**

Plate의 Column 노드에는 `layout`, `columnBg`, `columnDivider` 같은 커스텀 속성이 저장되지만, HTML 직렬화 시 이 메타데이터를 보존하는 규칙이 없었음. 표준 HTML에는 열 레이아웃 개념이 없으므로, 단순 `<div>` 변환 시 **커스텀 속성이 모두 탈락**

**해결**

직렬화 시 HTML 주석으로 메타데이터를 인코딩하고, 역직렬화 시 파싱하여 복원:

```html
<!-- columns 50,50 layout=side bg=var(--bg-tertiary) divider=solid -->
<div data-column-group data-layout="side" data-column-bg="...">
  <div data-column data-width="50%">...</div>
  <div data-column data-width="50%">...</div>
</div>
```

`data-*` 속성과 HTML 주석의 이중 인코딩으로, 주석이 제거되더라도 `data-*` 속성에서 복원 가능하도록 설계

**인사이트**

표준 HTML에 없는 에디터 고유 속성은 직렬화 시 반드시 **명시적으로 인코딩**해야 round-trip이 보존됨. `data-*` 속성 + HTML 주석 이중 저장으로 강건성 확보


</details>

<details>
<summary><strong>46. 제스처 분기: 드래그와 리사이즈가 한 요소에서 겹칠 때</strong></summary>

**문제**

인라인 이미지의 리사이즈 핸들을 클릭하면, 리사이즈가 아닌 이미지 삭제(DnD 드롭)가 발생

**원인**

인라인 이미지의 `onPointerDown` 핸들러가 DnD 드래그를 시작하는데, 리사이즈 핸들 위의 클릭도 이 핸들러가 가로채서 드래그→드롭으로 처리됨

**해결**

`onPointerDown` 최상단에 `closest("[data-cursor^='resize']")` 체크를 추가하여 리사이즈 핸들 클릭 시 DnD를 비활성화. 히트박스와 시각적 핸들을 별개의 sibling 요소로 분리하여 감지 범위와 시각적 위치를 독립 조정

**인사이트**: 한 요소에 드래그와 리사이즈처럼 다른 제스처가 겹치면, 포인터가 내려온 지점에서 어느 제스처인지부터 갈라야 한다.


</details>

<details>
<summary><strong>47. z-index 와 히트테스트: 오버레이가 포인터를 가로챈다</strong></summary>

**문제**

이미지 하단 리사이즈 히트박스가 있어야 할 위치에서 마우스 커서가 리사이즈 모양으로 바뀌지 않고 감지 안 됨

**원인**

캡션 오버레이(`zIndex: 3`)가 아래쪽 리사이즈 히트박스(`zIndex: 2`) 위에 렌더링되어 포인터 이벤트를 가로챔

**해결**

히트박스의 `zIndex`를 4~5로 올려 캡션 오버레이보다 위에 위치시킴. 이미지 변 전체를 히트박스 영역으로 확장하여 Figma 스타일의 직관적인 리사이즈 UX 구현

**인사이트**: 겹쳐 놓은 오버레이의 z-index 는 포인터 히트 순서를 그대로 정한다. 시각적 쌓임과 이벤트 수신 순서를 함께 설계해야 한다.


</details>

<details>
<summary><strong>48. 스크롤 컨테이너 경계: 떠 있는 요소의 배치 판정</strong></summary>

**문제**

에디터에서 이미지에 Tooltip(크기 정보)을 표시할 때, 이미지가 에디터 영역 상단 밖으로 스크롤되면 Tooltip이 에디터 밖에 뜨거나 잘림

**원인**

Tooltip의 `auto` placement 판정이 뷰포트 상단(`rect.top < 60`)만 기준으로 판단하여, 에디터 스크롤 컨테이너의 경계를 고려하지 않음

**해결**

`measure()` 함수에서 trigger의 가장 가까운 overflow 부모(`overflow-y: auto|scroll|hidden`)를 탐색하여 스크롤 컨테이너 상단과 trigger 상단의 거리가 40px 미만이면 `bottom`으로 전환

**인사이트**: 떠 있는 요소의 배치 판정은 뷰포트 경계만이 아니라 가장 가까운 스크롤 컨테이너의 경계도 함께 봐야 한다.


</details>

<details>
<summary><strong>49. 잎 블록과 wrapper: '현재 블록' 판정은 위로 올라가야 한다</strong></summary>

**문제**

에디터에서 blockquote, code block, table 안에 커서를 놓아도 메인 툴바의 해당 버튼이 active 스타일로 바뀌지 않음

**원인**

`useBlockInfo` 훅이 `editor.api.block()`으로 가장 가까운 블록을 가져오는데, wrapper 블록(blockquote, code_block, table) 안의 자식 블록(`p`, `code_line` 등)이 먼저 반환되어 `blockType`이 `"p"`나 `"code_line"`으로 설정됨

**해결**

`blockType`이 `"p"` 또는 `"code_line"`일 때 `editor.api.above()`로 상위에 wrapper 블록이 있는지 추가 탐색. `["blockquote", "code_block", "table"]`을 순회하며 발견 시 `blockType`을 해당 타입으로 갱신

**인사이트**: 트리 구조 에디터에서 "현재 블록" 은 잎(leaf) 블록이다. wrapper 의 활성 상태는 위로 올라가며 별도로 찾아야 한다.


</details>

<details>
<summary><strong>50. 참조 정합성: 고아 노드는 역순으로 지운다</strong></summary>

**문제**

에디터에서 각주 참조(`footnote_ref`)를 삭제해도 하단의 각주 내용(`footnote_content`)이 남아있고, 반대의 경우도 동일. 고아 노드가 직렬화되어 DB에 저장됨

**원인**

각주 참조와 내용은 `footnoteId`로 연결되어 있지만, Plate의 normalizeNode는 이 관계를 인식하지 못하여 한쪽이 삭제되어도 다른 쪽이 유지됨

**해결**

별도 `useEffect` + 300ms debounce로 에디터 변경 시 전체 각주를 스캔. `footnoteId`가 매칭되지 않는 고아 노드를 역순으로 삭제하여 path shift 문제 방지. `normalizeNode` 내부에서 직접 삭제 시 `Cannot find a descendant at path` 에러가 발생하여 effect로 분리

**인사이트**: 노드 사이의 참조 정합성은 에디터가 대신 지켜 주지 않는다. 고아 노드 삭제는 역순으로 해야 path 가 밀리지 않는다.


</details>

<details>
<summary><strong>51. 한 클릭 두 의도: 링크의 이동과 편집을 가르기</strong></summary>

**문제**

에디터 안의 링크를 클릭하면 즉시 새 탭으로 이동하여, 링크 URL을 수정하거나 텍스트를 편집할 수 없음

**원인**

`LinkElement`의 `onClick`이 `window.open()`을 바로 호출하여 에디터 내 커서 배치가 불가능했음

**해결**

클릭 → `e.preventDefault()`만 수행하여 커서를 링크 안에 배치하고 링크 편집 툴바를 자동 표시. 더블클릭 → 새 탭으로 이동. 링크→링크 이동 시 깜빡임 방지를 위해 `currentLinkKey`(링크 path 기반)로 동일 링크 여부를 판단하고, `useOutsideClick` 대신 에디터 본문 클릭을 무시하는 커스텀 핸들러 적용

**인사이트**: 편집기 안의 링크는 "이동" 과 "편집" 두 의도가 한 클릭에 겹친다. 클릭과 더블클릭으로 의도를 갈라야 둘 다 산다.


</details>

<details>
<summary><strong>52. 기본값이 방어하던 것: selection affinity 오버라이드의 대가</strong></summary>

**문제**: 인라인 코드(`<code>` mark) 안에서 ArrowLeft로 두 번째 글자에서 첫 번째 글자로 이동할 때 커서가 이전 텍스트 노드로 점프

**원인**: `CodePlugin.configure({ rules: { selection: { affinity: "directional" } } })`로 Plate 기본값 `"hard"`를 덮어씀. `"hard"` affinity는 mark 경계에서 커서를 mark 안쪽에 유지하는데, `"directional"`은 브라우저 기본 동작에 위임하여 `<code>` 요소 경계에서 커서가 밖으로 점프

**해결**: affinity 오버라이드를 제거하고 Plate 기본값(`"hard"`)을 사용

```ts
// Before
CodePlugin.configure({ rules: { selection: { affinity: "directional" } } }),

// After
CodePlugin,
```

**인사이트**: 라이브러리 기본값을 덮어쓸 때는 그 기본값이 무엇을 방어하고 있었는지부터 확인해야 한다.


</details>

<details>
<summary><strong>53. 흐름 밖과 문단 안: float 이미지와 inline void 의 충돌</strong></summary>

**문제**: float 이미지를 본문 옆에 흘리면서 (1) 옆 텍스트 블록을 드래그·선택해도 이미지는 안 묶이고, (2) 이미지 위/아래에 빈 줄이 안 보이고, (3) 클릭·방향키가 보이지 않는 빈 자리에 커서를 안 떨어뜨리게 하려 했으나 이 셋이 서로 충돌

**원인**: CSS `float` 은 이미지를 흐름 밖으로 빼지만, Plate(Slate)에선 이미지가 inline void(`isInline: true, isVoid: true`)라 반드시 문단 안에 있고 양옆에 빈 텍스트(ZWSP)가 강제됨

1. 텍스트와 **같은 문단**이면 블록 드래그가 이미지+텍스트를 통째로 이동
2. **독립 문단**으로 분리하면 흐름엔 ZWSP 한 줄만 남아 빈 줄로 보임
3. 그 빈 줄을 `line-height:0` 등으로 접으면 블록이 0높이가 되며 커서·핸들이 깨지고, 다음 블록으로 덮으면 안 보이는 그 자리에 클릭·방향키로 커서가 들어가 깜빡임

**해결**: 데이터·레이아웃·입력 세 층을 함께 처리

1. **(데이터) 독립 블록화** — 변경마다 mixed 문단을 `splitNodes` 로 분리해 이미지를 자기 문단으로 → 드래그·선택이 텍스트와 독립
2. **(레이아웃) 빈 줄 가리기** — 이미지 블록을 0높이로 접는 대신 **다음 블록을 한 줄 끌어올림**(`margin-bottom: -1lh`). 이미지 블록은 그대로라 커서·핸들 정상. float wrapper 에 `z-index` 를 줘 이동 핸들이 안 가리게
3. **(입력) 빈 자리 진입 차단** — 클릭(mousedown)·방향키(keydown)를 **capture 단계**에서 가로채, 빈 자리로 갈 상황이면 이미지를 선택하거나 인접 블록으로 보냄. Slate 기본 이동보다 먼저 처리해 깜빡임 제거

**인사이트**:

① float(흐름 밖)과 inline void(문단 내 강제 텍스트)는 근본적으로 충돌 — 한 군데 수정으론 안 풀린다
② 빈 줄을 "없애는" 게 아니라 **다음 블록으로 덮고**, 그 자리에 **커서가 못 가게 막는** 조합으로 해결
③ Slate 기본 동작이 먼저 커서를 옮긴 뒤 교정하면 1프레임 깜빡임 → **capture 단계에서 선점**해야 깜빡임이 사라진다
④ inline void 의 강제 ZWSP 는 normalize 가 복원해 지울 수 없으므로, **안 보이게 + 안 닿게** 만드는 우회가 현실적


</details>

<details>
<summary><strong>54. 내부 스크롤과 sticky: fixed + spacer 로 대체하기</strong></summary>

**문제**: 에디터 상단 바(BackLink·저장·리비전 등)를 `position: sticky` 로 화면 상단에 고정하려 했으나, 스크롤해도 핀이 걸리지 않고 본문과 함께 위로 사라짐

**원인**: 에디터 본문이 `height: 60vh` + `data-lenis-prevent` 로 감싼 **내부 스크롤 영역**이라, 정작 페이지(document) 자체는 거의 스크롤되지 않음

- `position: sticky` 는 **스크롤 컨테이너가 실제로 스크롤될 때** 핀이 걸리는데, 본문 안에서 휠을 굴려도 페이지 스크롤 위치는 그대로라 sticky 가 발동할 조건이 안 생김
- 또 `scroll` 이벤트는 버블하지 않아서, 일반 listener 로는 중첩된 본문 영역의 스크롤을 잡지 못함

**해결**: sticky 를 버리고 `position: fixed` 로 직접 제어

1. **(고정) `position: fixed; top: var(--header-height)`** — 전역 Navigation 바로 아래에 항상 고정. 접힘/펼침은 `transform: translateY()` 로
2. **(flow 예약) `ResizeObserver` spacer** — fixed 라 flow 에서 빠진 만큼 본문이 위로 밀려 가려지므로, top bar 높이를 `ResizeObserver` 로 측정해 같은 높이의 `.topBarSpacer` 로 자리를 예약
3. **(스크롤 감지) capture 단계 listener** — `window.addEventListener("scroll", onScroll, true)` 로 capture 단계에서 듣고, target 이 document 면 페이지 스크롤, `HTMLElement` 면 중첩 본문 스크롤로 분기. 두 경우 모두 방향(delta)을 누적해 임계값(6px) 도달 시 접기/펼치기 토글 — 느린 스크롤도 같은 방향으로 모이면 동작

**인사이트**:

① `position: sticky` 는 "조상 중 실제로 스크롤되는 컨테이너" 가 있어야 동작 — 내부 스크롤 패턴(`60vh` + `lenis-prevent`)에선 페이지가 안 움직이므로 sticky 가 무의미
② `scroll` 이벤트는 **버블하지 않는다** → 중첩 스크롤 영역까지 한 listener 로 잡으려면 **capture 단계**(`useCapture=true`)로 들어야 함
③ `fixed` 는 flow 에서 빠지므로, 가려짐을 막으려면 spacer 로 높이를 **명시적으로 예약**해야 한다 (`ResizeObserver` 로 동기화)


</details>

<details>
<summary><strong>55. IME 와 편집 모델 격리: commit-on-blur 입력</strong></summary>

**문제**: poll/tab 블록 등 에디터 내부 폼 input 에 한글을 입력하면 조합 중인 글자가 깨지거나 사라짐

**원인**: Slate 가 IME 조합 도중에 re-render 하면 조합 상태가 끊김

**해결**: poll/tab 입력을 void element + 공용 `EditorTextInput` 로 격리

1. `EditorTextInput` 은 `contentEditable=false` + commit-on-blur 방식 — Slate 의 편집 모델 밖에서 동작해 조합 중 re-render 영향을 받지 않음
2. `onMouseDown` 에서 `nativeEvent.stopImmediatePropagation()` 으로 Slate 의 selection 처리를 차단
3. 이미지 caption 과 동일 패턴

**인사이트**: 에디터 내부의 폼 input 은 에디터의 편집 모델과 분리해야 IME 조합이 안전하다 — caption 에서 검증된 패턴을 poll/tab 에 재사용


</details>

<details>
<summary><strong>56. native drag 차단: pointer 드래그와 공존할 수 없다</strong></summary>

**문제**: 에디터 블록을 핸들로 드래그할 때 브라우저의 HTML5 native drag 가 끼어들어 커스텀 pointer 드래그가 동작하지 않음

**원인**: 핸들이 draggable 로 잡혀 있으면 브라우저가 native drag 세션을 시작하고, 그동안 pointer 이벤트 발화가 억제되어 커스텀 드래그 로직이 좌표를 받지 못함

**해결**: native drag 를 끄고 커스텀 드래그 레이어로 대체

1. `useDraggable` 의 preview 를 disable + 핸들 `draggable={false}` 로 native drag 차단
2. 커스텀 `BlockDragLayer` 가 DOM 을 복제한 고스트를 커서를 따라 그리고, 에디터 가장자리에서 자동 스크롤
3. 커서 모양은 CSS `cursor` 가 아니라 `data-cursor` 속성(CursorTrail 시스템)으로 지정

**인사이트**: pointer 기반 커스텀 드래그를 쓰려면 HTML5 native drag 를 명시적으로 꺼야 한다 — 둘이 공존하면 native 가 pointer 이벤트를 삼킨다


</details>

<details>
<summary><strong>57. IME 조합과 재렌더: 조합 중 상태 커밋 미루기</strong></summary>

**문제**: 한글 등 IME 조합 중 슬래시 메뉴/툴바 상호작용에서 첫 글자가 중복 입력.

**원인**: 조합 중 부모(에디터) 재렌더가 조합을 깨서 첫 글자가 재입력됨.

**해결**: 조합 중에는 `onOpenChange` 등 부모 상태 변경을 억제(`open` 자체는 얼리지 않음 — 검색 유지).

**인사이트**: IME 조합 중 부모 재렌더는 조합을 리셋한다 — 조합 이벤트 동안 상태 커밋을 미룬다.


</details>

<details>
<summary><strong>58. 값 타입 정규화: 숫자 노드값과 문자열 옵션</strong></summary>

**문제**: 툴바 줄간격(line-height) Select 가 제목처럼 프리셋에 없는 값(예: 1.25)에선 값을 잡지 못해 빈칸으로 보이고, 콘솔에 옵션 중복 key 경고까지 났다.

**원인**: 값의 타입이 두 겹으로 어긋났다. `setLineHeight` 는 노드에 줄간격을 **숫자**(예: `1.6`)로 저장하는데, 툴바 프리셋 옵션과 비교는 **문자열**(`"1.6"`)이라 같은 값이 옵션에 두 번 들어가 중복 key 가 났다. 게다가 감지 로직(`resolvedLineHeight`)은 DOM 계산값에서 가장 가까운 프리셋을 찾되 근접(차이 < 0.05)하지 않으면 빈 문자열을 돌려줘서, 제목 1.25 처럼 프리셋과 안 맞는 값은 아예 표시되지 않았다.

**해결**: 노드 값을 `String(...)` 으로 정규화해 문자열 프리셋과 같은 타입으로 비교·렌더하도록 해 중복 key 를 없앴고, 프리셋에 근접하지 않는 값은 그 실제 비율을 Select 옵션 맨 위에 그대로 노출해 표시하도록 했다.

**인사이트**: Slate 노드에 숫자로 저장되는 값(line-height 등)은 문자열 기반 옵션과 비교·렌더하기 전에 반드시 `String` 으로 정규화한다. 프리셋 매칭은 "근접하면 프리셋, 아니면 실제값" 두 갈래를 모두 처리해야 빈칸이 생기지 않는다.


</details>

<details>
<summary><strong>59. history 스냅숏: '방금 그 변환만' 되돌리기</strong></summary>


**문제**: 마크다운 자동변환으로 만든 불릿을 지우고 계속 Backspace 를 누르면, 글자가 지워지는 대신 불릿이 되살아나거나 커서가 다른 줄로 이동했다.

**원인**: 자동변환 직후 Backspace 를 변환 취소로 처리하는 로직이 history 를 확인하지 않고 undo 를 불렀다. 변환 뒤에 다른 편집이 끼어 있으면 undo 가 그 편집을 되돌렸다. 문단 중간에서 친 스페이스를 변환으로 오판하는 판정 버그도 겹쳤다.

**해결**: trigger 를 넣기 전 history 위치를 적어 두고, 되돌리기 직전에 history 가 변환 직후 그대로인지 확인한다. 맞으면 그 이후 연산만 역적용해 마크다운 표시를 복원하고, 아니면 평범한 Backspace 로 동작한다. 블록 맨 앞 Backspace 는 자동변환 직후가 아니어도 마크다운 표시(`- `, `## `, `> `)로 되돌린다.

**인사이트**: `editor.undo()` 는 마지막 묶음을 통째로 되돌린다. "방금 그 변환만" 되돌리려면 history 시점을 스냅숏하고 그 이후 연산을 골라 역적용해야 한다.


</details>
