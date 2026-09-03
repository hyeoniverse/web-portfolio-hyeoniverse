import type { ReaderExtrasContext } from "./context";

/* 표 — 옛 직렬화의 헤더 배경 잔재를 정규화하고, 지정된 개수만큼 행/열을 고정한다. */
export function renderTables({ el, cleanups }: ReaderExtrasContext) {
  // ── 표 헤더 배경 정규화 — 옛 직렬화(bg-tertiary 5%·var(--bg-primary) 잔재)든 새 직렬화든
  //   모든 th 를 보이는 헤더 틴트로 통일(재저장 불필요). 불투명 base 위 틴트 → 행 고정 sticky 에도 대응.
  el.querySelectorAll<HTMLElement>("th").forEach((th) => {
    const custom = th.getAttribute("data-th-bg");
    const tint = custom && custom !== "var(--bg-primary)" ? custom : "var(--tbl-header-bg, var(--bg-tertiary-alt))";
    th.style.backgroundColor = "var(--bg-primary)";
    th.style.backgroundImage = `linear-gradient(${tint}, ${tint})`;
  });

  // ── 표 행/열 고정 — 리더 (에디터와 동일 모델, 세로 스크롤바 없음) ──
  //   열 고정: .tbl-freeze 가로 스크롤 기준 CSS sticky-left. 행 고정: 페이지 스크롤에 맞춰 첫 N행을
  //   transform:translateY 로 네비 아래에 pin. 불투명 배경·구분선(stuck 시 바깥 모서리 box-shadow).
  const TBL_LINE = "var(--tbl-border-color, var(--border-color-light))"; // 바깥 모서리(위/좌) — 일반 테두리색
  const TBL_ACCENT = "var(--color-accent-alpha-50)";                     // 스크롤 경계(아래/우) — 옅은 accent
  const FREEZE_MAX_RATIO = 0.6; // 고정 열 합이 이 비율 넘으면 왼쪽부터 sticky 해제(스크롤 영역 확보)
  const COL_NOT_FROZEN = 1e9;   // 비고정 sentinel(음수 negative sticky offset 과 구분)
  const freezeBoxes = Array.from(el.querySelectorAll<HTMLElement>(".tbl-freeze"));
  if (freezeBoxes.length) {
    const cs = getComputedStyle(document.documentElement);
    const navRaw = (cs.getPropertyValue("--reader-nav-offset") || cs.getPropertyValue("--header-height") || "64").trim();
    const navOffset = parseFloat(navRaw) || 64;
    // 끊김 방지: 측정(위치/base/셀 목록)은 measure 에서 캐시, 스크롤 시엔 scrollY 산술 + 스타일 쓰기만(동기).
    type Cell = { c: HTMLElement; i: number; j: number; sr: boolean; sc: boolean };
    type Box = { box: HTMLElement; rows: number; cols: number; colStart: number; base: number; maxOff: number; top: number; rowCells: HTMLElement[]; sticky: Cell[] };
    let boxes: Box[] = [];
    // 각 셀의 원본 background-image(헤더 틴트 등) 최초 1회 캡처 — freeze 가 덮어써도 복원용
    const cellOrigImg = new WeakMap<HTMLElement, string>();
    const measure = () => {
      // 이전 인라인 스타일 정리(리사이즈로 sticky 열 구성이 바뀌면 잔상 방지) — 배경은 원본으로 복원
      for (const b of boxes) for (const { c } of b.sticky) {
        c.style.transform = ""; c.style.boxShadow = "";
        c.style.borderTop = ""; c.style.borderBottom = ""; c.style.borderLeft = ""; c.style.borderRight = "";
        c.style.backgroundImage = cellOrigImg.get(c) || "";
      }
      boxes = [];
      freezeBoxes.forEach((box) => {
        const tbl = box.querySelector<HTMLTableElement>(":scope > table");
        if (!tbl) return;
        const rows = Number(tbl.getAttribute("data-freeze-rows") || 0);
        const cols = Number(tbl.getAttribute("data-freeze-cols") || 0);
        if (rows === 0 && cols === 0) return; // 고정 없는 가로 스크롤 전용 박스 — JS 처리 불필요(CSS 만)
        const trs = Array.from(tbl.querySelectorAll<HTMLElement>(":scope > tbody > tr"));
        const firstCells = trs[0] ? Array.from(trs[0].children) : [];
        // 열 sticky offset — 고정 열 합이 박스 너비의 FREEZE_MAX_RATIO 넘으면 왼쪽부터 해제(-1), 오른쪽 우선 유지.
        const nCols = firstCells.length;
        const lefts: number[] = new Array(nCols).fill(COL_NOT_FROZEN);
        if (cols > 0 && nCols > 0) {
          const widths = firstCells.map((c) => (c as HTMLElement).getBoundingClientRect().width);
          const view = box.clientWidth;
          const budget = view > 0 ? view * FREEZE_MAX_RATIO : Infinity;
          // 오른쪽(마지막)부터, budget 안에 들어가는 만큼만 유지.
          let start = cols, acc = 0;
          for (let j = cols - 1; j >= 0; j--) {
            if (acc + (widths[j] || 0) <= budget) { acc += widths[j] || 0; start = j; } else break;
          }
          if (start === cols) {
            // 마지막 열조차 budget 초과 → 그 열만 negative sticky 로 오른쪽 budget폭만 고정(왼쪽은 스크롤).
            lefts[cols - 1] = Math.min(0, budget - (widths[cols - 1] || 0));
          } else {
            let left = 0;
            for (let j = start; j < cols; j++) { lefts[j] = left; left += widths[j] || 0; }
          }
        }
        const colStart = lefts.findIndex((v) => v < COL_NOT_FROZEN);
        const sticky: Cell[] = [];
        const rowCells: HTMLElement[] = [];
        trs.forEach((tr, i) => {
          Array.from(tr.children).forEach((cell, j) => {
            const c = cell as HTMLElement;
            if (!cellOrigImg.has(c)) cellOrigImg.set(c, c.style.backgroundImage || ""); // 원본 배경(헤더 틴트) 최초 캡처
            const sr = i < rows, sc = lefts[j] < COL_NOT_FROZEN;
            // 비고정 셀 — 위치/z/구분선 초기화하되 배경은 원본(헤더 틴트) 복원(지우면 헤더가 사라짐)
            if (!sr && !sc) {
              c.style.position = ""; c.style.left = ""; c.style.zIndex = "";
              c.style.borderTop = ""; c.style.borderBottom = ""; c.style.borderLeft = ""; c.style.borderRight = "";
              c.style.backgroundImage = cellOrigImg.get(c) || "";
              return;
            }
            // 열 sticky-left / 행-only relative — 위치·z·배경은 여기서 1회 설정
            if (sc) { c.style.position = "sticky"; c.style.left = `${lefts[j]}px`; }
            else c.style.position = "relative";
            c.style.zIndex = sr && sc ? "6" : sr ? "5" : "4";
            // 불투명 배경은 stuck 됐을 때만(apply) — 정지 시엔 투명(일반 셀처럼).
            sticky.push({ c, i, j, sr, sc });
            if (sr) rowCells.push(c);
          });
        });
        let blockH = 0; const frozen = trs.slice(0, rows);
        frozen.forEach((tr) => { blockH += tr.getBoundingClientRect().height; });
        const r = tbl.getBoundingClientRect();
        const maxOff = rows > 0 ? Math.max(0, r.height - blockH) : 0;
        const base = r.top + window.scrollY - navOffset; // rowOffset = scrollY - base
        const boxTop = box.getBoundingClientRect().top + window.scrollY; // 문서 좌표 (clip 계산용)
        boxes.push({ box, rows, cols, colStart, base, maxOff, top: boxTop, rowCells, sticky });
      });
      apply();
    };
    const apply = () => {
      const sy = window.scrollY;
      for (const b of boxes) {
        const off = b.rows > 0 ? Math.max(0, Math.min(sy - b.base, b.maxOff)) : 0;
        const rowStuck = off > 0.5;
        const colStuck = b.box.scrollLeft > 0;
        const tf = rowStuck ? `translate3d(0,${off}px,0)` : "";
        for (const c of b.rowCells) c.style.transform = tf;
        // 핀 라인(네비) 위쪽을 clip → 비고정 행이 고정 헤더 위로 삐져나오지 않게(에디터의 잘림과 동일).
        if (b.rows > 0) {
          const clipTop = sy - (b.top - navOffset);
          b.box.style.clipPath = clipTop > 0.5 ? `inset(${clipTop}px 0 0 0)` : "";
        }
        for (const { c, i, j, sr, sc } of b.sticky) {
          // 불투명 배경 — stuck 됐을 때만(정지 시 원본). 원본 배경(헤더 틴트/커스텀 색) 위에 --bg-primary base.
          const needBg = (sr && rowStuck) || (sc && colStuck);
          const origImg = cellOrigImg.get(c) || "";
          if (needBg) {
            const layers: string[] = [];
            if (origImg && origImg !== "none") layers.push(origImg);                         // 원본(헤더 틴트 등) 보존
            else { const col = c.style.backgroundColor; if (col) layers.push(`linear-gradient(${col}, ${col})`); } // 커스텀 셀 색
            layers.push("linear-gradient(var(--bg-primary), var(--bg-primary))");            // 불투명 base
            c.style.backgroundImage = layers.join(", ");
          } else c.style.backgroundImage = origImg;
          // 구분선 — 리더 표는 border-collapse:collapse 라 셀 box-shadow 가 안 그려짐 → 실제 border 로. stuck 시에만.
          // 바깥 모서리(위/좌)는 1px 일반색, 스크롤 경계(아래=행, 우=열)는 2px accent.
          c.style.borderTop = (sr && rowStuck && i === 0) ? `1px solid ${TBL_LINE}` : "";
          c.style.borderBottom = (sr && rowStuck && i === b.rows - 1) ? `2px solid ${TBL_ACCENT}` : "";
          c.style.borderLeft = (sc && colStuck && j === b.colStart) ? `1px solid ${TBL_LINE}` : "";
          c.style.borderRight = (sc && colStuck && j === b.cols - 1) ? `2px solid ${TBL_ACCENT}` : "";
        }
      }
    };
    measure();
    window.addEventListener("scroll", apply, { passive: true });
    window.addEventListener("resize", measure, { passive: true });
    freezeBoxes.forEach((b) => b.addEventListener("scroll", apply, { passive: true }));
    // async 콘텐츠(플레이그라운드 lazy 마운트·이미지 로드 등)가 표 위 높이를 바꾸면 base(표 top)가
    // stale → 행 고정이 어긋남. content 높이 변화 시 재측정. (border 토글로 인한 미세 변화·루프 방지 임계값)
    let lastH = el.scrollHeight, remeasureRaf = 0;
    const onContentResize = () => {
      if (remeasureRaf) return;
      remeasureRaf = requestAnimationFrame(() => {
        remeasureRaf = 0;
        const h = el.scrollHeight;
        if (Math.abs(h - lastH) < 16) return;
        lastH = h;
        measure();
      });
    };
    const contentRo = new ResizeObserver(onContentResize);
    contentRo.observe(el);
    cleanups.push(() => {
      window.removeEventListener("scroll", apply);
      window.removeEventListener("resize", measure);
      freezeBoxes.forEach((b) => b.removeEventListener("scroll", apply));
      if (remeasureRaf) cancelAnimationFrame(remeasureRaf);
      contentRo.disconnect();
    });
  }
}
