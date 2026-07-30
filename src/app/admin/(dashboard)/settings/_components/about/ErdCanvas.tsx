"use client";

/* ERD 편집 — 목록 / 스키마 / 개념 세 가지 보기.
 *
 * 목록: 카드 그리드. 테이블 추가·검색·편집에 가장 빠르다.
 * 스키마: 공개 패널과 같은 ErdFlow(React Flow) — 배치가 어긋날 수 없다. 클릭하면 편집 모달.
 * 개념: Chen 표기(엔티티/속성/관계) — 전체 스키마 대신 핵심 엔티티만 추려 관계를 보여준다.
 *
 * 좌표는 어디에도 저장하지 않는다. 관계 그래프에서 매번 계산하므로
 * 새 테이블을 추가하면 공개 ERD 에도 곧바로 자리를 잡는다. */

import { useCallback, useMemo, useState } from "react";
import type { Language } from "@/types";
import { Plus, Link2, ArrowRight, ArrowLeft, ArrowLeftRight, List, Network, AlertTriangle } from "@/components/icons";
import Button from "@/components/ui/Button";
import SearchCapsule from "@/components/ui/SearchCapsule/SearchCapsule";
import { useModalStore } from "@/stores/modalStore";
import ErdTableModal from "./ErdTableModal";
import ErdExplorer from "@/components/about/ErdExplorer";
import { erdDesignNotes } from "@/data/about/erd";
import type { ErdTable, ErdRelation } from "@/data/about/types";
import Tooltip from "@/components/ui/Tooltip";
import css from "./ErdCanvas.module.css";


/* 카드에 보여줄 컬럼 수 — 더 늘리면 카드가 다이어그램 노드와 다를 게 없어진다 */
const PREVIEW_COLS = 3;

export default function ErdCanvas({ tables, relations, onChange, lang }: {
  tables: ErdTable[];
  relations: ErdRelation[];
  onChange: (t: ErdTable[], r: ErdRelation[]) => void;
  lang: Language;
}) {
  const openModal = useModalStore((st) => st.openModal);
  const [sel, setSel] = useState<string | null>(null);
  const [q, setQ] = useState("");
  /* 목록 = 추가·편집용, 다이어그램 = 공개 패널과 같은 배치의 미리보기 */
  const [view, setView] = useState<"list" | "diagram">("list");


  const relOf = useMemo(() => {
    const m = new Map<string, ErdRelation[]>();
    relations.forEach((r) => {
      if (!m.has(r.from)) m.set(r.from, []);
      if (!m.has(r.to)) m.set(r.to, []);
      m.get(r.from)!.push(r);
      m.get(r.to)!.push(r);
    });
    return m;
  }, [relations]);

  /* 선택한 테이블과 연결된 테이블. 흐리게 하는 것만으로는 "관계 있음" 이 안 읽혀서
     방향(참조함 / 참조됨)까지 같이 들고 있다가 카드에 배지로 표시한다. */
  const related = useMemo(() => {
    if (!sel) return null;
    const m = new Map<string, "out" | "in" | "both">();
    (relOf.get(sel) ?? []).forEach((r) => {
      const other = r.from === sel ? r.to : r.from;
      if (other === sel) return;
      const dir = r.from === sel ? "out" : "in";
      const prev = m.get(other);
      m.set(other, prev && prev !== dir ? "both" : dir);
    });
    return m;
  }, [sel, relOf]);

  const query = q.trim().toLowerCase();
  /* useMemo 필수 — 매 렌더 새 배열이면 다이어그램(ErdFlow)의 layout useMemo 가 깨져
     노드가 통째로 재생성되고 화면이 깜빡인다. 검색어가 없으면 원본 참조를 그대로 쓴다. */
  const shown = useMemo(
    () => (query
      ? tables.filter((t) =>
          t.name.toLowerCase().includes(query) ||
          t.columns.some((c) => c.name.toLowerCase().includes(query)))
      : tables),
    [tables, query],
  );

  /* 다이어그램도 같은 검색 결과를 반영 — 관계는 양끝이 모두 남아있는 것만 그린다
     (한쪽이 걸러지면 존재하지 않는 노드로 가는 엣지가 된다). */
  const shownRelations = useMemo(() => {
    if (!query) return relations;
    const names = new Set(shown.map((t) => t.name));
    return relations.filter((r) => names.has(r.from) && names.has(r.to));
  }, [relations, shown, query]);

  const setTables = (v: ErdTable[]) => onChange(v, relations);

  /* 저장 시 DB CHECK(about_erd_valid)가 거부하는 조건과 같은 규칙으로 미리 표시한다.
     모달을 하나씩 열어봐야 문제를 아는 상태면, 저장이 막혔을 때 원인을 찾을 수가 없다. */
  const issuesOf = useMemo(() => {
    const nameCount = new Map<string, number>();
    tables.forEach((t) => {
      const k = t.name.trim().toLowerCase();
      nameCount.set(k, (nameCount.get(k) ?? 0) + 1);
    });
    const m = new Map<string, string[]>();
    tables.forEach((t) => {
      const list: string[] = [];
      const key = t.name.trim().toLowerCase();
      if (!key) list.push(lang === "ko" ? "테이블 이름이 비어 있음" : "Table name is empty");
      else if ((nameCount.get(key) ?? 0) > 1) list.push(lang === "ko" ? "테이블 이름 중복" : "Duplicate table name");
      if (t.columns.length === 0) list.push(lang === "ko" ? "컬럼이 없음" : "No columns");
      if (t.columns.some((c) => !c.name.trim())) list.push(lang === "ko" ? "이름이 빈 컬럼" : "Column with an empty name");
      if (t.columns.some((c) => !c.type.trim())) list.push(lang === "ko" ? "타입이 빈 컬럼" : "Column with an empty type");
      const seen = new Set<string>();
      const dupCol = t.columns.some((c) => {
        const k = c.name.trim().toLowerCase();
        if (!k) return false;
        if (seen.has(k)) return true;
        seen.add(k);
        return false;
      });
      if (dupCol) list.push(lang === "ko" ? "컬럼 이름 중복" : "Duplicate column name");
      if (list.length > 0) m.set(t.name, list);
    });
    return m;
  }, [tables, lang]);

  /* 다이어그램에서 컬럼끼리 끌어 만든 관계 — 모달을 열지 않고도 연결할 수 있어야 한다.
     같은 연결을 다시 그으면 무시한다(중복 엣지는 선만 겹쳐 보인다). */
  const createRelation = useCallback((rel: ErdRelation) => {
    const dup = relations.some((r) =>
      r.from === rel.from && r.to === rel.to && r.fromField === rel.fromField && r.toField === rel.toField);
    if (dup) return;
    onChange(tables, [...relations, rel]);
  }, [onChange, tables, relations]);

  const removeTable = useCallback((name: string) => {
    onChange(
      tables.filter((t) => t.name !== name),
      relations.filter((r) => r.from !== name && r.to !== name),
    );
    setSel(null);
  }, [onChange, tables, relations]);

  /* 편집은 모달에서 — 카드 안 인라인은 컬럼이 많아지면 그리드를 통째로 밀어낸다.
     useCallback 필수 — 매 렌더 새 함수를 넘기면 ErdFlow 의 노드 memo 가 깨져
     hover 할 때마다 노드가 통째로 재생성되고 화면이 깜빡인다. */
  const openEditor = useCallback((t: ErdTable) => {
    openModal(
      <ErdTableModal table={t} tables={tables} relations={relations}
        onChange={onChange} onDelete={removeTable} lang={lang} />,
      { header: { title: t.name }, width: "auto" },
    );
  }, [openModal, tables, relations, onChange, removeTable, lang]);

  const addTable = () => {
    let n = 1;
    while (tables.some((t) => t.name === `new_table_${n}`)) n++;
    const name = `new_table_${n}`;
    const next: ErdTable = { name, columns: [{ name: "id", type: "uuid", pk: true }] };
    setTables([...tables, next]);
    setQ("");
    openEditor(next);
  };

  return (
    <div className={css.wrap}>
      <div className={css.toolbar}>
        {/* 공통 SearchCapsule — 지우개·이력 UI 를 자체 구현할 이유가 없다.
            이력/도움말은 이 자리에 불필요해서 끈다. */}
        <SearchCapsule size="sm" search={q} onSearchChange={setQ}
          /* 기본값 align="right" 는 margin-left:auto 를 붙인다 — 툴바 맨 앞 자리라 left */
          align="left" className={css.search}
          placeholder={lang === "ko" ? "테이블·컬럼 검색" : "Search tables or columns"}
          historyKey={null} showHelp={false} />
        <Button variant="subtle" size="sm" icon={<Plus size={14} />} onClick={addTable}>
          {lang === "ko" ? "테이블 추가" : "Add table"}
        </Button>
        <span className={css.count}>
          {lang === "ko"
            ? `테이블 ${tables.length} · 관계 ${relations.length}`
            : `${tables.length} tables · ${relations.length} relations`}
        </span>
        {/* 저장이 거부되기 전에 몇 개가 문제인지 먼저 알려준다 */}
        {issuesOf.size > 0 && (
          <span className={css.warnCount}>
            <AlertTriangle size={12} />
            {lang === "ko" ? `확인 필요 ${issuesOf.size}` : `${issuesOf.size} need attention`}
          </span>
        )}
        {/* 목록/다이어그램 전환 — 편집은 목록이 빠르고, 관계 파악은 다이어그램이 낫다 */}
        <div className={css.viewSwitch} role="tablist">
          <button type="button" role="tab" aria-selected={view === "list"}
            className={`${css.viewBtn} ${view === "list" ? css.viewBtnOn : ""}`}
            onClick={() => setView("list")}>
            <List size={13} />{lang === "ko" ? "목록" : "List"}
          </button>
          <button type="button" role="tab" aria-selected={view === "diagram"}
            className={`${css.viewBtn} ${view === "diagram" ? css.viewBtnOn : ""}`}
            onClick={() => setView("diagram")}>
            <Network size={13} />{lang === "ko" ? "다이어그램" : "Diagram"}
          </button>
        </div>
      </div>

      {/* 빈 상태는 두 뷰 공통 — "처음이라 없음"과 "검색해서 없음"은 필요한 안내가 다르다 */}
      {shown.length === 0 && (
        <div className={css.emptyBox}>
          {tables.length === 0 ? (
            <>
              <p className={css.emptyTitle}>
                {lang === "ko" ? "아직 테이블이 없습니다" : "No tables yet"}
              </p>
              <p className={css.emptyHint}>
                {lang === "ko"
                  ? "테이블을 직접 추가하거나, 위의 SQL 가져오기에 setup.sql 을 붙여넣으면 한 번에 만들어집니다."
                  : "Add a table, or paste your setup.sql into SQL import above to generate them all at once."}
              </p>
              <Button variant="subtle" size="sm" icon={<Plus size={14} />} onClick={addTable}>
                {lang === "ko" ? "테이블 추가" : "Add table"}
              </Button>
            </>
          ) : (
            <>
              <p className={css.emptyTitle}>
                {lang === "ko" ? "일치하는 테이블이 없습니다" : "No matching tables"}
              </p>
              <p className={css.emptyHint}>
                {lang === "ko"
                  ? `"${q.trim()}" 와(과) 이름·컬럼이 일치하는 테이블이 없습니다.`
                  : `No table name or column matches "${q.trim()}".`}
              </p>
              <Button variant="outline" size="sm" onClick={() => setQ("")}>
                {lang === "ko" ? "검색 지우기" : "Clear search"}
              </Button>
            </>
          )}
        </div>
      )}

      {view === "diagram" && shown.length > 0 && (
        <div className={css.flowBox}>
          {/* 상태·연관 계산·노트 표시는 공개 About 패널과 같은 컴포넌트가 맡는다 */}
          <ErdExplorer
            /* 검색 결과를 그대로 반영 — 툴바 검색이 이 뷰에서만 무동작이면 안 된다.
               key 로 검색어를 물려 결과가 바뀌면 fitView 가 다시 잡히게 한다. */
            key={query || "all"}
            tables={shown} relations={shownRelations}
            notes={erdDesignNotes} lang={lang}
            onEdit={openEditor}
            onCreateRelation={createRelation}
          />
        </div>
      )}

      {view === "list" && shown.length > 0 && (
      <div className={css.grid}>
        {shown.map((t) => {
          const rels = relOf.get(t.name) ?? [];
          const on = sel === t.name;
          const dir = related?.get(t.name) ?? null;
          const dim = related != null && !on && dir == null;
          /* 개수만으로는 테이블의 성격을 알 수 없다 — 앞쪽 컬럼을 그대로 보여준다.
             정의 순서를 지킨다(정렬하면 실제 스키마와 다른 인상을 준다). */
          const preview = t.columns.slice(0, PREVIEW_COLS);
          const rest = t.columns.length - preview.length;
          return (
            <div key={t.name}
              className={`${css.card} ${on ? css.cardOn : ""} ${dir ? css.cardRel : ""} ${dim ? css.cardDim : ""}`}
              onMouseEnter={() => setSel(t.name)}
              onMouseLeave={() => setSel(null)}>
              <button type="button" className={css.cardMain} onClick={() => openEditor(t)}>
                {/* 머리글 띠 — 다이어그램 노드와 같은 생김새라 두 뷰가 같은 물건으로 읽힌다 */}
                <span className={css.cardHead}>
                  <span className={css.cardName}>{t.name}</span>
                  {issuesOf.has(t.name) && (
                    <Tooltip content={issuesOf.get(t.name)!.join(" · ")} delay={150}>
                      <span className={css.warnTag}>
                        <AlertTriangle size={10} />
                        {lang === "ko" ? "확인 필요" : "Check"}
                      </span>
                    </Tooltip>
                  )}
                  {/* 관계가 있다는 사실뿐 아니라 어느 방향인지까지 보여준다 */}
                  {dir && (
                    <span className={css.dirTag}>
                      {dir === "out" && <><ArrowLeft size={11} />{lang === "ko" ? "참조됨" : "referenced"}</>}
                      {dir === "in" && <><ArrowRight size={11} />{lang === "ko" ? "참조함" : "references"}</>}
                      {dir === "both" && <><ArrowLeftRight size={11} />{lang === "ko" ? "양방향" : "both"}</>}
                    </span>
                  )}
                </span>
                <span className={css.cardCols}>
                  {preview.map((c) => (
                    <span key={c.name} className={css.col}>
                      <span className={`${css.colKey} ${c.pk ? css.colKeyPk : c.fk ? css.colKeyFk : ""}`}>
                        {c.pk ? "PK" : c.fk ? "FK" : ""}
                      </span>
                      <span className={css.colName}>{c.name}</span>
                      <span className={css.colType}>{c.type}</span>
                    </span>
                  ))}
                </span>
                {/* 숫자만 두면 무슨 수인지 알 수 없다 — 단위를 붙인다 */}
                <span className={css.cardSub}>
                  {rest > 0 && (
                    <span className={css.stat}>
                      {lang === "ko" ? `+${rest} 컬럼 더` : `+${rest} more`}
                    </span>
                  )}
                  <span className={css.stat}>
                    {t.columns.length} {lang === "ko" ? "컬럼" : t.columns.length === 1 ? "column" : "columns"}
                  </span>
                  {rels.length > 0 && (
                    <span className={css.stat}>
                      <Link2 size={11} />
                      {rels.length} {lang === "ko" ? "관계" : rels.length === 1 ? "relation" : "relations"}
                    </span>
                  )}
                </span>
              </button>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
