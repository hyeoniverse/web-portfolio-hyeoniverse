/* About ERD 설정값 검사 — /api/admin/settings PATCH 에서 사용.
 *
 * 클라이언트(ErdTableModal)에서도 같은 규칙으로 막지만,
 * API 를 직접 부르면 클라이언트 검증은 아무 역할을 못 한다. */

// config 는 { delta, savedDefaults } wrapper 구조 — 실제 값은 delta 안에 있음.
// 읽기 경로(src/lib/getSiteConfig.ts)가 `config.delta ?? config` 로 푸는 것과 같게 맞춘다.
function unwrapDelta(cfg: unknown): Record<string, unknown> {
  if (cfg && typeof cfg === "object") {
    const c = cfg as Record<string, unknown>;
    return ("delta" in c && c.delta && typeof c.delta === "object")
      ? (c.delta as Record<string, unknown>)
      : c;
  }
  return {};
}

/**
 * About ERD 필수값 검사 — 통과면 null, 위반이면 사유 문자열 반환.
 *
 * 클라이언트(ErdTableModal)에서도 막지만 API 를 직접 부르면 그대로 통과한다.
 * ErdColumn.type 은 optional 이 아니고 공개 About 패널이 col.type 을 그대로 SVG 에 그리므로,
 * 비어 있으면 배포된 ERD 에 빈 칸이 남는다.
 * UI · API · DB CHECK 3중 검증은 이 저장소 관례 (2026_07_13_posts_title_len.sql 참고).
 */
export function checkAboutErd(cfg: unknown): string | null {
  const about = unwrapDelta(cfg).about;
  if (!about || typeof about !== "object") return null;
  const tables = (about as Record<string, unknown>).erdTables;
  if (tables === undefined || tables === null) return null;
  if (!Array.isArray(tables)) return "about.erdTables 는 배열이어야 합니다.";

  const seenTable = new Set<string>();
  for (let i = 0; i < tables.length; i++) {
    const t = tables[i];
    if (!t || typeof t !== "object") return `erdTables[${i}] 의 형식이 올바르지 않습니다.`;
    const row = t as Record<string, unknown>;

    const tName = typeof row.name === "string" ? row.name.trim() : "";
    if (!tName) return `erdTables[${i}] 의 테이블 이름이 비어 있습니다.`;
    const tKey = tName.toLowerCase();
    if (seenTable.has(tKey)) return `테이블 이름 "${tName}" 이 중복되었습니다.`;
    seenTable.add(tKey);

    const cols = row.columns;
    if (!Array.isArray(cols) || cols.length === 0) return `테이블 "${tName}" 에 컬럼이 없습니다.`;

    const seenCol = new Set<string>();
    for (const c of cols) {
      if (!c || typeof c !== "object") return `테이블 "${tName}" 의 컬럼 형식이 올바르지 않습니다.`;
      const col = c as Record<string, unknown>;
      const cName = typeof col.name === "string" ? col.name.trim() : "";
      const cType = typeof col.type === "string" ? col.type.trim() : "";
      if (!cName) return `테이블 "${tName}" 에 이름이 비어 있는 컬럼이 있습니다.`;
      if (!cType) return `테이블 "${tName}" 의 컬럼 "${cName}" 에 타입이 비어 있습니다.`;
      const cKey = cName.toLowerCase();
      if (seenCol.has(cKey)) return `테이블 "${tName}" 의 컬럼 이름 "${cName}" 이 중복되었습니다.`;
      seenCol.add(cKey);
    }
  }

  /* 관계는 양쪽 테이블이 실제로 있어야 선이 그려진다.
     erdTables 가 delta 에 없으면(= 기본값 그대로) 대조할 대상이 없으니 건너뛴다. */
  const rels = (about as Record<string, unknown>).erdRelations;
  if (Array.isArray(rels) && tables.length > 0) {
    for (let i = 0; i < rels.length; i++) {
      const r = rels[i];
      if (!r || typeof r !== "object") return `erdRelations[${i}] 의 형식이 올바르지 않습니다.`;
      const rel = r as Record<string, unknown>;
      for (const k of ["from", "to", "fromField", "toField"] as const) {
        if (typeof rel[k] !== "string" || !(rel[k] as string).trim()) {
          return `erdRelations[${i}] 의 ${k} 가 비어 있습니다.`;
        }
      }
      for (const k of ["from", "to"] as const) {
        if (!seenTable.has((rel[k] as string).trim().toLowerCase())) {
          return `존재하지 않는 테이블 "${rel[k] as string}" 을 가리킵니다.`;
        }
      }
    }
  }

  return null;
}
