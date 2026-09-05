import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LanguageProvider } from "@/providers/LanguageProvider";
import GiscusHelp from "@/app/admin/(dashboard)/settings/_components/GiscusHelp";

/* 안내문의 인라인 조각(Kbd·Hl·Ext)을 컴포넌트 밖으로 옮겼다(#687 5-4).
   이 컴포넌트는 댓글 제공자가 giscus 일 때만 화면에 나와서 e2e 로는 닿지 않는다.
   패널을 열어 세 조각이 다 그려지는지 여기서 본다. */
describe("GiscusHelp", () => {
  it("트리거를 누르면 안내 패널이 열리고 kbd 칩·강조·외부 링크가 그려진다", async () => {
    const { container } = render(
      <LanguageProvider>
        <GiscusHelp />
      </LanguageProvider>,
    );

    fireEvent.click(screen.getByText(/설정 방법|Setup guide/));

    await waitFor(() => {
      expect(screen.getByText(/giscus 설정 방법|How to set up giscus/)).toBeTruthy();
    });

    // Popover 는 portal 로 body 에 붙으므로 document 전체에서 센다.
    const kbd = document.querySelectorAll("kbd").length;
    const hl = document.querySelectorAll("b").length;
    const ext = document.querySelectorAll('a[target="_blank"]').length;
    expect(kbd, "Kbd 조각").toBeGreaterThan(5);
    expect(hl, "Hl 조각").toBeGreaterThan(0);
    expect(ext, "Ext 조각").toBeGreaterThan(0);
    void container;
  });
});
