import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import AdminAuthSync from "@/components/common/AdminAuthSync";
import AdminDictProvider from "@/providers/AdminDictProvider";
import type { Translations } from "@/providers/LanguageProvider";
/* admin 사전을 서버에서 실어 온다 — 서버 컴포넌트 import 라 공개 라우트 번들엔 안 실린다.
   덕분에 첫 HTML 부터 admin.* 이 풀려, 클라 로드까지 화면을 가리던 게이트가 필요 없어진다. */
import koAdmin from "@/locales/ko.admin.json";
import enAdmin from "@/locales/en.admin.json";

export const metadata: Metadata = {
  title: {
    template: "Admin | %s",
    default: "Admin",
  },
};

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/denied");
  }

  return (
    <>
      <AdminAuthSync />
      <AdminDictProvider dict={{ ko: koAdmin as Translations, en: enAdmin as Translations }}>
        {children}
      </AdminDictProvider>
    </>
  );
}
