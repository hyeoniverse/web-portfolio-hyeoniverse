"use client";

import type { Project } from "@/data/projects";
import { Flow, Frame, LandingShell, Note, Numbers, Phones, type Lang, type L10n } from "../kit/LandingKit";

/**
 * MacFolio 전용 랜딩 페이지 — andreasantonsson.dev/project/synthetic-theatre 처럼 이미지가 중심이다.
 * 강한 장면만 화면 폭 전체로, 나머지는 한 장씩 폭 · 위치를 바꿔 가며 잇는다(격자 · 카드로 늘어놓지 않는다). 글은 묶음마다 번호 · 제목 · 한 줄뿐.
 * 게시물(메모 앱에 열린 개발기 본문)은 보여 주지 않는다 — 데스크톱과 앱을 보여 준다.
 * 화면은 모두 이 페이지를 위해 배포한 사이트(macfolio.hyeoniverse.com)에서 2배 해상도로 새로 찍은 캡처 · 녹화다
 * (content/works/macfolio/landing). 내용 · 숫자는 MacFolio README 에서 옮겼다.
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
      eyebrow={{ ko: "macOS 데스크톱을 그대로 옮긴 웹 포트폴리오", en: "A web portfolio that recreates the macOS desktop" }}
    >
      <Flow>
        <Frame at="bleed" priority src={`${A}/desktop-light.webp`} alt={t({ ko: "MacFolio 데스크톱 — 위젯 · 바탕화면 폴더 · Dock", en: "MacFolio desktop — widgets, folders and the Dock" })} />

        <Note
          viewLang={viewLang}
          no="01"
          title={{ ko: "포트폴리오를 운영체제처럼", en: "A portfolio that behaves like an OS" }}
          body={{
            ko: "한 장짜리 페이지 대신 메뉴 막대 · 위젯 · Dock 이 있는 데스크톱. 궁금한 앱을 열고, 창을 끌어 옮기고, 닫습니다.",
            en: "A desktop with a menu bar, widgets and a Dock instead of a single page — open the apps you like, drag the windows, close them.",
          }}
        />
        <Frame at="wide" video={`${A}/tour.mp4`} src={`${A}/desktop-light.webp`} alt={t({ ko: "Dock 에서 메모 · Finder · 음악을 여는 녹화", en: "Recording: opening Notes, Finder and Music from the Dock" })} />

        <Note
          viewLang={viewLang}
          no="02"
          title={{ ko: "메모 앱이 곧 블로그", en: "The Notes app as the blog" }}
          body={{
            ko: "폴더는 분류, 메모는 글. 관리자로 로그인하면 메모가 그대로 편집기가 됩니다.",
            en: "Folders are categories, notes are posts — signed in as admin, a note becomes the editor.",
          }}
        />
        <Frame at="right" src={`${A}/memo.webp`} alt={t({ ko: "메모 — 폴더 · 목록 · 본문 세 칸", en: "Notes — folders, list and body" })} />
        <Frame at="bleed" src={`${A}/desktop-dark.webp`} alt={t({ ko: "다크 모드 데스크톱", en: "Desktop in dark mode" })} />

        <Note
          viewLang={viewLang}
          no="03"
          title={{ ko: "macOS 그대로의 기본 앱", en: "Stock apps, just like macOS" }}
          body={{
            ko: "Finder 로 문서와 저장소의 README 를 둘러보고, 음악을 틀고, 사진 앨범을 넘기고, 메시지에 로그인 없이 피드백을 남깁니다.",
            en: "Browse docs and the repo README in Finder, play music, flip through photo albums and leave feedback in Messages without signing in.",
          }}
        />
        <Frame at="left" src={`${A}/finder.webp`} alt="Finder" />
        <Frame at="right" src={`${A}/music.webp`} alt={t({ ko: "음악", en: "Music" })} />
        <Frame at="center" src={`${A}/photos.webp`} alt={t({ ko: "사진", en: "Photos" })} />
        <Frame at="left" src={`${A}/messages.webp`} alt={t({ ko: "메시지", en: "Messages" })} />
        <Frame at="bleed" src={`${A}/launchpad.webp`} alt="Launchpad" />

        <Note
          viewLang={viewLang}
          no="04"
          title={{ ko: "Launchpad 안의 앱들", en: "Inside the Launchpad" }}
          body={{
            ko: "날씨(Open-Meteo) · 쿠키 없이 세는 활동 상태 · API 문서 · Markdown 이력서 · 1분 둘러보기 · 창 안에서 실행하는 다른 작업물.",
            en: "Weather (Open-Meteo), cookie-free Activity Monitor, API docs, a Markdown résumé, a one-minute tour and other projects that run in a window.",
          }}
        />
        <Frame at="right" src={`${A}/weather.webp`} alt={t({ ko: "날씨", en: "Weather" })} />
        <Frame at="left" src={`${A}/activity.webp`} alt={t({ ko: "활동 상태 보기", en: "Activity Monitor" })} />
        <Frame at="center" src={`${A}/apidocs.webp`} alt={t({ ko: "API 문서", en: "API docs" })} />
        <Frame at="right" src={`${A}/textedit.webp`} alt={t({ ko: "텍스트 편집기 — 이력서", en: "TextEdit — résumé" })} />
        <Frame at="left" src={`${A}/tips.webp`} alt={t({ ko: "팁", en: "Tips" })} />
        <Frame at="wide" src={`${A}/sproutfarm.webp`} alt={t({ ko: "새싹 농장 — 창 안에서 실행하는 게임", en: "SproutFarm — a game running in a window" })} />
        <Frame at="right" src={`${A}/newpick.webp`} alt="NewPick" />
        <Frame at="left" src={`${A}/github.webp`} alt="GitHub" />

        <Note
          viewLang={viewLang}
          no="05"
          title={{ ko: "Safari 탭으로 여는 프로젝트", en: "Projects opened in Safari tabs" }}
          body={{
            ko: "작업물은 Safari 에서 열립니다. HYEONIVERSE 탭은 배포한 사이트를 창 안에 그대로 불러옵니다.",
            en: "Projects open in Safari; the HYEONIVERSE tab loads the deployed site right inside the window.",
          }}
        />
        <Frame at="wide" src={`${A}/hyeoniverse.webp`} alt={t({ ko: "Safari 에 열린 HYEONIVERSE", en: "HYEONIVERSE open in Safari" })} />
        <Frame at="right" src={`${A}/safari.webp`} alt="Safari" />

        <Note
          viewLang={viewLang}
          no="06"
          title={{ ko: "서버까지 직접, 운영비 0원", en: "Running the server too, for $0" }}
          body={{
            ko: "프론트엔드는 Cloudflare Workers, 백엔드는 Oracle Cloud 무료 VM. 포트를 하나도 열지 않고 Cloudflare Tunnel 로만 요청을 받습니다.",
            en: "Frontend on Cloudflare Workers, backend on a free Oracle Cloud VM — no open ports, requests only through a Cloudflare Tunnel.",
          }}
        />
        <Frame at="left" src={`${A}/terminal.webp`} alt={t({ ko: "터미널", en: "Terminal" })} />
        <Frame at="right" src={`${A}/settings.webp`} alt={t({ ko: "시스템 설정", en: "System Settings" })} />

        <Note viewLang={viewLang} no="07" title={{ ko: "휴대폰에서는 iOS 홈 화면으로", en: "On a phone, as an iOS home screen" }} />
        <Phones
          items={[
            { src: `${A}/phone-home.webp`, alt: t({ ko: "휴대폰 홈 화면", en: "Phone home screen" }) },
            { src: `${A}/phone-safari.webp`, alt: t({ ko: "휴대폰 Safari", en: "Safari on a phone" }) },
          ]}
        />

        <Numbers
          viewLang={viewLang}
          items={[
            { value: "20+", label: { ko: "창으로 열리는 앱", en: "Apps that open as windows" } },
            { value: "0원", label: { ko: "운영비", en: "Running cost (KRW)" } },
            { value: "0개", label: { ko: "열린 포트", en: "Open ports" } },
            { value: "8종", label: { ko: "데스크톱 · 휴대폰 위젯", en: "Widgets on desktop and phone" } },
          ]}
        />
      </Flow>
    </LandingShell>
  );
}
