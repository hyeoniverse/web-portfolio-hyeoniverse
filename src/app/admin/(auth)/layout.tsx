import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import AdminTranslationsGate from "@/components/common/AdminTranslationsGate";

export const metadata: Metadata = {
  title: {
    template: "Admin | %s",
    default: "Admin",
  },
};

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
    redirect("/admin");
  }

  return (
    <div style={{ paddingTop: "var(--spacing-6xl)" }}>
      <AdminTranslationsGate>{children}</AdminTranslationsGate>
    </div>
  );
}
