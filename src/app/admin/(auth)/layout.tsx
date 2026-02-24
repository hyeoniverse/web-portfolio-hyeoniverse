import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Login | Admin" };

export default async function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/admin/posts");
  }

  return <>{children}</>;
}
