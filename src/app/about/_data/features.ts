/* About 개편 — 기능 장. 설명은 README 의 미리보기 · 관리자 · CMS 절에서, 화면은 README 가 쓰는 캡처
   (public/images/screenshots/pc · cms)에서 가져왔다. 데모는 실제 코드의 데이터 · 규칙을 쓴다(각 장면 컴포넌트 주석).
   방향이 정해지면 관리자 About 편집으로 옮긴다. */
import type { L10n } from "./showcase";

export interface FeatureShot {
  label: L10n;
  src: string;
  /** 다크 테마일 때 바꿔 보여 줄 캡처(있을 때만) */
  srcDark?: string;
  /** 움직이는 장면 — 화면에 보이는 동안만 소리 없이 재생 */
  video?: boolean;
}

export interface FeatureItem {
  title: L10n;
  body: L10n;
  points: L10n[];
  shots: FeatureShot[];
}

const PC = "/images/screenshots/pc";
const CMS = "/images/screenshots/cms";

export const featuresChapter = {
  eyebrow: { ko: "02 — 기능", en: "02 — Features" } satisfies L10n,
  title: {
    ko: "보는 화면과 쓰는 화면, 둘 다 직접 만들었습니다.",
    en: "Both sides — the pages you read and the tools that write them.",
  } satisfies L10n,
  note: {
    ko: "스크롤만으로 끝까지 훑을 수 있습니다. 데모는 직접 눌러 볼 수도 있습니다.",
    en: "Scroll to see everything. The demos also respond to clicks.",
  } satisfies L10n,
};

/* ── 장면 1 · 공개 화면 — 가로로 흐르는 큰 화면 카드 ── */

export const publicScene = {
  label: { ko: "공개 화면", en: "Public site" } satisfies L10n,
  title: { ko: "읽는 사람이 보는 곳", en: "Where readers land" } satisfies L10n,
  cards: [
    {
      title: { ko: "스크롤에 반응하는 홈", en: "A home that answers the scroll" },
      body: {
        ko: "끝까지 내리면 처음으로 이어지는 무한 스크롤 루프, 마우스 패럴랙스, Three.js 토러스 · 커피잔.",
        en: "An infinite scroll loop, mouse parallax, and a Three.js torus and coffee cup.",
      },
      shot: { src: `${PC}/home-light.png`, srcDark: `${PC}/home-dark.png` },
    },
    {
      title: { ko: "글과 시리즈", en: "Posts and series" },
      body: {
        ko: "SSR + ISR, 시리즈 · 배너 슬라이더 · 여섯 가지 목록 레이아웃.",
        en: "SSR + ISR, series, a banner slider and six list layouts.",
      },
      shot: { src: "/images/about/showcase/posts-list-light.jpg", srcDark: "/images/about/showcase/posts-list-dark.jpg" },
    },
    {
      title: { ko: "상세 페이지와 AI 요약", en: "Detail page with AI summary" },
      body: {
        ko: "글 · 작업물을 발행할 때 만든 한국어 · 영어 요약을 보는 언어로 펼칩니다. 수치 카드 · 목록 · 콜아웃처럼 글에 맞는 블록으로.",
        en: "The Korean and English summary made when a post or work is published opens in your language, in blocks that fit it — metrics, lists, callouts.",
      },
      shot: { src: "/images/about/showcase/summary-detail-light.jpg", srcDark: "/images/about/showcase/summary-detail-dark.jpg" },
    },
    {
      title: { ko: "게스트 댓글", en: "Guest comments" },
      body: {
        ko: "로그인 없는 마크다운 댓글과 이모지 반응, 또는 giscus.",
        en: "Markdown comments without login plus emoji reactions, or giscus.",
      },
      shot: { src: "/images/about/showcase/guest-comments-light.jpg", srcDark: "/images/about/showcase/guest-comments-dark.jpg" },
    },
    {
      title: { ko: "번역 배너", en: "Translate banner" },
      body: {
        ko: "보는 언어의 본문이 없으면 단추 하나로 그 자리에서 AI 번역을 받습니다. 메뉴의 🌐 단추로는 화면 글 · 목록 · 본문 · About · Profile 까지 사이트 전체를 33개 언어 중 하나로 바꿔 볼 수 있고, 번역은 언어마다 한 번 만들어 저장해 둡니다.",
        en: "When a body is missing in your language, one button translates it in place. The 🌐 button in the menu switches the whole site — UI text, lists, bodies, About and Profile — into one of 33 languages, and each translation is made once per language and stored.",
      },
      shot: { src: `${CMS}/10-translate-banner-light.png` },
    },
    {
      title: { ko: "프로필과 3D 마스코트", en: "Profile with a 3D mascot" },
      body: {
        ko: "가로로 흐르는 프로필. 3D 마스코트 몽이가 말을 걸며 따라오고, 창처럼 겹친 사진, GitHub 활동, 고정 저장소로 이어집니다.",
        en: "A horizontally scrolling profile. Mongi, a 3D mascot, follows along and talks, through window-like photos, GitHub activity and pinned repos.",
      },
      shot: { src: "/images/about/showcase/profile.jpg" },
    },
  ],
};

/* ── 장면 2 · 작업물 레이아웃 — 실제 /works 를 창에 띄운다 ── */

export const layoutsScene = {
  label: { ko: "데모 · 작업물 레이아웃", en: "Demo · Work layouts" } satisfies L10n,
  title: { ko: "여섯 가지 레이아웃, 실제 페이지로", en: "Six layouts, on the live page" } satisfies L10n,
  body: {
    ko: "`?layout=` 쿼리나 관리자 설정으로 바꿔 끼웁니다. 창 안은 지금 이 사이트의 작업물 페이지입니다.",
    en: "Swapped with a `?layout=` query or from admin settings. The window shows this site's own works page.",
  } satisfies L10n,
  layouts: [
    { key: "flow", note: { ko: "가로로 끝없이 흐르는 갤러리(기본)", en: "An endless horizontal gallery (default)" } },
    { key: "grid", note: { ko: "크기가 다른 칸을 채운 벤토", en: "A bento of mixed sizes" } },
    { key: "cylinder", note: { ko: "React Three Fiber 원통에 감아 돌린다", en: "Wrapped around an R3F cylinder" } },
    { key: "fullscreen", note: { ko: "화면 가득 겹쳐 바뀌는 배경", en: "Full-bleed crossfading backdrops" } },
    { key: "cinematic", note: { ko: "층마다 다른 속도의 패럴랙스", en: "Layered parallax" } },
    { key: "split", note: { ko: "왼쪽은 멈추고 오른쪽만 스크롤", en: "Pinned left, scrolling right" } },
  ],
  open: { ko: "새 탭에서 열기", en: "Open in a new tab" } satisfies L10n,
};

/* ── 몽이 — 3D 마스코트. 동작은 profile/_components/FloatingObject 의 코드 주석에서 확인했다 ── */

export const mascotScene = {
  label: { ko: "데모 · 3D 마스코트", en: "Demo · 3D mascot" } satisfies L10n,
  intro: {
    ko: "프로필을 따라 떠다니며 지나간 자리에 별가루를 남기는 3D 토끼입니다. 만지는 자리를 장면이 광선으로 찾아 반응하고, 만지는 동안에는 커서 대신 장면 안의 손이 나옵니다. 아래 항목을 누르거나 직접 만져 보세요.",
    en: "A 3D rabbit that drifts along the profile, leaving stardust behind. The scene ray-casts where you touch it, and while you do, a hand inside the scene replaces the cursor. Tap an item below, or touch it yourself.",
  } satisfies L10n,
  hint: { ko: "끌어서 돌리고 · 볼을 잡고 · 머리를 쓰다듬고 · 톡 찔러 보세요", en: "Drag to spin · pinch a cheek · pet its head · poke it" } satisfies L10n,
  acts: [
    {
      key: "pinch",
      title: { ko: "볼 잡기", en: "Pinch a cheek" },
      body: { ko: "볼을 잡고 끌면 살이 늘어나고 깜짝 놀랍니다.", en: "Pull a cheek — it stretches, and Mongi startles." },
    },
    {
      key: "pet",
      title: { ko: "쓰다듬기", en: "Pet its head" },
      body: { ko: "머리를 쓰다듬으면 좋아하며 하트가 떠오릅니다.", en: "Stroke its head and hearts float up." },
    },
    {
      key: "poke",
      title: { ko: "찌르기", en: "Poke" },
      body: { ko: "톡 찌르면 눌렸다 튕깁니다(사이트 소리를 켜면 소리도).", en: "It dents and boings (with sound if site audio is on)." },
    },
    {
      key: "spin",
      title: { ko: "빙글 돌리기", en: "Spin" },
      body: { ko: "끌었다 놓으면 관성으로 돌다 멈춥니다.", en: "Drag and let go — it spins and settles." },
    },
    {
      key: "faces",
      title: { ko: "표정 세 가지", en: "Three faces" },
      body: { ko: "기본 · 놀람 · 행복. 만지는 데 따라 바뀝니다.", en: "Default, surprised, happy — it changes as you touch it." },
    },
  ] as const,
  link: { ko: "프로필에서 몽이 따라가 보기", en: "Follow Mongi on the profile page" } satisfies L10n,
};

/* ── 장면 4 · 관리자 — 어두운 띠 위 화면 액자, 스크롤하면 화면이 넘어간다 ── */

export const adminScene = {
  label: { ko: "관리자 · CMS", en: "Admin · CMS" } satisfies L10n,
  title: { ko: "쓰고 운영하는 곳", en: "Where it's written and run" } satisfies L10n,
};

export const adminItems: FeatureItem[] = [
  {
    title: { ko: "Plate.js 편집기", en: "The Plate.js editor" },
    body: {
      ko: "위 툴바는 작용 범위별로 묶여 있고, 글을 선택하면 떠오르는 바에서 글자색 · 배경색을 입힙니다. 다이어그램 · 코드 플레이그라운드 · 수식 블록을 쓰고, SEO 점검이 빠진 항목을 짚어 줍니다.",
      en: "The toolbar is grouped by scope, and a floating bar on selection applies colors. Diagram, code playground and math blocks are built in, and an SEO check points out what's missing.",
    },
    points: [
      { ko: "다이어그램 · 수식 · 코드 블록", en: "Diagram · math · code blocks" },
      { ko: "색 도구", en: "Color tools" },
      { ko: "리비전 히스토리", en: "Revision history" },
    ],
    shots: [
      { label: { ko: "편집기", en: "Editor" }, src: `${PC}/editor-light.png` },
      { label: { ko: "색 도구", en: "Color tools" }, src: `${PC}/editor-color-light.png` },
      { label: { ko: "관련 항목 잇기", en: "Relations" }, src: `${CMS}/15-relation-picker-light.png` },
    ],
  },
  {
    title: { ko: "대시보드 · 트래픽", en: "Dashboard and traffic" },
    body: {
      ko: "첫 화면은 운영 현황 한 장이고, 맨 위 숫자는 방문자 수입니다. 달력에서 날짜를 누르면 그날의 순위와 많이 본 글이 열립니다. 방문 · 방문자 · 페이지 조회 · 머문 시간은 조회 기록 하나에서 세고, 같은 페이지는 30분에 한 번, 봇과 내 IP 는 뺍니다. 트래픽 화면은 유입 · 기기 · 국가 · UTM 과, 들어온 뒤 어느 페이지로 이어 갔는지(방문 흐름)를 보여 줍니다.",
      en: "The first screen is a one-page status report led by the visitor count. Click a day on the calendar for its rank and top posts. Visits, visitors, page views and time on page all come from one view log; the same page counts once per 30 minutes, and bots and your own IP are excluded. The traffic screen shows referrer, device, country and UTM, plus where visitors went after landing (visit flow).",
    },
    points: [
      { ko: "달력 히트맵", en: "Calendar heatmap" },
      { ko: "방문 급증 알림", en: "Traffic spike alerts" },
      { ko: "IP 익명화", en: "IP anonymization" },
      { ko: "방문 흐름 · 머문 시간", en: "Visit flow · time on page" },
    ],
    shots: [
      { label: { ko: "대시보드", en: "Dashboard" }, src: `${CMS}/17-dashboard-light.png` },
      { label: { ko: "일별 조회", en: "Daily views" }, src: `${CMS}/18-dashboard-daily-views-light.png` },
      { label: { ko: "트래픽", en: "Traffic" }, src: `${CMS}/19-traffic-light.png` },
      { label: { ko: "IP · UTM", en: "IP · UTM" }, src: `${CMS}/20-traffic-ip-utm-light.png` },
    ],
  },
  {
    title: { ko: "글 · 작업물 관리", en: "Managing posts and work" },
    body: {
      ko: "상태 칩을 누르면 그 자리에서 발행이 바뀌고, 끌어서 여러 행을 골라 한 번에 지우거나 카테고리를 바꿉니다. 예약 발행, GitHub README 불러오기, 30일 휴지통, `.md` 업로드와 내보내기가 있습니다.",
      en: "Tap a status chip to publish in place; drag across rows to delete or recategorize at once. Scheduled publishing, GitHub README import, a 30-day trash, and `.md` import and export.",
    },
    points: [
      { ko: "예약 발행", en: "Scheduled publishing" },
      { ko: "GitHub 불러오기", en: "GitHub import" },
      { ko: "휴지통 · .md 동기화", en: "Trash · .md sync" },
    ],
    shots: [
      { label: { ko: "글 목록", en: "Posts" }, src: `${CMS}/21-posts-list-light.png` },
      { label: { ko: "작업물 목록", en: "Works" }, src: `${CMS}/22-works-list-light.png` },
    ],
  },
  {
    title: { ko: "자동 번역과 AI", en: "Auto-translation and AI" },
    body: {
      ko: "EN으로 바꾸면 비어 있는 영어 칸을 제목부터 본문까지 한 번에 채웁니다. 자동으로 채운 번역은 표식을 남겨, 원문을 고치면 그 칸을 비우고 다음 방문 때 다시 번역합니다(사람이 고친 번역은 그대로 둡니다). 번역 · 요약 · 커버 · TTS마다 공급자 순서와 모델을 정하고, 같은 원인으로 거듭 실패한 공급자는 잠시 꺼집니다.",
      en: "Switch to EN and empty English fields fill at once. Auto-filled translations carry a mark, so editing the source clears them and they are re-translated on the next visit (translations a person edited are kept). Each AI feature has its own provider order and model, and a provider that keeps failing is switched off for a while.",
    },
    points: [
      { ko: "범위 골라 재번역", en: "Re-translate by scope" },
      { ko: "원문 수정 시 다시 번역", en: "Re-translate on source edit" },
      { ko: "공급자 대체 순서", en: "Provider fallback" },
      { ko: "실패 시 자동 차단", en: "Auto-disable on failure" },
    ],
    shots: [
      { label: { ko: "재번역", en: "Re-translate" }, src: `${CMS}/08-translate-editor-light.webm`, video: true },
      { label: { ko: "서비스 설정", en: "Services" }, src: `${CMS}/09-settings-services-light.png` },
    ],
  },
  {
    title: { ko: "알림 · 서비스 기록", en: "Notifications and service log" },
    body: {
      ko: "새 댓글 · 신고 · 새 기기 로그인 · 방문 급증과 시스템 알림을 네 탭으로 받습니다. 서비스 호출 기록은 AI · 메일 · GitHub · 예약 작업의 성공과 실패를 공급자별로 모읍니다.",
      en: "Comments, reports, new-device logins, traffic spikes and system alerts in four tabs. The service log collects AI, mail, GitHub and cron results per provider.",
    },
    points: [
      { ko: "알림 네 탭", en: "Four alert tabs" },
      { ko: "공급자별 성공 · 실패", en: "Per-provider results" },
    ],
    shots: [
      { label: { ko: "알림", en: "Notifications" }, src: `${CMS}/23-notifications-light.png` },
      { label: { ko: "서비스 기록", en: "Service log" }, src: `${CMS}/24-service-log-light.png` },
      { label: { ko: "댓글 관리", en: "Comments" }, src: `${CMS}/25-comments-light.png` },
    ],
  },
  {
    title: { ko: "설정 · 계정 · 보안", en: "Settings, accounts and security" },
    body: {
      ko: "설정은 여섯 탭이고, 비울 수 없는 값은 UI · API · DB 세 겹에서 막습니다. 로고는 올린 이미지와 기본 로고 중에 고르고, 짧은 로고 · 긴 로고 · 로딩 화면 · 파비콘을 따로 정하며, 밑 배경 밝기에 맞춰 색이 바뀝니다. 초대받은 멤버는 GitHub로 로그인하고, 5회 틀리면 15분 잠기며, 처음 보는 기기는 이메일 승인을 거칩니다.",
      en: "Six settings tabs, with required values guarded at UI, API and DB. The logo can be an uploaded image or the default one, with separate short and long logos, loading-screen logo and favicon, and it adapts to the brightness behind it. Members sign in with GitHub; five failures lock for 15 minutes, and new devices need email approval.",
    },
    points: [
      { ko: "세 겹 검증", en: "Three-layer validation" },
      { ko: "브랜드 로고 · 파비콘", en: "Brand logo · favicon" },
      { ko: "멤버와 역할", en: "Members and roles" },
      { ko: "새 기기 메일 승인", en: "New-device approval" },
    ],
    shots: [
      { label: { ko: "라이브러리", en: "Library" }, src: `${CMS}/26-settings-library-light.png` },
      { label: { ko: "계정", en: "Account" }, src: `${CMS}/27-settings-account-light.png` },
      { label: { ko: "로그인", en: "Login" }, src: `${CMS}/28-login-light.png` },
    ],
  },
];

/* ── 장면 5 · 발표 갤러리 음성 — 스크롤하면 장이 넘어가고 자막이 가사처럼 채워진다 ── */

export const cmsScene = {
  label: { ko: "데모 · 관리자를 직접", en: "Demo · Try the admin" } satisfies L10n,
  title: { ko: "관리자 기능, 규칙 그대로 만져 보기", en: "The admin's rules, hands-on" } satisfies L10n,
  body: {
    ko: "혼자 운영하는 CMS 에서 생기는 문제 여섯 가지를 이 사이트가 어떻게 막는지, 실제 관리자와 같은 규칙으로 움직이는 작은 화면에서 직접 확인합니다. 글을 잃지 않기 · 예약과 정리를 저절로 · 가입 없는 댓글 지키기 · 아무나 못 들어오게 · 역할 밖의 일 막기 · 이모지 가볍게 싣기. 들어오면 한 번 저절로 움직이고, 길잡이 별이 지금 볼 곳을 가리킵니다.",
    en: "Six problems a one-person CMS runs into, and how this site stops each — on small screens that follow the real admin's rules: never losing a post, scheduling and cleanup on their own, guarding sign-up-free comments, keeping strangers out, refusing what a role can't do, and shipping emojis light. Each plays once on its own, and the guide star points to what to watch.",
  } satisfies L10n,
  steps: { ko: "해 볼 차례", en: "Steps to try" } satisfies L10n,
};

export const voiceScene = {
  label: { ko: "데모 · 발표 갤러리와 음성", en: "Demo · Gallery with voice" } satisfies L10n,
  title: { ko: "슬라이드마다 음성과 자막", en: "Voice and captions on every slide" } satisfies L10n,
  body: {
    ko: "실제 작업물 갤러리에 올린 발표 자료와, 편집 화면에서 Fish TTS 로 만든 음성입니다. 음성은 편집 화면에서 자르고 이을 수 있고, 발표 파일은 장마다 그림과 대본으로 바뀝니다.",
    en: "Slides uploaded to a real work gallery, with narration made in the editor with Fish TTS. The voice can be cut and joined in the editor, and a slide deck turns into images and scripts, one per slide.",
  } satisfies L10n,
  wave: { ko: "파형 편집 — 실제 음성으로", en: "Waveform editing — on the real voice" } satisfies L10n,
  waveBody: {
    ko: "작업물 편집 화면에서 녹음을 멈춘 뒤 다듬는 도구입니다. 여기서는 갤러리가 트는 실제 Fish 음성 9.5초를 다룹니다.",
    en: "The tool for tidying a recording after you stop it in the work editor. Here it works on 9.5 seconds of the real Fish voice the gallery plays.",
  } satisfies L10n,
  waveSteps: [
    { ko: "파형을 끌어 구간을 고릅니다", en: "Drag across the waveform to select" },
    { ko: "잘라내기(⌘X)나 나누기(⌘B)로 클립을 만듭니다", en: "Cut (⌘X) or split (⌘B) to make clips" },
    { ko: "클립 위 번호 띠를 길게 눌러 끌면 순서가 바뀝니다", en: "Long-press a clip's number strip and drag to reorder" },
    { ko: "재생(Space)하면 고친 순서대로 들립니다", en: "Play (Space) to hear the edited order" },
  ] satisfies L10n[],
  convert: { ko: "PDF · PPTX 를 갤러리로", en: "PDF · PPTX into a gallery" } satisfies L10n,
  convertBody: {
    ko: "작업물 갤러리에 발표 파일을 끌어 놓으면 브라우저에서 장마다 JPEG 로 그려 올립니다. 파일은 바깥 변환 서비스로 나가지 않고, PPTX 는 발표자 노트가 그 장의 음성 대본이 됩니다. 여기서는 그 과정을 흉내만 냅니다.",
    en: "Drop a deck into a work gallery and the browser renders each slide to a JPEG and uploads it. The file never goes to an outside converter, and in a PPTX each speaker note becomes that slide's narration script. This demo only replays the process.",
  } satisfies L10n,
};

/* ── 장면 6 · 테마 — 스크롤하면 프리셋이 차례로 입혀지고 대비 점검이 바뀐다 ── */

export const themeScene = {
  label: { ko: "데모 · 테마", en: "Demo · Themes" } satisfies L10n,
  title: { ko: "프리셋 18종, 대비까지 계산", en: "18 presets, contrast included" } satisfies L10n,
  body: {
    ko: "강조색끼리 ΔE 20 이상 떨어뜨린 프리셋입니다. 표는 설정 화면과 같은 계산으로 WCAG 대비를 셉니다.",
    en: "Presets keep accents at least ΔE 20 apart. The table computes WCAG contrast the same way the settings page does.",
  } satisfies L10n,
  /** 대비 기준 미달 — 점검표 등급 */
  fail: { ko: "미달", en: "Fail" } satisfies L10n,
  rows: {
    body: { ko: "본문", en: "Body" },
    muted: { ko: "흐린 글자", en: "Muted" },
    link: { ko: "강조 링크", en: "Link" },
    graphic: { ko: "강조 그래픽", en: "Graphic" },
    button: { ko: "버튼 글자", en: "Button" },
    distinct: { ko: "링크↔본문", en: "Link vs body" },
  } satisfies Record<string, L10n>,
  sample: {
    eyebrow: "JUNIOR FRONTEND DEVELOPER",
    title: "Creative Developer",
    accent: "& Problem Solver",
    button: "Get in Touch",
  },
};
