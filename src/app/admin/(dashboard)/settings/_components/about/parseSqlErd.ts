/* SQL DDL → ERD 변환.
 *
 * `CREATE TABLE` 문을 읽어 테이블·컬럼·관계를 만든다.
 * 손으로 테이블과 컬럼을 하나씩 입력하는 대신, 실제 스키마를 붙여넣으면 그대로 반영되게 하는 게 목적이다.
 *
 * 지원 범위 (Postgres/Supabase 기준으로 흔한 형태):
 *  - CREATE TABLE [IF NOT EXISTS] [schema.]name ( ... );
 *  - 컬럼: name type [제약...]  — PRIMARY KEY / REFERENCES 인식
 *  - 테이블 제약: PRIMARY KEY (a, b) / FOREIGN KEY (a) REFERENCES t(b)
 *  - 따옴표("name") 및 스키마 접두사(public.) 제거
 *
 * 파서를 완전한 SQL 문법으로 만들 이유는 없다 —
 * 인식 못 한 줄은 조용히 건너뛰고, 성공한 테이블만 반영한다. */

import type { ErdTable, ErdRelation } from "@/data/about/types";

export interface ParsedErd {
  tables: ErdTable[];
  relations: ErdRelation[];
  /** 인식한 테이블 수 / 건너뛴 줄 등 사용자에게 보여줄 요약 */
  skipped: number;
}

const unquote = (s: string) =>
  s.trim().replace(/^["`[]|["`\]]$/g, "").replace(/^[\w]+\./, "");

/** 괄호 균형을 맞춰 CREATE TABLE 본문을 잘라낸다 (컬럼 타입 안의 괄호 대응) */
function sliceBody(sql: string, openIdx: number): { body: string; end: number } | null {
  let depth = 0;
  for (let i = openIdx; i < sql.length; i++) {
    if (sql[i] === "(") depth++;
    else if (sql[i] === ")") {
      depth--;
      if (depth === 0) return { body: sql.slice(openIdx + 1, i), end: i };
    }
  }
  return null;
}

/** 최상위 콤마로만 분리 (numeric(10,2) 같은 괄호 안 콤마는 무시) */
function splitTop(body: string): string[] {
  const out: string[] = [];
  let depth = 0, cur = "";
  for (const ch of body) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) { out.push(cur); cur = ""; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out;
}

export function parseSqlErd(sql: string): ParsedErd {
  const tables: ErdTable[] = [];
  const relations: ErdRelation[] = [];
  let skipped = 0;

  /* 주석 제거 — 컬럼 설명이 -- 로 붙는 경우가 흔하다 */
  const clean = sql
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/--[^\n]*/g, "");

  const re = /create\s+table\s+(?:if\s+not\s+exists\s+)?([^\s(]+)\s*\(/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(clean)) !== null) {
    const name = unquote(m[1]);
    const sliced = sliceBody(clean, re.lastIndex - 1);
    if (!sliced) { skipped++; continue; }
    re.lastIndex = sliced.end;

    const columns: ErdTable["columns"] = [];
    for (const rawPart of splitTop(sliced.body)) {
      const part = rawPart.trim().replace(/\s+/g, " ");
      if (!part) continue;

      /* 테이블 레벨 제약 */
      const pkTable = part.match(/^(?:constraint\s+\S+\s+)?primary\s+key\s*\(([^)]+)\)/i);
      if (pkTable) {
        const keys = pkTable[1].split(",").map(unquote);
        keys.forEach((k) => {
          const col = columns.find((c) => c.name === k);
          if (col) col.pk = true;
        });
        continue;
      }
      const fkTable = part.match(/^(?:constraint\s+\S+\s+)?foreign\s+key\s*\(([^)]+)\)\s*references\s+([^\s(]+)\s*\(([^)]+)\)/i);
      if (fkTable) {
        const fromField = unquote(fkTable[1].split(",")[0]);
        const to = unquote(fkTable[2]);
        const toField = unquote(fkTable[3].split(",")[0]);
        const col = columns.find((c) => c.name === fromField);
        if (col) col.fk = `${to}.${toField}`;
        relations.push({ from: name, fromField, to, toField, label: "N:1" });
        continue;
      }
      if (/^(constraint|unique|check|exclude|like|primary|foreign)\b/i.test(part)) continue;

      /* 컬럼 정의 */
      const cm = part.match(/^("?[\w]+"?)\s+(.+)$/);
      if (!cm) { skipped++; continue; }
      const colName = unquote(cm[1]);
      const rest = cm[2];
      /* 타입 = 첫 토큰 + 괄호/배열까지. 뒤따르는 제약 키워드(not null, primary key …)는 타입이 아니다.
         double precision 처럼 두 단어인 표준 타입만 예외로 붙여 읽는다. */
      const typeMatch = rest.match(
        /^((?:double\s+precision|character\s+varying|bit\s+varying|timestamp(?:tz)?(?:\s+with(?:out)?\s+time\s+zone)?|time(?:\s+with(?:out)?\s+time\s+zone)?|[\w]+)(?:\s*\([^)]*\))?(?:\s*\[\])?)/i,
      );
      const type = (typeMatch ? typeMatch[1] : rest.split(/\s+/)[0]).replace(/\s+/g, " ").trim();

      const col: ErdTable["columns"][number] = { name: colName, type };
      if (/\bprimary\s+key\b/i.test(rest)) col.pk = true;

      const refInline = rest.match(/references\s+([^\s(]+)\s*(?:\(([^)]+)\))?/i);
      if (refInline) {
        const to = unquote(refInline[1]);
        const toField = refInline[2] ? unquote(refInline[2].split(",")[0]) : "id";
        col.fk = `${to}.${toField}`;
        relations.push({ from: name, fromField: colName, to, toField, label: "N:1" });
      }
      columns.push(col);
    }

    if (columns.length) tables.push({ name, columns });
    else skipped++;
  }

  /* 존재하지 않는 테이블을 가리키는 관계는 버린다 */
  const known = new Set(tables.map((t) => t.name));
  return {
    tables,
    relations: relations.filter((r) => known.has(r.from) && known.has(r.to)),
    skipped,
  };
}
