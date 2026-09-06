"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import css from "../../AboutStudio.module.css";
import ErdCanvas from "../../ErdCanvas";
import SqlEditor from "../../SqlEditor";
import { describeImport, mergeErd, type ImportPlan } from "../../mergeErd";
import { parseSqlErd, type ParsedErd } from "../../parseSqlErd";
import { emptyReason } from "./UserFlowBlock";
import { FileCode } from "@/components/icons";
import Button from "@/components/ui/Button";
import { ModalConfirm } from "@/components/ui/ModalTemplates";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { type ErdRelation, type ErdTable } from "@/data/about/types";
import { useModalStore } from "@/stores/modalStore";
import { type Language } from "@/types";
import { useDeferredValue } from "react";
/* 가져오기 적용 전 경고 — 숫자만 보여주면 "무엇이 덮어써지는지" 를 알 수 없다.
   바뀌는 컬럼을 이름과 전/후로 짚어주고, 사라지는 것은 따로 모아 보여준다. */
function ImportWarning({ plan, lang, onConfirm }: {
  plan: ImportPlan; lang: Language; onConfirm: () => void;
}) {
  const ko = lang === "ko";
  const changedCount = plan.updatedTables.reduce((n, t) => n + t.changed.length, 0);
  return (
    <ModalConfirm
      desc={plan.mode === "replace"
        ? (ko ? "기존 ERD 를 SQL 내용으로 통째로 교체합니다. 되돌릴 수 없습니다."
              : "This replaces the entire ERD with the parsed SQL. It cannot be undone.")
        : (ko ? "SQL 내용을 기존 ERD 에 병합합니다. 아래 항목은 SQL 정의로 덮어써집니다."
              : "This merges the parsed SQL into your ERD. The items below get overwritten by the SQL definition.")}
      confirmText={plan.mode === "replace" ? (ko ? "교체" : "Replace") : (ko ? "병합" : "Merge")}
      danger
      onConfirm={onConfirm}
    >
      <ul className={css.planList}>
        {plan.removedTables.length > 0 && (
          <li className={css.planDanger}>
            <strong>{ko ? `테이블 ${plan.removedTables.length}개가 삭제됩니다` : `${plan.removedTables.length} tables will be deleted`}</strong>
            <span className={css.planNames}>{plan.removedTables.join(", ")}</span>
          </li>
        )}
        {changedCount > 0 && (
          <li className={css.planDanger}>
            <strong>{ko ? `컬럼 ${changedCount}개가 덮어써집니다` : `${changedCount} columns will be overwritten`}</strong>
            <div className={css.planDiff}>
              {plan.updatedTables.flatMap((t) => t.changed.map((c) => (
                <span key={`${t.name}.${c.name}`} className={css.planDiffRow}>
                  <code>{t.name}.{c.name}</code>
                  <span className={css.planBefore}>{c.before}</span>
                  <span aria-hidden>→</span>
                  <span className={css.planAfter}>{c.after}</span>
                </span>
              )))}
            </div>
          </li>
        )}
        {plan.addedTables.length > 0 && (
          <li>
            <strong>{ko ? `테이블 ${plan.addedTables.length}개 추가` : `${plan.addedTables.length} tables added`}</strong>
            <span className={css.planNames}>{plan.addedTables.join(", ")}</span>
          </li>
        )}
        {plan.keptTables.length > 0 && (
          <li>{ko ? `테이블 ${plan.keptTables.length}개는 그대로 유지됩니다` : `${plan.keptTables.length} tables stay untouched`}</li>
        )}
      </ul>
    </ModalConfirm>
  );
}

/* ═══════════ ERD ═══════════ */
/* 테이블·컬럼을 하나씩 손으로 넣는 건 실수가 잦고 느리다.
   실제 스키마(CREATE TABLE)를 붙여넣으면 테이블·컬럼·관계를 한 번에 만든다. */
export function ErdBlock({ tables, relations, onChange, lang }: {
  tables: ErdTable[]; relations: ErdRelation[];
  onChange: (t: ErdTable[], r: ErdRelation[]) => void; lang: Language;
}) {
  const openModal = useModalStore((st) => st.openModal);
  const [sql, setSql] = useState("");
  /* SQL 입력은 한 번 쓰고 마는 도구다 — 상시 펼쳐두면 캔버스를 계속 밀어낸다 */
  const [importOpen, setImportOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  /* Textarea 는 ref 를 받지 않아 래퍼에서 찾아 포커스한다 — 항상 마운트라 autoFocus 가 안 먹는다 */
  const sqlBoxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!importOpen) return;
    sqlBoxRef.current?.querySelector("textarea")?.focus();
  }, [importOpen]);
  const importRef = useRef<HTMLDivElement>(null);

  /* 바깥을 클릭하면 접는다. 입력한 내용이 있으면 실수로 날아가지 않게 열어둔다. */
  useEffect(() => {
    if (!importOpen) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node | null;
      if (t && importRef.current?.contains(t)) return;
      if (sql.trim()) return;
      setImportOpen(false);
      setErr(null);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [importOpen, sql]);
  const [dropOver, setDropOver] = useState(false);

  /* .sql 파일을 그대로 읽는다 — 스키마 덤프는 붙여넣기엔 길다 */
  const loadFile = async (f: File) => {
    setErr(null);
    try {
      const text = await f.text();
      setSql(text);
      setFileName(f.name);
      setImportOpen(true);
    } catch {
      setErr(lang === "ko" ? "파일을 읽지 못했습니다." : "Could not read the file.");
    }
  };
  const [result, setResult] = useState<{ tables: number; relations: number; skipped: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  /* 어떤 파일을 읽었는지 — 붙여넣기와 파일 업로드가 같은 칸을 쓰므로 출처가 보여야 한다 */
  const [fileName, setFileName] = useState<string | null>(null);
  /* 되돌리기가 없는 동작이라 파괴적인 쪽(교체)이 기본이면 안 된다 — 기존이 있으면 병합이 기본 */
  const [mode, setMode] = useState<"merge" | "replace">("merge");

  /* 생성 전에 무엇이 만들어질지 미리 보여준다 — 누르고 나서야 결과를 아는 건 되돌리기 어렵다.
     긴 덤프를 매 타건마다 파싱하면 입력이 밀리므로 deferred 값으로 한 박자 늦춘다. */
  const deferredSql = useDeferredValue(sql);
  /* 현재 테이블을 넘긴다 — ALTER 는 기존 테이블 위에서만 의미가 있어,
     빈 상태로 파싱하면 ALTER 만 붙여넣은 SQL 이 영영 아무것도 만들지 못한다. */
  const preview = useMemo(
    () => (deferredSql.trim() ? parseSqlErd(deferredSql, tables) : null),
    [deferredSql, tables],
  );

  /* 테이블을 하나도 만들지 않아도 DROP 만으로 충분히 유효한 입력이다 */
  const hasEffect = (p: ParsedErd) =>
    p.tables.length > 0 || p.removedTables.length > 0 || p.removedColumns.length > 0;

  const commit = (parsed: ParsedErd) => {
    const next = mode === "merge" && tables.length > 0
      ? mergeErd({ tables, relations }, parsed)
      : { tables: parsed.tables, relations: parsed.relations };
    onChange(next.tables, next.relations);
    setResult({ tables: next.tables.length, relations: next.relations.length, skipped: parsed.skipped });
    setImportOpen(false);
    setSql("");
    setFileName(null);
  };

  const applySql = () => {
    setErr(null);
    const parsed = parseSqlErd(sql, tables);
    if (!hasEffect(parsed)) {
      setErr(emptyReason(parsed, sql, lang));
      setResult(null);
      return;
    }
    /* 되돌릴 수 없는 동작이라, 무엇이 덮어써지고 무엇이 사라지는지 이름까지 보여주고 묻는다.
       병합도 규칙상 기존 컬럼 정의를 SQL 로 덮으므로 조용히 넘기지 않는다. */
    const plan = describeImport({ tables, relations }, parsed, tables.length > 0 ? mode : "replace");
    const destructive = plan.removedTables.length > 0
      || plan.updatedTables.some((t) => t.changed.length > 0);
    if (tables.length > 0 && destructive) {
      openModal(
        <ImportWarning plan={plan} lang={lang} onConfirm={() => commit(parsed)} />,
        { width: "min(92vw, 560px)" },
      );
      return;
    }
    commit(parsed);
  };

  return (
    <section className={css.block}>
      <div ref={importRef} className={`${css.erdImport} ${dropOver ? css.erdImportOver : ""}`}
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          setDropOver(true);
        }}
        onDragLeave={(e) => {
          if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
          setDropOver(false);
        }}
        onDrop={(e) => {
          const f = e.dataTransfer.files?.[0];
          if (!f) return;
          e.preventDefault();
          setDropOver(false);
          void loadFile(f);
        }}
>
        {/* 조건부 분기 밖에 둔다 — 안쪽에 두면 분기가 바뀔 때 언마운트돼 ref 가 null 이 된다 */}
        <input ref={fileRef} type="file" className={css.hiddenFile}
          accept=".sql,text/plain,application/sql"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void loadFile(f);
            e.target.value = "";
          }} />

        <div className={css.erdPanel}>
        {!importOpen && (
          <div className={css.erdActions}>
            {/* 붙여넣기에는 실제로 포커스를 받는 대상이 필요하다.
                이 영역이 드롭 존이자 붙여넣기 대상 — 클릭해 포커스한 뒤 붙여넣으면 된다. */}
            {/* 포커스하는 순간 입력창으로 펼친다 — 뭔가 붙여넣어야 바뀌면 동작을 알 수 없다 */}
            <div className={css.erdDrop} tabIndex={0} role="button"
              aria-label={lang === "ko" ? "SQL 입력 열기" : "Open SQL input"}
              onFocus={() => setImportOpen(true)}
              onClick={() => setImportOpen(true)}>
              <FileCode size={14} />
              <span>
                {lang === "ko"
                  ? "여기에 .sql 파일을 놓거나 스키마(SQL)를 붙여넣습니다"
                  : "Drop a .sql file here, or paste your SQL schema"}
              </span>
            </div>
            {/* 파일 선택은 두 상태에서 늘 행의 오른쪽 끝 — 상태에 따라 자리가 옮겨다니면
                같은 버튼인지 알아보기 어렵다. 닫힘에선 flex:1 드롭존이 밀어서 오른쪽에 선다. */}
            <Button className={css.erdFileBtn} variant="subtle" size="md"
              icon={<FileCode size={15} />} onClick={() => fileRef.current?.click()}>
              {lang === "ko" ? "파일 선택" : "Choose file"}
            </Button>
          </div>
        )}
        {/* 상태 문구는 액션 행 밖으로 — 행 안에 있으면 파일 버튼을 왼쪽으로 밀어낸다 */}
        {!importOpen && (result || err) && (
          <div className={css.erdMeta}>
            {result && (
              <span className={css.erdResult}>
                {lang === "ko"
                  ? `테이블 ${result.tables}개 · 관계 ${result.relations}개 생성${result.skipped ? ` · ${result.skipped}줄 건너뜀` : ""}`
                  : `${result.tables} tables · ${result.relations} relations${result.skipped ? ` · ${result.skipped} skipped` : ""}`}
              </span>
            )}
            {err && <span className={css.erdErr}>{err}</span>}
          </div>
        )}
        {/* 항상 마운트해 두고 높이만 0↔auto — 열 때 새로 마운트하면 트랜지션이 걸리지 않는다.
            닫혀 있을 땐 inert 로 탭 이동·클릭에서 빠진다. */}
        <div className={`${css.erdCollapse} ${importOpen ? css.erdCollapseOpen : ""}`}>
          <div className={css.erdCollapseInner} ref={sqlBoxRef} inert={!importOpen}>
            <p className={css.erdHint}>
              {lang === "ko"
                ? "CREATE TABLE · ALTER TABLE · DROP TABLE 을 순서대로 적용합니다. PRIMARY KEY 와 REFERENCES 로 키와 관계를 인식하고, 인덱스·정책·함수 등은 무시합니다."
                : "Applies CREATE TABLE, ALTER TABLE, and DROP TABLE in order. PRIMARY KEY and REFERENCES define keys and links; indexes, policies, and functions are ignored."}
            </p>
            {/* 하이라이팅되는 편집기 — 투명 textarea 오버레이는 캐럿·스크롤이 어긋나 쓰지 않는다
                (CodeBlockEditor 주석 참고). 편집은 CodeMirror 에 맡긴다. */}
            <SqlEditor value={sql} onChange={setSql} tables={tables} lang={lang}
              ariaLabel={lang === "ko" ? "SQL 스키마" : "SQL schema"} />
            {/* 무엇이 만들어질지 입력하는 동안 계속 알려준다 — 생성은 되돌릴 수 없다 */}
            <div className={css.erdMeta}>
              {fileName && (
                <span className={css.erdFile} title={fileName}>
                  <FileCode size={12} />{fileName}
                </span>
              )}
              {preview && (
                hasEffect(preview) ? (
                  <span className={css.erdPreviewOk}>
                    {(() => {
                      /* 모드에 따라 실제 결과가 다르다 — 인식 수만 보여주면 병합 결과를 오해한다 */
                      if (tables.length === 0 || mode === "replace") {
                        return lang === "ko"
                          ? `테이블 ${preview.tables.length}개 · 관계 ${preview.relations.length}개 인식`
                          : `${preview.tables.length} tables · ${preview.relations.length} relations detected`;
                      }
                      const m = mergeErd({ tables, relations }, preview).stats;
                      /* 삭제는 되돌릴 수 없어 0 이 아닐 때 반드시 드러나야 한다 */
                      const gone = lang === "ko"
                        ? [m.removedTables && `테이블 ${m.removedTables}개 삭제`,
                           m.removedColumns && `컬럼 ${m.removedColumns}개 삭제`]
                        : [m.removedTables && `${m.removedTables} tables removed`,
                           m.removedColumns && `${m.removedColumns} columns removed`];
                      const base = lang === "ko"
                        ? `새 테이블 ${m.addedTables}개 · 기존 ${m.updatedTables}개 갱신 · ${m.keptTables}개 유지`
                        : `${m.addedTables} new · ${m.updatedTables} updated · ${m.keptTables} untouched`;
                      return [base, ...gone.filter(Boolean)].join(" · ");
                    })()}
                    {preview.skipped > 0 && (
                      <span className={css.erdPreviewMuted}>
                        {lang === "ko" ? ` · ${preview.skipped}줄 건너뜀` : ` · ${preview.skipped} lines skipped`}
                      </span>
                    )}
                  </span>
                ) : (
                  <span className={css.erdPreviewNone}>
                    {emptyReason(preview, deferredSql, lang)}
                  </span>
                )
              )}
              {tables.length > 0 && preview && hasEffect(preview) && mode === "replace" && (
                <span className={css.erdReplaceWarn}>
                  {lang === "ko"
                    ? `기존 ${tables.length}개 테이블이 모두 지워집니다`
                    : `All ${tables.length} existing tables will be removed`}
                </span>
              )}
            </div>
            <div className={css.erdActions}>
              {/* 기존이 없으면 모드가 의미 없다 — 그냥 생성 */}
              {tables.length > 0 && (
                <SegmentedControl<"merge" | "replace"> size="sm" value={mode} onChange={setMode}
                  items={[
                    { value: "merge", label: lang === "ko" ? "병합" : "Merge" },
                    { value: "replace", label: lang === "ko" ? "교체" : "Replace" },
                  ]} />
              )}
              <Button variant="primary" size="md"
                disabled={!preview || !hasEffect(preview)} onClick={applySql}>
                {preview && hasEffect(preview)
                  ? (tables.length > 0 && mode === "merge"
                      ? (lang === "ko" ? "병합" : "Merge")
                      : (lang === "ko" ? `테이블 ${preview.tables.length}개 생성` : `Generate ${preview.tables.length} tables`))
                  : (lang === "ko" ? "생성" : "Generate")}
              </Button>
              <Button variant="subtle" size="md" onClick={() => { setImportOpen(false); setErr(null); setFileName(null); }}>
                {lang === "ko" ? "취소" : "Cancel"}
              </Button>
              {err && <span className={css.erdErr}>{err}</span>}
              {/* 닫힘 상태와 같은 라벨·같은 자리(오른쪽 끝) — 이름이나 위치가 바뀌면 다른 기능처럼 보인다 */}
              <Button className={css.erdFileBtn} variant="subtle" size="md"
                icon={<FileCode size={15} />} onClick={() => fileRef.current?.click()}>
                {lang === "ko" ? "파일 선택" : "Choose file"}
              </Button>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* 미리보기 겸 편집 — 클릭한 테이블만 펼쳐진다 */}
      <div className={css.erdCanvasScroll}>
        <ErdCanvas tables={tables} relations={relations} onChange={onChange} lang={lang} />
      </div>
    </section>
  );
}
