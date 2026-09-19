import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, screen, waitFor } from "@testing-library/react";
import { LanguageProvider, useLanguage, type Translations } from "@/providers/LanguageProvider";
import AdminDictProvider from "@/providers/AdminDictProvider";

/* 전역 모달(<Modal/>)은 루트 오버레이에서 그려져 AdminDictProvider 바깥이다. 그 자리에서
   t("admin.*") 가 풀리지 않으면 모달에 번역 키가 그대로 보인다(#1076). */

const dict = {
  ko: { admin: { common: { bulkCategoryDesc: "선택한 항목의 카테고리를 바꿉니다" } } },
  en: { admin: { common: { bulkCategoryDesc: "Change category" } } },
} as unknown as Record<"ko" | "en", Translations>;

function Says({ id }: { id: string }) {
  const { t } = useLanguage();
  return <span data-testid={id}>{t("admin.common.bulkCategoryDesc")}</span>;
}

afterEach(cleanup);

describe("관리자 사전", () => {
  it("provider 밖(전역 모달 자리)에서도 admin 키가 풀린다", async () => {
    render(
      <LanguageProvider>
        <AdminDictProvider dict={dict}>
          <Says id="inside" />
        </AdminDictProvider>
        {/* 전역 모달처럼 대시보드 바깥에 있는 자리 */}
        <Says id="outside" />
      </LanguageProvider>,
    );

    /* 언어는 브라우저 설정을 따르므로 문구 대신 "키가 아니다" 로 본다 */
    const 번역 = ["선택한 항목의 카테고리를 바꿉니다", "Change category"];
    expect(번역).toContain(screen.getByTestId("inside").textContent);
    await waitFor(() => expect(번역).toContain(screen.getByTestId("outside").textContent));
  });

  it("공개 화면에는 admin 사전이 없다 — 키를 넣지 않았으므로 그대로 둔다", () => {
    render(
      <LanguageProvider>
        <Says id="public" />
      </LanguageProvider>,
    );
    expect(screen.getByTestId("public").textContent).toBe("admin.common.bulkCategoryDesc");
  });
});
