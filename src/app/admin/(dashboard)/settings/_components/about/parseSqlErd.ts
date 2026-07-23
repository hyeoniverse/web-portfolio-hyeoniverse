/* SQL DDL → ERD 변환.
 *
 * 스키마 덤프(setup.sql 등)를 통째로 붙여넣으면 테이블·컬럼·관계를 만든다.
 * 손으로 하나씩 입력하는 대신 실제 스키마가 그대로 반영되게 하는 게 목적이다.
 *
 * 문장을 **문서 순서대로** 적용한다 — ALTER 는 그 앞의 CREATE 결과 위에서 동작해야 하므로
 * CREATE 만 먼저 훑는 방식으로는 안 된다.
 *
 * 지원 범위 (Postgres/Supabase 기준으로 흔한 형태):
 *  - CREATE TABLE [IF NOT EXISTS] [schema.]name ( ... )
 *    · 컬럼: name type [제약...] — PRIMARY KEY / REFERENCES 인식
 *    · 테이블 제약: PRIMARY KEY (a, b) / FOREIGN KEY (a) REFERENCES t(b)
 *  - ALTER TABLE [IF EXISTS] [ONLY] name
 *    · ADD [COLUMN] name type [제약...]
 *    · ADD [CONSTRAINT c] FOREIGN KEY (a) REFERENCES t(b)
 *    · ADD [CONSTRAINT c] PRIMARY KEY (a, b)
 *    · DROP [COLUMN] name
 *    · ALTER [COLUMN] name [SET DATA] TYPE newtype
 *    · RENAME TO newname / RENAME [COLUMN] a TO b
 *  - DROP TABLE [IF EXISTS] name
 *  - CREATE [OR REPLACE] [MATERIALIZED] VIEW — 뷰도 노드로 그린다 (kind: "view")
 *  - CREATE TABLE … AS SELECT — SELECT 목록에서 컬럼을 읽는다
 *  - CREATE TYPE … AS ENUM / ALTER TYPE … ADD VALUE — 컬럼 타입에 값 목록을 붙인다
 *  - CREATE [UNIQUE] INDEX — 어느 컬럼이 조회 경로인지 표시
 *  - COMMENT ON TABLE/COLUMN — 설명으로 붙인다
 *  - DO $$ … $$ 블록 안의 위 구문 (마이그레이션이 "있으면 건너뛰기" 로 감싸는 흔한 형태)
 *  - 따옴표("name") 및 스키마 접두사(public.) 제거
 *
 * ERD 와 무관한 구문(인덱스·정책·함수·트리거·GRANT·INSERT …)은 "건너뜀" 으로 세지 않고
 * 조용히 무시한다 — 실제 덤프는 그런 문장이 대부분이라, 세면 경고가 의미를 잃는다.
 *
 * 파서를 완전한 SQL 문법으로 만들 이유는 없다 — 못 읽은 것만 skipped 로 알린다. */

import type { ErdTable, ErdRelation } from "@/data/about/types";

export interface ParsedErd {
  tables: ErdTable[];
  relations: ErdRelation[];
  /** 읽으려다 실패한 문장/조각 수 — 무시 대상(인덱스 등)은 포함하지 않는다 */
  skipped: number;
  /** 문법은 알아봤지만 ERD 에 그릴 게 없어 넘긴 문장 수 (함수·인덱스·정책·GRANT …) */
  ignored: number;
  /** 읽어들인 전체 문장 수 — "읽긴 읽었는데 그릴 게 없음" 을 구분하는 데 쓴다 */
  statements: number;
  /** ALTER 대상인데 ERD 에도 이 SQL 에도 없어 적용하지 못한 테이블 이름 */
  unresolved: string[];
  /** ALTER 를 읽었지만 ERD 에 그릴 변화가 없던 테이블 (CHECK 제약·기본값·RLS …) */
  noEffect: string[];
  /** 편집기에 밑줄로 표시할 문제 — 원본 SQL 기준 위치를 담는다 */
  issues: SqlIssue[];
  /** DROP/RENAME 으로 **없어져야 하는** 테이블.
   *  결과 목록에서 빠지는 것만으로는 "언급 안 함(유지)" 과 구별되지 않아 따로 알린다. */
  removedTables: string[];
  /** DROP COLUMN 으로 없어져야 하는 컬럼 — 병합이 되살리지 않도록 */
  removedColumns: { table: string; column: string }[];
}

export type SqlIssueKind =
  | "unreadable"   // 무엇인지 알아볼 수 없는 문장
  | "unbalanced"   // 괄호가 닫히지 않음
  | "empty-table"  // CREATE TABLE 에서 읽어낸 컬럼이 없음
  | "bad-column"   // 컬럼 정의를 읽지 못함
  | "bad-action"   // ALTER 동작을 읽지 못함
  | "unresolved"   // ALTER 대상 테이블이 어디에도 없음
  | "unknown-ref"; // REFERENCES 대상 테이블이 없어 관계가 버려짐

export interface SqlIssue {
  kind: SqlIssueKind;
  /** 원본 SQL 기준 문자 위치 */
  from: number;
  to: number;
  /** 테이블 이름 등 안내에 끼워 넣을 값 */
  name?: string;
}

/** 잘라낸 조각과 그 시작 위치 — 위치가 어긋나면 밑줄이 엉뚱한 곳에 그어진다 */
interface Frag { text: string; from: number }

/** 앞뒤 공백을 떼면서 시작 위치도 같이 옮긴다 */
function trimFrag(text: string, from: number): Frag {
  const lead = text.length - text.trimStart().length;
  return { text: text.trim(), from: from + lead };
}

type Column = ErdTable["columns"][number];

/* 스키마 접두사를 **먼저** 떼고 그다음 감싼 따옴표를 벗긴다.
   순서가 반대면 public."works" 가 따옴표만 뒤쪽 하나 벗겨져 `"works` 로 남는다. */
const unquote = (s: string) =>
  s.trim()
    .replace(/^(?:"[^"]*"|`[^`]*`|\[[^\]]*\]|\w+)\s*\./, "")
    .replace(/^["`[]/, "")
    .replace(/["`\]]$/, "");

/** 괄호 균형을 맞춰 본문을 잘라낸다 (컬럼 타입 안의 괄호 대응) */
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

/** 최상위 콤마로만 분리 (numeric(10,2) 같은 괄호 안 콤마는 무시).
 *  base 는 body 가 원본 SQL 에서 시작하는 위치 — 진단 밑줄을 조각 단위로 긋기 위해 함께 나른다. */
function splitTop(body: string, base: number): Frag[] {
  const out: Frag[] = [];
  let depth = 0, cur = "", start = 0;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      if (cur.trim()) out.push(trimFrag(cur, base + start));
      cur = ""; start = i + 1; continue;
    }
    cur += ch;
  }
  if (cur.trim()) out.push(trimFrag(cur, base + start));
  return out;
}

/** 세미콜론으로 문장 분리 — 괄호·따옴표·달러인용($tag$) 안의 세미콜론은 문장 끝이 아니다.
 *  setup.sql 은 함수 본문이 `$fn$ … $fn$`, DO 블록이 `$$ … $$` 라
 *  이걸 다루지 않으면 문장이 조각나 엉뚱한 파편이 전부 "건너뜀" 으로 잡힌다. */
function splitStatements(sql: string): Frag[] {
  const out: Frag[] = [];
  let cur = "", depth = 0, i = 0, start = 0;
  let quote: string | null = null;
  let dollar: string | null = null;

  while (i < sql.length) {
    const ch = sql[i];

    if (dollar) {                       // 달러인용 안 — 닫는 태그까지 통째로 삼킨다
      if (sql.startsWith(dollar, i)) { cur += dollar; i += dollar.length; dollar = null; continue; }
      cur += ch; i++; continue;
    }
    if (quote) {                        // 문자열/따옴표 식별자 안
      cur += ch;
      if (ch === quote) quote = null;
      i++; continue;
    }
    if (ch === "'" || ch === '"') { quote = ch; cur += ch; i++; continue; }

    const dq = /^\$[A-Za-z_]*\$/.exec(sql.slice(i, i + 32));
    if (dq) { dollar = dq[0]; cur += dollar; i += dollar.length; continue; }

    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === ";" && depth === 0) {
      if (cur.trim()) out.push(trimFrag(cur, start));
      cur = ""; i++; start = i; continue;
    }
    cur += ch; i++;
  }
  if (cur.trim()) out.push(trimFrag(cur, start));
  return out;
}

/* 타입 = 첫 토큰 + 괄호/배열까지. 뒤따르는 제약 키워드(not null, primary key …)는 타입이 아니다.
   double precision 처럼 두 단어인 표준 타입만 예외로 붙여 읽는다. */
const TYPE_RE =
  /^((?:double\s+precision|character\s+varying|bit\s+varying|timestamp(?:tz)?(?:\s+with(?:out)?\s+time\s+zone)?|time(?:\s+with(?:out)?\s+time\s+zone)?|[\w]+)(?:\s*\([^)]*\))?(?:\s*\[\])?)/i;

/** "name type [제약…]" 한 조각 → 컬럼. 인라인 REFERENCES 는 관계로도 쌓는다. */
function parseColumnDef(
  part: string, table: string, relations: ErdRelation[],
  refSites: SqlIssue[], site: { from: number; to: number },
): Column | null {
  const cm = part.match(/^("?[\w]+"?)\s+(.+)$/);
  if (!cm) return null;
  const name = unquote(cm[1]);
  const rest = cm[2];
  const typeMatch = rest.match(TYPE_RE);
  const type = (typeMatch ? typeMatch[1] : rest.split(/\s+/)[0]).replace(/\s+/g, " ").trim();

  const col: Column = { name, type };
  if (/\bprimary\s+key\b/i.test(rest)) col.pk = true;
  /* PK 는 정의상 NOT NULL 이다 — SQL 에 안 적혀도 참이다 */
  if (col.pk || /\bnot\s+null\b/i.test(rest)) col.required = true;
  /* UNIQUE 뒤에 괄호가 오면 그건 테이블 제약이 잘못 붙은 것 — 컬럼 UNIQUE 만 본다 */
  if (/\bunique\b(?!\s*\()/i.test(rest)) col.unique = true;
  /* serial 계열과 IDENTITY 는 기본값이 자동 증가라는 뜻이다 */
  if (/^(?:big|small)?serial\b/i.test(type)) col.defaultValue = "auto";
  if (/\bgenerated\s+(?:always|by\s+default)\s+as\s+identity\b/i.test(rest)) col.defaultValue = "auto";
  /* 생성 컬럼은 식 자체가 값이다 */
  const gen = rest.match(/\bgenerated\s+always\s+as\s*\(([\s\S]+)\)\s*stored\b/i);
  if (gen) col.defaultValue = gen[1].trim().replace(/\s+/g, " ");
  /* DEFAULT 뒤는 다음 제약 키워드 직전까지 — `default now() not null` 에서 not null 을 삼키면 안 된다 */
  const def = rest.match(
    /\bdefault\s+([\s\S]+?)(?=\s+(?:not\s+null|null|unique|primary\s+key|references|check|constraint|collate|generated|deferrable|on\s+delete|on\s+update)\b|$)/i);
  if (def) col.defaultValue = def[1].trim().replace(/\s+/g, " ");

  const ref = rest.match(/references\s+([^\s(]+)\s*(?:\(([^)]+)\))?/i);
  if (ref) {
    const to = unquote(ref[1]);
    const toField = ref[2] ? unquote(ref[2].split(",")[0]) : "id";
    col.fk = `${to}.${toField}`;
    relations.push({ from: table, fromField: name, to, toField, label: "N:1" });
    /* 대상 테이블이 끝내 없으면 관계가 조용히 버려진다 — 그 자리를 표시할 수 있게 남긴다.
       part 는 공백이 축약된 사본이라 그 안의 상대 위치는 원본과 어긋난다 → 컬럼 조각 전체를 가리킨다. */
    refSites.push({ kind: "unknown-ref", name: to, from: site.from, to: site.to });
  }
  return col;
}

/** SELECT 목록에서 컬럼 이름을 뽑는다 — 뷰와 CREATE TABLE AS 는 이것 말고 컬럼을 알 방법이 없다.
 *  질의를 해석하는 게 아니라 **이름만** 본다: `식 AS 별칭` 은 별칭, `t.col` 은 col,
 *  `*` 는 원본 테이블이 이미 알려져 있을 때만 펼친다. 타입을 알 수 없으면 원본에서 가져온다. */
function columnsFromSelect(q: string, find: (n: string) => ErdTable | undefined): Column[] | null {
  const m = q.match(/\bselect\s+(?:distinct\s+(?:on\s*\([^)]*\)\s*)?)?([\s\S]+?)\s+from\s+([^\s;()]+)/i);
  if (!m) return null;
  const src = find(unquote(m[2]));
  const out: Column[] = [];
  for (const item of splitTop(m[1], 0)) {
    const text = item.text.replace(/\s+/g, " ").trim();
    if (!text) continue;
    if (text === "*" || /\.\*$/.test(text)) {
      if (!src) return null;                 // 무엇이 펼쳐지는지 알 수 없다
      src.columns.forEach((c) => out.push({ ...c }));
      continue;
    }
    const alias = text.match(/\s+as\s+("?[\w]+"?)$/i);
    const name = alias ? unquote(alias[1]) : (text.split(/\s/)[0].split(".").pop() ?? "").replace(/"/g, "");
    if (!/^\w+$/.test(name)) return null;    // 식만 있고 이름이 없으면 컬럼을 지어내지 않는다
    const from = src?.columns.find((c) => c.name === name);
    out.push(from ? { ...from } : { name, type: "?" });
  }
  return out.length ? out : null;
}

/** 절차 블록(DO $$ … $$) 안에서 DDL 문장만 잘라낸다.
 *  PL/pgSQL 문법을 흉내 내지 않는다 — CREATE/ALTER/DROP TABLE 이 시작되는 지점부터
 *  같은 깊이의 세미콜론까지만 떼어 오면 IF/BEGIN/LOOP 같은 제어문에 걸리지 않는다. */
function extractDdl(body: string, base: number): Frag[] {
  const out: Frag[] = [];
  const re = /\b(?:create\s+(?:unlogged\s+|temp(?:orary)?\s+)?table|alter\s+table|drop\s+table)\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    let depth = 0, end = body.length;
    let quote: string | null = null;
    for (let i = m.index; i < body.length; i++) {
      const ch = body[i];
      if (quote) { if (ch === quote) quote = null; continue; }
      if (ch === "'" || ch === '"') { quote = ch; continue; }
      if (ch === "(") depth++;
      else if (ch === ")") depth--;
      else if (ch === ";" && depth === 0) { end = i; break; }
    }
    out.push(trimFrag(body.slice(m.index, end), base + m.index));
    re.lastIndex = end;
  }
  return out;
}

/** ERD 와 무관해 조용히 넘기는 문장 — 세면 "건너뜀" 경고가 의미를 잃는다 */
const IGNORED_STMT =
  /^(?:create\s+(?:unique\s+)?index|create\s+(?:or\s+replace\s+)?(?:function|procedure|view|materialized\s+view|trigger|policy|rule|type|domain|sequence|extension|schema|publication)|comment\s+on|grant|revoke|insert|update|delete|select|with|do|set|begin|commit|rollback|truncate|analyze|vacuum|refresh|listen|notify|alter\s+(?:sequence|index|view|function|schema|type|publication|default)|drop\s+(?:index|function|policy|trigger|type|view|sequence|extension|schema))\b/i;

/** @param base 이미 ERD 에 있는 테이블 — ALTER 의 대상을 여기서 찾는다.
 *  ALTER 는 기존 테이블 위에서만 의미가 있어, 빈 상태로 시작하면 영영 적용되지 않는다.
 *  결과에는 **이 SQL 이 실제로 건드린 테이블만** 담는다(안 건드린 기존 테이블까지 돌려주면
 *  병합 쪽에서 전부 '갱신됨' 으로 보인다). */
export function parseSqlErd(sql: string, base: ErdTable[] = []): ParsedErd {
  /* 원본을 건드리지 않도록 복제해서 작업한다 */
  const tables: ErdTable[] = base.map((t) => ({ ...t, columns: t.columns.map((c) => ({ ...c })) }));
  const baseNames = new Set(base.map((t) => t.name));
  /* 이 SQL 이 실제로 만들거나 바꾼 테이블 */
  const touched = new Set<string>();
  const relations: ErdRelation[] = [];
  let skipped = 0;
  let ignored = 0;
  let statements = 0;
  const unresolved = new Set<string>();
  const noEffect = new Set<string>();
  /* "SQL 에 없다" 와 "SQL 이 지웠다" 는 다르다 — 후자를 명시적으로 모은다 */
  const removedTables = new Set<string>();
  const removedColumns = new Set<string>();   // `${table}.${column}`
  /* CREATE TYPE … AS ENUM — 타입 이름만으로는 무엇이 들어가는지 알 수 없다 */
  const enums = new Map<string, string[]>();
  const issues: SqlIssue[] = [];
  const refSites: SqlIssue[] = [];
  const bad = (kind: SqlIssueKind, f: Frag, name?: string) =>
    issues.push({ kind, from: f.from, to: f.from + f.text.length, name });

  /* 주석 제거 — 컬럼 설명이 -- 로 붙는 경우가 흔하다 */
  /* 주석은 지우지 않고 **같은 길이의 공백으로 덮는다** — 글자를 빼면 뒤쪽 위치가 전부 밀려
     진단 밑줄이 엉뚱한 줄에 그어진다. 줄바꿈은 살려 줄 번호도 그대로 유지한다. */
  const blank = (m: string) => m.replace(/[^\n]/g, " ");
  const clean = sql
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/--[^\n]*/g, blank);

  const find = (name: string) => tables.find((t) => t.name === name);

  /* 한 문장 적용 — DO 블록 안의 DDL 도 똑같은 경로를 타야 해서 함수로 뺀다 */
  const apply = (frag: Frag): void => {
    const stmt = frag.text;
    /* ── CREATE TABLE ── */
    const create = stmt.match(/^create\s+(?:unlogged\s+|temp(?:orary)?\s+)?table\s+(?:if\s+not\s+exists\s+)?([^\s(]+)\s*\(/i);
    if (create) {
      const name = unquote(create[1]);
      const openIdx = stmt.indexOf("(", create[0].length - 1);
      const sliced = sliceBody(stmt, openIdx);
      /* 괄호가 안 닫히면 컬럼을 하나도 못 읽는다 — 가장 흔한 붙여넣기 사고다 */
      if (!sliced) { skipped++; bad("unbalanced", frag); return; }

      const columns: Column[] = [];
      for (const partFrag of splitTop(sliced.body, frag.from + openIdx + 1)) {
        const part = partFrag.text.replace(/\s+/g, " ");
        if (!part) continue;

        const pkTable = part.match(/^(?:constraint\s+\S+\s+)?primary\s+key\s*\(([^)]+)\)/i);
        if (pkTable) {
          pkTable[1].split(",").map(unquote).forEach((k) => {
            const col = columns.find((c) => c.name === k);
            if (col) col.pk = true;
          });
          continue;
        }
        const fkTable = part.match(/^(?:constraint\s+\S+\s+)?foreign\s+key\s*\(([^)]+)\)\s*references\s+([^\s(]+)\s*(?:\(([^)]+)\))?/i);
        if (fkTable) {
          /* 복합 FK — 첫 컬럼만 읽으면 나머지 짝의 선이 통째로 사라진다 */
          const froms = fkTable[1].split(",").map(unquote);
          const to = unquote(fkTable[2]);
          const tos = fkTable[3] ? fkTable[3].split(",").map(unquote) : ["id"];
          froms.forEach((fromField, k) => {
            const toField = tos[k] ?? tos[0];
            const col = columns.find((c) => c.name === fromField);
            if (col) col.fk = `${to}.${toField}`;
            relations.push({ from: name, fromField, to, toField, label: "N:1" });
          });
          continue;
        }
        /* 테이블 레벨 UNIQUE — 해당 컬럼들에 표시 */
        const uqTable = part.match(/^(?:constraint\s+\S+\s+)?unique\s*(?:nulls\s+(?:not\s+)?distinct\s*)?\(([^)]+)\)/i);
        if (uqTable) {
          uqTable[1].split(",").map(unquote).forEach((k) => {
            const col = columns.find((c) => c.name === k);
            if (col) col.unique = true;
          });
          continue;
        }
        /* LIKE other — 다른 테이블의 컬럼을 그대로 복제한다 */
        const like = part.match(/^like\s+([^\s(]+)/i);
        if (like) {
          const src = find(unquote(like[1]));
          if (src) src.columns.forEach((c) => columns.push({ ...c }));
          else bad("unresolved", frag, unquote(like[1]));
          continue;
        }
        if (/^(constraint|unique|check|exclude|primary|foreign|exclude)\b/i.test(part)) continue;

        const col = parseColumnDef(part, name, relations, refSites,
          { from: partFrag.from, to: partFrag.from + partFrag.text.length });
        if (!col) { skipped++; bad("bad-column", partFrag); continue; }
        columns.push(col);
      }

      /* INHERITS (parent) — 부모 컬럼을 물려받는다. 자식 정의가 우선이므로 뒤에 붙인다. */
      const inherits = stmt.slice(sliced.end).match(/\binherits\s*\(([^)]+)\)/i);
      if (inherits) {
        inherits[1].split(",").map(unquote).forEach((pn) => {
          const parent = find(pn);
          if (!parent) { bad("unresolved", frag, pn); return; }
          parent.columns.forEach((c) => {
            if (!columns.some((x) => x.name === c.name)) columns.push({ ...c });
          });
        });
      }

      if (!columns.length) { skipped++; bad("empty-table", frag); return; }
      const existing = find(name);
      if (existing) existing.columns = columns;   // 같은 이름을 다시 만들면 최신 정의로
      else tables.push({ name, columns });
      touched.add(name);
      return;
    }

    /* ── CREATE VIEW / MATERIALIZED VIEW ──
       뷰도 스키마의 일부다. 실체 테이블과 구분해 kind 로 표시한다. */
    const view = stmt.match(/^create\s+(?:or\s+replace\s+)?(?:temp(?:orary)?\s+|materialized\s+)?view\s+(?:if\s+not\s+exists\s+)?([^\s(]+)([\s\S]*)$/i);
    if (view) {
      const name = unquote(view[1]);
      /* 컬럼 이름을 괄호로 직접 준 경우가 우선 — CREATE VIEW v (a, b) AS SELECT … */
      const explicit = view[2].match(/^\s*\(([^)]+)\)/);
      const columns = explicit
        ? splitTop(explicit[1], 0).map((f) => ({ name: unquote(f.text), type: "?" }))
        : columnsFromSelect(view[2], find);
      if (!columns?.length) { ignored++; return; }
      const at = tables.findIndex((t) => t.name === name);
      const next: ErdTable = { name, columns, kind: "view" };
      if (at >= 0) tables[at] = next; else tables.push(next);
      touched.add(name);
      removedTables.delete(name);
      return;
    }

    /* ── CREATE TABLE … AS SELECT ── */
    const ctas = stmt.match(/^create\s+(?:unlogged\s+|temp(?:orary)?\s+)?table\s+(?:if\s+not\s+exists\s+)?([^\s(]+)\s+as\s+([\s\S]+)$/i);
    if (ctas) {
      const name = unquote(ctas[1]);
      const columns = columnsFromSelect(ctas[2], find);
      if (!columns?.length) { ignored++; return; }
      const at = tables.findIndex((t) => t.name === name);
      if (at >= 0) tables[at].columns = columns; else tables.push({ name, columns });
      touched.add(name);
      removedTables.delete(name);
      return;
    }

    /* ── CREATE TYPE … AS ENUM ── */
    const enumDef = stmt.match(/^create\s+type\s+([^\s(]+)\s+as\s+enum\s*\(([\s\S]*)\)/i);
    if (enumDef) {
      enums.set(unquote(enumDef[1]).toLowerCase(),
        splitTop(enumDef[2], 0).map((f) => f.text.replace(/^'|'$/g, "")).filter(Boolean));
      return;
    }
    const enumAdd = stmt.match(/^alter\s+type\s+([^\s]+)\s+add\s+value\s+(?:if\s+not\s+exists\s+)?'([^']*)'/i);
    if (enumAdd) {
      const key = unquote(enumAdd[1]).toLowerCase();
      const list = enums.get(key) ?? [];
      if (!list.includes(enumAdd[2])) list.push(enumAdd[2]);
      enums.set(key, list);
      return;
    }
    if (/^drop\s+type\b/i.test(stmt)) {
      stmt.replace(/^drop\s+type\s+(?:if\s+exists\s+)?/i, "")
        .split(",").forEach((n) => enums.delete(unquote(n.replace(/\s+cascade|\s+restrict/i, "")).toLowerCase()));
      return;
    }

    /* ── CREATE INDEX ──
       인덱스는 그 자체로 그릴 게 없지만, 어느 컬럼이 조회 경로인지는 스키마의 중요한 사실이다. */
    const index = stmt.match(/^create\s+(unique\s+)?index\s+(?:concurrently\s+)?(?:if\s+not\s+exists\s+)?(?:[^\s(]+\s+)?on\s+(?:only\s+)?([^\s(]+)\s*(?:using\s+\w+\s*)?\(([^)]*)\)/i);
    if (index) {
      const target = find(unquote(index[2]));
      if (!target) { ignored++; return; }
      let hit = false;
      splitTop(index[3], 0).forEach((f) => {
        /* 식 인덱스(lower(x))는 특정 컬럼으로 귀속시키지 않는다 */
        const cn = unquote(f.text.replace(/\s+(asc|desc|nulls\s+(first|last))\b/gi, "").trim());
        const col = target.columns.find((c) => c.name === cn);
        if (!col) return;
        col.indexed = true;
        if (index[1]) col.unique = true;
        hit = true;
      });
      if (hit) touched.add(target.name); else ignored++;
      return;
    }

    /* ── COMMENT ON ── */
    const comment = stmt.match(/^comment\s+on\s+(table|column|view|materialized\s+view)\s+([^\s]+)\s+is\s+([\s\S]+)$/i);
    if (comment) {
      const raw = comment[3].trim();
      const text = /^null$/i.test(raw) ? undefined : raw.replace(/^'|'$/g, "").replace(/''/g, "'");
      const path = comment[2].split(".").map((x) => x.replace(/^["`[]|["`\]]$/g, ""));
      if (/^column$/i.test(comment[1])) {
        const cn = path.pop()!;
        const target = find(path.pop() ?? "");
        const col = target?.columns.find((c) => c.name === cn);
        if (!target || !col) { ignored++; return; }
        if (text) col.comment = text; else delete col.comment;
        touched.add(target.name);
      } else {
        const target = find(path.pop() ?? "");
        if (!target) { ignored++; return; }
        if (text) target.comment = text; else delete target.comment;
        touched.add(target.name);
      }
      return;
    }

    /* ── DROP TABLE ── */
    /* 뷰도 노드로 그리므로 DROP VIEW 역시 같은 경로를 탄다 */
    const drop = stmt.match(/^drop\s+(?:table|(?:materialized\s+)?view)\s+(?:if\s+exists\s+)?([^\s;]+)/i);
    if (drop) {
      const name = unquote(drop[1]);
      const at = tables.findIndex((t) => t.name === name);
      if (at >= 0) tables.splice(at, 1);
      touched.delete(name);
      removedTables.add(name);
      [...removedColumns].forEach((k) => {
        if (k.startsWith(`${name}.`)) removedColumns.delete(k);
      });
      for (let k = relations.length - 1; k >= 0; k--) {
        if (relations[k].from === name || relations[k].to === name) relations.splice(k, 1);
      }
      return;
    }

    /* ── ALTER TABLE ── */
    const alter = stmt.match(/^alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?([^\s]+)\s+([\s\S]+)$/i);
    if (alter) {
      const name = unquote(alter[1]);
      const target = find(name);
      /* 만들어진 적도 없고 기존 ERD 에도 없는 테이블은 손댈 수 없다.
         문법 오류와는 원인이 달라 따로 모은다 — 안내 문구가 엉뚱하게 문법을 탓하지 않도록. */
      if (!target) {
        unresolved.add(name);
        /* 문장 전체가 아니라 대상 이름에만 밑줄 — 무엇이 문제인지 바로 보이게 */
        const at = frag.from + stmt.toLowerCase().indexOf(alter[1].toLowerCase());
        issues.push({ kind: "unresolved", name, from: at, to: at + alter[1].length });
        return;
      }
      /* ERD 에 보이는 변화가 있을 때만 '건드림' 으로 친다 — CHECK 제약만 붙이는 ALTER 까지
         결과에 넣으면 바뀐 게 없는 테이블이 미리보기에 '갱신됨' 으로 잡힌다. */
      let changed = false;
      let touchName = name;

      for (const actionFrag of splitTop(alter[2], frag.from + stmt.length - alter[2].length)) {
        const action = actionFrag.text.replace(/\s+/g, " ");
        if (!action) continue;

        /* ADD [CONSTRAINT] FOREIGN KEY */
        const addFk = action.match(/^add\s+(?:constraint\s+\S+\s+)?foreign\s+key\s*\(([^)]+)\)\s*references\s+([^\s(]+)\s*(?:\(([^)]+)\))?/i);
        if (addFk) {
          const fromField = unquote(addFk[1].split(",")[0]);
          const to = unquote(addFk[2]);
          const toField = addFk[3] ? unquote(addFk[3].split(",")[0]) : "id";
          const col = target.columns.find((c) => c.name === fromField);
          if (col) col.fk = `${to}.${toField}`;
          relations.push({ from: name, fromField, to, toField, label: "N:1" });
          changed = true;
          continue;
        }
        /* ADD [CONSTRAINT] PRIMARY KEY */
        const addPk = action.match(/^add\s+(?:constraint\s+\S+\s+)?primary\s+key\s*\(([^)]+)\)/i);
        if (addPk) {
          addPk[1].split(",").map(unquote).forEach((k) => {
            const col = target.columns.find((c) => c.name === k);
            if (col) col.pk = true;
          });
          changed = true;
          continue;
        }
        /* ADD [CONSTRAINT] UNIQUE (cols) — 해당 컬럼에 표시 */
        const addUq = action.match(/^add\s+(?:constraint\s+\S+\s+)?unique\s*(?:nulls\s+(?:not\s+)?distinct\s*)?\(([^)]+)\)/i);
        if (addUq) {
          addUq[1].split(",").map(unquote).forEach((k) => {
            const col = target.columns.find((c) => c.name === k);
            if (col) { col.unique = true; changed = true; }
          });
          continue;
        }
        /* CHECK·EXCLUDE 제약은 ERD 에 그릴 게 없다 */
        if (/^add\s+(?:constraint\s+\S+\s+)?(?:check|exclude)\b/i.test(action)) continue;

        /* ADD [COLUMN] */
        const addCol = action.match(/^add\s+(?:column\s+)?(?:if\s+not\s+exists\s+)?(.+)$/i);
        if (addCol) {
          const col = parseColumnDef(addCol[1].trim(), name, relations, refSites,
            { from: actionFrag.from, to: actionFrag.from + actionFrag.text.length });
          if (!col) { skipped++; bad("bad-column", actionFrag); continue; }
          const at = target.columns.findIndex((c) => c.name === col.name);
          if (at >= 0) target.columns[at] = col;
          else target.columns.push(col);
          changed = true;
          continue;
        }

        /* DROP [COLUMN] — 제약 삭제는 ERD 와 무관 */
        if (/^drop\s+constraint\b/i.test(action)) continue;
        const dropCol = action.match(/^drop\s+(?:column\s+)?(?:if\s+exists\s+)?("?[\w]+"?)/i);
        if (dropCol) {
          const cn = unquote(dropCol[1]);
          target.columns = target.columns.filter((c) => c.name !== cn);
          removedColumns.add(`${name}.${cn}`);
          for (let k = relations.length - 1; k >= 0; k--) {
            if (relations[k].from === name && relations[k].fromField === cn) relations.splice(k, 1);
          }
          changed = true;
          continue;
        }

        /* RENAME TO (테이블) — 관계의 양끝과 FK 표기도 따라가야 선이 끊기지 않는다 */
        const renameTable = action.match(/^rename\s+to\s+("?[\w]+"?)$/i);
        if (renameTable) {
          const next = unquote(renameTable[1]);
          relations.forEach((r) => {
            if (r.from === name) r.from = next;
            if (r.to === name) r.to = next;
          });
          tables.forEach((t) => t.columns.forEach((c) => {
            if (c.fk?.startsWith(`${name}.`)) c.fk = `${next}.${c.fk.slice(name.length + 1)}`;
          }));
          touched.delete(name);
          touchName = next;
          target.name = next;
          changed = true;
          /* 옛 이름을 지워 달라고 알리지 않으면 병합 결과에 옛/새 이름이 둘 다 남는다 */
          removedTables.add(name);
          removedTables.delete(next);
          [...removedColumns].forEach((k) => {
            if (!k.startsWith(`${name}.`)) return;
            removedColumns.delete(k);
            removedColumns.add(`${next}.${k.slice(name.length + 1)}`);
          });
          continue;
        }
        /* RENAME [COLUMN] a TO b */
        const renameCol = action.match(/^rename\s+(?:column\s+)?("?[\w]+"?)\s+to\s+("?[\w]+"?)$/i);
        if (renameCol) {
          const from = unquote(renameCol[1]);
          const to = unquote(renameCol[2]);
          const col = target.columns.find((c) => c.name === from);
          if (col) col.name = to;
          removedColumns.add(`${name}.${from}`);
          removedColumns.delete(`${name}.${to}`);
          relations.forEach((r) => {
            if (r.from === name && r.fromField === from) r.fromField = to;
            if (r.to === name && r.toField === from) r.toField = to;
          });
          changed = true;
          continue;
        }

        /* ALTER COLUMN … SET/DROP NOT NULL · SET/DROP DEFAULT */
        const colOpt = action.match(/^alter\s+(?:column\s+)?("?[\w]+"?)\s+(set|drop)\s+(not\s+null|default)\b\s*([\s\S]*)$/i);
        if (colOpt) {
          const col = target.columns.find((c) => c.name === unquote(colOpt[1]));
          if (col) {
            const on = /^set$/i.test(colOpt[2]);
            if (/^not/i.test(colOpt[3])) {
              if (on) col.required = true; else delete col.required;
            } else if (on) {
              col.defaultValue = colOpt[4].trim().replace(/\s+/g, " ");
            } else {
              delete col.defaultValue;
            }
            changed = true;
          }
          continue;
        }

        /* ALTER COLUMN … TYPE */
        const alterType = action.match(/^alter\s+(?:column\s+)?("?[\w]+"?)\s+(?:set\s+data\s+)?type\s+(.+)$/i);
        if (alterType) {
          const col = target.columns.find((c) => c.name === unquote(alterType[1]));
          if (col) {
            const t = alterType[2].match(TYPE_RE);
            col.type = (t ? t[1] : alterType[2].split(/\s+/)[0]).replace(/\s+/g, " ").trim();
            changed = true;
          }
          continue;
        }

        /* 나머지 ALTER 동작(SET DEFAULT/NOT NULL, OWNER, RLS 활성화 …)은 ERD 에 영향이 없다 */
        if (/^(?:alter|enable|disable|owner|set|reset|validate|cluster|inherit|no inherit|attach|detach|replica|force|no force)\b/i.test(action)) continue;

        skipped++;
        bad("bad-action", actionFrag);
      }
      if (changed) touched.add(touchName);
      else noEffect.add(name);
      return;
    }

    /* ── DO $$ … $$ 절차 블록 ──
       마이그레이션은 "이미 있으면 건너뛰기" 를 위해 DDL 을 DO 블록으로 감싸는 게 흔하다.
       블록 안이라고 넘기면 그런 파일에선 아무것도 읽지 못한다.
       IF 조건은 정적으로 판정할 수 없으므로 무조건 적용한다 — 최종 스키마를 그리는 게 목적이다. */
    const doBlock = stmt.match(/^do\s+(?:language\s+\w+\s+)?(\$[A-Za-z_]*\$)([\s\S]*)\1/i);
    if (doBlock) {
      const inner = extractDdl(doBlock[2], frag.from + stmt.length - doBlock[2].length - doBlock[1].length);
      if (!inner.length) { ignored++; return; }
      inner.forEach(apply);
      return;
    }

    /* ── ERD 와 무관한 문장 — 세지 않는다 ── */
    if (IGNORED_STMT.test(stmt)) { ignored++; return; }

    skipped++;
    bad("unreadable", frag);
  };

  for (const frag of splitStatements(clean)) {
    statements++;
    apply(frag);
  }

  /* 결과는 이 SQL 이 건드린 것만. 관계는 기존 테이블을 가리켜도 유효하므로
     base 까지 포함해 정합성을 본다(병합 단계에서 다시 한 번 걸러진다). */
  /* ENUM 은 컬럼보다 뒤에 정의될 수도 있어 마지막에 한 번에 붙인다 */
  if (enums.size) {
    tables.forEach((t) => t.columns.forEach((c) => {
      const key = c.type.replace(/^.*\./, "").replace(/\[\]$/, "").toLowerCase();
      const values = enums.get(key);
      if (values?.length) c.enumValues = [...values];
    }));
  }

  const known = new Set([...baseNames, ...tables.map((t) => t.name)]);
  const out = tables.filter((t) => touched.has(t.name));
  /* 지웠다가 다시 만든 것은 삭제가 아니다 — 최종 상태만 남긴다 */
  const liveNames = new Set(tables.map((t) => t.name));
  const liveCols = new Set(
    tables.flatMap((t) => t.columns.map((c) => `${t.name}.${c.name}`)),
  );
  return {
    tables: out,
    relations: relations.filter((r) => known.has(r.from) && known.has(r.to)),
    skipped,
    ignored,
    statements,
    unresolved: [...unresolved],
    noEffect: [...noEffect].filter((n) => !touched.has(n)),
    /* 대상이 끝내 없는 REFERENCES 는 관계가 조용히 사라진다 — 그건 알려줘야 한다 */
    issues: [...issues, ...refSites.filter((r) => !known.has(r.name!))]
      .sort((a, b) => a.from - b.from),
    removedTables: [...removedTables].filter((n) => !liveNames.has(n)),
    removedColumns: [...removedColumns]
      .filter((k) => !liveCols.has(k) && !removedTables.has(k.slice(0, k.indexOf("."))))
      .map((k) => ({ table: k.slice(0, k.indexOf(".")), column: k.slice(k.indexOf(".") + 1) })),
  };
}
