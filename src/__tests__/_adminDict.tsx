import type { ReactNode } from "react";
import { LanguageProvider, type Translations } from "@/providers/LanguageProvider";
import AdminDictProvider from "@/providers/AdminDictProvider";
import koAdmin from "@/locales/ko.admin.json";
import enAdmin from "@/locales/en.admin.json";

/** 관리 화면 컴포넌트 테스트용 — 대시보드 레이아웃처럼 관리자 사전을 얹어 그린다(한국어) */
export function AdminDict({ children }: { children: ReactNode }) {
  localStorage.setItem("language", "ko");
  return (
    <LanguageProvider>
      <AdminDictProvider dict={{ ko: koAdmin as Translations, en: enAdmin as Translations }}>{children}</AdminDictProvider>
    </LanguageProvider>
  );
}
