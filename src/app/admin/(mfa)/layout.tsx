import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import AdminTranslationsGate from "@/components/common/AdminTranslationsGate";

export const metadata: Metadata = {
  title: "Admin | 2FA",
};

/* 2단계 인증 화면 — 로그인은 했지만 OTP 확인 전(aal1)인 세션이 오는 곳. (auth) 묶음은 로그인한 사람을 /admin 으로 돌려보내
   여기와 서로 보내기를 되풀이하므로 따로 둔다. 로그인 전이면 로그인 화면으로 */
export default async function MfaLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  return (
    <div style={{ paddingTop: "var(--spacing-128)" }}>
      <AdminTranslationsGate>{children}</AdminTranslationsGate>
    </div>
  );
}
