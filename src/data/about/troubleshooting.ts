import type { TroubleShootingItem } from "./types";

export const troubleShootingItems: TroubleShootingItem[] = [
  {
    problem: { ko: "Lenis Scroll Velocity 효과 미작동", en: "Lenis Scroll Velocity Effect Not Working" },
    cause: {
      ko: "스크롤 속도에 따라 요소가 기울어지는 효과를 만들려 했습니다. 매 화면 갱신마다 스크롤 위치를 직접 읽어 속도를 계산했는데, **값이 들쑥날쑥하며 애니메이션이 떨리는 현상**이 발생했습니다. 원인은 스크롤 라이브러리(Lenis)가 내부적으로 **움직임을 부드럽게 가공**하고 있어서, 외부에서 읽은 값과 **타이밍이 어긋났기 때문**이었습니다.",
      en: "I wanted elements to tilt based on scroll speed. I manually read the scroll position every frame and calculated velocity myself, but the values were erratic and **animations jittered**. The cause: the scroll library (Lenis) internally **smooths out the movement**, so the values I read externally were **out of sync** with what Lenis was actually doing.",
    },
    solution: {
      ko: "직접 계산하는 방식을 버리고, **Lenis가 제공하는 스크롤 이벤트**에서 속도 값을 가져오도록 바꿨습니다. 라이브러리가 이미 정확하게 계산해 놓은 값을 그대로 사용하니 **떨림 없이 부드러운 애니메이션**이 구현되었습니다.",
      en: "Instead of calculating velocity myself, I switched to using the **scroll event provided by Lenis** and read the speed value it already computed. Using the library's own accurate values resulted in **smooth, jitter-free animations**.",
    },
    keyInsight: {
      ko: "라이브러리가 이미 계산해 놓은 값이 있다면, 같은 걸 직접 다시 계산하기보다 **라이브러리가 제공하는 값을 그대로 쓰는 것**이 항상 더 정확합니다.",
      en: "If a library already computes a value internally, **using the value it provides** is always more accurate than trying to recalculate the same thing yourself.",
    },
  },
  {
    problem: { ko: "Framer Motion transform과 CSS transform 충돌", en: "Framer Motion Transform Conflicts with CSS Transform" },
    cause: {
      ko: "CSS의 transform 속성으로 요소를 화면 중앙에 배치한 상태에서, 애니메이션 라이브러리(Framer Motion)로 스크롤 효과를 추가했습니다. 그런데 라이브러리가 **같은 transform 속성을 덮어써버려서**, 중앙 배치 설정이 사라지고 **요소가 엉뚱한 위치로 튀어나갔습니다**.",
      en: "I centered an element using CSS's transform property, then added a scroll animation with Framer Motion. But the library **overwrote the same transform property**, erasing the centering and causing the **element to jump to an unexpected position**.",
    },
    solution: {
      ko: "중앙 배치 방식을 transform 대신 **margin으로 변경**했습니다. transform 속성을 **애니메이션 전용으로 비워두면서도** 화면 중앙 배치를 유지할 수 있었습니다.",
      en: "Changed the centering method from transform to **margin-based positioning**. This keeps transform **reserved exclusively for animations** while still centering the element visually.",
    },
    keyInsight: {
      ko: "CSS 속성과 애니메이션 라이브러리가 **같은 속성을 동시에 사용하면 충돌**합니다. 위치 잡기와 움직임 효과는 **서로 다른 속성으로 분리**해야 안전합니다.",
      en: "When CSS and an animation library try to control **the same property, they conflict**. Positioning and motion effects should use **separate properties** to avoid interference.",
    },
  },
  {
    problem: { ko: "CSS Module 해시 충돌로 데스크톱 레이아웃 붕괴", en: "CSS Module Hash Collision Collapsing Desktop Layout" },
    cause: {
      ko: "About 페이지의 각 패널은 **공유 CSS Module과 로컬 CSS Module을 `{ ...shared, ...local }`로 병합**하여 사용합니다. ProcessPanel의 `.processBody`는 공유 CSS에서 `display: contents`로 정의되어 있었는데, 로컬 CSS에서 **모바일 미디어 쿼리 안에서만** 같은 이름의 클래스를 정의했습니다. 문제는 CSS Module이 **파일별로 다른 해시를 생성**하기 때문에, 스프레드 병합 시 **로컬 해시가 공유 해시를 덮어써** 데스크톱에서 `display: contents`가 적용되지 않은 것이었습니다.",
      en: "About page panels merge shared and local CSS Modules via `{ ...shared, ...local }`. ProcessPanel's `.processBody` was defined as `display: contents` in shared CSS, but local CSS only defined the **same class name inside a mobile media query**. Since CSS Modules generate **different hashes per file**, the spread merge caused the **local hash to override the shared hash**, losing `display: contents` on desktop.",
    },
    solution: {
      ko: "로컬 CSS 파일에 **미디어 쿼리 바깥에서도 `.processBody { display: contents }`를 명시적으로 선언**하여, 로컬 해시가 적용되더라도 데스크톱에서 올바른 스타일이 유지되도록 했습니다.",
      en: "Added an **explicit `.processBody { display: contents }` rule outside the media query** in the local CSS file, ensuring the correct style is maintained on desktop even when the local hash takes over.",
    },
    keyInsight: {
      ko: "`{ ...shared, ...local }` 패턴에서 **같은 클래스명이 양쪽에 존재하면 로컬이 무조건 이깁니다**. 로컬에서 미디어 쿼리 안에서만 정의해도 해시 자체가 달라지므로, **데스크톱 기본 스타일까지 로컬에 복제**해야 합니다.",
      en: "In the `{ ...shared, ...local }` pattern, **if the same class name exists in both, local always wins**. Even defining it only inside a media query changes the hash, so you must **replicate the desktop default style in local CSS** too.",
    },
  },
  {
    problem: { ko: "글로벌 transition shorthand가 컴포넌트 전환 효과를 덮어씀", en: "Global Transition Shorthand Overriding Component Transitions" },
    cause: {
      ko: "테마 전환을 위해 `html[data-theme-ready] *`에 **transition shorthand**를 걸어 `background-color, border-color, color` 등을 부드럽게 전환했습니다. 그런데 이 선택자의 특이성이 `(0,1,1)`로, 단일 클래스 `(0,1,0)`보다 높아서 **컴포넌트의 `max-height`, `opacity`, `transform` 전환이 모두 무시**되었습니다. `transition`이 shorthand이기 때문에 **값을 통째로 교체**한 것이 원인이었습니다.",
      en: "For theme switching, I set a **transition shorthand** on `html[data-theme-ready] *` to smoothly transition `background-color, border-color, color`, etc. But its specificity `(0,1,1)` beats single-class selectors `(0,1,0)`, and since `transition` is a shorthand, it **completely replaced** component-level transitions for `max-height`, `opacity`, `transform`, etc.",
    },
    solution: {
      ko: "컴포넌트에서 글로벌 규칙을 이길 수 있도록 **복합 선택자 `(0,2,0)`**을 사용했습니다. `.parent .child { transition: ... }` 형태로 특이성을 올려 글로벌 shorthand를 안전하게 오버라이드합니다.",
      en: "Used **compound selectors `(0,2,0)`** in components to outweigh the global rule. Patterns like `.parent .child { transition: ... }` safely override the global shorthand.",
    },
    keyInsight: {
      ko: "CSS `transition` shorthand는 **나열하지 않은 속성의 전환까지 초기화**합니다. 글로벌에 `*` 전환을 걸 때는 shorthand 대신 **`transition-property, transition-duration`을 개별 지정**하거나, 컴포넌트 쪽 특이성을 반드시 높여야 합니다.",
      en: "CSS `transition` shorthand **resets transitions for unlisted properties too**. When applying `*` transitions globally, either use **individual `transition-property` and `transition-duration`** instead of shorthand, or ensure component selectors have higher specificity.",
    },
  },
  {
    problem: { ko: "reCAPTCHA v3 초기 로드 성능 저하 (LCP 17.1s, TTI 18.2s)", en: "reCAPTCHA v3 Initial Load Performance Degradation (LCP 17.1s, TTI 18.2s)" },
    cause: {
      ko: "공식 문서대로 보안 스크립트(reCAPTCHA)를 앱 시작 시 바로 불러왔더니, 페이지를 열자마자 **784KB짜리 파일이 다운로드**되었습니다. 이 파일이 다른 작업을 막으면서 **페이지가 화면에 표시되기까지 17초**나 걸리게 되었습니다.",
      en: "Following official docs, I loaded the security script (reCAPTCHA) immediately on app start, which caused a **784KB file to download right away**. This blocked other work and pushed the **page display time to 17 seconds**.",
    },
    solution: {
      ko: "보안 스크립트를 처음부터 불러오지 않고, **사용자가 처음 클릭하거나 터치하는 시점**에 불러오도록 변경했습니다. 또한 Google 서버와의 **연결을 미리 준비**해 두어 실제 로드 시 더 빨라지도록 했습니다.",
      en: "Instead of loading the security script upfront, it now loads **when the user first clicks or touches the page**. I also **pre-established the connection** to Google's server so the actual load is faster when needed.",
    },
    keyInsight: {
      ko: "외부 스크립트는 **\"지금 당장 필요한가?\"를 먼저 따져야** 합니다. 당장 안 쓰는 무거운 파일을 처음부터 불러오면, 정작 사용자가 보는 화면이 수 초씩 늦어집니다.",
      en: "Always ask **\"is this needed right now?\"** before loading external scripts. Loading heavy files upfront that aren't immediately needed **delays what the user actually sees** by several seconds.",
    },
  },
  {
    problem: { ko: "미사용 폰트로 인한 리소스 낭비 (폰트 19파일, 페이지 1,489KB)", en: "Resource Waste from Unused Fonts (19 Files, 1,489KB Page Weight)" },
    cause: {
      ko: "글꼴을 **9종류 등록**해 두었는데, 실제로 사용하는 건 **5종류뿐**이었습니다. 나머지 4종류는 디자인 실험 때 추가한 뒤 지우지 않은 것이었습니다. Next.js는 **등록만 해도 파일을 포함**시키기 때문에, 쓰지도 않는 **12개의 글꼴 파일**이 매번 다운로드되고 있었습니다.",
      en: "I had **9 font families** registered, but only **5 were actually in use**. The other 4 were leftover from design experiments. Since Next.js **includes font files just by registering them**, **12 unused font files** were being downloaded every time.",
    },
    solution: {
      ko: "사용하지 않는 글꼴 **4종류를 제거**(12파일 절약)하고, 한 글꼴의 굵기 옵션도 **7개에서 실제 쓰는 5개로** 줄였습니다. 또한 글꼴이 로딩되는 동안에도 **텍스트가 먼저 표시**되도록 설정했습니다.",
      en: "Removed **4 unused font families** (12 files saved) and reduced weight variations from **7 to the 5 actually used**. Also ensured **text appears immediately** while fonts are still loading.",
    },
    keyInsight: {
      ko: "Next.js에서는 글꼴을 **등록하기만 해도 자동으로 다운로드**됩니다. 안 쓰는 글꼴이 쌓이지 않도록 주기적으로 정리해야 합니다. 이 정리만으로 **성능 점수가 60에서 98로**, 페이지 용량이 **70% 줄었습니다**.",
      en: "In Next.js, **registering a font means it gets downloaded** automatically. Unused fonts should be cleaned up regularly. This cleanup alone improved the **performance score from 60 to 98** and reduced page weight by **70%**.",
    },
  },
  {
    problem: { ko: "Works 가로 갤러리 양방향 무한 스크롤", en: "Bidirectional Infinite Scroll for Works Horizontal Gallery" },
    cause: {
      ko: "프로젝트 카드를 10세트 복제하여 가로로 나열했지만, 아무리 많이 복제해도 **양쪽 끝은 존재**합니다. 끝에 도달하면 빈 화면이 보여서, 진정한 무한 스크롤이 아닌 **\"아주 긴 유한 스크롤\"**에 불과했습니다.",
      en: "I duplicated project cards into 10 sets, but no matter how many copies, there are still **two ends**. Reaching either end showed empty space — it was just a **\"very long finite scroll\"**, not truly infinite.",
    },
    solution: {
      ko: "카드 한 세트의 **정확한 폭을 계산**한 뒤, 스크롤 위치가 세트 경계를 넘을 때마다 **한 세트 폭만큼 되감아** 순환시킵니다. 사용자 눈에는 끊김 없이 **양방향으로 무한히 스크롤**되는 것처럼 보입니다.",
      en: "After **calculating the exact width of one card set**, whenever the scroll crosses a set boundary, the position is **rewound by exactly one set width**. To the user, it looks like **seamless infinite scrolling** in both directions.",
    },
    keyInsight: {
      ko: "무한 스크롤은 콘텐츠를 끝없이 복제하는 것이 아니라, 한정된 콘텐츠 위에서 **보이는 위치만 되감는 것**입니다. **3세트면 충분**하고, 나머지는 계산이 해결합니다.",
      en: "Infinite scroll doesn't mean duplicating content forever — it means **rewinding the visible position** over a finite set. **Three sets are enough**; math handles the rest.",
    },
  },
  {
    problem: { ko: "언어 전환 시 Works 인트로 레이아웃 시프트", en: "Layout Shift in Works Intro on Language Switch" },
    cause: {
      ko: "한국어와 영어는 같은 뜻이라도 **글자 수가 크게 다릅니다**. 언어를 바꾸면 텍스트의 줄 수가 달라지면서 높이가 변하고, **주변 요소들이 갑자기 위아래로 밀려나는 현상**이 발생했습니다.",
      en: "Korean and English have **very different character counts** for the same meaning. Switching languages changes the number of lines, altering height and causing **surrounding elements to suddenly jump up or down**.",
    },
    solution: {
      ko: "텍스트 영역에 **두 언어 중 더 긴 쪽에 맞춰 최소 높이를 고정**해 두어, 어떤 언어든 같은 공간을 차지하도록 했습니다. 모바일에서는 세로 스크롤이라 밀림이 눈에 띄지 않으므로 **높이 고정을 해제**했습니다.",
      en: "Each text area was given a **fixed minimum height matching the taller language**, so both languages occupy the same space. On mobile, where vertical scrolling makes shifts less noticeable, the **height lock is removed**.",
    },
    keyInsight: {
      ko: "여러 언어를 지원하는 화면에서는 **가장 긴 언어에 맞춰 공간을 미리 확보**해 두는 것이 레이아웃 안정성의 핵심입니다.",
      en: "In multilingual interfaces, the key to stable layouts is **reserving space based on whichever language takes up the most room**.",
    },
  },
  {
    problem: { ko: "mousemove마다 React 리렌더 (60fps 성능 저하)", en: "React Re-render on Every mousemove (60fps Performance Degradation)" },
    cause: {
      ko: "Works 섹션의 마우스 반발 효과가 **mousemove마다 React state를 업데이트**하고 있었습니다. 마우스를 움직일 때마다 **초당 60번의 setState 호출**이 발생하고, 매번 WorksSection 전체(25개 이상의 그리드 아이템)가 **다시 그려졌습니다**. 이로 인해 마우스를 움직이는 동안 메인 스레드가 계속 바빴습니다.",
      en: "The mouse repulsion effect in the Works section was **updating React state on every mousemove**. This caused **~60 setState calls per second**, each triggering a full re-render of WorksSection with 25+ grid items. The main thread stayed busy the entire time the mouse was moving.",
    },
    solution: {
      ko: "React state 대신 **useRef로 오프셋 값을 저장**하고, 별도의 **requestAnimationFrame 루프에서 lerp 보간 후 DOM의 style.transform을 직접 수정**하는 방식으로 변경했습니다. React는 이 변화를 전혀 인지하지 못하므로 **리렌더가 발생하지 않습니다**.",
      en: "Replaced React state with **useRef for offset storage** and a separate **requestAnimationFrame loop that applies lerp-smoothed values directly via style.transform**. React is completely unaware of these changes, so **zero re-renders occur**.",
    },
    keyInsight: {
      ko: "초당 수십 번 변하는 값(마우스 위치, 스크롤 오프셋 등)은 **React state로 관리하면 안 됩니다**. 화면에 반영만 하면 되는 값은 **ref + 직접 DOM 조작**이 훨씬 효율적입니다.",
      en: "Values that change dozens of times per second (mouse position, scroll offsets) **should never be React state**. When you only need visual output, **ref + direct DOM manipulation** is far more efficient.",
    },
  },
  {
    problem: { ko: "Framer Motion/GSAP 무한 반복 애니메이션의 메인 스레드 점유", en: "Framer Motion/GSAP Infinite Animations Occupying the Main Thread" },
    cause: {
      ko: "Hero 섹션의 타원 회전(Framer Motion `animate={{ rotate: 360 }}`)과 마퀴 스크롤(GSAP `repeat: -1`)이 **JavaScript의 requestAnimationFrame으로 실행**되고 있었습니다. 단순한 회전이나 이동임에도 **매 프레임마다 JS 코드가 실행**되어, 다른 인터랙션이 있을 때 **프레임 드롭**이 발생할 수 있었습니다.",
      en: "The Hero oval rotation (Framer Motion `animate={{ rotate: 360 }}`) and marquee scroll (GSAP `repeat: -1`) were running via **JavaScript's requestAnimationFrame**. Despite being simple rotation/translation, they required **JS execution every frame**, potentially causing **frame drops** during other interactions.",
    },
    solution: {
      ko: "두 애니메이션 모두 **CSS `animation` 속성으로 전환**했습니다. `@keyframes spin { to { transform: rotate(360deg) } }`와 `@keyframes marquee { to { transform: translateX(-50%) } }`로 구현하면, 브라우저의 **컴포지터 스레드에서 실행**되어 메인 스레드를 전혀 차단하지 않습니다.",
      en: "Converted both animations to **CSS `animation` property**. Using `@keyframes spin` and `@keyframes marquee`, the browser runs these on the **compositor thread**, completely freeing the main thread.",
    },
    keyInsight: {
      ko: "transform과 opacity만 사용하는 단순 반복 애니메이션은 **항상 CSS animation이 더 효율적**입니다. JS 애니메이션 라이브러리는 **물리 시뮬레이션이나 조건부 로직이 필요한 경우에만** 사용하는 것이 좋습니다.",
      en: "For simple repeating animations using only transform and opacity, **CSS animation is always more efficient**. JS animation libraries should only be used when **physics simulation or conditional logic is needed**.",
    },
  },
];
