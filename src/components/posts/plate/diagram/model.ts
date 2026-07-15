// ── 비주얼 다이어그램 블록 데이터 모델 ──
// 위치 보존(파워포인트식 자유 배치)이 목적이라 자체 포맷을 source of truth 로 쓴다.
// mermaid 는 diagramToMermaid() 로 "구조만" 한 방향 export (좌표는 mermaid 자동레이아웃이라 버려짐).

export type DiagramNodeShape =
  | "rect" | "round" | "stadium" | "circle"        // 둥근 계열 (CSS)
  | "ellipse" | "diamond" | "hexagon" | "parallelogram" | "trapezoid" // 타원/다각형 (SVG)
  | "subroutine" | "cylinder"                      // 서브루틴 / 원통(DB) (SVG)
  | "text";                                        // 테두리 없는 텍스트

export interface DiagramNode {
  id: string;
  label: string;
  x: number;
  y: number;
  /** 리사이즈로 고정한 크기(없으면 내용에 맞춰 자동) */
  width?: number;
  height?: number;
  shape?: DiagramNodeShape;
  /** 노드 배경색(선택) */
  color?: string;
  /** 라벨 글자 크기(px, 선택) */
  fontSize?: number;
  /** 라벨 글자 색(선택) */
  textColor?: string;
}

export type DiagramArrow = "arrowclosed" | "arrow" | "none";
/** 선 스타일 — 실선 / 파선 / 점선 */
export type DiagramLine = "solid" | "dashed" | "dotted";
/** 선 모양 — 곡선(베지어) / 계단(부드러운 꺾은선) / 직선 */
export type DiagramCurve = "bezier" | "smoothstep" | "straight";

export interface DiagramEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  /** 연결된 핸들 id — 노드마다 핸들이 여러 개라 명시해야 재렌더/리로드 시에도 엣지가 유지됨 */
  sourceHandle?: string;
  targetHandle?: string;
  /** @deprecated arrowEnd 로 대체 — 이전 데이터 호환용으로만 읽음 */
  arrow?: DiagramArrow;
  /** 시작(source)쪽 화살표 — 기본 none. arrowStart·arrowEnd 둘 다 있으면 양방향 */
  arrowStart?: DiagramArrow;
  /** 끝(target)쪽 화살표 — 기본 채운 삼각형 */
  arrowEnd?: DiagramArrow;
  /** 선 스타일 — 기본 실선 */
  line?: DiagramLine;
  /** 선 모양 — 기본 곡선(베지어) */
  curve?: DiagramCurve;
}

export interface DiagramData {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

export const EMPTY_DIAGRAM: DiagramData = { nodes: [], edges: [] };

/** 안전한 mermaid 노드 id — 영숫자/언더스코어만(공백·특수문자는 언더스코어). */
export function safeMermaidId(id: string): string {
  const s = id.replace(/[^A-Za-z0-9_]/g, "_");
  return /^[A-Za-z_]/.test(s) ? s : `n_${s}`;
}

/** 라벨 escape — mermaid 는 대괄호/따옴표 등에 민감. 따옴표 래핑 + 내부 escape. */
function mermaidLabel(label: string): string {
  const text = (label || "").trim() || " ";
  return `"${text.replace(/"/g, "&quot;")}"`;
}

/** 도형별 노드 표기 — graph 문법. */
function shapeToken(label: string, shape?: DiagramNodeShape): string {
  const l = mermaidLabel(label);
  switch (shape) {
    case "round": return `(${l})`;
    case "stadium": return `([${l}])`;
    case "diamond": return `{${l}}`;
    case "circle": return `((${l}))`;
    case "ellipse": return `((${l}))`; // mermaid 에 타원 없음 → 원으로 근사
    case "hexagon": return `{{${l}}}`;
    case "parallelogram": return `[/${l}/]`;
    case "trapezoid": return `[/${l}\\]`;
    case "subroutine": return `[[${l}]]`;
    case "cylinder": return `[(${l})]`;
    // text: mermaid flowchart 에 테두리 없는 노드가 없어 사각형으로 근사(구조 export)
    default: return `[${l}]`;
  }
}

/** 엣지 → mermaid 링크 문자열. 방향(양방향/단방향/없음) + 선(실선/점선) 반영.
 *  mermaid 는 파선·점선을 구분 안 하므로 둘 다 점선 링크(-.-)로 매핑. */
function mermaidLink(e: DiagramEdge): string {
  const start = (e.arrowStart ?? "none") !== "none";
  const end = (e.arrowEnd ?? e.arrow ?? "arrowclosed") !== "none";
  const dashed = e.line === "dashed" || e.line === "dotted";
  if (dashed) {
    if (start && end) return "<-.->";
    if (end) return "-.->";
    if (start) return "<-.-";
    return "-.-";
  }
  if (start && end) return "<-->";
  if (end) return "-->";
  if (start) return "<--";
  return "---";
}

/** 자체 포맷 → mermaid flowchart 코드(구조만). 위치는 export 시 버려지고 mermaid 가 자동 배치. */
export function diagramToMermaid(d: DiagramData): string {
  const lines: string[] = ["graph TD"];
  const idMap = new Map<string, string>();
  d.nodes.forEach((n) => {
    // 원본 id 중복/충돌 방지 — safe id 로 매핑
    let sid = safeMermaidId(n.id);
    let i = 1;
    while ([...idMap.values()].includes(sid)) sid = `${safeMermaidId(n.id)}_${i++}`;
    idMap.set(n.id, sid);
    lines.push(`  ${sid}${shapeToken(n.label, n.shape)}`);
  });
  d.edges.forEach((e) => {
    const s = idMap.get(e.source);
    const t = idMap.get(e.target);
    if (!s || !t) return; // 끊긴 엣지 제외
    const lbl = e.label && e.label.trim() ? `|${mermaidLabel(e.label)}|` : "";
    lines.push(`  ${s} ${mermaidLink(e)}${lbl} ${t}`);
  });
  return lines.join("\n");
}

/** DiagramData 유효성 정규화 — nodes/edges 배열 보정 + 끊긴 엣지 제거. */
export function normalizeDiagram(raw: unknown): DiagramData {
  const d = (raw ?? {}) as Partial<DiagramData>;
  const nodes = Array.isArray(d.nodes) ? d.nodes.filter((n): n is DiagramNode => !!n && typeof n.id === "string") : [];
  const ids = new Set(nodes.map((n) => n.id));
  const edges = Array.isArray(d.edges)
    ? d.edges.filter((e): e is DiagramEdge => !!e && typeof e.id === "string" && ids.has(e.source) && ids.has(e.target))
    : [];
  return { nodes, edges };
}
