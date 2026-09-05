"use client";

import { useEffect } from "react";

import type { PlateEditor } from "platejs/react";

/* 여러 블록 선택 하이라이트 — 선택 범위에 걸친 블록 위에 오버레이 — PlateEditor.tsx 에서 분리 (#680). */

export function MultiBlockHighlight({ editor }: { editor: PlateEditor }) {
  useEffect(() => {
    const root = document.querySelector('[data-slate-editor="true"]') as HTMLElement | null;
    if (!root) return;
    const CLIP_VARS = ["--a-l", "--a-t", "--a-w", "--a-h", "--b-l", "--b-t", "--b-w", "--b-h"];
    const clearClip = (el: HTMLElement) => { el.removeAttribute("data-float-clip"); CLIP_VARS.forEach((v) => el.style.removeProperty(v)); };
    const TBL_VARS = ["--tbl-l", "--tbl-t", "--tbl-w", "--tbl-h"];
    const clearTbl = (el: HTMLElement) => { el.removeAttribute("data-tbl-tint"); TBL_VARS.forEach((v) => el.style.removeProperty(v)); };
    const clear = () => root.querySelectorAll("[data-block-selected]").forEach((el) => {
      el.removeAttribute("data-block-selected");
      el.removeAttribute("data-sel-merge-up");
      el.removeAttribute("data-sel-merge-down");
      clearClip(el as HTMLElement);
      clearTbl(el as HTMLElement);
    });
    // 표 블록 tint — 래퍼(.blockDraggable)는 스크롤 패딩·행밴드·풀폭까지 포함해 표보다 크므로,
    // 실제 <table> rect 를 재서 tint 를 표에 딱 맞춘다(사방 --tint-inset=6px). float-clip 과 동일 패턴.
    const applyTableTint = (block: HTMLElement) => {
      const tbl = block.querySelector("table");
      if (!tbl) { clearTbl(block); return false; }
      const cr = block.getBoundingClientRect();
      const tr = tbl.getBoundingClientRect();
      // 가로 스크롤(넓은 표)일 때 표 좌/우가 스크롤 뷰포트 밖으로 나가면 tint 가 넘치므로 뷰포트로 클램프.
      const scroll = block.querySelector("[data-tbl-scroll]") as HTMLElement | null;
      const sr = scroll ? scroll.getBoundingClientRect() : null;
      const left = sr ? Math.max(tr.left, sr.left) : tr.left;
      const right = sr ? Math.min(tr.right, sr.right) : tr.right;
      const INSET = 6;
      block.style.setProperty("--tbl-l", `${left - cr.left - INSET}px`);
      block.style.setProperty("--tbl-t", `${tr.top - cr.top - INSET}px`);
      block.style.setProperty("--tbl-w", `${Math.max(0, right - left) + 2 * INSET}px`);
      block.style.setProperty("--tbl-h", `${tr.height + 2 * INSET}px`);
      block.setAttribute("data-tbl-tint", "");
      return true;
    };
    // 블록 래퍼의 indent(px) — 실제 여백은 안쪽 slate element 의 margin-left 에 있다(래퍼는 full-width).
    // 양수 margin(24·48…)만 indent 로 취급. 열블록 컨테이너의 marginLeft:-40(핸들 공간용 레이아웃 hack) 같은
    // 음수/0 은 indent 가 아니므로 0 으로 — 안 그러면 열블록 아래 블록이 "더 들여썼다"고 잘못 판정돼 merge 됨.
    const indentPx = (el: HTMLElement) => {
      const inner = el.querySelector('[data-slate-node="element"]') as HTMLElement | null;
      const ml = inner ? parseFloat(inner.style.marginLeft) : 0;
      return Number.isFinite(ml) && ml > 0 ? ml : 0;
    };
    // float 이미지가 겹치는 블록은 선택 배경을 2조각(이미지 옆 ::before / 아래 ::after)으로 나눠 이미지 영역을 비움
    const applyClip = (block: HTMLElement, floats: HTMLElement[]) => {
      const br = block.getBoundingClientRect();
      const f = floats.find((fi) => {
        const fr = fi.getBoundingClientRect();
        return fr.right > br.left + 1 && fr.left < br.right - 1 && fr.bottom > br.top + 1 && fr.top < br.bottom - 1;
      });
      if (!f) { clearClip(block); return; }
      const fr = f.getBoundingClientRect();
      const bw = br.width, bh = br.height;
      const GAP = 10; // 이미지와 배경 조각 사이 간격
      const ih = Math.max(0, Math.min(fr.bottom - br.top, bh)); // 이미지 하단(블록 기준)
      const side = f.getAttribute("data-float-side") || "left";
      // ::before = 이미지 옆(전체 높이), ::after = 이미지 아래(이미지 폭까지만) — 서로 안 겹치게(반투명 중첩 방지)
      if (side === "left") {
        const iw = Math.max(0, Math.min(fr.right - br.left, bw)); // 이미지 우측
        block.style.setProperty("--a-l", `${iw + GAP}px`);
        block.style.setProperty("--a-w", `${Math.max(0, bw - iw - GAP + 8)}px`);
        block.style.setProperty("--b-l", `-8px`);
        block.style.setProperty("--b-w", `${iw + GAP + 8}px`);
      } else {
        const il = Math.max(0, Math.min(fr.left - br.left, bw)); // 이미지 좌측
        block.style.setProperty("--a-l", `-8px`);
        block.style.setProperty("--a-w", `${Math.max(0, il - GAP + 8)}px`);
        block.style.setProperty("--b-l", `${il - GAP}px`);
        block.style.setProperty("--b-w", `${Math.max(0, bw - il + GAP + 8)}px`);
      }
      block.style.setProperty("--a-t", `-2px`);
      block.style.setProperty("--a-h", `${bh + 4}px`);
      block.style.setProperty("--b-t", `${ih + GAP}px`);
      block.style.setProperty("--b-h", `${Math.max(0, bh - ih - GAP + 2)}px`);
      block.setAttribute("data-float-clip", side);
    };
    // 블록 래퍼 찾기 — 루트 또는 data-block-container(탭 패널·컬럼 등) 의 직속 자식까지 올라간다.
    // → top-level 뿐 아니라 중첩 컨테이너 안의 멀티블록 선택도 같은 부모 형제로 잡힘.
    const isBoundary = (p: HTMLElement | null) => !!p && (p === root || p.hasAttribute("data-block-container"));
    const blockOf = (node: Node | null): HTMLElement | null => {
      let el: HTMLElement | null = node ? (node.nodeType === 3 ? node.parentElement : (node as HTMLElement)) : null;
      while (el && el.parentElement && !isBoundary(el.parentElement)) el = el.parentElement;
      return el && isBoundary(el.parentElement) ? el : null;
    };
    // DOM selection 을 직접 읽어 selectionchange 에 즉시 토글 — slate 의 raf 갱신 지연/리렌더를 안 거쳐 깜빡임 없음
    const apply = () => {
      clear();
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed || !root.contains(sel.anchorNode) || !root.contains(sel.focusNode)) {
        root.removeAttribute("data-multiblock");
        return;
      }
      const aB = blockOf(sel.anchorNode);
      const fB = blockOf(sel.focusNode);
      if (!aB || !fB) { root.removeAttribute("data-multiblock"); return; }
      // 단일 블록이면 "통째로"(블록 처음~끝) 선택된 경우만 블록 tint — 부분 텍스트 선택은 그대로 텍스트 하이라이트.
      // (경계 클릭·블록 전체선택은 start~end 로 선택). slate selection 으로 판정(gutter chrome 영향 없게).
      if (aB === fB) {
        let coversFull = false;
        try {
          const s = editor.selection;
          if (s && !editor.api.isCollapsed()) {
            const topPath = [s.anchor.path[0]];
            const [pStart, pEnd] = editor.api.edges(s)!;
            coversFull = !!editor.api.isStart(pStart, topPath) && !!editor.api.isEnd(pEnd, topPath);
          }
        } catch { /* noop */ }
        if (!coversFull) { root.removeAttribute("data-multiblock"); return; }
      }
      root.setAttribute("data-multiblock", "");
      const floats = Array.from(root.querySelectorAll("[data-float-side]")) as HTMLElement[];
      let start = aB, end = fB;
      if (aB.compareDocumentPosition(fB) & Node.DOCUMENT_POSITION_PRECEDING) { start = fB; end = aB; }
      let cur: HTMLElement | null = start;
      const selBlocks: HTMLElement[] = [];
      while (cur) {
        cur.setAttribute("data-block-selected", "");
        // 표 블록은 실제 표 rect 로 tint 맞춤(float-clip 대신). 나머지는 기존 float-clip.
        if (applyTableTint(cur)) clearClip(cur);
        else if (floats.length) applyClip(cur, floats);
        else clearClip(cur);
        selBlocks.push(cur);
        if (cur === end) break;
        cur = cur.nextElementSibling as HTMLElement | null;
      }
      // "묶인 블록"(indent 그룹 — 부모 + 더 깊게 들여쓴 자식들)끼리만 배경을 이어붙인다.
      // merge-down: 아래 블록과 이어짐 / merge-up: 위 블록과 이어짐. 무관한 top-level 블록은 각자 박스로 남긴다.
      let rootIndent = indentPx(selBlocks[0]);
      for (let i = 1; i < selBlocks.length; i++) {
        const ind = indentPx(selBlocks[i]);
        const prevInd = indentPx(selBlocks[i - 1]);
        if (ind > rootIndent || (ind === prevInd && ind > 0)) {
          selBlocks[i].setAttribute("data-sel-merge-up", "");
          selBlocks[i - 1].setAttribute("data-sel-merge-down", "");
        } else {
          rootIndent = ind; // 들여쓰기가 그룹 기준선 이하로 내려오면 새 그룹 시작
        }
      }
    };
    // tint 좌표(표 rect·float-clip)는 고정 px 라, 리사이즈·스크롤·레이아웃 변경 시 재측정해야 안 어긋난다.
    // rAF 로 프레임당 1회로 throttle. selection 없으면 apply 가 즉시 early-return 이라 유휴 비용 없음.
    let raf = 0;
    const schedule = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; apply(); }); };
    document.addEventListener("selectionchange", apply);
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true); // capture — 에디터/표 등 어떤 스크롤 컨테이너든
    const ro = new ResizeObserver(schedule);
    ro.observe(root);
    return () => {
      document.removeEventListener("selectionchange", apply);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
      root.removeAttribute("data-multiblock");
      clear();
    };
  }, [editor]);
  return null;
}

// float-left 이미지 옆 블록에 --float-edge(이미지 우측+gap) 설정 → 핸들·placeholder 를 이미지 옆으로.
// 실제론 float-wrap 이지만 핸들/placeholder 가 이미지 영역을 피해 flow-root 처럼 보이게.
