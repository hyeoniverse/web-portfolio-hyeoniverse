/* CodeMirror 용 최소 SQL 문법.
 *
 * @codemirror/lang-sql 을 새로 넣지 않는 이유 — 여기서 필요한 건 "읽히게 색이 붙는 것" 뿐이고,
 * 완전한 SQL 파서는 과하다. prismHighlight 가 bash 를 직접 정의한 것과 같은 판단이다.
 * (@codemirror/language 는 Sandpack 이 이미 끌고 있어 추가 의존성이 없다)
 *
 * 인식: 주석(-- , 슬래시-별) · 문자열('…', 달러인용) · 따옴표 식별자("…") ·
 *       숫자 · 키워드 · 타입 · 연산자/구두점. */

import { StreamLanguage, LanguageSupport } from "@codemirror/language";


/* 자동완성도 같은 목록을 쓴다 — 두 벌로 갈라지면 한쪽만 갱신되는 사고가 난다 */
export const SQL_KEYWORDS = [
  "ADD", "ALL", "ALTER", "AND", "AS", "ASC", "BEGIN", "BETWEEN", "BY", "CASCADE", "CASE",
  "CHECK", "COLUMN", "COMMENT", "COMMIT", "CONSTRAINT", "CREATE", "CROSS", "CURRENT",
  "DEFAULT", "DEFERRABLE", "DELETE", "DESC", "DISTINCT", "DO", "DROP", "ELSE", "END",
  "EXCLUDE", "EXISTS", "FALSE", "FOREIGN", "FROM", "FULL", "FUNCTION", "GRANT", "GROUP",
  "HAVING", "IF", "IN", "INDEX", "INNER", "INSERT", "INTO", "IS", "JOIN", "KEY", "LANGUAGE",
  "LEFT", "LIKE", "LIMIT", "NOT", "NULL", "OFFSET", "ON", "ONLY", "OR", "ORDER", "OUTER",
  "POLICY", "PRIMARY", "PROCEDURE", "REFERENCES", "RENAME", "REPLACE", "RESTRICT", "RETURNS",
  "REVOKE", "RIGHT", "ROLLBACK", "ROW", "SCHEMA", "SECURITY", "SELECT", "SEQUENCE", "SET",
  "TABLE", "TEMP", "TEMPORARY", "THEN", "TO", "TRIGGER", "TRUE", "TRUNCATE", "UNION",
  "UNIQUE", "UNLOGGED", "UPDATE", "USING", "VALUES", "VIEW", "WHEN", "WHERE", "WITH",
];

export const SQL_TYPES = [
  "BIGINT", "BIGSERIAL", "BOOL", "BOOLEAN", "BYTEA", "CHAR", "CHARACTER", "CIDR", "CITEXT",
  "DATE", "DECIMAL", "DOUBLE", "FLOAT", "INET", "INT", "INT2", "INT4", "INT8", "INTEGER",
  "INTERVAL", "JSON", "JSONB", "MACADDR", "MONEY", "NUMERIC", "PRECISION", "REAL", "SERIAL",
  "SMALLINT", "TEXT", "TIME", "TIMESTAMP", "TIMESTAMPTZ", "TIMETZ", "TSVECTOR", "UUID",
  "VARCHAR", "VARYING", "XML",
];

/* 토큰 판정은 Set 이 빨라야 한다 — 목록은 위에서 한 벌만 관리하고 여기서 색인만 만든다 */
const KEYWORDS = new Set(SQL_KEYWORDS);
const TYPES = new Set(SQL_TYPES);

interface SqlState {
  /** 여러 줄에 걸치는 블록의 종료 표시 — 슬래시-별 주석 또는 달러인용 태그 */
  block: { kind: "comment" } | { kind: "dollar"; tag: string } | null;
}

const sqlMode = StreamLanguage.define<SqlState>({
  name: "sql",
  startState: () => ({ block: null }),

  token(stream, state) {
    /* ── 여러 줄 블록 이어가기 ── */
    if (state.block?.kind === "comment") {
      while (!stream.eol()) {
        if (stream.next() === "*" && stream.peek() === "/") { stream.next(); state.block = null; break; }
      }
      return "comment";
    }
    if (state.block?.kind === "dollar") {
      const tag = state.block.tag;
      while (!stream.eol()) {
        if (stream.match(tag)) { state.block = null; break; }
        stream.next();
      }
      return "string";
    }

    if (stream.eatSpace()) return null;

    /* ── 주석 ── */
    if (stream.match("--")) { stream.skipToEnd(); return "comment"; }
    if (stream.match("/*")) {
      state.block = { kind: "comment" };
      while (!stream.eol()) {
        if (stream.next() === "*" && stream.peek() === "/") { stream.next(); state.block = null; break; }
      }
      return "comment";
    }

    /* ── 달러인용 ($fn$ … $fn$) — 함수 본문이 이 형태다 ── */
    const dollar = stream.match(/^\$[A-Za-z_]*\$/) as RegExpMatchArray | null;
    if (dollar) {
      const tag = dollar[0];
      state.block = { kind: "dollar", tag };
      while (!stream.eol()) {
        if (stream.match(tag)) { state.block = null; break; }
        stream.next();
      }
      return "string";
    }

    /* ── 문자열 / 따옴표 식별자 ── */
    if (stream.match(/^'(?:[^']|'')*'?/)) return "string";
    if (stream.match(/^"(?:[^"]|"")*"?/)) return "variableName";

    /* ── 숫자 ── */
    if (stream.match(/^\d+(?:\.\d+)?/)) return "number";

    /* ── 낱말: 키워드 / 타입 / 그 외 식별자 ── */
    const word = stream.match(/^[A-Za-z_][\w$]*/) as RegExpMatchArray | null;
    if (word) {
      const upper = word[0].toUpperCase();
      if (KEYWORDS.has(upper)) return "keyword";
      if (TYPES.has(upper)) return "typeName";
      return "variableName";
    }

    if (stream.match(/^[(),;.[\]]/)) return "punctuation";
    if (stream.match(/^[=<>!+\-*/%|@#^~:]+/)) return "operator";

    stream.next();
    return null;
  },

  languageData: {
    commentTokens: { line: "--", block: { open: "/*", close: "*/" } },
  },
});

export const sqlLanguage = () => new LanguageSupport(sqlMode);
