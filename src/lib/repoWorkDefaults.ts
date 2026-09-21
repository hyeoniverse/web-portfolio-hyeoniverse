/**
 * GitHub 저장소를 작업물로 들일 때 발행에 필요한 칸을 채우는 값들.
 *
 * 작업물은 제목·분류·성격·연도·대표 이미지·본문이 있어야 발행된다(WorkEditor 의 handleSave).
 * 저장소에는 분류·성격이 없고, README 가 없거나 그림이 없는 저장소도 많다. 그대로 들이면 편집 화면을
 * 열어 저장하는 순간 필수 칸이 비었다고 막혀서, 들인 작업물마다 여섯 칸을 손으로 채워야 했다.
 *
 * 여기서는 저장소가 가진 단서(언어·주제·소개·README·소유 계정 이름)로 그럴듯한 값을 고른다.
 * 어디까지나 초안이다 — 들인 뒤 편집 화면에서 고치면 된다.
 */
import koAdmin from "@/locales/ko.admin.json";
import enAdmin from "@/locales/en.admin.json";
import type { GithubRepoCard } from "@/lib/githubShowcase";

export interface CategoryOption {
  ko: string;
  en: string;
}

/** README 는 앞부분만 본다 — 뒤로 갈수록 설치법·라이선스 같은 잡음이 많다 */
const README_HEAD = 4000;

interface RepoClues {
  langs: Set<string>;
  topics: Set<string>;
  /** 이름·소유 계정·소개·주제·README 앞부분을 소문자로 이은 것 */
  text: string;
  /** 저장소 소개만 — README 에는 설치 명령 같은 잡음이 있어 좁게 봐야 하는 규칙에 쓴다 */
  about: string;
}

function cluesOf(repo: GithubRepoCard): RepoClues {
  const langs = new Set((repo.languages?.length ? repo.languages : [repo.language]).filter(Boolean).map((l) => l.toLowerCase()));
  const topics = new Set(repo.topics.map((t) => t.toLowerCase()));
  const readme = (repo.readme?.markdown ?? "").slice(0, README_HEAD);
  const about = `${repo.description} ${repo.readme?.summary ?? ""}`.toLowerCase();
  /* "git clone" 은 거의 모든 README 의 설치법에 있다 — 클론 코딩으로 오인하지 않게 지운다 */
  const text = `${repo.name} ${repo.owner} ${repo.description} ${repo.topics.join(" ")} ${readme}`
    .toLowerCase()
    .replace(/git\s+clone/g, "");
  return { langs, topics, text, about };
}

const hasAny = (set: Set<string>, words: readonly string[]) => words.some((w) => set.has(w));

/* ── 분류 ──
   위에서부터 처음 맞는 것. 어디서 도는지(확장·게임·모바일·데스크탑)를 먼저 보고, 그다음 무엇을 하는지
   (AI·비주얼·라이브러리·도구·자동화·백엔드), 마지막에 웹이다. ChatGPT 를 부르는 안드로이드 앱은 모바일 앱이다.
   en 은 사이트 설정의 작업물 분류 이름과 맞춘다(설정에서 그 이름을 지웠으면 다음 규칙으로 넘어간다). */
const WEB_LANGS = ["typescript", "javascript", "html", "css", "scss", "vue", "svelte", "astro"];
const CATEGORY_RULES: ReadonlyArray<{ en: string; test: (c: RepoClues) => boolean }> = [
  {
    en: "Extension",
    test: (c) => hasAny(c.topics, ["chrome-extension", "browser-extension", "vscode-extension", "firefox-extension", "raycast-extension"])
      || /(chrome|browser|vs ?code|firefox|크롬|브라우저)\s*(extension|익스텐션|확장)/.test(c.text),
  },
  {
    en: "Game",
    test: (c) => hasAny(c.topics, ["game", "unity", "unity3d", "godot", "pygame", "phaser", "gamedev", "game-development"])
      || c.langs.has("gdscript") || /\bunity\b|게임|\bgame\b/.test(c.text),
  },
  {
    en: "Mobile App",
    test: (c) => hasAny(c.topics, ["ios", "android", "flutter", "react-native", "swiftui", "expo", "mobile"])
      || hasAny(c.langs, ["swift", "kotlin", "dart", "objective-c"])
      || /\bios\b|android|안드로이드|아이폰|iphone|flutter|react native|swiftui|app ?store|play ?store|플레이\s?스토어/.test(c.text),
  },
  {
    en: "Desktop App",
    test: (c) => hasAny(c.topics, ["electron", "tauri", "desktop", "desktop-app", "pyqt", "pyqt5", "tkinter", "javafx", "wpf"])
      || /electron|tauri|pyqt|tkinter|javafx|데스크\s?(탑|톱)|desktop app|키오스크|kiosk/.test(c.text),
  },
  {
    en: "AI / ML",
    test: (c) => hasAny(c.topics, ["machine-learning", "deep-learning", "ai", "ml", "llm", "nlp", "pytorch", "tensorflow", "keras",
      "computer-vision", "opencv", "mediapipe", "langchain", "transformers", "huggingface"])
      || c.langs.has("jupyter notebook")
      || /머신\s?러닝|딥\s?러닝|인공\s?지능|machine learning|deep learning|\bllm\b|pytorch|tensorflow|keras|koelectra|\bbert\b|huggingface|분류\s?모델|학습\s?모델/.test(c.text),
  },
  {
    en: "Interactive / Visual",
    test: (c) => hasAny(c.topics, ["threejs", "three-js", "webgl", "shader", "glsl", "p5js", "creative-coding", "generative-art"])
      || /three\.js|webgl|glsl|셰이더|p5\.js|creative coding/.test(c.text),
  },
  {
    en: "Library",
    test: (c) => hasAny(c.topics, ["library", "npm-package", "package", "sdk", "framework"]) || /라이브러리|\blibrary\b|\bsdk\b/.test(c.about),
  },
  {
    en: "Tool",
    test: (c) => hasAny(c.topics, ["cli", "tool", "tools", "command-line", "converter", "generator"]) || /\bcli\b|도구|\btool\b|변환기|생성기/.test(c.about),
  },
  {
    en: "Automation",
    test: (c) => hasAny(c.topics, ["bot", "automation", "github-actions", "crawler", "scraper", "discord-bot", "slack-bot", "telegram-bot"])
      || /봇|\bbot\b|자동화|automation|크롤러|crawler|scraper/.test(c.about),
  },
  {
    en: "Backend",
    test: (c) => hasAny(c.topics, ["api", "backend", "server", "spring", "spring-boot", "express", "nestjs", "django", "fastapi", "flask", "graphql", "rest-api"])
      || (!hasAny(c.langs, WEB_LANGS) && hasAny(c.langs, ["java", "go", "php", "ruby", "c#", "rust", "kotlin"])),
  },
  {
    en: "Web App",
    test: (c) => hasAny(c.langs, WEB_LANGS) || hasAny(c.topics, ["react", "nextjs", "next-js", "vue", "svelte", "web", "website", "frontend"]),
  },
];

/**
 * 저장소에 맞는 작업물 분류 — 설정에 등록된 분류 가운데서 고른다(없는 이름을 만들지 않는다).
 * 맞는 것이 없으면 "기타(Etc)", 그것도 설정에 없으면 첫 분류. 분류가 하나도 없으면 null.
 */
export function inferRepoCategory(repo: GithubRepoCard, options: readonly CategoryOption[]): CategoryOption | null {
  if (options.length === 0) return null;
  const find = (en: string) => options.find((o) => o.en.toLowerCase() === en.toLowerCase());
  const clues = cluesOf(repo);
  for (const rule of CATEGORY_RULES) {
    if (!rule.test(clues)) continue;
    const hit = find(rule.en);
    if (hit) return hit;
  }
  return find("Etc") ?? options[0];
}

/* ── 성격 ──
   만든 동기는 저장소 정보에 잘 드러나지 않는다. 조직 이름·소개·README 에 흔히 남는 낱말만 본다
   (데브코스 조직, "공모전" 수상 문구, "캡스톤" 등). 아무것도 없으면 사이드 프로젝트로 둔다. */
export type NatureKey = "toy" | "clone" | "side" | "academic" | "contest" | "opensource" | "study";

const NATURE_RULES: ReadonlyArray<{ key: NatureKey; re: RegExp }> = [
  { key: "contest", re: /해커톤|공모전|경진\s?대회|대회|contest|hackathon|competition|solution challenge|수상/ },
  { key: "academic", re: /캡스톤|capstone|졸업\s?(작품|프로젝트|과제)|학기|수업|강의|과제|assignment|coursework|대학교|학부/ },
  { key: "study", re: /스터디|\bstudy\b|데브\s?코스|devcourse|부트\s?캠프|bootcamp|교육\s?과정|튜토리얼|tutorial|ssafy|싸피|우아한\s?테크\s?코스|likelion|멋쟁이\s?사자/ },
  { key: "clone", re: /클론|\bclone\b|cloning/ },
  { key: "toy", re: /토이|\btoy\b/ },
];

export function inferRepoNatureKey(repo: GithubRepoCard): NatureKey {
  const { text } = cluesOf(repo);
  return NATURE_RULES.find((r) => r.re.test(text))?.key ?? "side";
}

/** 성격 라벨 — 편집 화면의 성격 프리셋과 같은 문구라야 편집 화면에서 그 프리셋이 골라진 채로 열린다 */
export function natureLabel(key: NatureKey): CategoryOption {
  return {
    ko: koAdmin.admin.works.editor.naturePresets[key],
    en: enAdmin.admin.works.editor.naturePresets[key],
  };
}

/**
 * README 에 그림이 없을 때의 대표 이미지 — GitHub 이 저장소마다 만들어 주는 소개 카드(1200×600).
 * 저장소 이름·소개·통계가 담겨 있어 빈칸보다 낫다. 주소 앞의 숫자는 캐시 열쇠라 아무 값이나 된다.
 */
export function repoCoverFallback(repo: GithubRepoCard): string {
  return `https://opengraph.githubassets.com/1/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.name)}`;
}

/** 연도 — 마지막으로 손댄 해. 모르면 올해 */
export function repoYear(repo: GithubRepoCard, now = new Date()): string {
  return /^\d{4}/.test(repo.pushedAt) ? repo.pushedAt.slice(0, 4) : String(now.getFullYear());
}

/**
 * README 가 없을 때의 본문 — 저장소 정보로 짧게 채운다. 들인 뒤 편집 화면에서 고쳐 쓰라는 초안이다.
 */
export function repoContentFallback(repo: GithubRepoCard, tech: readonly string[], lang: "ko" | "en"): string {
  const link = `[${repo.fullName || `${repo.owner}/${repo.name}`}](${repo.url})`;
  const intro = repo.description.trim();
  const lines = lang === "ko"
    ? [
      intro || `GitHub 저장소 ${link} 에서 불러온 작업물입니다.`,
      "",
      `- 저장소: ${link}`,
      ...(tech.length ? [`- 기술: ${tech.join(" · ")}`] : []),
      ...(/^\d{4}-\d{2}/.test(repo.pushedAt) ? [`- 마지막 작업: ${repo.pushedAt.slice(0, 7)}`] : []),
    ]
    : [
      intro || `Imported from the GitHub repository ${link}.`,
      "",
      `- Repository: ${link}`,
      ...(tech.length ? [`- Tech: ${tech.join(" · ")}`] : []),
      ...(/^\d{4}-\d{2}/.test(repo.pushedAt) ? [`- Last updated: ${repo.pushedAt.slice(0, 7)}`] : []),
    ];
  return lines.join("\n");
}
