"use client";

/* ERD 탐색기 — 공개 About 패널과 admin 스튜디오가 공유한다.
 *
 * 예전에는 두 화면이 각자 상태(선택/hover/연관 계산)와 노트 마크업을 들고 있었다.
 * 같은 걸 두 벌 유지하니 한쪽만 고쳐지는 일이 반복됐다 —
 * 노트가 공개에선 하나만 뜨고, 클릭 동작도 서로 달랐다.
 *
 * 여기서 담당하는 것: 선택/hover 상태, 연관 테이블 계산, 좁혀 보기, 설계 노트 표시.
 * 바깥에서 다른 것: 헤더(제목/힌트), 줌 컨트롤 모양, 편집 진입 여부. */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { X, Network, Shapes } from "@/components/icons";
import { Panel, type Viewport } from "@xyflow/react";
import ErdFlow from "./ErdFlow";
import ChenFlow from "./ChenFlow";
import { buildConceptOverlay } from "@/data/about/erdConceptual";
import ErdControls from "./ErdControls";
import type { ErdTable, ErdRelation, ErdDesignNote } from "@/data/about/types";
import css from "./ErdExplorer.module.css";

export default function ErdExplorer({
  tables, relations, notes, lang,
  onEdit, onCreateRelation, initialZoom, children, className,
  renderFocusBar,
}: {
  tables: ErdTable[];
  relations: ErdRelation[];
  notes: ErdDesignNote[];
  lang: "ko" | "en";
  /** 주면 포커스 바에 편집 버튼이 생긴다 (admin 전용) */
  onEdit?: (t: ErdTable) => void;
  /** 주면 컬럼 handle 을 끌어 관계를 만들 수 있다 (admin 전용) */
  onCreateRelation?: (rel: ErdRelation) => void;
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
  /* 좁혀 본 상태에서 한 번 더 누른 대상 — 화면만 그쪽으로 옮긴다(포커스는 그대로) */
  const [zoomTarget, setZoomTarget] = useState<string | null>(null);
  /* 리마운트를 넘어 화면 위치를 이어붙인다 — 없으면 매번 기본 위치에서 튀어나와 이동으로 안 보인다.
     ErdExplorer 는 리마운트되지 않으므로 여기 담아두면 살아남는다. */
  const viewportRef = useRef<Viewport | undefined>(undefined);
  const rememberViewport = useCallback((v: Viewport) => { viewportRef.current = v; }, []);

  /* 개념 뷰에서 엔티티를 누르면 그 자리에서 좁혀 본다(점진적 공개).
     "실제 테이블은 어떤 모양인가" 로 넘어가는 건 포커스 칩의 명시적 버튼이 맡는다 —
     클릭이 곧 뷰 전환이면 개념적 맥락을 잃는다. */
  const focusEntity = useCallback((name: string) => {
    setFocus((prev) => (prev === name ? null : name));
  }, []);
  const jumpToSchema = useCallback(() => setView("schema"), []);

  /* 인라인 화살표로 넘기면 매 렌더 새 참조가 돼 ErdFlow 의 노드가 재생성되고,
     mousedown 과 mouseup 사이에 DOM 이 교체돼 클릭이 아예 발생하지 않는다.

     한 박자 늦춰 토글하는 이유 — 포커스가 바뀌면 schemaPane 의 key(=focus) 가 바뀌어
     ErdFlow 가 통째로 리마운트된다. 즉시 토글하면 더블클릭의 첫 클릭에서 DOM 이 갈려
     두 번째 클릭이 새 노드에 떨어지고 dblclick 이 아예 성립하지 않는다(= 편집이 안 열림).
     더블클릭이면 아래 handleNodeEdit 이 이 타이머를 취소한다. */
  const clickTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  /* handleOpen 은 참조가 고정돼야 한다(위 주석) — 최신 focus 는 ref 로 읽는다 */
  const focusRef = useRef<string | null>(null);
  focusRef.current = focus;
  const handleOpen = useCallback((t: ErdTable) => {
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => {
      /* 이미 좁혀 본 상태면 **화면만** 그 테이블로 옮긴다 — 무엇이 보이는지는 그대로다.
         같은 대상을 다시 누르면 되돌아온다(= 좁혀 본 전체가 다시 보인다).
         포커스 자체의 해제는 빈 곳 클릭이 맡는다. */
      if (focusRef.current) {
        setZoomTarget((prev) => (prev === t.name ? null : t.name));
        return;
      }
      setZoomTarget(null);
      setFocus(t.name);
    }, 220);
  }, []);

  /* 노트도 같은 규칙 — 누르면 그 노트만, 다시 누르면 되돌아온다 */
  const handleNoteClick = useCallback(
    () => setZoomTarget((prev) => (prev === "__note" ? null : "__note")), []);

  /* 더블클릭 = 편집. 대기 중인 포커스 토글을 취소해 리마운트를 막는다. */
  const handleNodeEdit = useCallback((t: ErdTable) => {
    if (clickTimer.current) clearTimeout(clickTimer.current);
    onEdit?.(t);
  }, [onEdit]);

  useEffect(() => () => { if (clickTimer.current) clearTimeout(clickTimer.current); }, []);
  const clearFocus = useCallback(() => { setFocus(null); setZoomTarget(null); }, []);

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

  /* 노트 JSX 는 반드시 메모 — 인라인으로 넘기면 렌더마다 새 객체라 ErdFlow 의 noteNode useMemo 가
     매번 무효화되고, 노트 위에 hover 하면 DOM 이 갈아끼워지며 mouseEnter 가 재발화돼 깜빡인다. */
  const noteContent = useMemo(() => (
    sub && sub.notes.length > 0 ? (
      <div className={css.notes}>
        {sub.notes.map((n) => (
          <article key={n.tag} className={css.note}>
            <strong className={css.noteTitle}>{n.title[lang]}</strong>
            <code className={css.noteTag}>{n.tag}</code>
            <p className={css.noteDesc}>{n.description[lang]}</p>
          </article>
        ))}
      </div>
    ) : null
  ), [sub, lang]);

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

  /* 개념 뷰 — Chen 표기. 클릭하면 그 엔티티로 좁혀 보고, 숨겨졌던 관계를 함께 보여준다. */
  const conceptPane = (extra?: ReactNode) => (
    <ChenFlow tables={tables} relations={relations} lang={lang}
      showControls={false} onEntityClick={focusEntity} focus={focus}>
      {focus && (
        <Panel position="top-left" className={css.focusChip}>
          <span className={css.focusTitle}><strong>{focus}</strong></span>
          <button type="button" className={css.focusBtn} data-clickable="true" onClick={jumpToSchema}>
            {lang === "ko" ? "스키마에서 보기" : "View in schema"}
          </button>
          <button type="button" className={css.focusBtn} data-clickable="true"
            aria-label={lang === "ko" ? "전체 보기" : "Show all"} onClick={clearFocus}>
            <X size={13} />
          </button>
        </Panel>
      )}
      {extra}
      <ErdControls lang={lang} />
    </ChenFlow>
  );

  const schemaPane = (extra?: ReactNode) => (
    <ErdFlow
      /* 표시 대상이나 볼 지점이 바뀌면 새로 마운트한다 — 카메라는 마운트 시점 fitView 가 잡는다.
         명령형 fitView 는 노드 측정 타이밍에 기대게 돼 조용히 아무 일도 안 하는 경우가 있었다. */
      key={`${focus ?? "all"}|${zoomTarget ?? ""}`}
      tables={sub ? sub.tables : tables}
      relations={sub ? sub.relations : relations}
      selected={highlight}
      related={related}
      onHover={setHovered}
      onOpen={handleOpen}
      /* onEdit 이 있을 때만(=admin) 더블클릭 편집이 열린다 */
      onNodeEdit={onEdit ? handleNodeEdit : undefined}
      onCreateRelation={onCreateRelation}
      /* 빈 곳을 누르면 전체 보기로 — 칩의 X 말고도 빠져나올 길을 둔다 */
      onPaneClick={clearFocus}
      showControls={false}
      initialZoom={initialZoom}
      lang={lang}
      /* 개념 주석(관계 동사·M:N·다중값/파생)을 타입과 함께 항상 보여준다 */
      concept={overlay}
      /* 포커스를 넘겨야 카메라가 상태에 맞게 잡힌다 —
         안 넘기면 ErdFlow 는 늘 '전체 보기' 로 알고 좁혀 본 걸 화면에 채우지 못한다 */
      focus={focus}
      zoomTo={zoomTarget}
      onNoteClick={handleNoteClick}
      lastViewport={viewportRef.current}
      onViewportSettled={rememberViewport}
      /* 설계 노트는 다이어그램 안, 그 테이블 옆에 */
      noteAnchor={focus}
      note={noteContent}
    >
      {focusChip}
      {/* 편집 경로 안내 — admin(onEdit 있음)에서만. 클릭=좁혀보기, 더블클릭=편집이 안 보이면 아무도 못 찾는다 */}
      {/* 편집 경로 안내 — admin(onEdit 있음)에서만. 클릭=좁혀보기, 더블클릭=편집이 안 보이면 아무도 못 찾는다 */}
      {onEdit && !focus && (
        <Panel position="bottom-left" className={css.editHint}>
          {lang === "ko"
            ? "클릭: 관계만 좁혀 보기 · 더블클릭: 테이블 편집 · 빈 곳: 전체 보기"
            : "Click: focus relations · Double-click: edit · Empty space: show all"}
        </Panel>
      )}
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
