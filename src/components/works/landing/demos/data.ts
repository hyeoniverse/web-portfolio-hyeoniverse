/* 작업물 랜딩 데모 네 개(테마 · 레이아웃 · 메일함 · 공급자 대체)의 문구와 규칙 상수.
   공급자 규칙은 src/lib/ai/providers.ts 에서 옮겼다 — 바뀌면 그쪽부터 고친다. */

export type L10n = { ko: string; en: string };

/* ── 테마 ── */

export const themes = {
  previewLabel: { ko: "{name} 테마 {mode} 미리보기", en: "{name} theme, {mode} preview" },
  modeGroup: { ko: "모드", en: "Mode" },
  light: { ko: "라이트", en: "Light" },
  dark: { ko: "다크", en: "Dark" },
  presets: { ko: "테마 프리셋", en: "Theme presets" },
  nav: ["Works", "Posts", "About"],
  eyebrow: { ko: "Portfolio", en: "Portfolio" },
  heroLine1: { ko: "작업물과 글을,", en: "Works and writing," },
  heroLine2: { ko: "움직이는 화면으로.", en: "on a moving screen." },
  cta: { ko: "작업물 보기", en: "View works" },
  tags: [
    { ko: "웹", en: "Web" },
    { ko: "모바일 앱", en: "Mobile app" },
    { ko: "게임", en: "Game" },
  ],
  five: {
    accent: { ko: "강조", en: "Accent" },
    lightBg: { ko: "라이트 바탕", en: "Light background" },
    lightText: { ko: "라이트 글자", en: "Light text" },
    darkBg: { ko: "다크 바탕", en: "Dark background" },
    darkText: { ko: "다크 글자", en: "Dark text" },
  },
  contrastGroup: { ko: "대비 점검", en: "Contrast check" },
  body: { ko: "본문", en: "Body" },
  accentText: { ko: "강조 글자", en: "Accent text" },
  onAccent: { ko: "강조 면 위 글자", en: "Text on accent" },
  corrected: { ko: "명도 보정 {hex}", en: "Lightness fixed {hex}" },
  grades: {
    aaa: { ko: "AAA", en: "AAA" },
    aa: { ko: "AA", en: "AA" },
    aaLarge: { ko: "큰 글자 AA", en: "Large AA" },
    fail: { ko: "부족", en: "Fail" },
  },
  hint: {
    ko: "토러스는 프리셋을 바꿔도 그대로이고, 라이트·다크에서만 재질이 바뀝니다.",
    en: "The torus stays the same across presets; only light and dark change its material.",
  },
};

/** 프리셋이 혼자 넘어가는 간격(ms)과, 몇 번 넘어갈 때마다 모드도 바꾸는지 */
export const THEME_CYCLE_MS = 2200;
export const THEME_FLIP_EVERY = 4;

/* ── 레이아웃 ── */

export type LayoutKind = "flow" | "grid" | "cylinder" | "fullscreen" | "cinematic" | "split";

export const layouts: { kind: LayoutKind; label: string; note: L10n }[] = [
  {
    kind: "flow",
    label: "Flow",
    note: { ko: "가로로 끝없이 흐르는 갤러리입니다. 마우스를 따라 기울어집니다.", en: "An endless horizontal gallery that tilts with the mouse." },
  },
  {
    kind: "grid",
    label: "Grid",
    note: { ko: "크기가 다른 칸을 12칸 격자에 채운 벤토입니다.", en: "A bento of mixed-size tiles on a 12-column grid." },
  },
  {
    kind: "cylinder",
    label: "Cylinder",
    note: { ko: "Three.js 원통에 작업물을 감아 돌립니다.", en: "Works wrapped around a spinning Three.js cylinder." },
  },
  {
    kind: "fullscreen",
    label: "Fullscreen",
    note: { ko: "화면 가득 배경이 겹쳐 바뀌고, 네 귀퉁이에 시계·FPS HUD가 있습니다.", en: "Full-bleed backgrounds crossfade, with a clock and FPS HUD in the corners." },
  },
  {
    kind: "cinematic",
    label: "Cinematic",
    note: { ko: "층마다 다른 속도로 움직이는 패럴랙스 영화입니다.", en: "A parallax film where each layer moves at its own speed." },
  },
  {
    kind: "split",
    label: "Split",
    note: { ko: "왼쪽 정보는 멈추고 오른쪽 작업물만 스크롤합니다.", en: "The info on the left stays put while only the works on the right scroll." },
  },
];

export const layoutsCopy = {
  label: { ko: "작업물 목록 레이아웃 여섯 가지", en: "Six works-list layouts" },
  pause: { ko: "멈추기", en: "Pause" },
  play: { ko: "움직이기", en: "Play" },
};

/* ── 메일함 ── */

export type MailIcon = "reply" | "invite" | "device" | "schedule";

export const mails: { icon: MailIcon; from: L10n; title: L10n; body: L10n }[] = [
  {
    icon: "reply",
    from: { ko: "답글 알림", en: "Reply notice" },
    title: { ko: "남긴 댓글에 답글이 달렸습니다", en: "Someone replied to your comment" },
    body: { ko: "댓글을 쓸 때 메일을 적어 둔 사람에게만 보냅니다.", en: "Sent only to people who left an email with their comment." },
  },
  {
    icon: "invite",
    from: { ko: "작성자 초대", en: "Author invite" },
    title: { ko: "HYEONIVERSE 저자로 초대되었습니다", en: "You are invited as a HYEONIVERSE author" },
    body: { ko: "이 메일 주소로 GitHub 로그인을 하면 역할이 붙습니다.", en: "Sign in with GitHub using this address and the role is attached." },
  },
  {
    icon: "device",
    from: { ko: "새 기기 확인", en: "New device check" },
    title: { ko: "처음 보는 기기에서 로그인했습니다", en: "Sign-in from a new device" },
    body: { ko: "24시간 안에 링크를 눌러야 그 기기에서 들어올 수 있습니다.", en: "The device can sign in only after the link is opened within 24 hours." },
  },
  {
    icon: "schedule",
    from: { ko: "예약 발행", en: "Scheduled publish" },
    title: { ko: "예약한 글 1편을 발행했습니다", en: "One scheduled post was published" },
    body: { ko: "Next.js가 아니라 DB(pg_net)가 Resend로 직접 보냅니다.", en: "Sent straight from the database (pg_net) through Resend, not from Next.js." },
  },
];

/** 메일이 하나씩 도착하는 간격(ms) */
export const MAIL_ARRIVE_MS = 600;

export const mailbox = {
  inbox: { ko: "받은편지함", en: "Inbox" },
  unread: { ko: "안 읽음 {n}", en: "{n} unread" },
  waiting: { ko: "도착 전", en: "Not yet arrived" },
  again: { ko: "다시 받기", en: "Receive again" },
  note: {
    ko: "사이트가 Resend로 보내는 메일 네 가지입니다. 도착한 메일을 누르면 내용이 펼쳐집니다.",
    en: "The four kinds of email the site sends through Resend. Tap an arrived message to open it.",
  },
};

/* ── 공급자 대체 ── */

export type Feature = "translation" | "summary" | "cover" | "tts";
export type Unit = "chars" | "bytes" | "requests";

/** 요청 한 번에 쓰는 양 — 단위별(요청 수 단위는 늘 1) */
export const features: { key: Feature; label: L10n; providers: string[]; cost: Partial<Record<Unit, number>> }[] = [
  { key: "translation", label: { ko: "번역", en: "Translate" }, providers: ["DeepL", "Google Translate", "Gemini", "Claude"], cost: { chars: 1_800 } },
  { key: "summary", label: { ko: "요약", en: "Summary" }, providers: ["Gemini", "OpenAI", "Groq", "Claude"], cost: {} },
  { key: "cover", label: { ko: "커버", en: "Cover" }, providers: ["NanoBanana", "Hugging Face"], cost: {} },
  { key: "tts", label: { ko: "음성", en: "Speech" }, providers: ["Fish Audio", "Google Cloud TTS", "Edge TTS"], cost: { chars: 8_000, bytes: 24_000 } },
];

export const units: Record<Unit, L10n> = {
  chars: { ko: "자", en: " chars" },
  bytes: { ko: "바이트", en: " bytes" },
  requests: { ko: "번", en: " req" },
};

/** 실패 원인 — src/lib/ai/providers.ts FailureKind. fatal 은 사람이 고쳐야 풀리는 원인(FATAL_KINDS) */
export type Kind = "network" | "rate_limit" | "server" | "invalid_key" | "expired" | "forbidden" | "quota" | "billing";
export const kinds: Record<Kind, { label: L10n; fatal: boolean }> = {
  network: { label: { ko: "시간 초과", en: "Timeout" }, fatal: false },
  rate_limit: { label: { ko: "요청 속도 제한(429)", en: "Rate limited (429)" }, fatal: false },
  server: { label: { ko: "서버 오류(503)", en: "Server error (503)" }, fatal: false },
  invalid_key: { label: { ko: "키 오류(401)", en: "Bad key (401)" }, fatal: true },
  expired: { label: { ko: "키 만료", en: "Key expired" }, fatal: true },
  forbidden: { label: { ko: "권한 없음(403)", en: "Forbidden (403)" }, fatal: true },
  quota: { label: { ko: "한도 초과", en: "Quota exceeded" }, fatal: true },
  billing: { label: { ko: "결제 필요", en: "Billing required" }, fatal: true },
};

/** 같은 원인으로 이만큼 이어 실패하면 그 공급자를 끈다 — src/lib/ai/providers.ts FATAL_LIMIT · TRANSIENT_LIMIT */
export const FATAL_LIMIT = 3;
export const TRANSIENT_LIMIT = 5;

/**
 * 공급자마다 미리 정해 둔 성향: 이번 달 사용량, 무료 한도와 앱 상한(providers.ts freeMonthly · appCap), 실패 확률과 원인.
 * 응답은 무작위지만, 몇 번 보내다 보면 대체 · 한도 초과 · 자동으로 꺼짐 · 키 없음 · 앱 상한을 모두 겪게 짜 두었다
 */
export type Profile = {
  used: number;
  unit: Unit;
  /** 한 달 무료 한도 (넘으면 한도 초과) */
  limit?: number;
  /** 이 앱이 스스로 멈추는 상한 (넘을 요청은 보내지 않는다) */
  cap?: number;
  /** 한도를 숫자로 모를 때의 설명 */
  note?: L10n;
  /** 키가 없으면 부르지 않고 건너뛴다 (실패로 세지 않는다) */
  noKey?: boolean;
  fail: number;
  kinds: Kind[];
  /** 화면에 보이는 성향 한 줄 */
  trait: L10n;
};

const PREPAID: L10n = { ko: "무료 한도 없음 · 선불 크레딧", en: "No free tier · prepaid credits" };

export const profiles: Record<string, Profile> = {
  DeepL: { used: 482_000, limit: 500_000, unit: "chars", fail: 0.1, kinds: ["network"], trait: { ko: "무료 한도 직전", en: "Near the free limit" } },
  "Google Translate": {
    used: 61_000,
    limit: 500_000,
    cap: 450_000,
    unit: "chars",
    fail: 0.6,
    kinds: ["rate_limit", "server"],
    trait: { ko: "자주 불안정", en: "Often flaky" },
  },
  Gemini: {
    used: 214,
    unit: "requests",
    note: { ko: "무료 등급은 분·하루 요청 수 제한", en: "Free tier limits requests per minute and day" },
    fail: 0.35,
    kinds: ["rate_limit"],
    trait: { ko: "가끔 429", en: "Sometimes 429" },
  },
  OpenAI: { used: 3, unit: "requests", note: PREPAID, fail: 0.6, kinds: ["quota", "expired"], trait: { ko: "키 만료 임박", en: "Key about to expire" } },
  Groq: {
    used: 40,
    unit: "requests",
    note: { ko: "무료 등급 · 모델마다 분당 제한", en: "Free tier · per-model rate limits" },
    fail: 0.3,
    kinds: ["rate_limit"],
    trait: { ko: "넉넉한 무료 등급", en: "Generous free tier" },
  },
  Claude: { used: 12, unit: "requests", note: PREPAID, fail: 0.5, kinds: ["billing"], trait: { ko: "크레딧 바닥", en: "Out of credits" } },
  NanoBanana: {
    used: 0,
    unit: "requests",
    note: { ko: "무료 한도 없음 · 유료", en: "No free tier · paid" },
    noKey: true,
    fail: 0,
    kinds: [],
    trait: { ko: "키 없음", en: "No key" },
  },
  "Hugging Face": {
    used: 9,
    unit: "requests",
    note: { ko: "월 무료 크레딧 소량", en: "Small monthly free credit" },
    fail: 0.4,
    kinds: ["server", "network"],
    trait: { ko: "모델 깨우는 중 503", en: "503 while the model wakes" },
  },
  "Fish Audio": {
    used: 41_200,
    unit: "chars",
    note: { ko: "2026-11-30까지 무료", en: "Free until 2026-11-30" },
    fail: 0.25,
    kinds: ["network", "forbidden"],
    trait: { ko: "가끔 시간 초과", en: "Occasional timeouts" },
  },
  "Google Cloud TTS": {
    used: 776_000,
    limit: 1_000_000,
    cap: 800_000,
    unit: "bytes",
    fail: 0.05,
    kinds: ["server"],
    trait: { ko: "앱 상한 80만 직전", en: "Near the 800k app cap" },
  },
  "Edge TTS": {
    used: 31,
    unit: "requests",
    note: { ko: "키 없이 무료", en: "Free, no key" },
    fail: 0.1,
    kinds: ["network"],
    trait: { ko: "키 없이 무료", en: "Free, no key" },
  },
};

/** 데모가 시작하는 달 */
export const START_MONTH = 10;
/** 요청을 보낸 뒤 결과를 보여 주기까지(ms) */
export const SEND_DELAY_MS = 500;

export const providers = {
  featureGroup: { ko: "기능", en: "Feature" },
  fallback: { ko: "실패하면 다음 공급자로", en: "Fall back to the next provider" },
  primary: { ko: "기본", en: "Primary" },
  backup: { ko: "대체 {n}", en: "Fallback {n}" },
  thisMonth: { ko: "이번 달 {amount}", en: "This month {amount}" },
  appCap: { ko: " (앱 상한)", en: " (app cap)" },
  streak: { ko: "이어진 실패 {n}", en: "Failures in a row {n}" },
  off: { ko: "꺼짐 · {kind} {n}번 이어져", en: "Off · {kind} ×{n} in a row" },
  noKey: { ko: "키가 없어 건너뜁니다 · {note}", en: "Skipped, no key · {note}" },
  up: { ko: "{name} 위로", en: "Move {name} up" },
  down: { ko: "{name} 아래로", en: "Move {name} down" },
  revive: { ko: "다시 켜기", en: "Turn on" },
  reviveLabel: { ko: "{name} 다시 켜기", en: "Turn {name} back on" },
  send: { ko: "요청 보내기", en: "Send request" },
  sending: { ko: "보내는 중…", en: "Sending…" },
  nextMonth: { ko: "{month}월로 넘기기", en: "Go to {month}" },
  outcomeOff: { ko: "꺼짐", en: "off" },
  outcomeNoKey: { ko: "키 없음", en: "no key" },
  outcomeCap: { ko: "앱 상한이라 보내지 않음", en: "not sent, app cap" },
  handled: { ko: " · {name}에서 처리했습니다", en: " · Handled by {name}" },
  allFailed: { ko: " · 모든 공급자가 실패해 관리자 알림에 남습니다", en: " · Every provider failed, so an admin notice is left" },
  noFallback: { ko: " · 대체를 꺼서 여기서 실패합니다", en: " · Fallback is off, so the request fails here" },
  idle: {
    ko: "공급자마다 성향이 달라, 여러 번 보내 보면 대체·한도 초과·자동으로 꺼짐·키 없음·앱 상한을 모두 겪습니다.",
    en: "Each provider behaves differently. Send a few requests to see fallback, quota limits, auto-disable, missing keys and the app cap.",
  },
};

export const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
