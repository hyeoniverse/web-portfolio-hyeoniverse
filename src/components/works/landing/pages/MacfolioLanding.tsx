"use client";

import type { Project } from "@/data/projects";
import { LandingShell, Numbers, Pair, Phones, Recording, Section, SectionHead, Shot, type Lang, type L10n } from "../kit/LandingKit";

/**
 * MacFolio 전용 랜딩 페이지 — andreasantonsson.dev/project/secret-level 처럼 섹션마다 화면 폭 전체를 쓴다.
 * 화면은 모두 이 페이지를 위해 배포한 사이트(macfolio.hyeoniverse.com)에서 2배 해상도로 새로 찍은 캡처 · 녹화다
 * (content/works/macfolio/landing). 글은 섹션 머리의 짧은 문장뿐. 내용 · 숫자는 MacFolio README 에서 옮겼다.
 */
const A = "/content/works/macfolio/landing";

export default function MacfolioLanding({ project, viewLang, next }: {
  project: Project; viewLang: Lang; next?: { href: string; title: string } | null;
}) {
  const t = (v: L10n) => v[viewLang];
  return (
    <LandingShell
      project={project}
      viewLang={viewLang}
      next={next}
      eyebrow={{ ko: "macOS 데스크톱을 웹으로 옮긴 포트폴리오", en: "A portfolio that brings the macOS desktop to the web" }}
    >
      <Section tone="bleed">
        <Shot priority src={`${A}/desktop-light.webp`} alt={t({ ko: "MacFolio 데스크톱 — 위젯 · 바탕화면 폴더 · Dock", en: "MacFolio desktop — widgets, folders and the Dock" })} />
      </Section>

      <Section tone="base">
        <SectionHead
          viewLang={viewLang}
          no="01"
          title={{ ko: "Dock 에서 열고, 창을 끌어 옮긴다", en: "Open from the Dock, drag the windows" }}
          body={{ ko: "배포한 사이트를 그대로 녹화했습니다.", en: "Recorded on the deployed site as is." }}
        />
        <Recording src={`${A}/tour.mp4`} poster={`${A}/desktop-light.webp`} label={t({ ko: "Dock 에서 메모 · Finder · 음악을 여는 녹화", en: "Recording: opening Notes, Finder and Music from the Dock" })} />
      </Section>

      <Section tone="tint">
        <SectionHead
          viewLang={viewLang}
          no="02"
          title={{ ko: "메모 앱이 곧 블로그다", en: "The Notes app is the blog" }}
          body={{ ko: "폴더는 분류, 메모는 글. 관리자로 로그인하면 글이 곧 편집기가 됩니다.", en: "Folders are categories, notes are posts. Signed in, a note becomes the editor." }}
        />
        <Shot size="wide" src={`${A}/memo-post.webp`} alt={t({ ko: "메모 앱에 열린 개발기", en: "A dev note open in Notes" })} />
      </Section>

      <Section tone="bleed">
        <Shot src={`${A}/desktop-dark.webp`} alt={t({ ko: "다크 모드 데스크톱", en: "Desktop in dark mode" })} />
      </Section>

      <Section tone="base">
        <SectionHead
          viewLang={viewLang}
          no="03"
          title={{ ko: "앱 20여 개가 창으로 열린다", en: "Twenty-odd apps open as windows" }}
          body={{ ko: "Finder · 음악 · 사진 · 메시지 · 터미널을 macOS 처럼 씁니다.", en: "Finder, Music, Photos, Messages and Terminal behave like macOS." }}
        />
        <Pair>
          <Shot size="wide" src={`${A}/finder.webp`} alt="Finder" />
          <Shot size="wide" src={`${A}/music.webp`} alt={t({ ko: "음악", en: "Music" })} />
          <Shot size="wide" src={`${A}/photos.webp`} alt={t({ ko: "사진", en: "Photos" })} />
          <Shot size="wide" src={`${A}/messages.webp`} alt={t({ ko: "메시지", en: "Messages" })} />
        </Pair>
      </Section>

      <Section tone="dark">
        <SectionHead viewLang={viewLang} no="04" title={{ ko: "서버까지 직접, 운영비 0원", en: "Running the server too, for $0" }} body={{ ko: "포트를 하나도 열지 않고 Cloudflare Tunnel 로만 요청을 받습니다.", en: "No open ports — requests arrive only through a Cloudflare Tunnel." }} />
        <Shot size="wide" src={`${A}/terminal.webp`} alt={t({ ko: "터미널", en: "Terminal" })} />
      </Section>

      <Section tone="bleed">
        <Shot src={`${A}/launchpad.webp`} alt="Launchpad" />
      </Section>

      <Section tone="base">
        <SectionHead viewLang={viewLang} no="05" title={{ ko: "Safari 탭마다 프로젝트 하나", en: "One project per Safari tab" }} />
        <Shot size="wide" src={`${A}/safari.webp`} alt="Safari" />
      </Section>

      <Section tone="tint">
        <SectionHead viewLang={viewLang} no="06" title={{ ko: "휴대폰으로 열면, iOS 홈 화면", en: "On a phone, an iOS home screen" }} />
        <Phones
          items={[
            { src: `${A}/phone-home.webp`, alt: t({ ko: "휴대폰 홈 화면", en: "Phone home screen" }) },
            { src: `${A}/phone-memo.webp`, alt: t({ ko: "휴대폰 메모", en: "Notes on a phone" }) },
            { src: `${A}/phone-safari.webp`, alt: t({ ko: "휴대폰 Safari", en: "Safari on a phone" }) },
          ]}
        />
      </Section>

      <Section tone="base">
        <Numbers
          viewLang={viewLang}
          items={[
            { value: "20+", label: { ko: "창으로 열리는 앱", en: "Apps that open as windows" } },
            { value: "0원", label: { ko: "운영비", en: "Running cost (KRW)" } },
            { value: "0개", label: { ko: "열린 포트", en: "Open ports" } },
            { value: "200편+", label: { ko: "메모 앱의 개발기", en: "Dev notes in the Notes app" } },
          ]}
        />
      </Section>
    </LandingShell>
  );
}
