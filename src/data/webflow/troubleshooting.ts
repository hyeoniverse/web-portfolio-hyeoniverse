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
    problem: { ko: "TypeScript useRef 타입 에러", en: "TypeScript useRef Type Error" },
    cause: {
      ko: "타이머 ID를 저장하기 위해 React의 useRef를 사용했는데, **초기값을 넣지 않았더니** TypeScript가 이 변수를 **\"읽기 전용\"으로 인식**해버렸습니다. 이후 새 값을 넣으려 하면 **\"수정할 수 없는 속성입니다\"**라는 에러가 발생했습니다.",
      en: "I used React's useRef to store a timer ID but **forgot to provide an initial value**. TypeScript then treated it as **read-only**, so when I tried to assign a new value, it threw a **\"cannot modify read-only property\"** error.",
    },
    solution: {
      ko: "**초기값(undefined)을 명시적으로 전달**했습니다. 초기값이 있으면 TypeScript가 **\"수정 가능한 변수\"로 인식**하여, 이후 자유롭게 새 값을 넣을 수 있게 됩니다.",
      en: "Added an **explicit initial value (undefined)**. With an initial value present, TypeScript recognizes it as a **\"mutable variable\"**, allowing new values to be freely assigned afterward.",
    },
    keyInsight: {
      ko: "React의 useRef는 **초기값을 넣었느냐 안 넣었느냐에 따라 동작이 달라집니다**. 값을 저장하는 용도로 쓸 때는 **반드시 초기값을 넘겨야** 나중에 수정할 수 있습니다.",
      en: "React's useRef **behaves differently based on whether you provide an initial value**. When using it to store values, you **must provide an initial value** to be able to modify it later.",
    },
  },
  {
    problem: { ko: "GSAP ScrollTrigger 수평 무한 스크롤 구현", en: "Implementing Horizontal Infinite Scroll with GSAP ScrollTrigger" },
    cause: {
      ko: "GSAP으로 가로 스크롤을 만들었지만, **스크롤할 수 있는 범위에 끝이 있어서** 끝에 도달하면 더 진행할 수 없었습니다. 위치를 순환시키는 방법도 시도했지만, 끝에 닿는 순간 **갑자기 처음으로 되돌아가는 듯한 끊김**이 보였습니다.",
      en: "I built horizontal scroll with GSAP, but the **scrollable range had a fixed end** — once you reached it, you couldn't go further. Trying to loop positions caused a **visible snap back to the start** when hitting the boundary.",
    },
    solution: {
      ko: "스크롤 가능 거리를 실제 콘텐츠 폭의 **10배로 넉넉하게** 설정한 뒤, 화면에 보이는 위치만 **콘텐츠 폭 단위로 되감아** 순환시켰습니다. 사용자는 끝에 도달할 일 없이 계속 스크롤하며, 시각적으로는 **콘텐츠가 무한히 반복**됩니다.",
      en: "Set the scrollable distance to **10 times the actual content width**, then silently **looped the visible position** within that range. Users never reach the end and keep scrolling while **content visually repeats infinitely**.",
    },
    keyInsight: {
      ko: "무한 스크롤의 핵심은 스크롤 자체를 되감는 것이 아니라, **보이는 화면만 순환**시키는 것입니다. 사용자의 스크롤 흐름을 끊지 않으면서 무한한 느낌을 줄 수 있습니다.",
      en: "The key to infinite scroll isn't resetting the scroll itself, but **looping only what's visible**. This creates an infinite feel without disrupting the user's natural scroll flow.",
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
];
