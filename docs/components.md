# 주요 컴포넌트

### Pressable · Button

눌리는 것은 둘로 나뉩니다.

| | 무엇을 주나 | 언제 |
| --- | --- | --- |
| `Pressable` | 동작만 — `type="button"` · 클릭/호버 사운드 · disabled · 누를 때 축소 | 생김새가 그 자리 사정을 따르는 것 |
| `Button` | 동작 + 생김새 (`variant` `size` `tone` `shape`) | 버튼처럼 생긴 버튼 |

```tsx
<Button variant="outline" size="xs">저장</Button>
<Pressable className={styles.sidebarScrollBtn}>…</Pressable>
```

**raw `<button>` 은 쓰지 않습니다.** 사운드가 빠지고, `type` 을 빠뜨리면 폼 안에서 제출됩니다
(실제로 63곳이 그랬습니다). eslint 의 `react/button-has-type` 이 후자를 막습니다.

`Pressable` 은 브라우저 기본 스타일 리셋을 하지 않습니다 — `globals/_base.css` 가 모든
`<button>` 에 이미 하고 있어서, 여기서 또 적으면 클래스 특이도로 컴포넌트 CSS 를 덮습니다.

prop 두 개가 있습니다. `soundDisabled` 는 길게 눌러 반복되는 자리(스텝퍼·드래그 핸들),
`noTapScale` 은 `transform` 이 자리를 흔들면 안 되는 절대위치 오버레이에 씁니다.

생김새를 통일하면 **안 되는** 자리가 실제로 많습니다 — 절대위치로 깔린 클릭 영역,
부모 글꼴을 물려받는 페이지 번호, 필터 행 높이에 맞춘 탭, `::after` 로 밑줄을 그리는 칩.
이런 것을 `Button` 에 담으려고 prop 을 늘리면 `Button` 이 무너집니다. MUI 의 `ButtonBase`,
React Aria 의 `useButton` 과 같은 이유로 담당을 나눴습니다.

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

뷰포트가 브레이크포인트 경계를 넘을 때 자식을 통째로 다시 마운트하는 컴포넌트다. GSAP ScrollTrigger, RAF 애니메이션, R3F 캔버스처럼 마운트 때 크기를 읽어 두는 것들을 새 크기로 다시 초기화한다.

**경로**: `src/components/common/BreakpointGuard.tsx`

**기능**:

- 너비 1024px(`BREAKPOINT.tablet`)를 기준으로 `desktop` / `mobile`, 높이 640px 를 기준으로 `tall` / `short` 를 나눈다. 두 값을 합친 키가 바뀌면 경계를 넘은 것으로 본다.
- 경계를 넘을 때마다 자식의 `key` 를 1씩 올려 다시 마운트한다. 첫 마운트는 이미 그 뷰포트 안에서 일어났으므로 첫 effect 에서는 key 를 바꾸지 않는다.
- 다시 마운트하는 동안 불투명한 덮개를 띄우고, 정착을 기다린 뒤 걷는다. 덮개와 key 변경을 같은 렌더에서 처리해 R3F 처럼 `useLayoutEffect` 를 쓰는 라이브러리와 충돌하지 않게 한다.
- 이 컴포넌트 위의 Provider 는 다시 마운트되지 않아 상태가 유지된다.

**적용 위치**: `src/app/profile/page.tsx`

```tsx
<BreakpointGuard>
  <div className="content" data-type="mono">
    <ProfileMeSection profileData={profileData} showcase={showcase} />
    <FloatingObject />
  </div>
</BreakpointGuard>
```

위 코드는 프로필 페이지가 자식을 감싸는 모양이다. 다른 페이지는 이 컴포넌트를 쓰지 않는다.

---

### Modal (Bottom Sheet)

데스크탑에서는 가운데 대화상자, 모바일에서는 아래에서 올라오는 바텀 시트로 열리는 모달 컴포넌트다.

**경로**: `src/components/ui/Modal.tsx`

**동작**:

- 모달마다 `<dialog>` 를 두고 붙는 순간 `showModal()` 로 top layer 에 올린다. 포커스 가둠, 열기 전 자리로 포커스 되돌리기, Esc 닫기는 `<dialog>` 가 맡는다.
- 모바일에서는 아래에서 슬라이드업으로 들어온다. 닫기 버튼은 숨기고, 핸들을 끌어내리거나 바깥을 눌러 닫는다.
- 끌기는 `useSheetDrag`(`src/hooks/useSheetDrag.ts`)가 맡는다. 80px 넘게 끌어내리거나 빠르게 쓸어내리면 닫힌다. 위로 끌면 처음 높이 · 화면 높이의 50% · 75% · 내용 전체 높이 중 가까운 단계에 멈춘다.
- `ClientOverlays` 에서 전역으로 한 번 렌더한다.

---

### PostArticleView

게시물 본문(아티클)을 그리는 **presentational 컴포넌트 집합**. 공개 상세 페이지(`posts/[slug]`)와 어드민 미리보기 페이지가 **같은 컴포넌트를 공유**한다 — 미리보기가 실제 게시 화면과 1:1로 일치하고, 중복 구현이 사라진다 (single source of truth).

**경로**: `src/components/posts/PostArticleView.tsx`

**Exports**:

- `PostArticleHeader`: DetailLayout 의 `header` slot. metaRow(날짜·읽기시간·조회수·편집 / GitHub·Share·언어토글) · 제목 · 요약 · 태그 · divider
- `PostArticleBody`: DetailLayout 의 `children` slot 본문. richtext / markdown 렌더 + 코드 wrap 토글·이미지 뷰어 등 인터랙션

**기능**:

- ko/en fallback 은 호출부에서 해석해 `displayTitle / displayContent / displayExcerpt` 로 전달 — 컴포넌트는 표시값만 받음
- richtext 는 `processRichtextHtml` 로 전처리, markdown 은 `MarkdownRenderer` 사용
- `isPreview` 로 저장된 DB 레코드가 필요한 요소(좋아요/댓글 등)를 호출부에서 제외
- `headerActionsLeft` 로 미리보기 전용 액션(휴지통 복원/영구삭제 등)을 header 에 주입
- `proseViewerRef` 로 호출부의 `useProseImageViewer` 와 연결

**사용처**: `src/app/posts/[slug]/PostDetailClient.tsx` (공개 상세) + `src/app/admin/(preview)/posts/preview/page.tsx` (미리보기)

---

### WorkArticleHeader · WorkArticleInfoGrid · WorkArticleBody · WorkArticleGallery · WorkArticleTeam

작업물 상세를 그리는 presentational 컴포넌트들이다. 예전 `WorkArticleView.tsx` 한 파일을 역할마다 나눴다. PostArticleView 와 같이 공개 상세(`works/[slug]`)와 어드민 미리보기가 같은 컴포넌트를 쓴다. barrel 없이 사용처가 각 파일을 직접 import 한다.

**경로**: `src/components/works/`

| 컴포넌트 | 들어가는 자리 | 그리는 것 |
| --- | --- | --- |
| `WorkArticleHeader` | DetailLayout 의 `header` | 메타(번호 · 팀/개인 배지 · 편집 · 언어 토글) · 제목 · 설명 · 액션(Visit · GitHub · 공유 · 듣기) · 아래의 정보 그리드 |
| `WorkArticleInfoGrid` | `WorkArticleHeader` 안 | 연도 · 카테고리 · 역할 · 본인 기여 · 기술 노트 · 관련 글/시리즈 · AI 요약. 항목이 없으면 그 블록을 그리지 않는다 |
| `WorkArticleBody` | DetailLayout 의 `children` | 본문(richtext/markdown) + ImageViewer. richtext 후처리는 글 상세와 같은 `processRichtextHtml` · `useRichtextEnhance` 를 쓴다 |
| `WorkArticleGallery` | DetailLayout 의 `afterContent` | 슬라이드 갤러리. 발표 자료를 장으로 쪼갠 경우가 많아 본문 칼럼이 아니라 페이지 폭을 쓴다 |
| `WorkArticleTeam` | DetailLayout 의 `afterContent` | 팀 멤버 폴라로이드 flip 캐러셀. 공개 상세에서만 쓴다 |

공유 props · 관련 글 타입은 `workArticleTypes.ts` 에 있다.

**기능**:

- `Project` shape 하나만 받아 렌더한다. 미리보기는 `workFormToProject(form)`(`src/types/work.ts`)로 에디터 폼을 `Project` 로 바꿔 같은 컴포넌트를 쓴다.
- `isPreview` 로 편집 링크 등 DB 에 저장된 레코드가 있어야 하는 요소를 뺀다.

**사용처**: `src/app/works/[slug]/WorkDetailClient.tsx` (공개 상세) + `src/app/admin/(preview)/works/preview/page.tsx` (미리보기)

---

### AdminNotFound

어드민 편집/상세에서 항목을 찾지 못했을 때 보여주는 **중앙 정렬 "not found" 상태**. 아이콘 + 메시지 + 목록으로 돌아가는 링크.

**경로**: `src/components/admin/AdminNotFound/index.tsx`

**Props**:

| Prop        | Type     | Description              |
| ----------- | -------- | ----------------------- |
| `title`     | `string` | 표시 메시지             |
| `backHref`  | `string` | 목록 등으로 돌아갈 링크 |
| `backLabel` | `string` | 돌아가기 버튼 라벨      |

**사용처**: 어드민 posts/works 편집 페이지 (`admin/(dashboard)/posts/[id]/edit`, `.../works/[id]/edit`)

---

### StickyGlassBar

admin 목록 페이지 상단의 **공통 sticky 헤더 바**. nav 아래에 고정되며, 배경색 없이 `backdrop-filter` blur 만 쓰는 full-bleed(양옆 뷰포트 끝까지) 유리다. sentinel + scroll 로 pin 을 감지해 **pin 됐을 때만** frost 를 표시한다. 에디터 topBar 패턴에서 추출했다.

**경로**: `src/components/admin/StickyGlassBar/StickyGlassBar.tsx`

**Props**:

| Prop        | Type        | Description       |
| ----------- | ----------- | ----------------- |
| `children`  | `ReactNode` | 바 내용           |
| `className` | `string`    | 추가 CSS 클래스   |

**주의**:

- `transform` 은 `backdrop-filter` 를 깨므로 full-bleed 는 `transform` 이 아니라 margin/left-right(`-page-px`)로 뷰포트 끝까지 늘린다
- 요소 뒤 형제(행)를 blur 하려면 `::before` + `z-index: -1` 가 아니라 **요소에 직접** `backdrop-filter` 를 건다

**사용처**: 어드민 posts/works 목록 페이지

---

### MembersList · RoleBadge · ProviderChips

Settings → Account 탭의 **멤버 관리 UI 프리미티브**. `MembersList` 가 멤버 카드 목록(아바타 · 이름/이메일 · 마지막 로그인 · 대기 초대)을 렌더하고, 각 행에 `RoleBadge`(소유자/편집자/저자 역할 배지)와 `ProviderChips`(GitHub / 이메일 로그인 수단 칩)를 붙입니다. 소유자만 CRUD(초대 / 역할 변경 / 삭제)가 가능하고, 데이터는 `/api/admin/authors/members`(소유자) · `/api/admin/authors/context`(비소유자) 로 로드합니다.

대시보드 홈에도 `limit` + `hideHeader` 로 임베드되어 상위 N명 요약을 보여주며(초과 시 "외 N명" 링크 → Account 탭), 이때 각 멤버 행은 `role="button"` 으로 클릭·키보드(Enter/Space) 진입이 가능해 접근 정보(역할 · 로그인 수단 · 마지막 로그인) 위주의 `MemberDetailModal` 을 엽니다. `hideHeader` 일 땐 리스트 상단 border 를 생략해 섹션 자체 divider 와 겹쳐 2px 로 두꺼워지는 것을 막습니다. 멤버 섹션은 소유자 전용이라 비소유자면 `onResolved(false)` 로 섹션째 숨깁니다.

**경로**: `src/components/admin/MembersList.tsx`, `src/components/admin/MemberBadges.tsx` (`RoleBadge` / `ProviderChips`)

**사용처**: `admin/(dashboard)/settings` Account 탭 · admin 대시보드 홈 멤버 섹션 (둘 다 행 클릭 → MemberDetailModal, Account 탭은 MemberEditModal 연동)

---

### processRichtextHtml (util)

richtext HTML을 후처리하는 **공용 유틸**. 상세 페이지와 미리보기가 본문을 **동일하게 렌더**하도록 처리를 한곳으로 모았다.

**경로**: `src/utils/processRichtextHtml.ts`

**처리 순서**:

1. heading id 주입 (TOC 앵커)
2. iframe embed URL 변환. 예전 글에 남은 구글 문서 뷰어 주소도 지금 뷰어 주소로 바꾼다(`lib/officeViewer`)
3. 코드블록 wrap 토글 버튼에 라벨 span 삽입
4. img 에 `data-cursor="zoom"` 힌트 주입 (CursorTrail 이미지 뷰어)

신택스 하이라이팅은 여기서 하지 않는다. Shiki 가 `highlightRichtextCode` 로 따로 칠한다.

```ts
import { processRichtextHtml } from "@/utils/processRichtextHtml";

const html = processRichtextHtml(rawHtml, {
  codeScroll: t("common.codeScroll"),
  codeWrap: t("common.codeWrap"),
});
```

위 코드는 번역된 라벨 두 개를 넘겨 호출하는 예다. 버튼 라벨은 DOM 조작이 아니라 HTML 문자열 단계에서 넣는다. 리렌더가 일어나도 라벨이 사라지지 않는다.

---

### EmojiPicker

이모지·아이콘·커스텀 이미지를 고르는 **공용 picker** (개편). 값 형식은 native 이모지 / `img:url`(커스텀 업로드) / `icon:id`(SVG 아이콘) 3종.

**경로**: `src/components/ui/EmojiPicker/`

**기능**:

- lucide 에서 추출한 **아이콘 476개** (`IconEntry.svg` inner-SVG 필드 + `iconSvgInner` 헬퍼), 신규 카테고리(날씨/기기/음식/건강/도구/교육/표정/지도/도형 등)
- **한국어 검색**(`emojiKo.ts`) + emoji-mart 메타(영문 이름/키워드, `emojiMeta.ts`) + 이모지 이름 툴팁(공용 Tooltip)
- 이미지 **드래그앤드롭 업로드**, inline 스타일 → CSS 모듈(`EmojiPicker.module.css`) 전환

---

### RelatedChips

썸네일 + 제목 + 카테고리로 된 **관련 콘텐츠 칩 목록**. 더보기 토글 + hover 시 미리보기 카드.

**경로**: `src/components/ui/RelatedChips/`

**기능**:

- 칩 hover 시 미리보기 카드를 띄우는 `useHoverPreview` 훅 동봉 (`src/components/ui/RelatedChips/useHoverPreview.tsx`)
- 상세 페이지의 관련 시리즈 / 관련 게시물 노출에 사용

---

### ViewModeToggle

Footer 의 **PC / 모바일 모드 전환** 토글. viewport meta 를 오버라이드한다.

**경로**: `src/components/layout/ViewModeToggle.tsx`

**기능**:

- viewport 오버라이드는 모바일에서 "PC 버전 보기" 용으로만 유효하므로 **터치 기기(`pointer:coarse`)에서만 노출**

---

### CoverBanner

어드민 에디터의 **커버 배너** 컴포넌트.

**경로**: `src/components/admin/CoverBanner/`

---

### FloatingBar

PlateEditor 에서 **블록 선택 시 뜨는 플로팅 툴바**. 다른 블록과 인터랙션하면 닫힌다.

**경로**: `src/components/posts/plate/toolbars/FloatingBar.tsx`

---

### 발행 상태 Chip · 발행 모달 (에디터)

에디터 상단 좌측(언어 토글 옆)에 현재 **발행 상태**를 공용 `Chip`(`variant="capsule"`) 으로 표시한다. dot 색으로 구분 — 발행됨(success) / 예약 발행(warning) / 미발행(muted).

미발행 글은 별도 발행 버튼 대신 **저장 버튼 하나로 발행을 일원화**한다. 미발행 상태에서 저장을 누르면 `ModalConfirm` "지금 발행할까요?" 모달이 한 번 확인하고, `발행하기`(`onConfirm`) / `임시저장`(`onCancel`) 중 고른다. 이미 발행된 글은 모달 없이 바로 저장한다.

**경로**: `src/components/admin/AdminEditorShell/index.tsx` (chip) · `src/components/posts/PostEditor.tsx` (발행 모달)

---

### EditorTextInput

에디터 내부 폼 입력용 **IME-safe 공용 프리미티브**. `contentEditable=false` + commit-on-blur 로 한글 조합 깨짐을 막는다. (이미지 caption · poll · tab 입력에서 공유)

**경로**: `src/components/posts/plate/EditorTextInput.tsx`

---

### Collapsible

내용이 길면 접고 **더보기 / 접기** 토글을 붙이는 공용 래퍼. 긴 댓글 등에 사용.

**경로**: `src/components/ui/Collapsible.tsx`

**기능**:

- `maxHeight` 를 **넘을 때만** 접는다 — 넘지 않으면 토글 버튼도 하단 페이드도 렌더하지 않음
- 오버플로 판정은 클램프 안 된 내부 div 를 `ResizeObserver` 로 관찰 — 이미지가 늦게 로드돼 높이가 커져도 다시 잡힘
- **첫 클램프는 애니메이션 없음**: 사용자가 토글을 실제로 누르기 전까지 애니메이션을 억제해, 로드 시점에 저절로 접히는 연출을 방지
- 펼침 높이는 framer-motion `height: "auto"` 로 애니메이션, 토글은 `Button variant="ghost" size="sm" shape="capsule"`

**Props**:

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `maxHeight` | `number` | (필수) | 이 높이(px)를 넘을 때만 접는다 |
| `expandLabel` | `ReactNode` | (필수) | 펼치기 라벨 |
| `collapseLabel` | `ReactNode` | (필수) | 접기 라벨 |
| `children` | `ReactNode` | (필수) | 대상 콘텐츠 |

---

### HelpButton

`?` 원형 도움말 버튼 통일 래퍼. Popover / Tooltip 트리거로 쓴다.

**경로**: `src/components/ui/HelpButton.tsx`

**기능**:

- `Button variant="subtle" shape="circle"` + `?` 를 고정 — `variant` / `shape` / `children` 은 의도적으로 override 불가, **`size` 만 시각 조절 knob**
- 나머지 props 는 Button 으로 그대로 spread (Popover/Tooltip 이 트리거에 주입하는 핸들러 통과)
- `forwardRef`: 트리거 anchor 측정 가능

**Props**:

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `size` | `"2xs" \| "xs" \| "sm" \| "md" \| "lg" \| "xl"` | `"sm"` | 기본 28px. 폼 라벨 옆처럼 좁은 자리는 `2xs`(20px) / `xs`(24px) |
| `className` | `string` | - | **배치용만**: 색·보더·radius·padding override 금지 (필요하면 부모 래퍼로) |
| `soundDisabled` | `boolean` | - | 클릭 사운드 비활성 |

---

### PageTitle

posts 계열 페이지의 공용 대형 타이틀(`<h1>`).

**경로**: `src/components/ui/PageTitle.tsx`

**Props**:

| Prop | Type | Description |
| ---- | ---- | ----------- |
| `icon` | `ReactNode` | 왼쪽 아이콘 (lucide 등). 크기는 타이틀 font-size 에 `em` 비례로 자동 스케일 |
| `children` | `ReactNode` | 타이틀 텍스트 |
| `className` | `string` | 추가 CSS 클래스 |

> `"use client"` 없음 — 서버 컴포넌트.

---

### SpinButton

**long-press 가속 반복** 버튼. NumberInput 의 스테퍼가 사용한다.

**경로**: `src/components/ui/SpinButton.tsx`

**기능**:

- pointerDown 시 **즉시 1회** 발화 → 380ms 홀드 후 반복 시작, 간격이 130ms 에서 tick 마다 12ms 씩 줄어 **최소 28ms** 까지 가속
- `setPointerCapture`: 버튼 밖에서 손을 떼도 정지. pointerUp / pointerCancel / lostPointerCapture / unmount 에서 모두 stop
- 마우스는 `e.button === 0` 만 반응, 최신 action 을 ref 로 들고 있어 반복 tick 이 stale 되지 않음
- `type="button"` + `tabIndex={-1}`: 스테퍼가 탭 순서를 오염시키지 않음

**Props**:

| Prop | Type | Description |
| ---- | ---- | ----------- |
| `onStep` | `() => void` | (필수) 1 스텝 동작 |
| `children` | `ReactNode` | (필수) 아이콘 등 |
| `className` | `string` | 추가 CSS 클래스 |
| `ariaLabel` | `string` | 접근성 라벨 (camelCase prop) |

---

### portalContainer (context)

오버레이(모달) **안에서 열린 팝오버가 그 오버레이 위에 쌓이도록** portal 대상을 내려주는 컨텍스트. 전역 z-index 를 키우지 않는 top-layer 방식.

**경로**: `src/components/ui/portalContainer.ts`

```ts
export const PortalContainerContext = createContext<HTMLElement | null>(null);
export const usePortalContainer = () => useContext(PortalContainerContext);
```

**동작**:

- `Modal` 이 `.portalLayer` div 를 렌더하고 그 element 를 Provider 로 하위 트리에 내려준다
- 소비자는 `usePortalContainer() ?? document.body` 로 portal 대상 결정 — 오버레이 밖에서는 기존대로 body
- 소비처: `Popover` · `Select` · `Tooltip` · `DatePickerPopover` · `TimePickerPopover`

**기술 결정**:

- `.portalLayer` 는 모달 패널의 **자식이 아니라 형제**: 패널의 `transform` 이 containing block 이 되면 fixed 좌표가 어긋나므로, `inset: 0` backdrop 쪽에 붙인다
- ref setter 는 modal id 별로 `Map` 에 캐시 — 렌더마다 새 화살표 함수를 주면 cleanup/mount 무한 루프("Maximum update depth")

---

### 공통 컴포넌트의 선택 prop

| 컴포넌트 | prop | 내용 |
| -------- | ---- | ---- |
| `Popover` | `variant` | `"glass"`(기본) / `"solid"` / `"difference"`. `solid` 는 modifier 클래스 없이 base `.dropdown` 자체 |
| `Popover` | `openOnHover` | 기본 `false`, 데스크탑 전용(sheet 모드에선 무시). 열림은 즉시, 닫힘은 500ms 지연(트리거↔콘텐츠 이동 구간 유지). 모듈 레벨 플래그로 **hover popover 는 동시에 1개만** |
| `Button` | `tone="accent"` | `tone: "default" \| "danger" \| "success" \| "accent"` |
| `Modal` | `header.actions` | 헤더 우측 액션 영역 (`ReactNode`, 닫기 버튼 왼쪽) |
| `Modal` | `subButtons` | 닫기(X) 버튼 바로 왼쪽 서브 버튼 (뒤로/앞으로 등) |
| `Toast` | `pauseAllToasts` / `resumeAllToasts` | 토스트 하나에 hover 하면 **스택 전체 정지**: 재배치로 커서가 벗어나 사라지는 것 방지 |
| `NumberInput` | `unit` | `ReactNode`. 우측 단위(`px`, `%`) 표시. 텍스트가 **실제로 말줄임될 때만** Tooltip 활성 |
| `NumberInput` | `gauge` | 기본 `false`. `min`·`max` 가 둘 다 있을 때만 동작, 값 위치를 숫자 색(낮음/중간/높음)으로 표시 (바는 그리지 않음) |
| `Textarea` | `tabIndent` | opt-in. Tab 으로 2칸 공백 들여쓰기 — `execCommand("insertText")` 로 native undo 스택 보존, IME 조합 중 skip, Shift+Tab 은 native 포커스 이동 유지. **`maxHint` 가 설정된 EditableTextarea 모드에서만** 동작 |
| `Select` | (viewport clamp) | 선택 항목 중앙을 트리거 중앙에 맞춘 뒤 여백 8px 로 뷰포트 안에 clamp, 자연 높이가 가용 높이를 넘을 때만 `max-height` 부여. 외부 스크롤 시 재배치가 아니라 **닫음** |
| `Select` | `editable` + `editableInputProps` | 프리셋 밖 값을 **직접 입력**. 트리거를 더블클릭하면(250ms 안 두 번 클릭) input 으로 바뀌어 타이핑 후 `Enter`/blur 로 commit, `Escape` 로 취소. `editableInputProps.sanitize` 로 commit 직전 정규화(예: 숫자만), `maxLength`/`placeholder` 지정. `value` 가 비어 있으면 mount 시 입력 모드부터 시작. 에디터 툴바의 글꼴 크기·줄간격·자간이 사용하며, 프리셋에 없는 현재 값은 목록 맨 위 옵션으로 노출한다. (드롭다운 상단 입력행이 필요한 검색형은 별도 `combobox` 모드) |
| `ModalConfirm` | `children` | 선택. `desc` 뒤에 렌더한다. 확인 전에 **무엇이 바뀌는지 목록으로** 보여 줄 때 쓴다 |
| `ModalConfirm` | `onCancel` | 선택(하위호환). **취소 버튼에 동작**을 부여 — 미지정이면 단순 close. X/esc/backdrop 은 항상 단순 close 로 유지. 에디터의 "발행 여부" 모달이 취소 버튼을 '임시저장' 으로 쓴다 |
| `TagNotesEditor` | `renderEditPopover` | 선택 `(item, close) => ReactNode`. 제공 시 각 chip 의 편집 트리거를 공용 `Popover` 로 감싸 편집 UI 를 chip 옆 팝오버로 띄운다(열림은 `activeItem` 로 제어). 하위호환 — 미제공 시 기존 인라인 drawer 동작. 설정 > Content 의 태그·카테고리·작품 카테고리 에디터가 하단 고정 편집 박스 대신 이 팝오버 편집을 쓴다 |

---

## 공용 UI 컴포넌트 (design-system.md 에서 이관)

> 스타일 규칙(토큰·네이밍)이 아니라 컴포넌트 사용법이므로 이 문서로 옮겼다.

### SearchCapsule (`src/components/ui/SearchCapsule/`)

캡슐형 검색 입력. 정렬 · 태그 캡슐과 높이를 맞춰 한 줄에 같이 놓는다. 검색 이력 드롭다운과 검색 문법 도움말을 함께 갖고 있다.

- **높이**: `size` 가 `md`(기본, `--control-height-md` 32px) 또는 `sm`(`--control-height-sm` 28px)이다. Select · 일반 입력칸과 같은 토큰을 쓴다.
- **`typeSelector`**: `{ value, options, onChange }` 를 넘기면 왼쪽에 검색 범위 Select(예: 제목 / 본문)가 붙는다. 셋을 한 객체로 받아 "셋 다 있거나 하나도 없거나"를 타입으로 강제한다.
- **이력**: `historyKey` 마다 최근 검색어를 저장한다(기본은 지금 경로, `null` 이면 끈다). `hasResults` 가 `true` 이고 검색어가 1초 동안 그대로면 이력에 넣는다.
- **`routeParam`**: 이름을 주면(예: `"q"`) 검색어를 `?q=` 에 맞춘다.
- **`collapsible`**: 원형으로 접혀 있다가 누르면 `expandedWidth`(기본 280px)로 펼쳐지고, 비운 채 포커스를 잃으면 다시 접힌다.

```tsx
<SearchCapsule
  search={query}
  onSearchChange={setQuery}
  placeholder={t("posts.searchPlaceholder")}
  typeSelector={{ value: searchType, options: searchTypeOptions, onChange: setSearchType }}
  routeParam="q"
/>
```

위 코드는 검색 범위 Select 와 주소 동기화를 함께 켠 예다.

### `<T>`: 번역 말풍선 + 설명

`<T>` 는 지금 언어의 글을 보여 주고, 오래 올려 두면(기본 `delay` 600ms) 반대 언어 글을 말풍선으로 띄운다. `tooltip` prop 을 주면 짧은 설명이 같은 말풍선에 한 줄 더 붙는다.

```tsx
import T from "@/components/ui/T";

<T k="postsPage.sortDate" tooltip={t("postsPage.sortDateTooltip")} />
<T ko="최신순" en="Latest" />
```

위 코드의 첫 줄은 번역 키로, 둘째 줄은 두 언어 글을 직접 넘겨 쓰는 예다.

- `k` 와 `ko`/`en` 중 하나만 받는다. 섞거나 둘 다 빼면 타입 오류다.
- 두 언어 글이 같고 `tooltip` 도 없으면 말풍선 없이 글만 그린다. 바깥에 Tooltip 이 따로 있으면 `noTooltip` 으로 끈다.
- 캡슐 버튼 · 아이콘만 있는 트리거 · 줄인 라벨처럼 보기만으로 뜻이 바로 오지 않는 자리에 쓴다.

### 정렬 컨트롤 (`/posts`)

`/posts` 의 정렬은 `SegmentedControl` 한 줄이다(`src/app/posts/_components/PostsToolbar/PostsToolbar.tsx`).

- 최신순 · 인기순 · 제목순(저자가 둘 이상이면 저자순) 항목을 둔다. 같은 항목을 다시 누르면 방향(asc / desc)이 바뀌고, `sortDir` prop 이 방향 화살표를 그린다.
- 인기순에는 `subItems`(종합 · 조회 · 댓글 · 좋아요)가 있다. `subVariant="nested"` 라 인기순을 고르면 다른 항목이 접히고 하위 항목이 펼쳐진다.
- 랜덤은 방향이 없어 정렬 항목에 넣지 않는다. 옆의 원형 Shuffle 버튼이 맡고, 누를 때마다 새 시드로 다시 섞는다. 서버(`/api/posts?sort=random&seed=`)는 mulberry32 로 섞어 같은 시드면 같은 순서를 돌려준다. 그래서 페이지를 넘겨도 순서가 흔들리지 않는다.

### MenuDots (`src/components/ui/MenuDots/`)

3×3 = 9개의 점으로 된 **메뉴 아이콘**. 열리면 점이 X 로 모인다. 처음에는 Navigation 메뉴 버튼과 설정 탭바 토글이 같은 모양을 쓰도록 만들었다. 지금 이 컴포넌트를 쓰는 곳은 `/design-system` 데모뿐이다.

- 상태만 받는 프레젠테이션 컴포넌트다. `open`(점이 X 로 모임) · `closing`(모였다가 다시 펼쳐지는 중) · `size`(px, 생략하면 12px)를 받는다.
- 색과 트랜지션은 CSS Module 이 맡고, 크기는 `--_size` 지역 변수로 넣는다.
- `aria-hidden` 이다. 뜻은 감싸는 버튼의 `aria-label` 이 전한다.

```tsx
<Pressable aria-label={t("nav.menu")} aria-expanded={open}>
  <MenuDots open={open} size={16} />
</Pressable>
```

위 코드는 버튼 안에 아이콘만 넣고 상태를 내려주는 예다.

---
