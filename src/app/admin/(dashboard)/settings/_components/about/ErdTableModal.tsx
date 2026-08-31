"use client";

/* 테이블 편집 모달.
 *
 * 카드 안에서 인라인으로 펼치던 방식은 컬럼이 27개쯤 되면 그리드를 통째로 밀어내고,
 * 좁은 카드 폭 안에서 이름·타입 입력이 다닥다닥 붙어 읽기 어려웠다.
 * 편집은 넓은 자리가 필요하니 모달로 분리한다. */

import { Fragment, useContext, useEffect, useRef, useState } from "react";
import type { Language } from "@/types";
import { createPortal } from "react-dom";
import { Plus, KeyRound, ArrowRight, GripVertical, Asterisk, Fingerprint, ChevronDown } from "@/components/icons";
import Button from "@/components/ui/Button";
import Chip from "@/components/ui/Chip";
import CloseButton from "@/components/ui/CloseButton";
import Checkbox from "@/components/ui/Checkbox";
import Select from "@/components/ui/Select";
import { ModalFooterContext } from "@/components/ui/Modal";
import { ModalConfirm } from "@/components/ui/ModalTemplates";
import { useModalStore } from "@/stores/modalStore";
import type { ErdTable, ErdRelation } from "@/data/about/types";
import Tooltip from "@/components/ui/Tooltip";
import css from "./ErdTableModal.module.css";
import Pressable from "@/components/ui/Pressable";


/* Postgres 에서 흔히 쓰는 타입들. 목록에 없는 값도 직접 입력할 수 있으므로
   여기 없다고 못 쓰는 건 아니고, 자주 쓰는 걸 먼저 보여주는 용도다. */
const COLUMN_TYPES = [
  /* 식별자·문자 */
  "UUID", "TEXT", "VARCHAR", "CHAR", "CITEXT",
  /* 숫자 */
  "INT", "SMALLINT", "BIGINT", "SERIAL", "BIGSERIAL",
  "NUMERIC", "DECIMAL", "REAL", "DOUBLE PRECISION",
  /* 불리언·시간 */
  "BOOL", "DATE", "TIME", "TIMETZ", "TIMESTAMP", "TIMESTAMPTZ", "INTERVAL",
  /* 구조·기타 */
  "JSON", "JSONB", "BYTEA", "INET", "CIDR", "MACADDR", "TSVECTOR",
  /* 배열 */
  "TEXT[]", "UUID[]", "INT[]", "JSONB[]",
];

/* 타입 입력 — 목록에서 고르거나 직접 칠 수 있게. 치는 동안 비슷한 것만 남는다. */
function TypeCell({ value, onChange, invalid }: { value: string; onChange: (v: string) => void; invalid?: boolean }) {
  /* combobox 는 trigger 가 input 이라 inputValue 를 비워두면 현재 타입이 안 보인다 → 값으로 채운다 */
  const [input, setInput] = useState(value);
  useEffect(() => { setInput(value); }, [value]);

  const commit = (v: string) => {
    const next = v.trim().toUpperCase();
    onChange(next);
    setInput(next);
  };
  const options = COLUMN_TYPES.includes(value) || !value
    ? COLUMN_TYPES.map((v) => ({ value: v, label: v }))
    : [{ value, label: value }, ...COLUMN_TYPES.map((v) => ({ value: v, label: v }))];

  return (
    /* combobox 는 Enter·옵션 선택으로만 커밋된다. 그대로 두면 친 값이 조용히 사라지고,
       비운 채 벗어나면 화면은 빈칸인데 데이터엔 이전 타입이 남아 표시가 데이터와 어긋난다.
       → 벗어날 때 확정하고, 비웠으면 되돌린다. 타입은 비울 수 있는 칸이 아니다. */
    <span
      className={css.typeCell}
      onKeyDownCapture={(e) => {
        /* Escape 는 편집 취소 — Select 루트가 stopPropagation 하므로 capture 로 먼저 받는다 */
        if (e.key === "Escape" && !e.nativeEvent.isComposing) setInput(value);
      }}
      onBlur={(e) => {
        /* 드롭다운으로 포커스가 넘어가는 중이면 아직 편집 중이다 (portal 이라 relatedTarget 이 밖에 있다) */
        if ((e.relatedTarget as HTMLElement | null)?.closest('[class*="__dropdown"]')) return;
        const next = input.trim().toUpperCase();
        if (!next) { setInput(value); return; }
        if (next !== value) onChange(next);
        setInput(next);
      }}
    >
      <Select className={`${css.typeSelect} ${invalid ? css.selectInvalid : ""}`}
        width="full" dropAlign="below" value={value} options={options}
        combobox inputValue={input} onInputChange={setInput}
        onAdd={commit} onChange={commit} />
    </span>
  );
}

export default function ErdTableModal({
  table, tables, relations, onChange, onDelete, lang,
}: {
  table: ErdTable;
  tables: ErdTable[];
  relations: ErdRelation[];
  onChange: (t: ErdTable[], r: ErdRelation[]) => void;
  onDelete: (name: string) => void;
  lang: Language;
}) {
  const closeModal = useModalStore((s) => s.closeModal);
  const openModal = useModalStore((s) => s.openModal);
  /* 액션 버튼은 모달 템플릿의 footer 슬롯으로 — 본문 안에 두면 내용이 길 때 같이 스크롤된다 */
  const footerEl = useContext(ModalFooterContext);
  /* 모달 안에서만 편집하고 닫을 때 반영 — 매 키 입력마다 바깥 그리드가 다시 그려지면 느리다 */
  const [draft, setDraft] = useState<ErdTable>(table);

  /* 참조하는 쪽 / 참조당하는 쪽 — 방향이 헷갈리지 않게 그룹을 나눠 보여준다 */
  const outgoing = relations.filter((r) => r.from === table.name);
  const incoming = relations.filter((r) => r.to === table.name);
  const setCols = (columns: ErdTable["columns"]) => setDraft({ ...draft, columns });

  /* 컬럼 순서 = 공개 ERD 에 그려지는 순서. 잘못 넣었다고 지웠다 다시 만들 일은 없어야 한다.
     입력의 텍스트 선택을 방해하지 않도록 드래그는 핸들에서만 시작하고, 행은 드롭 대상만 맡는다. */
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  /* 기본값·설명 상세 행 — 값이 있으면 접어두지 않는다(모르는 채 저장되는 걸 막는다) */
  const [openRows, setOpenRows] = useState<Set<number>>(new Set());
  const detailOpen = (c: ErdTable["columns"][number], i: number) =>
    openRows.has(i) || !!c.defaultValue || !!c.comment || !!c.indexed || !!c.enumValues?.length;
  const moveCol = (from: number, to: number) => {
    if (from === to) return;
    const next = [...draft.columns];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    setCols(next);
  };

  /* 다중 선택 — 인덱스로 들고 있다가 삭제 시 한 번에 처리 */
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const togglePick = (i: number) => setPicked((prev) => {
    const next = new Set(prev);
    if (next.has(i)) next.delete(i); else next.add(i);
    return next;
  });
  const allPicked = draft.columns.length > 0 && picked.size === draft.columns.length;
  const removePicked = () => {
    setCols(draft.columns.filter((_, i) => !picked.has(i)));
    setPicked(new Set());
  };

  /* 참조 후보 — 자기 자신을 제외한 테이블의 PK(없으면 첫 컬럼) */
  const fkOptions = [
    { value: "", label: lang === "ko" ? "없음" : "None" },
    ...tables
      .filter((t) => t.name !== table.name)
      .map((t) => {
        const key = t.columns.find((c) => c.pk)?.name ?? t.columns[0]?.name ?? "id";
        return { value: `${t.name}.${key}`, label: `${t.name}.${key}` };
      }),
  ];
  /* 참조 변경분 — 저장할 때 relations 에 반영 */
  const [fkEdits, setFkEdits] = useState<Record<string, string>>({});

  const scrollRef = useRef<HTMLDivElement>(null);
  const tableNameRef = useRef<HTMLInputElement>(null);
  /* 저장을 눌러본 뒤부터 오류를 표시한다 — 컬럼을 추가하자마자 빨갛게 만들면 재촉처럼 읽힌다 */
  const [tried, setTried] = useState(false);

  /* 필수: 테이블 이름 / 컬럼 이름 / 컬럼 타입.
     타입은 ErdColumn 에서 optional 이 아니고 공개 패널이 그대로 그리는 값이라,
     비어 있으면 ERD 에 빈 칸이 그려진다. */
  const nameMissing = !draft.name.trim();
  const nameTaken = !nameMissing && tables.some(
    (t) => t.name !== table.name && t.name.trim().toLowerCase() === draft.name.trim().toLowerCase());
  const colMissing = draft.columns.map((c) => ({ name: !c.name.trim(), type: !c.type.trim() }));
  const dupCols = (() => {
    const seen = new Map<string, number>();
    const dup = new Set<number>();
    draft.columns.forEach((c, i) => {
      const k = c.name.trim().toLowerCase();
      if (!k) return;
      const prev = seen.get(k);
      if (prev !== undefined) { dup.add(prev); dup.add(i); } else seen.set(k, i);
    });
    return dup;
  })();

  const issues: string[] = [];
  if (nameMissing) issues.push(lang === "ko" ? "테이블 이름을 입력합니다." : "Enter a table name.");
  if (nameTaken) issues.push(lang === "ko" ? "이미 사용 중인 테이블 이름입니다." : "That table name is already in use.");
  if (draft.columns.length === 0) issues.push(lang === "ko" ? "컬럼을 하나 이상 추가합니다." : "Add at least one column.");
  if (colMissing.some((m) => m.name)) issues.push(lang === "ko" ? "이름이 비어 있는 컬럼이 있습니다." : "Some columns have no name.");
  if (colMissing.some((m) => m.type)) issues.push(lang === "ko" ? "타입이 비어 있는 컬럼이 있습니다." : "Some columns have no type.");
  if (dupCols.size > 0) issues.push(lang === "ko" ? "컬럼 이름이 중복되었습니다." : "Column names must be unique.");

  const addColumn = () => {
    setCols([...draft.columns, { name: "", type: "text" }]);
    setPicked(new Set());
    /* 추가한 행이 화면 밖이면 무엇이 늘었는지 알 수 없다 → 끝으로 스크롤 후 포커스 */
    requestAnimationFrame(() => {
      const wrap = scrollRef.current;
      if (!wrap) return;
      wrap.scrollTop = wrap.scrollHeight;
      /* 마지막 행을 직접 집는다 — 인덱스 계산은 열이 늘면(체크박스 등) 바로 어긋난다 */
      const rows = wrap.querySelectorAll("tbody tr");
      const last = rows[rows.length - 1];
      last?.querySelector<HTMLInputElement>('input[aria-label="column name"]')?.focus();
    });
  };

  const commit = () => {
    if (issues.length > 0) {
      setTried(true);
      /* 어디를 고쳐야 하는지 바로 보이게 첫 문제 지점으로 이동 */
      if (nameMissing || nameTaken) { tableNameRef.current?.focus(); return; }
      const bad = colMissing.findIndex((m) => m.name || m.type);
      const row = scrollRef.current?.querySelectorAll("tbody tr")[bad === -1 ? 0 : bad];
      row?.scrollIntoView({ block: "nearest" });
      row?.querySelector<HTMLInputElement>('input[aria-label="column name"]')?.focus();
      return;
    }
    /* 이름이 바뀌면 관계도 같이 따라가야 연결이 끊기지 않는다 */
    let nextRels = relations.map((r) => ({
      ...r,
      from: r.from === table.name ? draft.name : r.from,
      to: r.to === table.name ? draft.name : r.to,
    }));
    /* 참조를 바꾼 컬럼 — 기존 관계를 지우고 새로 건다 */
    for (const [colName, fk] of Object.entries(fkEdits)) {
      nextRels = nextRels.filter((r) => !(r.from === draft.name && r.fromField === colName));
      if (!fk) continue;
      const [to, toField] = fk.split(".");
      if (to && toField) {
        nextRels.push({ from: draft.name, fromField: colName, to, toField, label: "N:1" });
      }
    }
    onChange(tables.map((t) => (t.name === table.name ? draft : t)), nextRels);
    closeModal();
  };

  return (
    <div className={css.body}>
      <label className={css.field}>
        <span className={css.label}>
          {lang === "ko" ? "테이블 이름" : "Table name"}
          <span className={css.req} aria-hidden>*</span>
        </span>
        <input ref={tableNameRef}
          className={`${css.nameInput} ${tried && (nameMissing || nameTaken) ? css.invalid : ""}`}
          value={draft.name} autoFocus aria-required aria-invalid={tried && (nameMissing || nameTaken)}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
      </label>

      <div className={css.field}>
        <span className={css.label}>
          {lang === "ko" ? `컬럼 ${draft.columns.length}` : `${draft.columns.length} columns`}
        </span>
        {/* 셀 경계가 보이는 표 — 입력마다 캡슐을 두면 목록이 아니라 폼처럼 읽힌다 */}
        <div ref={scrollRef} className={css.tableWrap}>
          <table className={css.table}>
            <thead>
              <tr>
                <th scope="col" className={css.thGrip}>
                  <span className={css.srOnly}>{lang === "ko" ? "순서" : "Order"}</span>
                </th>
                <th scope="col" className={css.thPick}>
                  <Checkbox shape="square" checked={allPicked}
                    indeterminate={picked.size > 0 && !allPicked}
                    onChange={(v) => setPicked(v ? new Set(draft.columns.map((_, i) => i)) : new Set())} />
                </th>
                <th scope="col" className={css.thPk}>
                  <span className={css.srOnly}>{lang === "ko" ? "제약" : "Constraints"}</span>
                </th>
                <th scope="col">
                  {lang === "ko" ? "이름" : "Name"}<span className={css.req} aria-hidden>*</span>
                </th>
                <th scope="col" className={css.thType}>
                  {lang === "ko" ? "타입" : "Type"}<span className={css.req} aria-hidden>*</span>
                </th>
                <th scope="col" className={css.thTail}>{lang === "ko" ? "참조" : "Ref"}</th>
                <th scope="col" className={css.thMore}><span className={css.srOnly}>—</span></th>
                <th scope="col" className={css.thX}><span className={css.srOnly}>—</span></th>
              </tr>
            </thead>
            <tbody>
              {draft.columns.map((c, i) => (
                <Fragment key={i}>
                <tr
                  className={`${picked.has(i) ? css.rowPicked : ""} ${dragIdx === i ? css.rowDragging : ""}`.trim()}
                  onDragOver={(e) => { if (dragIdx != null) e.preventDefault(); }}
                  onDrop={(e) => {
                    if (dragIdx == null) return;
                    e.preventDefault();
                    moveCol(dragIdx, i);
                    setDragIdx(null);
                  }}
                >
                  <td className={css.tdGrip}>
                    <Tooltip content={lang === "ko" ? "끌어서 순서 변경" : "Drag to reorder"} delay={300}>
                      <span
                        className={css.grip}
                        draggable
                        data-cursor="grab"
                        onDragStart={(e) => { setDragIdx(i); e.dataTransfer.effectAllowed = "move"; }}
                        onDragEnd={() => setDragIdx(null)}
                      >
                        <GripVertical size={12} />
                      </span>
                    </Tooltip>
                  </td>
                  <td className={css.tdPick}>
                    <Checkbox shape="square" checked={picked.has(i)} onChange={() => togglePick(i)} />
                  </td>
                  <td className={css.tdPk}>
                    <Tooltip content={lang === "ko" ? "기본키" : "Primary key"} delay={200}>
                      <Pressable className={`${css.pk} ${c.pk ? css.pkOn : ""}`}
                        aria-label={lang === "ko" ? "기본키" : "Primary key"} aria-pressed={!!c.pk}
                        onClick={() => setCols(draft.columns.map((x, j) => (j === i ? { ...x, pk: !x.pk } : x)))}>
                        <KeyRound size={13} />
                      </Pressable>
                    </Tooltip>
                    {/* PK 는 정의상 NOT NULL 이라 따로 끌 수 없다 — 왜 잠겼는지 툴팁으로 말한다 */}
                    <Tooltip delay={200}
                      content={c.pk
                        ? (lang === "ko" ? "기본키라 항상 필수입니다" : "Always required — it's the primary key")
                        : (lang === "ko" ? "필수 (NOT NULL)" : "Required (NOT NULL)")}>
                      <Pressable className={`${css.pk} ${c.required || c.pk ? css.pkOn : ""}`}
                        aria-label={lang === "ko" ? "필수" : "Required"} aria-pressed={!!(c.required || c.pk)}
                        disabled={!!c.pk}
                        onClick={() => setCols(draft.columns.map((x, j) => (j === i ? { ...x, required: !x.required || undefined } : x)))}>
                        <Asterisk size={13} />
                      </Pressable>
                    </Tooltip>
                    <Tooltip content={lang === "ko" ? "고유 (UNIQUE)" : "Unique"} delay={200}>
                      <Pressable className={`${css.pk} ${c.unique ? css.pkOn : ""}`}
                        aria-label={lang === "ko" ? "고유" : "Unique"} aria-pressed={!!c.unique}
                        onClick={() => setCols(draft.columns.map((x, j) => (j === i ? { ...x, unique: !x.unique || undefined } : x)))}>
                        <Fingerprint size={13} />
                      </Pressable>
                    </Tooltip>
                  </td>
                  <td>
                    <input
                      className={`${css.cell} ${tried && (colMissing[i].name || dupCols.has(i)) ? css.invalid : ""}`}
                      value={c.name} aria-label="column name"
                      aria-required aria-invalid={tried && (colMissing[i].name || dupCols.has(i))}
                      placeholder={lang === "ko" ? "이름" : "name"}
                      onChange={(e) => setCols(draft.columns.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                      onBlur={(e) => {
                        /* 아무것도 안 넣고 벗어나면 빈 행을 남기지 않는다.
                           같은 행 안(타입/참조)으로 이동하는 중이면 유지. */
                        if (c.name.trim()) return;
                        const row = (e.target as HTMLElement).closest("tr");
                        window.setTimeout(() => {
                          if (row?.contains(document.activeElement)) return;
                          setCols(draft.columns.filter((_, j) => j !== i));
                        }, 0);
                      }} />
                  </td>
                  <td className={css.tdType}>
                    <TypeCell value={c.type} invalid={tried && colMissing[i].type}
                      onChange={(v) => setCols(draft.columns.map((x, j) => (j === i ? { ...x, type: v } : x)))} />
                  </td>
                  <td className={css.tdTail}>
                    {/* 참조는 표시만 하고 있었다 — 다른 테이블을 골라 연결/해제할 수 있게 */}
                    <Select className={css.fkSelect} width="full" dropAlign="below" value={c.fk ?? ""}
                      options={fkOptions}
                      onChange={(v) => {
                        setCols(draft.columns.map((x, j) => (j === i ? { ...x, fk: v || undefined } : x)));
                        setFkEdits((prev) => ({ ...prev, [c.name]: v }));
                      }} />
                  </td>
                  <td className={css.tdMore}>
                    <Tooltip content={lang === "ko" ? "기본값·설명" : "Default & description"} delay={200}>
                    <Pressable
                      className={`${css.more} ${detailOpen(c, i) ? css.moreOn : ""}`}
                      aria-label={lang === "ko" ? "기본값·설명" : "Default & description"}
                      aria-expanded={detailOpen(c, i)}
                      onClick={() => setOpenRows((prev) => {
                        const next = new Set(prev);
                        if (next.has(i)) next.delete(i); else next.add(i);
                        return next;
                      })}>
                      <ChevronDown size={13} />
                    </Pressable>
                    </Tooltip>
                  </td>
                  <td className={css.tdX}>
                    <CloseButton size="xs" ariaLabel={lang === "ko" ? "컬럼 삭제" : "Remove column"}
                      onClick={() => setCols(draft.columns.filter((_, j) => j !== i))} />
                  </td>
                </tr>
                {/* 기본값·설명·인덱스·ENUM — 매 행에 열로 두면 이름 칸이 잘린다.
                    SQL 로 들어온 값이 있으면 자동으로 펼쳐 보이지 않는 채로 저장되는 일이 없게 한다. */}
                {detailOpen(c, i) && (
                  <tr className={css.detailRow}>
                    <td colSpan={9}>
                      <div className={css.detail}>
                        <label className={css.detailField}>
                          <span>{lang === "ko" ? "기본값" : "Default"}</span>
                          <input className={css.cell} value={c.defaultValue ?? ""}
                            placeholder={lang === "ko" ? "now(), 'draft' …" : "now(), 'draft' …"}
                            onChange={(e) => setCols(draft.columns.map((x, j) =>
                              (j === i ? { ...x, defaultValue: e.target.value || undefined } : x)))} />
                        </label>
                        <label className={css.detailField}>
                          <span>{lang === "ko" ? "설명" : "Description"}</span>
                          <input className={css.cell} value={c.comment ?? ""}
                            placeholder={lang === "ko" ? "이 컬럼이 무엇인지" : "what this column is"}
                            onChange={(e) => setCols(draft.columns.map((x, j) =>
                              (j === i ? { ...x, comment: e.target.value || undefined } : x)))} />
                        </label>
                        {/* 인덱스·ENUM 은 SQL 에서만 오는 값이라 표시만 한다 */}
                        {c.indexed && <span className={css.detailFlag}>INDEX</span>}
                        {!!c.enumValues?.length && (
                          <span className={css.detailFlag}>ENUM {c.enumValues.join(" | ")}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <div className={css.colActions}>
          <Button variant="subtle" size="sm" icon={<Plus size={14} />} onClick={addColumn}>
            {lang === "ko" ? "컬럼 추가" : "Add column"}
          </Button>
          {picked.size > 0 && (
            <Button variant="subtle" size="sm" tone="danger" onClick={removePicked}>
              {lang === "ko" ? `선택 ${picked.size}개 삭제` : `Delete ${picked.size} selected`}
            </Button>
          )}
        </div>
      </div>

      {/* 방향을 화살표 하나로만 구분하면 어느 쪽이 참조하는 쪽인지 읽히지 않는다.
          → 참조하는 쪽 / 참조당하는 쪽을 아예 그룹으로 나누고,
            chip 안 화살표는 늘 "참조하는 컬럼 → 참조되는 컬럼" 방향으로 고정한다. */}
      {(outgoing.length > 0 || incoming.length > 0) && (
        <div className={css.field}>
          <span className={css.label}>{lang === "ko" ? "관계" : "Relations"}</span>

          {outgoing.length > 0 && (
            <div className={css.relGroup}>
              <span className={css.relLabel}>
                {lang === "ko" ? "이 테이블이 참조하는 곳" : "References"}
              </span>
              <div className={css.rels}>
                {outgoing.map((r, i) => (
                  <Chip key={`o${i}`} className={css.rel}
                    onRemove={() => onChange(tables, relations.filter((x) => x !== r))}>
                    <span className={css.relCol}>{r.fromField}</span>
                    <ArrowRight className={css.relArrow} size={12} strokeWidth={2.5} aria-hidden />
                    <span className={css.relCol}>{r.to}.{r.toField}</span>
                  </Chip>
                ))}
              </div>
            </div>
          )}

          {incoming.length > 0 && (
            <div className={css.relGroup}>
              <span className={css.relLabel}>
                {lang === "ko" ? "이 테이블을 참조하는 곳" : "Referenced by"}
              </span>
              <div className={css.rels}>
                {incoming.map((r, i) => (
                  <Chip key={`i${i}`} className={css.rel}
                    onRemove={() => onChange(tables, relations.filter((x) => x !== r))}>
                    <span className={css.relCol}>{r.from}.{r.fromField}</span>
                    <ArrowRight className={css.relArrow} size={12} strokeWidth={2.5} aria-hidden />
                    <span className={css.relCol}>{r.toField}</span>
                  </Chip>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {footerEl && createPortal(
        <div className={css.footerSlot}>
          {tried && issues.length > 0 && (
            <p className={css.hint} role="alert">
              {issues.map((m) => <span key={m}>{m}</span>)}
            </p>
          )}
          <div className={css.footer}>
            <Button variant="subtle" size="sm" tone="danger"
              /* 테이블 삭제는 연결된 관계까지 즉시 지운다 — 되돌릴 길이 없으니 한 번 묻는다.
                 모달 스택이라 확인창이 위에 쌓이고, 확인 시 확인창(자체) → 이 모달 순으로 닫힌다. */
              onClick={() => {
                const relCount = relations.filter((r) => r.from === table.name || r.to === table.name).length;
                openModal(
                  <ModalConfirm
                    desc={lang === "ko"
                      ? `"${table.name}" 테이블을 삭제합니다.${relCount > 0 ? ` 연결된 관계 ${relCount}개도 함께 사라집니다.` : ""} 되돌릴 수 없습니다.`
                      : `Delete table "${table.name}".${relCount > 0 ? ` ${relCount} linked relation(s) will be removed as well.` : ""} This cannot be undone.`}
                    confirmText={lang === "ko" ? "삭제" : "Delete"}
                    danger
                    onConfirm={() => { onDelete(table.name); closeModal(); }}
                  />,
                  { width: "min(90vw, 460px)" },
                );
              }}>
              {lang === "ko" ? "테이블 삭제" : "Delete table"}
            </Button>
            <span className={css.footerRight}>
              <Button variant="subtle" size="sm" onClick={() => closeModal()}>
                {lang === "ko" ? "취소" : "Cancel"}
              </Button>
              <Button variant="primary" size="sm" onClick={commit}>
                {lang === "ko" ? "저장" : "Save"}
              </Button>
            </span>
          </div>
        </div>,
        footerEl,
      )}
    </div>
  );
}
