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
import { Plus, Link2, KeyRound, ArrowRight, ArrowLeft, ArrowLeftRight, List, Network } from "lucide-react";
import Button from "@/components/ui/Button";
import SearchCapsule from "@/components/ui/SearchCapsule/SearchCapsule";
import { useModalStore } from "@/stores/modalStore";
import ErdTableModal from "./ErdTableModal";
import ErdExplorer from "@/components/about/ErdExplorer";
import { erdDesignNotes } from "@/data/about/erd";
import type { ErdTable, ErdRelation } from "@/data/about/types";
import css from "./ErdCanvas.module.css";

type Lang = "ko" | "en";

export default function ErdCanvas({ tables, relations, onChange, lang }: {
  tables: ErdTable[];
  relations: ErdRelation[];
  onChange: (t: ErdTable[], r: ErdRelation[]) => void;
  lang: Lang;
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
  const shown = query
    ? tables.filter((t) =>
        t.name.toLowerCase().includes(query) ||
        t.columns.some((c) => c.name.toLowerCase().includes(query)))
    : tables;

  const setTables = (v: ErdTable[]) => onChange(v, relations);

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

      {view === "diagram" && (
        <div className={css.flowBox}>
          {/* 상태·연관 계산·노트 표시는 공개 About 패널과 같은 컴포넌트가 맡는다 */}
          <ErdExplorer
            tables={tables} relations={relations}
            notes={erdDesignNotes} lang={lang}
            onEdit={openEditor}
          />
        </div>
      )}

      {view === "list" && (
      <div className={css.grid}>
        {shown.map((t) => {
          const rels = relOf.get(t.name) ?? [];
          const on = sel === t.name;
          const dir = related?.get(t.name) ?? null;
          const dim = related != null && !on && dir == null;
          const pk = t.columns.filter((c) => c.pk).map((c) => c.name);
          return (
            <div key={t.name}
              className={`${css.card} ${on ? css.cardOn : ""} ${dir ? css.cardRel : ""} ${dim ? css.cardDim : ""}`}
              onMouseEnter={() => setSel(t.name)}
              onMouseLeave={() => setSel(null)}>
              <button type="button" className={css.cardMain} onClick={() => openEditor(t)}>
                <span className={css.cardTop}>
                  <span className={css.cardName}>{t.name}</span>
                  {/* 관계가 있다는 사실뿐 아니라 어느 방향인지까지 보여준다 */}
                  {dir && (
                    <span className={css.dirTag}>
                      {dir === "out" && <><ArrowLeft size={11} />{lang === "ko" ? "참조됨" : "referenced"}</>}
                      {dir === "in" && <><ArrowRight size={11} />{lang === "ko" ? "참조함" : "references"}</>}
                      {dir === "both" && <><ArrowLeftRight size={11} />{lang === "ko" ? "양방향" : "both"}</>}
                    </span>
                  )}
                </span>
                {/* 숫자만 두면 무슨 수인지 알 수 없다 — 단위를 붙인다 */}
                <span className={css.cardSub}>
                  <span className={css.stat}>
                    {t.columns.length} {lang === "ko" ? "컬럼" : t.columns.length === 1 ? "column" : "columns"}
                  </span>
                  {rels.length > 0 && (
                    <span className={css.stat}>
                      <Link2 size={11} />
                      {rels.length} {lang === "ko" ? "관계" : rels.length === 1 ? "relation" : "relations"}
                    </span>
                  )}
                  {pk.length > 0 && (
                    <span className={css.pkTag} title={lang === "ko" ? "기본키" : "Primary key"}>
                      <KeyRound size={10} />{pk.join(", ")}
                    </span>
                  )}
                </span>
              </button>
            </div>
          );
        })}

        {shown.length === 0 && (
          <p className={css.empty}>
            {lang === "ko" ? "일치하는 테이블이 없습니다." : "No matching tables."}
          </p>
        )}
      </div>
      )}
    </div>
  );
}
