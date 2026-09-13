import type { Metadata } from "next";
import AdminTranslationsGate from "@/components/common/AdminTranslationsGate";
import DesignSystemClient from "./DesignSystemClient";

export const metadata: Metadata = {
  title: "Design System",
  description: "Design tokens, components, and visual language reference.",
};

/**
 * admin 사전을 함께 불러온다.
 *
 * 이 페이지는 공개 라우트지만 `PeriodPicker` 를 전시하는데, 그 컴포넌트가 라벨을
 * `admin.settings.profile.*` 키로 읽는다. admin 사전을 지연 로드로 돌린 뒤로는
 * 여기서도 불러오지 않으면 화면에 번역 키가 그대로 노출된다.
 *
 * 근본 해결은 그 라벨을 admin 네임스페이스 밖으로 옮기는 것이다 (별도 작업).
 *
 * 게이트는 레이아웃이 아니라 이 페이지에 둔다. 게이트는 사전을 받을 때까지 자식을 그리지 않아, 레이아웃에 두면 없는
 * 하위 주소([...missing])의 404 가 서버 HTML 에 담기지 않고 응답이 200 이 됐다(#903).
 */
export default function DesignSystemPage() {
  return (
    <AdminTranslationsGate>
      <DesignSystemClient />
    </AdminTranslationsGate>
  );
}
