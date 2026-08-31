import { unwrapDelta } from "@/lib/settingsDelta";

/**
 * About 콘텐츠 필수값 검사 — 통과면 null, 위반이면 사유 문자열.
 *
 * 설정 화면과 동기화 스크립트가 같은 키에 쓰는데, 검사는 `/api/admin/settings` PATCH 를
 * 직접 부르면 아무것도 없었다. ERD 만 `checkAboutErd` 로 막고 나머지는 뚫려 있었다.
 *
 * **여기서 보는 것은 없으면 화면이 죽는 값들이다.** About 패널은 값이 있다고 믿고
 * `item.cause[language]` 처럼 바로 파고든다. 빠지면 빈 칸이 아니라 TypeError 라서
 * About 페이지가 통째로 안 뜬다. 난이도도 마찬가지로 `DIFFICULTY_META[difficulty]` 를
 * 바로 찾으므로 1~3 밖의 값이 들어오면 같은 결과가 된다.
 *
 * 반대로 없어도 빈 칸으로 끝나는 값(security.icon 처럼 사전에서 못 찾으면 아무것도
 * 안 그리는 것)은 막지 않는다. 검사를 촘촘히 할수록 정상적인 편집이 걸린다.
 *
 * 동기화 스크립트도 DB 에 쓰기 전에 이 함수를 지난다 — 두 경로가 같은 규칙을 쓰지 않으면
 * 한쪽으로 들어온 값이 다른 쪽 검사를 비웃게 된다.
 */

type Rec = Record<string, unknown>;

/** `{ ko, en }` 인가. 둘 다 문자열이어야 화면이 언어 전환에서 안 깨진다. */
function isLocalized(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const v = value as Rec;
  return typeof v.ko === "string" && typeof v.en === "string";
}

/** 화면이 바로 파고드는 네 자리 + 제목. 빠지면 About 페이지가 통째로 안 뜬다. */
const REQUIRED_DECISION_FIELDS = ["problem", "definition", "cause", "solution", "keyInsight"] as const;

function checkDecisions(about: Rec): string | null {
  const items = about.troubleshooting;
  if (items === undefined || items === null) return null;
  if (!Array.isArray(items)) return "about.troubleshooting 은 배열이어야 합니다.";

  const seen = new Set<string>();
  for (let i = 0; i < items.length; i++) {
    const raw = items[i];
    if (!raw || typeof raw !== "object") return `troubleshooting[${i}] 의 형식이 올바르지 않습니다.`;
    const item = raw as Rec;

    const id = typeof item.id === "string" ? item.id.trim() : "";
    if (!id) return `troubleshooting[${i}] 에 id 가 없습니다.`;
    if (seen.has(id)) return `Design Decisions 항목 id "${id}" 가 중복되었습니다.`;
    seen.add(id);

    for (const field of REQUIRED_DECISION_FIELDS) {
      if (!isLocalized(item[field])) {
        return `Design Decisions "${id}" 의 ${field} 가 { ko, en } 형식이 아닙니다.`;
      }
    }

    if (item.difficulty !== undefined) {
      const d = item.difficulty;
      if (d !== 1 && d !== 2 && d !== 3) {
        return `Design Decisions "${id}" 의 difficulty 는 1~3 이어야 합니다.`;
      }
    }
    if (item.section !== undefined && !isLocalized(item.section)) {
      return `Design Decisions "${id}" 의 section 이 { ko, en } 형식이 아닙니다.`;
    }
  }
  return null;
}

/* 항목이 배열인지까지만 본다. 안쪽 문자열이 비면 화면에 빈 칸이 남을 뿐 죽지 않는다. */
const LIST_PANELS = ["security", "features", "process"] as const;

function checkLists(about: Rec): string | null {
  for (const key of LIST_PANELS) {
    const value = about[key];
    if (value === undefined || value === null) continue;
    if (!Array.isArray(value)) return `about.${key} 는 배열이어야 합니다.`;
    for (let i = 0; i < value.length; i++) {
      if (!value[i] || typeof value[i] !== "object" || Array.isArray(value[i])) {
        return `about.${key}[${i}] 의 형식이 올바르지 않습니다.`;
      }
    }
  }
  return null;
}

export function checkAboutContent(cfg: unknown): string | null {
  const about = unwrapDelta(cfg).about;
  if (!about || typeof about !== "object" || Array.isArray(about)) return null;
  const rec = about as Rec;
  return checkDecisions(rec) ?? checkLists(rec);
}
