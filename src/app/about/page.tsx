import type { Metadata } from "next";
import BreakpointGuard from "@/components/common/BreakpointGuard";
import { getSiteConfig } from "@/lib/getSiteConfig";
import AboutSection from "./_components/AboutSection";
import { AboutConfigProvider } from "./_components/AboutConfig";

export const metadata: Metadata = { title: "About" };

export default async function AboutPage() {
  // 패널 내용은 모든 페이지에 싣는 사이트 설정에서 빠져 있어 여기서 받는다(#944)
  const { about } = await getSiteConfig();

  /* AboutSection 을 <Suspense> 로 감싸지 않는다.
   *
   * 안에서 suspend 하는 게 없다(useSearchParams 도 lazy 도 없다. 패널의 dynamic(ssr: false)은
   * 저마다 경계를 따로 갖는다). 그런데 React 는 Suspense 경계를 본체와 떼어 늦게 하이드레이션한다.
   * 모바일에서는 서버가 데스크톱 트리(패널 3벌, 350vw 짜리 넓은 패널 포함)를 보내므로, 경계가
   * 늦게 풀리는 동안 그 큰 트리가 DOM 에 남아 있다. 그 사이 전역 네비의 로고 측정 같은 rAF 가
   * 레이아웃을 강제하면 매번 그 트리를 다시 계산한다(모바일 조건 80ms·194ms 두 번).
   *
   * 예전에는 BreakpointGuard 가 방문 직후 페이지를 통째로 다시 만들면서 이 늦은 하이드레이션을
   * 건너뛰었다. 그 리마운트를 없애자(/profile 첫 화면이 9.7초까지 밀리던 원인) 여기서 드러났다.
   * 경계를 빼면 셸과 함께 하이드레이션되어 모바일 트리로 일찍 바뀐다.
   * /profile/page.tsx 도 같은 이유로 경계를 뺐다. */
  return (
    <BreakpointGuard>
      <div className="content">
        <AboutConfigProvider about={about}>
          <AboutSection />
        </AboutConfigProvider>
      </div>
    </BreakpointGuard>
  );
}
