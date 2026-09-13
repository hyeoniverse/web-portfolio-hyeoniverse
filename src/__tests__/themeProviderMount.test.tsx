import { describe, it, expect, afterEach } from "vitest";
import { Suspense } from "react";
import { render, cleanup, act } from "@testing-library/react";
import { SiteConfigProvider } from "@/providers/SiteConfigProvider";
import { ThemeProvider, useTheme } from "@/providers/ThemeProvider";
import { siteConfig, type SiteConfigData } from "@/config/site.config";

/* 테마 provider 는 마운트 때 급한 갱신을 내지 않아야 한다(#911). 페이지 본문은 loading.tsx 의 Suspense 경계 안에서 루트보다
   늦게 하이드레이션되는데, 그 사이 급한 갱신이 경계에 닿으면 React 가 서버 HTML 을 버리고 다시 그렸다(느린 회선의 상세 페이지).
   그래서 상태는 전환으로 넣고, 값이 그대로면 소비자에게 새 값을 보내지 않으며, 문서의 테마는 바로 칠한다. */

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

const wrap = (children: React.ReactNode) => (
  <SiteConfigProvider initialConfig={siteConfig as unknown as SiteConfigData}>
    <ThemeProvider>{children}</ThemeProvider>
  </SiteConfigProvider>
);

function renderConsumer() {
  const seen: string[] = [];
  function Consumer() {
    seen.push(useTheme().theme);
    return null;
  }
  render(wrap(<Consumer />));
  return seen;
}

describe("ThemeProvider 마운트", () => {
  it("저장된 테마가 기본값(dark)과 같으면 소비자를 다시 그리지 않는다", async () => {
    localStorage.setItem("theme", "dark");
    const seen = renderConsumer();
    await act(async () => {});
    expect(seen).toEqual(["dark"]);
  });

  it("저장된 테마가 다르면 소비자에게 한 번 알린다", async () => {
    localStorage.setItem("theme", "light");
    const seen = renderConsumer();
    await act(async () => {});
    expect(seen).toEqual(["dark", "light"]);
  });

  it("테마 상태가 늦게 들어가도 문서 테마는 바로 칠한다", async () => {
    localStorage.setItem("theme", "light");
    // 아직 하이드레이션되지 않은 경계를 흉내 낸다 — 새 테마로 그리려 하면 멈춰, 전환이 끝나지 않는다
    const never = new Promise(() => {});
    function Waits() {
      if (useTheme().theme === "light") throw never;
      return null;
    }
    render(wrap(<Suspense fallback={null}><Waits /></Suspense>));
    await act(async () => {});
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });
});
