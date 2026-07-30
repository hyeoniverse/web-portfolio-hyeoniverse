import type { ReactNode } from "react";
import { ArrowRight, ArrowLeftRight, Minus, ChevronRight, Spline, Waypoints } from "@/components/icons";
import type { DiagramNodeShape, DiagramArrow, DiagramLine, DiagramCurve } from "./diagram/model";

/** 노드 모양 옵션 */
export interface DiagramShapeOption {
  v: DiagramNodeShape;
  label: string;
  en: string;
}
export const SHAPES: DiagramShapeOption[] = [
  { v: "rect", label: "사각", en: "Rectangle" },
  { v: "round", label: "둥근", en: "Rounded" },
  { v: "stadium", label: "알약", en: "Stadium" },
  { v: "circle", label: "원", en: "Circle" },
  { v: "ellipse", label: "타원", en: "Ellipse" },
  { v: "diamond", label: "마름모", en: "Diamond" },
  { v: "hexagon", label: "육각형", en: "Hexagon" },
  { v: "parallelogram", label: "평행사변형", en: "Parallelogram" },
  { v: "trapezoid", label: "사다리꼴", en: "Trapezoid" },
  { v: "subroutine", label: "서브루틴", en: "Subroutine" },
  { v: "cylinder", label: "원통(DB)", en: "Cylinder" },
  { v: "text", label: "텍스트", en: "Text" },
];

/** 노드 색 팔레트 (빈 문자열 = 기본) */
export const COLORS = ["", "#e0556a", "#5b8def", "#22c39a", "#f4a43b", "#9b6dd6", "#7a8aa0"];

export type EdgeDir = "end" | "both" | "none";
/** 엣지 방향 옵션 */
export interface DiagramDirOption {
  v: EdgeDir;
  label: string;
  en: string;
  icon: ReactNode;
}
export const DIRS: DiagramDirOption[] = [
  { v: "end", label: "끝", en: "End", icon: <ArrowRight size={14} strokeWidth={2.4} /> },
  { v: "both", label: "양방향", en: "Both", icon: <ArrowLeftRight size={14} strokeWidth={2.4} /> },
  { v: "none", label: "화살표 없음", en: "No arrow", icon: <Minus size={14} /> },
];

/** 화살촉 모양 옵션 (화살표가 있을 때 적용) */
export interface DiagramHeadOption {
  v: DiagramArrow;
  label: string;
  en: string;
  icon: ReactNode;
}
export const HEADS: DiagramHeadOption[] = [
  { v: "arrowclosed", label: "채운", en: "Filled", icon: <ArrowRight size={14} strokeWidth={2.8} /> },
  { v: "arrow", label: "열린", en: "Open", icon: <ChevronRight size={14} /> },
];

/** 선 스타일 옵션 */
export interface DiagramLineOption {
  v: DiagramLine;
  label: string;
  en: string;
  dash?: string;
}
export const LINES: DiagramLineOption[] = [
  { v: "solid", label: "실선", en: "Solid" },
  { v: "dashed", label: "파선", en: "Dashed", dash: "6 4" },
  { v: "dotted", label: "점선", en: "Dotted", dash: "1.5 4" },
];

/** 선 모양 옵션 (직선/꺾은선/곡선) — RF edge type 매핑 */
export interface DiagramCurveOption {
  v: DiagramCurve;
  label: string;
  en: string;
  icon: ReactNode;
}
export const CURVES: DiagramCurveOption[] = [
  { v: "bezier", label: "곡선", en: "Curved", icon: <Spline size={14} /> },
  { v: "smoothstep", label: "꺾은선", en: "Step", icon: <Waypoints size={14} /> },
  { v: "straight", label: "직선", en: "Straight", icon: <Minus size={14} /> },
];

/** 텍스트 글자 크기 프리셋 */
export interface DiagramFontSizeOption {
  v: number;
  label: string;
}
export const FONT_SIZES: DiagramFontSizeOption[] = [
  { v: 12, label: "S" }, { v: 14, label: "M" }, { v: 18, label: "L" }, { v: 24, label: "XL" },
];
