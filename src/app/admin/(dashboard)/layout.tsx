import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import AdminHeader from "../_components/AdminHeader";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // login 페이지가 아닌 경우 인증 필수
  if (!user) {
    redirect("/admin/login");
  }

  return (
    <>
      <AdminHeader email={user.email ?? ""} />
      {children}
    </>
  );
}
