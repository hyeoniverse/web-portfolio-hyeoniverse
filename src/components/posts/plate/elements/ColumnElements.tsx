import React, { useCallback, useRef, useEffect } from "react";

import {
  PlateElement,
  type PlateElementProps,
  useEditorRef,
  useSelected,
} from "platejs/react";

import { useLanguage } from "@/providers/LanguageProvider";

import { showToast } from "@/stores/toastStore";

import { COLUMN_DEFAULT_BG, COLUMN_MIN_PX, COLUMN_MAX_PX, COLUMN_GROUP_MAX_PX } from "../presets";

import base from "../../RichTextEditor.module.css";
import code from "../../EditorCode.module.css";
import diagram from "../../EditorDiagram.module.css";
import media from "../../EditorMedia.module.css";
const styles = { ...base, ...code, ...diagram, ...media };

/* 열 그룹과 열 — 너비 조절 포함 — elements.tsx 에서 분리 (#680). */

export function ColumnGroupElement(props: PlateElementProps) {
  const editor = useEditorRef();
  const { t } = useLanguage();
  // 최대 폭 안내 toast — 드래그 1회당 한 번만 (매 pointermove 마다 뜨면 도배된다)
  const maxToastedRef = useRef(false);
  const el = props.element as Record<string, unknown>;
  const colBg = el.columnBg as string | undefined;
  const colDivider = el.columnDivider as string | undefined;
  const columnScroll = el.columnScroll as boolean | undefined; // false = 스크롤 끔(넘치면 잘림)
  const groupRef = useRef<HTMLDivElement>(null);

  // 기본은 열 사이 가운데에 subtle 구분선 — "transparent" 로 명시하면 숨김
  const dividerColor = colDivider === "transparent" ? "transparent" : colDivider || "var(--border-color-light)";
  const colBgVal = colBg === "transparent" ? "transparent" : colBg || COLUMN_DEFAULT_BG;

  const colChildren = (el.children as unknown[]) || [];
  const colCount = colChildren.length;

  const onResizeDown = useCallback((index: number, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const group = groupRef.current;
    if (!group) return;

    const colEls = Array.from(group.querySelectorAll<HTMLElement>(":scope > [data-slate-node='element']"));
    // 마지막 열도 조절 대상 — 핸들 i 는 "열 i 의 오른쪽 모서리"라 마지막 열엔 마지막 핸들이 붙는다.
    // (예전엔 핸들이 열 "사이"에만 있어서 마지막 열은 조절할 방법이 없었다)
    if (index >= colEls.length) return;

    // 구분선을 끌면 **잡은 열만** 늘고 줄어든다 — 이웃은 그대로 두고 총폭이 같이 변한다(→ 넘치면 가로 스크롤).
    // 예전엔 이웃이 그만큼 흡수해서(zero-sum) 총폭이 두 열의 합에 묶였고, 그 합은 처음엔 화면 폭이라
    // "열을 아무리 넓혀도 총합이 화면 너비를 못 넘는" 상태였다(이웃을 MIN 까지 짜부라뜨려야 겨우 늘어남).
    // 놓으면 px 로 확정.
    const startWidths = colEls.map((el) => el.getBoundingClientRect().width);
    const startX = e.clientX;
    maxToastedRef.current = false;
    const clampPx = (w: number) => Math.min(COLUMN_MAX_PX, Math.max(COLUMN_MIN_PX, Math.round(w)));
    const applyPxWidths = (widths: number[]) => {
      colEls.forEach((el, i) => { el.style.flex = `0 0 ${clampPx(widths[i])}px`; });
    };

    // 상한은 둘 — 열 하나(COLUMN_MAX_PX)와 블록 전체(COLUMN_GROUP_MAX_PX, 나머지 열 합을 뺀 여유분).
    // 둘 중 먼저 걸리는 쪽에서 멈추되 **핸들은 계속 잡힌 채**로 두고, 왜 안 늘어나는지 toast 로 알린다.
    // (예전엔 조용히 clamp 만 해서 핸들이 죽은 것처럼 보였다)
    const othersSum = startWidths.reduce((sum, w, i) => (i === index ? sum : sum + w), 0);
    const groupRoom = COLUMN_GROUP_MAX_PX - othersSum;
    // 이미 상한을 넘긴 블록(예전 버그로 그렇게 저장된 글)이면 groupRoom 이 현재 폭보다 작거나 음수다.
    // 그대로 clamp 하면 **잡기만 해도** 손도 안 댄 열이 확 줄어든다 → 상한은 "더 못 늘린다"는 뜻일 뿐,
    // 이미 있는 폭을 강제로 깎지는 않는다. 줄이는 방향(want < 현재)은 min(cap, want) 라 그대로 먹는다.
    const cap = Math.max(startWidths[index], Math.min(COLUMN_MAX_PX, groupRoom));
    const hitGroup = groupRoom < COLUMN_MAX_PX; // 블록 상한이 먼저 걸린 경우

    let lastX = e.clientX;
    // 자동 스크롤이 대신 벌어준 폭. 포인터가 컨테이너 밖으로 나가면 더 갈 데가 없으므로
    // "포인터가 못 간 만큼"을 여기에 쌓아 폭에 더한다.
    let autoPan = 0;

    /** 현재 포인터 + autoPan 으로 폭을 다시 그린다. 상한에 걸렸으면 true. */
    const render = () => {
      // 잡은 열만 변경 → 총폭 = 기존 총폭 + dx. 이웃을 안 건드리므로 화면 너비에 묶이지 않는다.
      const want = startWidths[index] + (lastX - startX) + autoPan;
      if (want > cap && !maxToastedRef.current) {
        maxToastedRef.current = true;
        showToast(
          hitGroup
            ? t("editor.columnGroupMaxWidth").replace("{{max}}", String(COLUMN_GROUP_MAX_PX))
            : t("editor.columnMaxWidth").replace("{{max}}", String(COLUMN_MAX_PX)),
          "info",
        );
      }
      const widths = startWidths.slice();
      widths[index] = Math.max(COLUMN_MIN_PX, Math.min(cap, Math.round(want)));
      applyPxWidths(widths);
      return want > cap;
    };

    // ── 경계 밖으로 끌면 자동 스크롤 ──
    // 열을 넓히려면 핸들을 오른쪽으로 끌게 되는데, 블록이 이미 화면을 채우고 있으면 포인터가
    // 경계에서 막혀 거기서 성장이 멈춘다. 포인터가 **밖으로 나간 동안** 매 프레임 우리가 폭을
    // 대신 벌리고(autoPan) 같은 양만큼 스크롤해서, 핸들이 포인터 밑에 그대로 붙어 있게 한다.
    //
    // 순서가 중요하다: 오른쪽은 **폭을 먼저 넓혀야** scrollWidth 가 커져서 scrollLeft 가 그만큼
    // 더 갈 수 있다. 반대로 하면 이미 끝까지 스크롤된 상태라 스크롤이 안 먹고, 스크롤이 안 먹으니
    // 폭도 안 늘어 서로를 기다리는 교착이 된다.
    //
    // 경계 "근처"가 아니라 **밖**에서만 발동한다 — 마지막 열의 핸들은 블록 오른쪽 끝에 붙어 있어서,
    // 안쪽 여유를 두면 핸들을 잡기만 해도 스크롤이 튀어나간다.
    const AUTOSCROLL_MAX = 18; // px/frame — 경계에서 멀수록 빨라진다
    let rafId = requestAnimationFrame(function tick() {
      rafId = requestAnimationFrame(tick);
      const g = groupRef.current;
      if (!g) return;
      const r = g.getBoundingClientRect();
      // 그룹이 화면 밖까지 뻗어 있으면 어차피 안 보이니 뷰포트 경계로 자른다
      const right = Math.min(r.right, window.innerWidth);
      const left = Math.max(r.left, 0);
      let v = 0;
      if (lastX > right) v = Math.min(AUTOSCROLL_MAX, (lastX - right) / 2);
      else if (lastX < left) v = -Math.min(AUTOSCROLL_MAX, (left - lastX) / 2);
      if (!v) return;

      if (v > 0) {
        autoPan += v;
        render(); // DOM 에 동기 반영 → scrollWidth 갱신 → 아래 스크롤이 그만큼 더 갈 수 있다
        const before = g.scrollLeft;
        g.scrollLeft = before + v; // 브라우저가 [0, max] 로 clamp
        const moved = g.scrollLeft - before;
        // 실제로 스크롤된 만큼만 인정 — 열이 상한이거나 더 갈 데가 없으면 되돌린다.
        // (안 그러면 autoPan 만 계속 쌓여, 포인터를 되돌렸을 때 한참 끌어야 반응하는 죽은 구간이 생긴다)
        if (moved !== v) { autoPan += moved - v; render(); }
      } else {
        // 왼쪽은 반대 — 스크롤이 실제로 움직인 만큼만 폭을 줄인다(scrollLeft 가 0 이면 아무 일도 없다)
        const before = g.scrollLeft;
        g.scrollLeft = before + v;
        const moved = g.scrollLeft - before;
        if (moved) { autoPan += moved; render(); }
      }
    });

    const onMove = (ev: PointerEvent) => {
      if (!ev.buttons) { onUp(); return; } // 창 밖 릴리즈 등으로 pointerup 유실 → 버튼 안 눌린 이동은 종료(유령 리사이즈 방지)
      lastX = ev.clientX;
      render();
    };

    const onUp = () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      // px 로 확정 저장 — 합이 화면보다 넓으면 그대로 가로 스크롤. (렌더: flex:0 0 {px}px)
      // width(%) 는 지우지 않는다 — @platejs/layout normalizer 가 열 width 합=100 을 요구하므로 null 로 지우면 무한 루프.
      try {
        const path = editor.api.findPath(props.element);
        if (!path) return;
        const finalPx = colEls.map((el) => clampPx(el.getBoundingClientRect().width));
        editor.tf.withoutNormalizing(() => {
          colEls.forEach((_, i) => editor.tf.setNodes({ widthPx: finalPx[i] }, { at: [...Array.from(path), i] }));
        });
      } catch { /* ignore */ }
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
  }, [editor, props.element, t]);

  // 스크롤 ON(기본): px 열 고정 → 넘치면 가로 스크롤. OFF: px 열이 flex-shrink 로 줄어 화면 폭에 맞춤(fit).
  const scrollOn = columnScroll !== false;
  const groupStyle: React.CSSProperties = {
    ...props.style,
    display: "flex",
    gap: "var(--spacing-xs)",
    // 다른 블록과 같은 블록 간격(에디터 --prose-block-gap=28px) — 탭·일반블록과 gap 통일, tint 겹침/닿음 방지
    marginBlock: "var(--prose-block-gap)",
    // 첫 열 블록의 좌측 핸들(gutter left:-40px)이 overflow-x 에 안 잘리게 좌측 40px 공간(paddingLeft) 확보.
    // marginLeft 는 컬럼의 내부 padding(spacing-sm=12) 만큼 더 당겨(-52), 첫 열 "텍스트"가 일반 블록과 같은
    // 왼쪽 시작점에 오게 한다(카드 padding 은 유지, 카드가 12px 왼쪽으로 hang).
    marginLeft: -52,
    paddingLeft: 40,
    // 마지막 열의 오른쪽 핸들은 콘텐츠 맨 끝에 앉는다 — translateX(-50%) 라 절반(6px)이
    // overflow 에 잘린다. 좌측과 같은 수법으로 우측에도 폭만큼 여유를 준다.
    marginRight: -8,
    paddingRight: 8,
    position: "relative",
    overflowX: scrollOn ? "auto" : "hidden",
    // 스크롤된 콘텐츠가 좌측 paddingLeft 구역으로 새어 보이는 걸 막는 클립.
    // 단, 좌측 40px 전부를 클립하면 첫 열 내부 블록의 드래그 핸들(gutter left:-40px)까지 잘린다.
    // → 핸들이 보이도록 좌측 클립을 12px 로 완화. 트레이드오프: 열 가로 스크롤 시 12~40px 구역으로
    //   콘텐츠가 약간 새어 보일 수 있다(핸들 노출 우선).
    clipPath: "inset(0 0 0 12px)",
    "--_col-shrink": scrollOn ? 0 : 1, // px 열의 flex-shrink — OFF 면 1(줄어들어 fit)
    "--_col-bg": colBgVal,
    "--_col-divider": dividerColor,
  } as React.CSSProperties;

  // 구분선 handle — colElement::after 위에 겹쳐서 배치
  // 핸들은 각 열의 **오른쪽 모서리**에 하나씩 — 마지막 열 포함(colCount 개).
  // 드래그하면 그 열만 넓어지고 총폭이 따라 늘어난다.
  const handles = [];
  for (let i = 0; i < colCount; i++) {
    handles.push(
      <div
        key={i}
        data-col-handle={i}
        data-cursor="resize"
        contentEditable={false}
        onPointerDown={(e) => onResizeDown(i, e)}
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          width: 12,
          cursor: "col-resize",
          zIndex: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          // JS로 위치 계산하지 않음 — useEffect에서 배치
          left: 0,
          opacity: 0,
          pointerEvents: "none",
        }}
      >
        <div className={styles.colResizeBar} style={{
          width: 3, height: 24, borderRadius: 2,
          background: "var(--text-muted)",
        }} />
      </div>,
    );
  }

  // handle 위치를 DOM 기반으로 배치
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    const positionHandles = () => {
      const colEls = Array.from(group.querySelectorAll<HTMLElement>(":scope > [data-slate-node='element']"));
      const handleEls = Array.from(group.querySelectorAll<HTMLElement>("[data-col-handle]"));
      if (handleEls.length === 0) return;
      const groupRect = group.getBoundingClientRect();
      colEls.forEach((colEl, i) => {
        if (i >= handleEls.length) return;
        const colRect = colEl.getBoundingClientRect();
        // getBoundingClientRect 는 뷰포트 좌표라 스크롤된 만큼 왼쪽으로 밀려 나온다. 반면 핸들은
        // position: absolute 라 **스크롤되는 콘텐츠** 기준으로 배치된다 → scrollLeft 를 더해 보정하지 않으면
        // 블록이 넓어져 그룹이 가로 스크롤되는 순간 핸들이 딱 scrollLeft 만큼 어긋난다(= 못 잡는다).
        const left = colRect.right - groupRect.left + group.scrollLeft;
        handleEls[i].style.left = `${left}px`;
        handleEls[i].style.transform = "translateX(-50%)";
        handleEls[i].style.opacity = "";
        handleEls[i].style.pointerEvents = "";
      });
    };

    // 초기 배치 + DOM 갱신 후 재배치
    positionHandles();
    requestAnimationFrame(positionHandles);
    // 가로 스크롤/크기 변화에도 따라붙어야 한다 — 넓은 블록에서 스크롤하면 위치가 즉시 틀어지므로.
    group.addEventListener("scroll", positionHandles, { passive: true });
    const ro = new ResizeObserver(positionHandles);
    ro.observe(group);
    // **열도** 관찰한다 — 드래그 중엔 그룹(컨테이너)의 크기는 그대로고 열 폭만 변하므로
    // 그룹만 보면 콜백이 안 돈다. 그러면 핸들이 제자리에 남아 끌던 열 모서리와 어긋난다.
    group.querySelectorAll<HTMLElement>(":scope > [data-slate-node='element']").forEach((el) => ro.observe(el));
    return () => {
      group.removeEventListener("scroll", positionHandles);
      ro.disconnect();
    };
  });

  return (
    <PlateElement {...props} ref={groupRef as React.Ref<HTMLElement>} style={groupStyle} data-col-group>
      {/* handles 를 children 앞에 — 그래야 마지막 컬럼이 :last-child 가 되어 오른쪽 구분선이 숨겨짐 */}
      {handles}
      {props.children}
    </PlateElement>
  );
}

export function ColumnElement(props: PlateElementProps) {
  const el = props.element as Record<string, unknown>;
  const width = el.width as string | undefined;
  const widthPx = el.widthPx as number | undefined;
  // px 지정: 정확한 px 고정(grow/shrink 0) → 합이 컨테이너를 넘으면 가로 스크롤(= 화면보다 넓게 가능).
  // px 없음: 유동 % 채움(항상 화면에 맞음).
  const px = typeof widthPx === "number" && widthPx > 0 ? widthPx : null;
  const weight = width ? Math.max(0.001, parseFloat(width)) : 1;
  // 편집(selection 이 이 열 안)이면 selected → accent 하이라이트. hover 는 CSS(:hover)가 처리.
  const selected = useSelected();
  return (
    <PlateElement {...props} className={`${styles.colElement}${selected ? ` ${styles.colElementActive}` : ""}`} data-block-container="" style={{
      ...props.style,
      ...(px != null ? { flex: `0 var(--_col-shrink, 0) ${px}px` } : { flex: `${weight} 1 0` }),
      minWidth: COLUMN_MIN_PX,
      borderRadius: "var(--radius-2xl)",
      background: `var(--_col-bg, ${COLUMN_DEFAULT_BG})`,
      padding: "var(--spacing-sm)",
    }}>
      {props.children}
    </PlateElement>
  );
}

// ── Toggle (접기/펼치기) ──
