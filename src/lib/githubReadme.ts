/**
 * 저장소 README 에서 표지·제목·설명을 뽑는다(#1053).
 *
 * 홈의 GitHub 저장소 칸은 표지가 없어 언어 색 버블로 대신하고 제목은 저장소 이름을 썼다.
 * 그런데 대부분의 저장소는 README 에 이미 배너와 제목, 소개 문단을 갖고 있다. 그걸 읽어
 * 기본값으로 쓰면 설정에서 일일이 채우지 않아도 된다. 설정에 적은 값이 언제나 우선한다.
 *
 * 파싱은 정규식으로 한다 — 마크다운 파서를 서버에 들이기에는 뽑을 것이 세 가지뿐이다.
 */

/* 표지로 쓰면 안 되는 이미지. 셋으로 나뉜다 —
   빌드·버전 배지, 프로필 꾸미기용 생성형 배너·통계 카드, 기술 스택 아이콘 띠.
   모두 README 맨 위에 줄지어 있어서 "첫 이미지" 를 그냥 집으면 이것들이 걸린다. */
const DECORATIVE_IMAGE =
  /(shields\.io|badge|\/workflows\/[^)]*\.svg|travis-ci|codecov|coveralls|npmjs\.com|packagist|circleci|appveyor|snyk\.io|sonarcloud|capsule-render|readme-typing-svg|hits\.seeyoufarm|visitor-badge|forthebadge|skillicons\.dev|github-readme-stats|github-readme-streak|github-profile-trophy|readme-stats)/i;

/** 문단에서 마크다운 표식을 걷어내 읽을 수 있는 한 줄로 */
function stripInline(text: string): string {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")        // 이미지
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")      // 링크 → 글자만
    .replace(/\[([^\]]*)\]\[[^\]]*\]/g, "$1")     // 참조식 링크 → 글자만
    .replace(/<[^>]+>/g, "")                      // HTML 태그
    .replace(/[*_`~]/g, "")                       // 강조 기호
    .replace(/\s+/g, " ")
    .trim();
}

/** 글자가 실질적으로 몇 자인가 — 숫자·기호·이모지만 있는 줄(날짜 표기 등)을 설명으로 잡지 않으려고 센다 */
function letterCount(text: string): number {
  return (text.match(/[\p{L}]/gu) ?? []).length;
}

export interface ReadmeMeta {
  /** 첫 `#` 제목 */
  title: string;
  /** 제목 뒤 첫 문단 */
  summary: string;
  /** 첫 이미지 — 배지·장식 배너는 뺀다. 상대경로일 수 있어 absolutizeReadmeImage 로 펴야 한다 */
  image: string;
  /** README 원문. 상세 화면이 본문으로 그린다 — 목록을 위해 이미 받아 온 것이라 요청이 늘지 않는다.
      그릴 때는 readmeToMarkdown 으로 걸러야 한다(남이 쓴 HTML 이 섞여 있다) */
  markdown?: string;
}

const SUMMARY_MAX = 160;
const SUMMARY_MIN_LETTERS = 10;

export function parseReadme(markdown: string): ReadmeMeta {
  const meta: ReadmeMeta = { title: "", summary: "", image: "" };
  /* 코드 블록 안의 내용은 예시일 뿐이라 건너뛴다 — 설치 명령이 설명으로 잡히면 곤란하다 */
  let inCode = false;

  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trim();
    if (/^(```|~~~)/.test(line)) { inCode = !inCode; continue; }
    if (inCode || !line) continue;

    if (!meta.image) {
      const found = line.match(/!\[[^\]]*\]\(\s*([^)\s]+)/) ?? line.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (found && !DECORATIVE_IMAGE.test(found[1])) meta.image = found[1];
    }

    if (!meta.title) {
      const heading = line.match(/^#\s+(.+)$/);
      if (heading) {
        meta.title = stripInline(heading[1]);
        continue;
      }
    }

    /* 설명은 제목을 만난 뒤부터 찾는다 — 제목 위의 배지 줄·날짜 줄이 잡히지 않게.
       표·인용·목록도 소개 문장이 아니라 건너뛴다. */
    if (meta.title && !meta.summary) {
      if (/^#{1,6}\s/.test(line)) continue;
      if (/^[|>\-*+]/.test(line) || /^\d+[.)]\s/.test(line)) continue;
      const text = stripInline(line);
      if (letterCount(text) >= SUMMARY_MIN_LETTERS) meta.summary = text.slice(0, SUMMARY_MAX);
    }

    if (meta.title && meta.summary && meta.image) break;
  }

  return meta;
}

/* 표지로 받아들일 호스트. next.config 의 images.remotePatterns 와 짝이다 —
   거기 없는 호스트를 next/image 에 넘기면 그 한 장 때문에 페이지 전체가 500 이 된다.
   README 는 남의 글이라 어떤 주소가 들어 있을지 알 수 없으므로, 아는 것만 받는다. */
const ALLOWED_IMAGE_HOSTS = new Set([
  "raw.githubusercontent.com",
  "user-images.githubusercontent.com",
  "camo.githubusercontent.com",
  "github.com",
]);

/**
 * README 안의 상대경로 이미지를 실제로 받을 수 있는 주소로 편다.
 * 우리가 그릴 수 없는 호스트면 빈 문자열 — 부르는 쪽이 표지 없이(언어 색 버블로) 간다.
 */
export function absolutizeReadmeImage(src: string, owner: string, repo: string, branch: string): string {
  if (!src) return "";

  const absolute = /^https?:\/\//i.test(src)
    ? src
    : src.startsWith("//")
      ? `https:${src}`
      : `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${src.replace(/^\.\//, "").replace(/^\//, "")}`;

  try {
    const { protocol, hostname } = new URL(absolute);
    if (protocol !== "https:" || !ALLOWED_IMAGE_HOSTS.has(hostname)) return "";
    return absolute;
  } catch {
    return "";
  }
}
