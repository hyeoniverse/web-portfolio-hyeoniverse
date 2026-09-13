import type { Metadata } from "next";
import DesignSystemClient from "./DesignSystemClient";

export const metadata: Metadata = {
  title: "Design System",
  description: "Design tokens, components, and visual language reference.",
};

/**
 * 공개 페이지라 관리자 사전 없이 그린다. 예전에는 전시하는 PeriodPicker 가 라벨을 admin.* 키로 읽어 페이지 전체를
 * AdminTranslationsGate 로 감쌌고, 미리 그린 HTML 에 본문이 없었다. 공용 UI 의 라벨은 공개 사전(common 등)에 둔다(#905).
 */
export default function DesignSystemPage() {
  return <DesignSystemClient />;
}
