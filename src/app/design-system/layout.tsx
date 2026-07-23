import type { Metadata } from "next";
import AdminTranslationsGate from "@/components/common/AdminTranslationsGate";

export const metadata: Metadata = { title: "Design System" };

/**
 * admin 사전을 함께 불러온다.
 *
 * 이 페이지는 공개 라우트지만 `PeriodPicker` 를 전시하는데, 그 컴포넌트가 라벨을
 * `admin.settings.profile.*` 키로 읽는다. admin 사전을 지연 로드로 돌린 뒤로는
 * 여기서도 불러오지 않으면 화면에 번역 키가 그대로 노출된다.
 *
 * 근본 해결은 그 라벨을 admin 네임스페이스 밖으로 옮기는 것이다 (별도 작업).
 */
export default function DesignSystemLayout({ children }: { children: React.ReactNode }) {
  return <AdminTranslationsGate>{children}</AdminTranslationsGate>;
}
