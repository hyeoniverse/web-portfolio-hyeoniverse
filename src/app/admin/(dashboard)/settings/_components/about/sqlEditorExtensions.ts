/* SQL 편집기에 붙이는 CodeMirror 확장 — 자동완성 · 찾기/바꾸기 · Tab 들여쓰기 · 진단.
 *
 * Sandpack 기본 구성에는 줄 번호·되돌리기·괄호 짝만 들어 있다.
 * 여기서 얹는 것들은 모두 이미 설치돼 있던 CodeMirror 공식 패키지라 새 무게가 거의 없다.
 *
 * 진단은 별도 SQL 파서를 들이지 않는다 — 화면에 그려질 ERD 를 실제로 만들어 내는
 * parseSqlErd 가 못 읽은 자리를 그대로 표시한다. 그래야 밑줄과 결과가 어긋나지 않는다. */

import { autocompletion, completionKeymap, acceptCompletion,
  type CompletionContext, type CompletionResult, type Completion } from "@codemirror/autocomplete";
import { indentMore, indentLess } from "@codemirror/commands";
import { linter, type Diagnostic } from "@codemirror/lint";
import { search, searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { keymap, type EditorView, type Command } from "@codemirror/view";
import { Prec, type Extension } from "@codemirror/state";
import type { ErdTable } from "@/data/about/types";
import { parseSqlErd, type SqlIssue } from "./parseSqlErd";
import { SQL_KEYWORDS, SQL_TYPES } from "./sqlLanguage";

type Lang = "ko" | "en";

/* ── 자동완성 ────────────────────────────────────
   오타 난 테이블 이름은 지금도 "대상 테이블이 없습니다" 로 잡히지만,
   애초에 오타가 안 나게 하는 편이 낫다. */

const KEYWORD_ITEMS: Completion[] = [
  ...SQL_KEYWORDS.map((label) => ({ label, type: "keyword" })),
  ...SQL_TYPES.map((label) => ({ label, type: "type" })),
];

function sqlCompletions(tables: () => ErdTable[]) {
  return (ctx: CompletionContext): CompletionResult | null => {
    /* "posts." 처럼 테이블을 앞에 찍었으면 그 테이블의 컬럼만 — 목록이 짧을수록 쓸모 있다 */
    const dotted = ctx.matchBefore(/"?([\w]+)"?\.\w*/);
    if (dotted) {
      const owner = /^"?([\w]+)"?\./.exec(dotted.text)?.[1]?.toLowerCase();
      const table = tables().find((t) => t.name.toLowerCase() === owner);
      if (table) {
        return {
          from: dotted.from + dotted.text.indexOf(".") + 1,
          options: table.columns.map((c) => ({
            label: c.name, type: "property", detail: c.type,
          })),
          validFor: /^\w*$/,
        };
      }
    }

    const word = ctx.matchBefore(/[\w]+/);
    if (!word && !ctx.explicit) return null;

    /* 컬럼은 어느 테이블 것인지 함께 보여준다 — 같은 이름이 여러 테이블에 흔하다 */
    const columns = tables().flatMap((t) =>
      t.columns.map((c) => ({
        label: c.name, type: "property", detail: `${t.name}.${c.type}`, boost: -1,
      })));

    return {
      from: word?.from ?? ctx.pos,
      options: [
        ...tables().map((t) => ({
          label: t.name, type: "class",
          detail: `${t.columns.length}`, boost: 1,
        })),
        ...columns,
        ...KEYWORD_ITEMS,
      ],
      validFor: /^\w*$/,
    };
  };
}

/* ── 진단 ────────────────────────────────────── */

const MESSAGE: Record<SqlIssue["kind"], (name: string | undefined, ko: boolean) => string> = {
  unbalanced: (_n, ko) => ko
    ? "괄호가 닫히지 않았습니다."
    : "Unclosed parenthesis.",
  "bad-column": (_n, ko) => ko
    ? "컬럼 정의를 읽지 못했습니다. `이름 타입` 형태여야 합니다."
    : "Could not read this column. Expected `name type`.",
  "bad-action": (_n, ko) => ko
    ? "이 ALTER 동작은 읽지 못했습니다."
    : "Could not read this ALTER action.",
  "empty-table": (_n, ko) => ko
    ? "읽어낼 컬럼이 없어 테이블을 만들지 않습니다."
    : "No readable columns, so no table is created.",
  unreadable: (_n, ko) => ko
    ? "무슨 구문인지 알아보지 못했습니다."
    : "Could not recognise this statement.",
  unresolved: (n, ko) => ko
    ? `${n} 테이블이 ERD 에도 이 SQL 에도 없어 적용되지 않습니다.`
    : `${n} is neither in the ERD nor created here, so this is skipped.`,
  "unknown-ref": (n, ko) => ko
    ? `${n} 테이블이 없어 이 관계는 그려지지 않습니다.`
    : `${n} does not exist, so this relation won't be drawn.`,
};

/** 관계가 안 그려지는 건 경고, 아예 못 읽은 건 오류로 나눈다 */
const severityOf = (kind: SqlIssue["kind"]): Diagnostic["severity"] =>
  kind === "unknown-ref" || kind === "unresolved" ? "warning" : "error";

function sqlLinter(tables: () => ErdTable[], lang: () => Lang) {
  return linter((view: EditorView): Diagnostic[] => {
    const doc = view.state.doc;
    const ko = lang() === "ko";
    return parseSqlErd(doc.toString(), tables()).issues.map((i) => ({
      /* 파서가 원본 기준 위치를 주지만, 편집 중 문서보다 길면 CodeMirror 가 던진다 */
      from: Math.min(i.from, doc.length),
      to: Math.min(i.to, doc.length),
      severity: severityOf(i.kind),
      message: MESSAGE[i.kind](i.name, ko),
    })).filter((d) => d.to > d.from);
  }, { delay: 400 });
}

/* ── 조합 ────────────────────────────────────── */

/** 편집기에 갇히지 않게 — Escape 는 완성/찾기 패널이 먼저 먹고, 남으면 포커스를 뺀다 */
const escapeEditor: Command = (view) => { view.contentDOM.blur(); return true; };

export function sqlEditorExtensions(
  tables: () => ErdTable[], lang: () => Lang,
): Extension[] {
  return [
    autocompletion({ override: [sqlCompletions(tables)], icons: false }),
    search({ top: true }),
    highlightSelectionMatches(),
    sqlLinter(tables, lang),
    /* 기본 키맵보다 먼저 잡아야 Tab 이 포커스 이동으로 새지 않는다 */
    Prec.high(keymap.of([
      /* 완성 목록이 열려 있으면 Tab 은 먼저 그걸 채택한다 */
      { key: "Tab", run: acceptCompletion },
      { key: "Tab", run: indentMore, shift: indentLess },
      ...completionKeymap,
      ...searchKeymap,
    ])),
    /* 낮은 우선순위 — 닫을 패널이 없을 때만 편집기를 빠져나간다 */
    Prec.low(keymap.of([{ key: "Escape", run: escapeEditor }])),
  ];
}
