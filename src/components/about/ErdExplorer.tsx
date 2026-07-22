"use client";

/* ERD 탐색기 — 공개 About 패널과 admin 스튜디오가 공유한다.
 *
 * 예전에는 두 화면이 각자 상태(선택/hover/연관 계산)와 노트 마크업을 들고 있었다.
 * 같은 걸 두 벌 유지하니 한쪽만 고쳐지는 일이 반복됐다 —
 * 노트가 공개에선 하나만 뜨고, 클릭 동작도 서로 달랐다.
 *
 * 여기서 담당하는 것: 선택/hover 상태, 연관 테이블 계산, 좁혀 보기, 설계 노트 표시.
 * 바깥에서 다른 것: 헤더(제목/힌트), 줌 컨트롤 모양, 편집 진입 여부. */

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { X, Network, Shapes } from "lucide-react";
import { Panel } from "@xyflow/react";
import ErdFlow from "./ErdFlow";
import ChenFlow from "./ChenFlow";
import { buildConceptOverlay } from "@/data/about/erdConceptual";
import ErdControls from "./ErdControls";
import type { ErdTable, ErdRelation, ErdDesignNote } from "@/data/about/types";
import css from "./ErdExplorer.module.css";

export default function ErdExplorer({
  tables, relations, notes, lang,
  onEdit, initialZoom, children, className,
  renderFocusBar,
}: {
  tables: ErdTable[];
  relations: ErdRelation[];
  notes: ErdDesignNote[];
  lang: "ko" | "en";
  /** 주면 포커스 바에 편집 버튼이 생긴다 (admin 전용) */
  onEdit?: (t: ErdTable) => void;
  initialZoom?: number;
  /** ReactFlow 안에 넣을 추가 요소 (커스텀 줌 컨트롤 등) */
  children?: ReactNode;
  className?: string;
  /** 포커스 바를 바깥에서 그리고 싶을 때 */
  renderFocusBar?: (info: { name: string; relatedCount: number; clear: () => void }) => ReactNode;
}) {
  const [view, setView] = useState<"concept" | "schema">("schema");
  const [focus, setFocus] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  /* 개념 뷰에서 엔티티를 누르면 스키마 뷰의 그 테이블로 넘어간다 —
     "이 엔티티가 실제로는 어떤 테이블인가" 를 바로 이어서 보게 한다. */
  const jumpToTable = useCallback((name: string) => {
    setFocus(name);
    setView("schema");
  }, []);

  /* 인라인 화살표로 넘기면 매 렌더 새 참조가 돼 ErdFlow 의 노드가 재생성되고,
     mousedown 과 mouseup 사이에 DOM 이 교체돼 클릭이 아예 발생하지 않는다. */
  const handleOpen = useCallback((t: ErdTable) => {
    setFocus((prev) => (prev === t.name ? null : t.name));
  }, []);
  const clearFocus = useCallback(() => setFocus(null), []);

  /* 포커스한 테이블 + 직접 연결된 것만 — 23개를 다 띄우면 어느 게 엮였는지 보려고 계속 팬해야 한다 */
  const sub = useMemo(() => {
    if (!focus) return null;
    const keep = new Set<string>([focus]);
    relations.forEach((r) => {
      if (r.from === focus) keep.add(r.to);
      if (r.to === focus) keep.add(r.from);
    });
    return {
      tables: tables.filter((t) => keep.has(t.name)),
      relations: relations.filter((r) => keep.has(r.from) && keep.has(r.to)),
      notes: notes.filter((n) => n.relatedTable === focus),
    };
  }, [focus, tables, relations, notes]);

  const highlight = focus ?? hovered;
  const related = useMemo(() => {
    if (!highlight) return null;
    const s = new Set<string>([highlight]);
    relations.forEach((r) => {
      if (r.from === highlight) s.add(r.to);
      if (r.to === highlight) s.add(r.from);
    });
    return s;
  }, [highlight, relations]);

  /* 포커스 표시는 캔버스 안 좌상단에 떠 있는 칩으로 —
     바깥에 전체 폭 바를 두면 다이어그램이 아래로 밀리고 별개 UI 처럼 보인다. */
  const focusChip = sub && focus ? (
    <Panel position="top-left" className={css.focusChip}>
      {renderFocusBar?.({ name: focus, relatedCount: sub.tables.length - 1, clear: clearFocus }) ?? (
        <>
          <span className={css.focusTitle}>
            <strong>{focus}</strong>
            {lang === "ko" ? ` +${sub.tables.length - 1}` : ` +${sub.tables.length - 1}`}
          </span>
          {onEdit && (
            <button type="button" className={css.focusBtn} data-clickable="true"
              onClick={() => { const t = tables.find((x) => x.name === focus); if (t) onEdit(t); }}>
              {lang === "ko" ? "편집" : "Edit"}
            </button>
          )}
          <button type="button" className={css.focusBtn} data-clickable="true"
            aria-label={lang === "ko" ? "전체 보기" : "Show all"} onClick={clearFocus}>
            <X size={13} />
          </button>
        </>
      )}
    </Panel>
  ) : null;

  /* 뷰는 둘 — 표현 층위가 실제로 다른 것만 남긴다.
     논리/물리로 나눠봤지만 같은 그림에서 타입 라벨만 켜고 끄는 차이라
     뷰로 나눌 값이 아니었다. 대신 스키마 뷰가 타입과 개념 주석을 함께 보여준다. */
  const VIEWS = [
    { id: "concept" as const, icon: <Shapes size={12} />, ko: "개념", en: "Conceptual" },
    { id: "schema" as const, icon: <Network size={12} />, ko: "스키마", en: "Schema" },
  ];

  const viewToggle = (
    <Panel position="top-right" className={css.viewSwitch}>
      {VIEWS.map((v) => (
        <button key={v.id} type="button" data-clickable="true"
          className={`${css.viewBtn} ${view === v.id ? css.viewBtnOn : ""}`}
          onClick={() => setView(v.id)}>
          {v.icon}{lang === "ko" ? v.ko : v.en}
        </button>
      ))}
    </Panel>
  );

  /* 논리 뷰에 얹을 개념 정보 — 관계 동사, M:N 조인 테이블, 다중값/파생 컬럼 */
  const overlay = useMemo(
    () => buildConceptOverlay(tables, relations),
    [tables, relations],
  );

  /* 개념 뷰 — Chen 표기 */
  const conceptPane = (extra?: ReactNode) => (
    <ChenFlow tables={tables} relations={relations} lang={lang}
      showControls={false} onEntityClick={jumpToTable}>
      {extra}
      <ErdControls lang={lang} />
    </ChenFlow>
  );

  const schemaPane = (extra?: ReactNode) => (
    <ErdFlow
      /* 표시 대상이 바뀌면 배치를 새로 잡아야 한다 */
      key={focus ?? "all"}
      tables={sub ? sub.tables : tables}
      relations={sub ? sub.relations : relations}
      selected={highlight}
      related={related}
      onHover={setHovered}
      onOpen={handleOpen}
      /* 빈 곳을 누르면 전체 보기로 — 칩의 X 말고도 빠져나올 길을 둔다 */
      onPaneClick={clearFocus}
      showControls={false}
      initialZoom={initialZoom}
      lang={lang}
      /* 개념 주석(관계 동사·M:N·다중값/파생)을 타입과 함께 항상 보여준다 */
      concept={overlay}
      /* 설계 노트는 다이어그램 안, 그 테이블 옆에 */
      noteAnchor={focus}
      note={sub && sub.notes.length > 0 ? (
        <div className={css.notes}>
          {sub.notes.map((n) => (
            <article key={n.tag} className={css.note}>
              <strong className={css.noteTitle}>{n.title[lang]}</strong>
              <code className={css.noteTag}>{n.tag}</code>
              <p className={css.noteDesc}>{n.description[lang]}</p>
            </article>
          ))}
        </div>
      ) : null}
    >
      {focusChip}
      {extra}
      <ErdControls lang={lang} />
    </ErdFlow>
  );

  if (view === "concept") {
    return (
      <div className={`${css.wrap} ${className ?? ""}`}>
        <div className={css.flow}>{conceptPane(<>{viewToggle}{children}</>)}</div>
      </div>
    );
  }

  return (
    <div className={`${css.wrap} ${className ?? ""}`}>
      <div className={css.flow}>{schemaPane(<>{viewToggle}{children}</>)}</div>
    </div>
  );
}
