/**
 * 편집기 사이드바가 쓰는 패널 목록.
 *
 * 정의는 `@/data/about/panels` 하나뿐이다 — 공개 페이지와 관리자 화면이 같은 패널을
 * 다르게 부르지 않도록. 여기서는 사이드바 표기에 맞춰 제목의 마침표만 뗀다.
 */
import { ABOUT_PANELS as PANELS, aboutPanelLabel } from "@/data/about/panels";

export interface AboutPanelDef {
  key: string;
  label: string;
  editable?: boolean;
}

export const ABOUT_PANELS: AboutPanelDef[] = PANELS.map((p) => ({
  key: p.key,
  label: aboutPanelLabel(p.key),
  editable: p.editable,
}));
