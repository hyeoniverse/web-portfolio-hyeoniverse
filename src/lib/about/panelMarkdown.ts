import { parseFrontmatter, asArray, type Frontmatter } from "@/lib/frontmatter";

/**
 * 산문형 About 패널 ↔ markdown.
 *
 * Design Decisions(decisionsMarkdown.ts)는 본문이 네 단으로 나뉘어 전용 형식을 쓴다.
 * 나머지 산문 패널 — Security · Features · Process · Overview · Credits — 은 전부
 * "머리말 + 제목 한 줄 + 본문 한 덩어리" 라 형식 하나를 공유한다.
 *
 * **패널 값은 config 모양으로 만든다.** 정적 데이터(`src/data/about/*.ts`)는 `LocalizedText`
 * 를 쓰지만 `site_settings` 에 들어가는 값은 `title_ko` / `title_en` 처럼 평평한 모양이고,
 * 화면이 `adaptSecurity` 같은 함수로 둘을 잇는다. 동기화가 쓰는 자리는 후자다.
 *
 * 언어는 파일 두 개로 가른다 — `<이름>.md`(ko), `<이름>.en.md`(en).
 * 언어와 무관한 값(icon · step · image · tech)은 ko 파일 것을 쓴다.
 */

export interface SimpleDoc {
  meta: Frontmatter;
  /** `# ` 한 줄. 없으면 빈 문자열. */
  title: string;
  /** 제목을 뺀 나머지. */
  body: string;
  warnings: string[];
}

export function parseSimpleMarkdown(
  raw: string,
  opts?: { optionalBody?: boolean },
): SimpleDoc {
  const { meta, body } = parseFrontmatter(raw);
  const warnings: string[] = [];
  const lines = body.split("\n");

  let title = "";
  const rest: string[] = [];
  for (const line of lines) {
    if (!title && line.trim().startsWith("# ")) {
      title = line.trim().slice(2).trim();
      continue;
    }
    rest.push(line);
  }
  if (!title) warnings.push("`# 제목` 줄이 없습니다");
  const text = rest.join("\n").trim();
  /* Credits 처럼 본문(한 줄 메모)이 없는 게 정상인 패널이 있다. */
  if (!text && !opts?.optionalBody) warnings.push("본문이 비어 있습니다");

  return { meta, title, body: text, warnings };
}

function writeSimpleMarkdown(
  meta: Array<[string, string | string[]]>,
  title: string,
  body: string,
): string {
  const fm = meta
    .filter(([, v]) => (Array.isArray(v) ? v.length > 0 : String(v ?? "") !== ""))
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? `[${v.join(", ")}]` : v}`);
  const out: string[] = [];
  if (fm.length > 0) out.push(`---\n${fm.join("\n")}\n---`);
  if (title) out.push(`# ${title}`);
  if (body) out.push(body);
  return `${out.join("\n\n")}\n`;
}

/** 파일명용. 항목 식별에는 쓰지 않는다 — 순서가 곧 정체성이라 이름은 사람이 읽으라고 있는 것. */
export function slugify(text: string): string {
  return (text || "item")
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "item";
}

const str = (v: Frontmatter[string] | undefined): string =>
  typeof v === "string" ? v : "";

// ── Security ───────────────────────────────────────────────────

export interface CfgSecurity {
  icon: string;
  title_ko: string; title_en: string;
  description_ko: string; description_en: string;
  scope_ko: string; scope_en: string;
}

export const securityPanel = {
  fileName: (item: CfgSecurity, i: number) => `${pad(i)}-${slugify(item.title_en || item.title_ko)}`,
  write: (item: CfgSecurity, lang: "ko" | "en") =>
    writeSimpleMarkdown(
      [["icon", item.icon], ["scope", lang === "ko" ? item.scope_ko : item.scope_en]],
      lang === "ko" ? item.title_ko : item.title_en,
      lang === "ko" ? item.description_ko : item.description_en,
    ),
  read: (ko: SimpleDoc, en: SimpleDoc | undefined): CfgSecurity => ({
    icon: str(ko.meta.icon),
    title_ko: ko.title,
    title_en: en?.title || ko.title,
    description_ko: ko.body,
    description_en: en?.body || ko.body,
    scope_ko: str(ko.meta.scope),
    scope_en: str(en?.meta.scope) || str(ko.meta.scope),
  }),
};

// ── Features ───────────────────────────────────────────────────

export interface CfgFeature {
  icon: string; title: string;
  description_ko: string; description_en: string;
  /* config 에서는 쉼표로 이어 붙인 한 줄이다. 화면이 split 해서 칩으로 그린다. */
  tech: string; image: string;
}

export const featuresPanel = {
  fileName: (item: CfgFeature, i: number) => `${pad(i)}-${slugify(item.title)}`,
  write: (item: CfgFeature, lang: "ko" | "en") =>
    writeSimpleMarkdown(
      [
        ["icon", item.icon],
        ["tech", (item.tech || "").split(",").map((s) => s.trim()).filter(Boolean)],
        ["image", item.image],
      ],
      item.title,
      lang === "ko" ? item.description_ko : item.description_en,
    ),
  read: (ko: SimpleDoc, en: SimpleDoc | undefined): CfgFeature => ({
    icon: str(ko.meta.icon),
    /* 제목은 언어가 갈리지 않는 필드다 (config 에 title 하나뿐). ko 파일 것을 쓴다. */
    title: ko.title,
    description_ko: ko.body,
    description_en: en?.body || ko.body,
    tech: asArray(ko.meta.tech).join(", "),
    image: str(ko.meta.image),
  }),
};

// ── Process ────────────────────────────────────────────────────

export interface CfgProcess {
  step: string;
  title_ko: string; title_en: string;
  description_ko: string; description_en: string;
}

export const processPanel = {
  fileName: (item: CfgProcess, i: number) => `${pad(i)}-${slugify(item.title_en || item.title_ko)}`,
  write: (item: CfgProcess, lang: "ko" | "en") =>
    writeSimpleMarkdown(
      [["step", item.step]],
      lang === "ko" ? item.title_ko : item.title_en,
      lang === "ko" ? item.description_ko : item.description_en,
    ),
  read: (ko: SimpleDoc, en: SimpleDoc | undefined): CfgProcess => ({
    step: str(ko.meta.step),
    title_ko: ko.title,
    title_en: en?.title || ko.title,
    description_ko: ko.body,
    description_en: en?.body || ko.body,
  }),
};

// ── Overview ───────────────────────────────────────────────────

interface CfgStat { value: string; label_ko: string; label_en: string }
export interface OverviewValues {
  overview_description_ko: string;
  overview_description_en: string;
  overview_highlights: string;
  overview_stats: CfgStat[];
}

const STATS_HEADING = "## Stats";

/* 카드 라벨에 줄바꿈이 들어간다("개발 기간\n(2/5 – 진행 중)"). 표 칸에는 실제 줄바꿈을
   넣을 수 없어 `<br>` 로 바꿔 적고 되읽을 때 되돌린다. */
const brOut = (s: string) => s.replace(/\n/g, "<br>");
const brIn = (s: string) => s.replace(/<br\s*\/?>/gi, "\n");

export const overviewPanel = {
  write: (values: OverviewValues, lang: "ko" | "en") => {
    const stats = values.overview_stats ?? [];
    const table = stats.length === 0 ? "" : [
      STATS_HEADING,
      "",
      "| value | label |",
      "| --- | --- |",
      ...stats.map((s) => `| ${s.value} | ${brOut(lang === "ko" ? s.label_ko : s.label_en)} |`),
    ].join("\n");
    const body = [
      lang === "ko" ? values.overview_description_ko : values.overview_description_en,
      table,
    ].filter(Boolean).join("\n\n");
    return writeSimpleMarkdown(
      [["highlights", (values.overview_highlights || "").split(",").map((s) => s.trim()).filter(Boolean)]],
      "Overview",
      body,
    );
  },
  read: (ko: SimpleDoc, en: SimpleDoc | undefined): OverviewValues => {
    const split = (doc: SimpleDoc | undefined) => {
      const text = doc?.body ?? "";
      const at = text.indexOf(STATS_HEADING);
      return at === -1
        ? { description: text.trim(), rows: [] as string[] }
        : {
            description: text.slice(0, at).trim(),
            rows: text.slice(at).split("\n").filter((l) => l.trim().startsWith("|")).slice(2),
          };
    };
    const a = split(ko);
    const b = split(en);
    const cell = (row: string, i: number) => (row.split("|").slice(1, -1)[i] ?? "").trim();
    return {
      overview_description_ko: a.description,
      overview_description_en: b.description || a.description,
      overview_highlights: asArray(ko.meta.highlights).join(", "),
      overview_stats: a.rows.map((row, i) => ({
        value: cell(row, 0),
        label_ko: brIn(cell(row, 1)),
        label_en: brIn(cell(b.rows[i] ?? row, 1)),
      })),
    };
  },
};

// ── Credits ────────────────────────────────────────────────────

export interface CreditsValues {
  creditsNames: string[];
  /** en */
  creditsNote: string;
  creditsNote_ko: string;
}

/* 타이포(폰트·크기·정렬)는 옮기지 않는다. 글이 아니라 설정이고, 설정 화면에서 눈으로
   맞추는 값이라 파일로 빼면 오히려 손이 는다. */
export const creditsPanel = {
  /* 덧붙이는 메모라 비어 있는 게 기본값이다. */
  optionalBody: true,
  write: (values: CreditsValues, lang: "ko" | "en") =>
    writeSimpleMarkdown(
      [["names", values.creditsNames ?? []]],
      "Credits",
      lang === "ko" ? values.creditsNote_ko : values.creditsNote,
    ),
  read: (ko: SimpleDoc, en: SimpleDoc | undefined): CreditsValues => ({
    creditsNames: asArray(ko.meta.names),
    creditsNote_ko: ko.body,
    creditsNote: en?.body ?? "",
  }),
};

function pad(i: number): string {
  return String(i + 1).padStart(2, "0");
}
