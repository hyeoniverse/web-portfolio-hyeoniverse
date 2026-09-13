import { describe, it, expect, afterEach, vi } from "vitest";
import { Suspense, lazy } from "react";
import { renderToString } from "react-dom/server";
import { hydrateRoot, type Root } from "react-dom/client";
import { act } from "@testing-library/react";
import { SiteConfigProvider } from "@/providers/SiteConfigProvider";
import { ThemeProvider, useTheme } from "@/providers/ThemeProvider";
import { LenisProvider, useLenis } from "@/providers/LenisProvider";
import { LanguageProvider, useLanguage } from "@/providers/LanguageProvider";
import { siteConfig, type SiteConfigData } from "@/config/site.config";

/* 늦게 하이드레이션되는 경계의 서버 HTML 을 버리지 않는지(#929). 글·작업물 상세는 loading.tsx 의 Suspense 경계 안이라 본문 코드가
   도착해야 하이드레이션된다. 그 전에 Lenis 인스턴스가 생기거나 저장된 테마(light)·언어(en)가 들어가며 context 값이 바뀌면, React 는
   그 경계를 서버 값으로 하이드레이션하지 못해 새로 그리거나 어긋난 속성을 남겼다(동시에 여러 창을 열어 코드가 늦을 때). 여기서는
   본문을 늦게 풀리는 lazy 로 흉내 내, provider 가 마운트를 마친 뒤에 경계가 하이드레이션되게 한다. 본문은 세 값을 모두 그려
   서버 값으로 맞춘 뒤 새 값으로 바뀌는지 본다. */

vi.mock("@studio-freight/lenis", () => ({
  default: class {
    options = { infinite: false, syncTouch: false };
    scroll = 0;
    on() {}
    raf() {}
    scrollTo() {}
    stop() {}
    start() {}
    destroy() {}
  },
}));
vi.mock("gsap", () => ({ default: { registerPlugin() {}, ticker: { add() {}, remove() {}, lagSmoothing() {} } } }));
vi.mock("gsap/ScrollTrigger", () => ({ ScrollTrigger: { update() {}, scrollerProxy() {}, refresh() {}, getAll: () => [] } }));

let root: Root | null = null;
afterEach(() => {
  act(() => root?.unmount());
  root = null;
  document.body.innerHTML = "";
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

function Body() {
  const { theme } = useTheme();
  const { lenis } = useLenis();
  const { language } = useLanguage();
  return <article data-lenis={lenis ? "ready" : "none"}>{theme}/{language}</article>;
}

const tree = (body: React.ReactNode) => (
  <SiteConfigProvider initialConfig={siteConfig as unknown as SiteConfigData}>
    <ThemeProvider>
      <LanguageProvider>
        <LenisProvider>
          <nav>nav</nav>
          <Suspense fallback={<p>loading</p>}>{body}</Suspense>
        </LenisProvider>
      </LanguageProvider>
    </ThemeProvider>
  </SiteConfigProvider>
);

describe("늦게 하이드레이션되는 경계", () => {
  for (const [theme, language] of [["dark", "ko"], ["light", "ko"], ["dark", "en"]]) {
    it(`저장된 테마 ${theme}·언어 ${language} 로 provider 가 먼저 마운트해도 서버가 그린 본문을 그대로 쓴다`, async () => {
      localStorage.setItem("theme", theme);
      localStorage.setItem("language", language);
      const container = document.createElement("div");
      container.innerHTML = renderToString(tree(<Body />));
      document.body.appendChild(container);
      const serverArticle = container.querySelector("article");
      expect(serverArticle?.textContent, "서버는 기본값으로 그린다").toBe("dark/ko");

      let release!: () => void;
      const codeArrives = new Promise<void>((resolve) => { release = resolve; });
      const LateBody = lazy(async () => { await codeArrives; return { default: Body }; });
      const errors: unknown[] = [];
      await act(async () => {
        root = hydrateRoot(container, tree(<LateBody />), { onRecoverableError: (e) => errors.push(e) });
      });
      // provider 는 마운트를 마쳤고(Lenis 인스턴스·저장된 테마), 본문 코드는 이제 도착한다
      await act(async () => { release(); await codeArrives; });

      expect(errors, "하이드레이션 오류").toEqual([]);
      expect(container.querySelector("article"), "서버가 그린 본문 노드").toBe(serverArticle);
      expect(serverArticle?.textContent, "하이드레이션 뒤 저장된 값으로 바뀐다").toBe(`${theme}/${language}`);
      expect(serverArticle?.getAttribute("data-lenis")).toBe("ready");
    });
  }
});
