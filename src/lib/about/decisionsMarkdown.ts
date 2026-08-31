import { parseFrontmatter, asArray, asInt, asBool } from "@/lib/frontmatter";
import type {
  TroubleShootingItem,
  TroubleshootingDifficulty,
  TroubleshootingImage,
} from "@/data/about/types";
import type { LocalizedText } from "@/types/common";

/**
 * Design Decisions 항목 ↔ markdown 파일.
 *
 * 쓰기(`itemToMarkdown`)와 읽기(`parseDecisionMarkdown`)를 한 파일에 둔다. 둘이 떨어져
 * 있으면 한쪽만 고쳐도 아무 데서도 안 터지고, 왕복이 조용히 깨진다. 같은 파일에 두면
 * 형식을 바꿀 때 반대쪽이 눈에 들어온다.
 *
 * 형식
 *   ---
 *   id: role-stored-in-app-metadata
 *   section: 인증 / 인가
 *   difficulty: 2
 *   vizKey: perm-store
 *   tags: [auth, jwt]
 *   ---
 *   # 화면 제목
 *
 *   > 증상 한 줄 (problem — 제목과 다를 때만)
 *
 *   ## Context / ## Considerations / ## Decision / ## Key Insight
 *
 * 본문의 `[[viz]]` 한 줄은 그 자리에 도형(vizKey 가 가리키는 컴포넌트)을 그리라는 표시다.
 * 글자로는 뜻이 없지만 위치 정보라서 파일에 그대로 남긴다.
 *
 * 한 항목이 파일 두 개다 — `<이름>.md`(ko) 와 `<이름>.en.md`(en). About 의 모든 텍스트가
 * `LocalizedText` 라서, 한 파일 안에 두 언어를 섞는 것보다 docs/ 가 이미 쓰는
 * `security.md` / `security.en.md` 규칙을 따르는 편이 읽고 고치기 낫다.
 *
 * 왕복하지 않는 필드가 둘 있다.
 *   `comparisons`  내보낼 때 본문에 markdown 표로 적힌다. 되읽으면 그 표가 본문 글자로
 *                  남으므로 화면에 보이는 내용은 유지되지만 구조는 잃는다.
 *   `recommendReason`  아직 형식을 안 정했다.
 * 지금 노출 중인 9개 항목에는 둘 다 없어서 뒤로 미뤘다. 본문에 사람이 손으로 쓴 표는
 * 그냥 본문이므로 아무 영향이 없다 — 실제 항목 하나가 그렇게 쓰여 있다.
 */

/** 본문 소제목 → 항목 필드. 화면이 쓰는 번역 라벨과 같은 말이라 사람이 읽어도 이어진다. */
const SECTION_KEYS = {
  Context: "definition",
  Considerations: "cause",
  Decision: "solution",
  "Key Insight": "keyInsight",
} as const;

type SectionField = (typeof SECTION_KEYS)[keyof typeof SECTION_KEYS];

/** 표 안에서는 `|` 가 칸 구분자라 그대로 두면 열이 밀린다. */
function escapeCell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\n+/g, " ").trim();
}

// ── 쓰기 ────────────────────────────────────────────────────────

export interface MarkdownHeadings {
  definition: string;
  cause: string;
  solution: string;
  keyInsight: string;
}

/** 파서가 소제목으로 필드를 찾으므로 내보낼 때도 같은 영문 라벨을 쓴다. */
export const CANONICAL_HEADINGS: MarkdownHeadings = {
  definition: "Context",
  cause: "Considerations",
  solution: "Decision",
  keyInsight: "Key Insight",
};

export function itemToMarkdown(
  item: TroubleShootingItem,
  language: "ko" | "en",
  headings: MarkdownHeadings = CANONICAL_HEADINGS,
): string {
  const L = (t: LocalizedText | undefined) => t?.[language] ?? "";
  const out: string[] = [];

  const fm: string[] = [`id: ${item.id}`];
  if (item.section) fm.push(`section: ${L(item.section)}`);
  if (item.difficulty) fm.push(`difficulty: ${item.difficulty}`);
  if (item.vizKey) fm.push(`vizKey: ${item.vizKey}`);
  if (item.recommended) fm.push(`recommended: true`);
  if (item.tags?.length) fm.push(`tags: [${item.tags.join(", ")}]`);
  out.push(`---\n${fm.join("\n")}\n---`);

  const title = L(item.title ?? item.problem);
  out.push(`# ${title}`);

  /* problem 은 증상 요약이다. 화면에서는 탐색기 tooltip 에만 나오고 본문 제목이 title 로
     대체되므로, 둘이 다를 때만 인용 한 줄로 남긴다. */
  const problem = L(item.problem);
  if (problem && problem !== title) out.push(`> ${problem}`);

  const sections: Array<[string, string, TroubleshootingImage["position"]]> = [
    [headings.definition, L(item.definition), "definition"],
    [headings.cause, L(item.cause), "cause"],
    [headings.solution, L(item.solution), "solution"],
    [headings.keyInsight, L(item.keyInsight), "insight"],
  ];

  for (const [heading, body, position] of sections) {
    /* `[[viz]]` 한 줄은 그 자리에 도형을 그리라는 표시다. 읽는 용도만 생각하면 지우고 싶지만,
       이 결과물이 그대로 content/about/decisions/ 로 들어가 되읽히므로 지우면 도형이 전부
       섹션 끝으로 몰린다. 형식을 하나로 두려고 남긴다 — 지운 판과 남긴 판을 따로 만들면
       클립보드로 복사한 글을 파일에 넣었을 때 조용히 달라진다. */
    const text = (body ?? "").trim();
    if (!text) continue;
    out.push(`## ${heading}`, text);
    /* 이미지는 어느 섹션 뒤에 붙는지가 곧 position 이다. 그 자리에 그대로 쓰면
       파서가 위치를 따로 적지 않아도 복원한다. */
    for (const image of item.images ?? []) {
      if (!image.src || (image.position ?? "solution") !== position) continue;
      out.push(`![${escapeCell(L(image.alt))}](${image.src})`);
      const caption = L(image.caption);
      if (caption) out.push(`*${caption}*`);
    }
  }

  for (const table of item.comparisons ?? []) {
    const label = L(table.label);
    if (label) out.push(`### ${label}`);
    const header = `| ${table.headers.map((h) => escapeCell(L(h))).join(" | ")} |`;
    const divider = `| ${table.headers.map(() => "---").join(" | ")} |`;
    const rows = table.rows.map((row) => `| ${row.cells.map((c) => escapeCell(L(c))).join(" | ")} |`);
    out.push([header, divider, ...rows].join("\n"));
    const desc = L(table.description);
    if (desc) out.push(desc);
  }

  return `${out.join("\n\n")}\n`;
}

/** 다운로드·파일 이름. 화면의 `01.md` 는 목록 밖으로 나가면 무엇인지 알 수 없어 id 를 붙인다. */
export function itemFileName(item: TroubleShootingItem, index: number, language: "ko" | "en" = "ko"): string {
  const suffix = language === "en" ? ".en.md" : ".md";
  return `${String(index + 1).padStart(2, "0")}-${item.id}${suffix}`;
}

// ── 읽기 ────────────────────────────────────────────────────────

export interface ParsedDecision {
  id: string;
  title: string;
  problem: string;
  section?: string;
  difficulty?: TroubleshootingDifficulty;
  vizKey?: string;
  recommended?: boolean;
  tags: string[];
  body: Record<SectionField, string>;
  images: Array<{ src: string; alt: string; caption?: string; position: TroubleshootingImage["position"] }>;
  warnings: string[];
}

const IMAGE_RE = /^!\[([^\]]*)\]\(([^)]+)\)$/;
const CAPTION_RE = /^\*(.+)\*$/;

/**
 * 한 언어 파일 하나를 읽는다.
 *
 * `fallbackId` 는 파일명에서 뽑은 id — 머리말에 `id:` 가 없을 때 쓴다. 파일명이 곧
 * 항목이라 대개 그걸로 충분하고, 머리말에 적으면 파일명을 바꿔도 항목이 유지된다.
 */
export function parseDecisionMarkdown(raw: string, fallbackId: string): ParsedDecision {
  const { meta, body } = parseFrontmatter(raw);
  const warnings: string[] = [];

  const id = typeof meta.id === "string" && meta.id ? meta.id : fallbackId;

  const difficultyRaw = asInt(meta.difficulty, 1, 3);
  if (meta.difficulty !== undefined && difficultyRaw === undefined) {
    warnings.push(`difficulty 는 1~3 이어야 합니다 — 받은 값 "${String(meta.difficulty)}"`);
  }

  const lines = body.split("\n");
  let title = "";
  let problem = "";
  const collected: Record<string, string[]> = {};
  const images: ParsedDecision["images"] = [];
  let current: SectionField | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!title && trimmed.startsWith("# ")) {
      title = trimmed.slice(2).trim();
      continue;
    }
    if (current === null && !problem && trimmed.startsWith("> ")) {
      problem = trimmed.slice(2).trim();
      continue;
    }
    if (trimmed.startsWith("## ")) {
      const heading = trimmed.slice(3).trim();
      const field = SECTION_KEYS[heading as keyof typeof SECTION_KEYS];
      if (!field) {
        warnings.push(`모르는 소제목 "${heading}" — 본문에서 빠집니다`);
        current = null;
        continue;
      }
      current = field;
      collected[field] ??= [];
      continue;
    }
    if (current === null) continue;

    const image = trimmed.match(IMAGE_RE);
    if (image) {
      images.push({
        alt: image[1],
        src: image[2],
        position: current === "definition" ? "definition"
          : current === "cause" ? "cause"
          : current === "solution" ? "solution" : "insight",
      });
      continue;
    }
    /* 이미지 바로 다음 줄의 `*...*` 한 줄은 그 이미지의 캡션이다. */
    const caption = trimmed.match(CAPTION_RE);
    if (caption && images.length > 0 && collected[current]!.at(-1)?.trim() === "") {
      const last = images[images.length - 1];
      if (!last.caption) { last.caption = caption[1]; continue; }
    }
    collected[current]!.push(line);
  }

  if (!title) warnings.push("`# 제목` 줄이 없습니다");

  const body4 = {
    definition: (collected.definition ?? []).join("\n").trim(),
    cause: (collected.cause ?? []).join("\n").trim(),
    solution: (collected.solution ?? []).join("\n").trim(),
    keyInsight: (collected.keyInsight ?? []).join("\n").trim(),
  };
  for (const [field, text] of Object.entries(body4)) {
    if (!text) warnings.push(`${field} 가 비어 있습니다`);
  }

  return {
    id,
    title,
    problem: problem || title,
    section: typeof meta.section === "string" ? meta.section : undefined,
    difficulty: difficultyRaw as TroubleshootingDifficulty | undefined,
    vizKey: typeof meta.vizKey === "string" ? meta.vizKey : undefined,
    recommended: asBool(meta.recommended),
    tags: asArray(meta.tags),
    body: body4,
    images,
    warnings,
  };
}

const pair = (ko: string, en: string): LocalizedText => ({ ko, en: en || ko });

/**
 * ko / en 파일 한 쌍을 항목 하나로 합친다.
 *
 * en 이 없으면 ko 를 그대로 쓴다. 번역 전 항목이 화면에서 빈칸으로 보이는 것보다
 * 원문이라도 보이는 편이 낫다.
 */
export function mergeDecisionPair(ko: ParsedDecision, en?: ParsedDecision): TroubleShootingItem {
  const item: TroubleShootingItem = {
    id: ko.id,
    problem: pair(ko.problem, en?.problem ?? ""),
    title: pair(ko.title, en?.title ?? ""),
    definition: pair(ko.body.definition, en?.body.definition ?? ""),
    cause: pair(ko.body.cause, en?.body.cause ?? ""),
    solution: pair(ko.body.solution, en?.body.solution ?? ""),
    keyInsight: pair(ko.body.keyInsight, en?.body.keyInsight ?? ""),
  };

  if (ko.section) item.section = pair(ko.section, en?.section ?? "");
  if (ko.difficulty) item.difficulty = ko.difficulty;
  if (ko.vizKey) item.vizKey = ko.vizKey;
  if (ko.recommended) item.recommended = true;
  if (ko.tags.length) item.tags = ko.tags;

  if (ko.images.length) {
    item.images = ko.images.map((image, i) => {
      const twin = en?.images[i];
      const shot: TroubleshootingImage = {
        src: image.src,
        alt: pair(image.alt, twin?.alt ?? ""),
        position: image.position,
      };
      if (image.caption) shot.caption = pair(image.caption, twin?.caption ?? "");
      return shot;
    });
  }

  return item;
}
