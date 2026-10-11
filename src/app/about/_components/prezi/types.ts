/* 프레지 장면 정의 — 그룹 파일(scenes/*.tsx)이 장마다 이 모양의 배열을 내보내고, frames.tsx 가 무리로 묶는다 */
import type { ReactNode } from "react";
import type { L10n } from "../../_data/showcase";

export interface SceneDef {
  id: string;
  /** 장면 이름 — 무거운 장면을 멀리서 볼 때 대역으로 적는 이름 */
  label: L10n;
  render: () => ReactNode;
  /** 장면 스스로 여백을 갖는지 — 아니면 프레임이 좌우 여백 · 네비게이션 자리를 준다 */
  ownPad?: boolean;
  /** 무거운 장면(3D · iframe · 코드 실행기 · 실시간 데모 · 큰 그래프) — 지금 프레임 · 앞뒤가 아니면 실제 내용 대신 이름만 띄운다.
      가벼운 장면은 같은 장 안이면 멀리 있어도 실제로 그려, 카메라가 물러나도 진짜 패널이 보인다 */
  heavy?: boolean;
}

export const k = (ko: string, en: string): L10n => ({ ko, en });
