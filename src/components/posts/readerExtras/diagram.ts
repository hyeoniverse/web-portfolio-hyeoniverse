import type { ReaderExtrasContext } from "./context";

/* 비주얼 다이어그램 — 에디터가 저장한 노드/엣지 위치를 그대로 읽어 읽기전용 SVG 로 그린다. */
export function renderDiagram({ el }: ReaderExtrasContext) {
  // ── 비주얼 다이어그램 (data-diagram) ── 위치 보존 노드/엣지 → vanilla SVG(읽기전용) 렌더
  el.querySelectorAll<HTMLElement>("[data-diagram]").forEach((host) => {
    if (host.dataset.diagramDone) return;
    host.dataset.diagramDone = "1";
    let data: { nodes?: Array<{ id: string; label?: string; x: number; y: number; width?: number; height?: number; shape?: string; color?: string; fontSize?: number; textColor?: string }>; edges?: Array<{ source: string; target: string; label?: string; arrow?: string; arrowStart?: string; arrowEnd?: string; line?: string; curve?: string }> } = {};
    try { data = JSON.parse(host.getAttribute("data-diagram") || "{}"); } catch { /* noop */ }
    const nodes = Array.isArray(data.nodes) ? data.nodes : [];
    const edges = Array.isArray(data.edges) ? data.edges : [];
    if (!nodes.length) { host.remove(); return; }

    const NS = "http://www.w3.org/2000/svg";
    const nodeW = (n: { label?: string; width?: number }) => n.width ?? Math.max(80, ((n.label || "").length) * 8 + 28);
    const nodeH = (n: { height?: number }) => n.height ?? 40;
    const byId = new Map(nodes.map((n) => [n.id, n]));

    // bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach((n) => { minX = Math.min(minX, n.x); minY = Math.min(minY, n.y); maxX = Math.max(maxX, n.x + nodeW(n)); maxY = Math.max(maxY, n.y + nodeH(n)); });
    const pad = 24;
    const vb = `${minX - pad} ${minY - pad} ${(maxX - minX) + pad * 2} ${(maxY - minY) + pad * 2}`;

    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", vb);
    svg.setAttribute("class", "reader-diagram-svg");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    // 화살표 marker — 채운 삼각형 / 열린 화살(둘 다 orient auto-start-reverse 라 start·end 양쪽에 재사용)
    const defs = document.createElementNS(NS, "defs");
    defs.innerHTML =
      `<marker id="rd-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker>` +
      `<marker id="rd-arrow-open" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10" fill="none" stroke="currentColor" stroke-width="1.6"/></marker>`;
    svg.appendChild(defs);
    const markerId = (a?: string) => (a === "arrow" ? "url(#rd-arrow-open)" : "url(#rd-arrow)");

    // edges (center→center, target 사각형 경계에서 멈춤 근사)
    edges.forEach((e) => {
      const s = byId.get(e.source); const tg = byId.get(e.target);
      if (!s || !tg) return;
      const sx = s.x + nodeW(s) / 2, sy = s.y + nodeH(s) / 2;
      const tx = tg.x + nodeW(tg) / 2, ty = tg.y + nodeH(tg) / 2;
      // target 사각형 경계로 클립
      const dx = tx - sx, dy = ty - sy;
      const halfW = nodeW(tg) / 2, halfH = nodeH(tg) / 2;
      const scale = dx === 0 && dy === 0 ? 0 : Math.min(Math.abs(halfW / (dx || 1e-6)), Math.abs(halfH / (dy || 1e-6)));
      const ex = tx - dx * scale, ey = ty - dy * scale;
      // 선 모양 — 직선(line) / 꺾은선·곡선(path)
      const mx = (sx + ex) / 2, my = (sy + ey) / 2, horiz = Math.abs(ex - sx) >= Math.abs(ey - sy);
      let el: SVGElement;
      if (e.curve === "smoothstep") {
        el = document.createElementNS(NS, "path");
        el.setAttribute("d", horiz ? `M${sx},${sy} L${mx},${sy} L${mx},${ey} L${ex},${ey}` : `M${sx},${sy} L${sx},${my} L${ex},${my} L${ex},${ey}`);
        el.setAttribute("fill", "none");
      } else if (e.curve === "bezier" || e.curve == null) {
        el = document.createElementNS(NS, "path");
        el.setAttribute("d", horiz ? `M${sx},${sy} C${mx},${sy} ${mx},${ey} ${ex},${ey}` : `M${sx},${sy} C${sx},${my} ${ex},${my} ${ex},${ey}`);
        el.setAttribute("fill", "none");
      } else { // straight
        el = document.createElementNS(NS, "line");
        el.setAttribute("x1", String(sx)); el.setAttribute("y1", String(sy));
        el.setAttribute("x2", String(ex)); el.setAttribute("y2", String(ey));
      }
      el.setAttribute("class", "reader-diagram-edge");
      const endA = e.arrowEnd ?? e.arrow ?? "arrowclosed";
      const startA = e.arrowStart ?? "none";
      if (endA !== "none") el.setAttribute("marker-end", markerId(endA));
      if (startA !== "none") el.setAttribute("marker-start", markerId(startA));
      if (e.line === "dashed") el.setAttribute("stroke-dasharray", "6 4");
      else if (e.line === "dotted") el.setAttribute("stroke-dasharray", "1.5 4");
      svg.appendChild(el);
      if (e.label) {
        const lt = document.createElementNS(NS, "text");
        lt.setAttribute("x", String((sx + ex) / 2)); lt.setAttribute("y", String((sy + ey) / 2 - 4));
        lt.setAttribute("text-anchor", "middle"); lt.setAttribute("class", "reader-diagram-edge-label");
        lt.textContent = e.label;
        svg.appendChild(lt);
      }
    });

    // nodes — 도형별 SVG(실좌표)
    const poly = (pts: string) => { const p = document.createElementNS(NS, "polygon"); p.setAttribute("points", pts); return p; };
    nodes.forEach((n) => {
      const w = nodeW(n), h = nodeH(n);
      const x = n.x, y = n.y, cx = x + w / 2, cy = y + h / 2, r = x + w, b = y + h;
      const hx = Math.min(w * 0.2, 22), ry = Math.min(h * 0.16, 8);
      const shapeEls: SVGElement[] = [];
      switch (n.shape) {
        case "ellipse": { const el2 = document.createElementNS(NS, "ellipse"); el2.setAttribute("cx", String(cx)); el2.setAttribute("cy", String(cy)); el2.setAttribute("rx", String(w / 2)); el2.setAttribute("ry", String(h / 2)); shapeEls.push(el2); break; }
        case "diamond": shapeEls.push(poly(`${cx},${y} ${r},${cy} ${cx},${b} ${x},${cy}`)); break;
        case "hexagon": shapeEls.push(poly(`${x + hx},${y} ${r - hx},${y} ${r},${cy} ${r - hx},${b} ${x + hx},${b} ${x},${cy}`)); break;
        case "parallelogram": shapeEls.push(poly(`${x + hx},${y} ${r},${y} ${r - hx},${b} ${x},${b}`)); break;
        case "trapezoid": shapeEls.push(poly(`${x + hx},${y} ${r - hx},${y} ${r},${b} ${x},${b}`)); break;
        case "subroutine": {
          const rc = document.createElementNS(NS, "rect"); rc.setAttribute("x", String(x)); rc.setAttribute("y", String(y)); rc.setAttribute("width", String(w)); rc.setAttribute("height", String(h)); rc.setAttribute("rx", "4"); shapeEls.push(rc);
          [x + 8, r - 8].forEach((lx) => { const ln = document.createElementNS(NS, "line"); ln.setAttribute("x1", String(lx)); ln.setAttribute("y1", String(y)); ln.setAttribute("x2", String(lx)); ln.setAttribute("y2", String(b)); ln.setAttribute("class", "reader-diagram-node-line"); shapeEls.push(ln); }); break;
        }
        case "cylinder": {
          const body = document.createElementNS(NS, "path"); body.setAttribute("d", `M${x},${y + ry} V${b - ry} a${w / 2},${ry} 0 0 0 ${w},0 V${y + ry} Z`); shapeEls.push(body);
          const top = document.createElementNS(NS, "ellipse"); top.setAttribute("cx", String(cx)); top.setAttribute("cy", String(y + ry)); top.setAttribute("rx", String(w / 2)); top.setAttribute("ry", String(ry)); shapeEls.push(top); break;
        }
        case "text": break; // 무테 — 라벨만
        default: { const rc = document.createElementNS(NS, "rect"); rc.setAttribute("x", String(x)); rc.setAttribute("y", String(y)); rc.setAttribute("width", String(w)); rc.setAttribute("height", String(h)); rc.setAttribute("rx", String(n.shape === "circle" || n.shape === "round" || n.shape === "stadium" ? h / 2 : 8)); shapeEls.push(rc); }
      }
      shapeEls.forEach((el, i) => {
        el.setAttribute("class", el.getAttribute("class") || "reader-diagram-node");
        if (n.color && i === 0 && el.tagName !== "line") (el as SVGElement).style.fill = n.color;
        svg.appendChild(el);
      });
      const txt = document.createElementNS(NS, "text");
      txt.setAttribute("x", String(n.x + w / 2)); txt.setAttribute("y", String(n.y + h / 2));
      txt.setAttribute("text-anchor", "middle"); txt.setAttribute("dominant-baseline", "central");
      txt.setAttribute("class", "reader-diagram-label");
      if (typeof n.fontSize === "number") txt.style.fontSize = `${n.fontSize}px`;
      if (n.textColor) txt.style.fill = n.textColor;
      txt.textContent = n.label || "";
      svg.appendChild(txt);
    });

    const fig = document.createElement("figure");
    fig.className = "reader-diagram";
    fig.appendChild(svg);
    host.replaceWith(fig);
  });
}
