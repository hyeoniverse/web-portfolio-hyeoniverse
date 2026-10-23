"use client";

import type { Project } from "@/data/projects";
import { Flow, Frame, LandingShell, Marquee, Note, Numbers, PhoneFlip, type Lang, type L10n } from "../kit/LandingKit";

/** 배경화면 이름 — 시스템 설정 › 배경화면 순서(캡처 wall-light-0 … 5 · wall-dark-0 … 5 와 같다) */
const WALLPAPERS = ["High Sierra", "Big Sur", "Ventura", "Sonoma", "Sequoia", "Tahoe"];

/**
 * MacFolio 전용 랜딩 페이지 — andreasantonsson.dev/project/synthetic-theatre 처럼 이미지가 중심이다.
 * 강한 장면만 화면 폭 전체로, 나머지는 한 장씩 폭 · 위치를 바꿔 가며 잇는다(격자 · 카드로 늘어놓지 않는다). 글은 묶음마다 번호 · 제목 · 한 줄뿐.
 * 게시물(메모 앱에 열린 개발기 본문)은 보여 주지 않는다 — 데스크톱과 앱을 보여 준다.
 * 화면은 모두 이 페이지를 위해 배포한 사이트(macfolio.hyeoniverse.com)에서 2배 해상도로 새로 찍은 캡처 · 녹화다
 * (content/works/macfolio/landing). 부팅 · 둘러보기 · 위젯 편집 · 메모 · 터미널 · Safari 는 녹화, 배경화면은 여섯 벌을 라이트 · 다크로 입힌
 * 실제 데스크톱이 흐르는 띠, 휴대폰은 화면마다 녹화. 내용 · 숫자는 MacFolio README 에서 옮겼다.
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
      eyebrow={{ ko: "읽는 대신 직접 만져 보는 포트폴리오", en: "A portfolio you touch instead of read" }}
    >
      <Flow>
        <Frame at="bleed" priority src={`${A}/desktop-light.webp`} alt={t({ ko: "MacFolio 데스크톱 — 위젯 · 바탕화면 폴더 · Dock", en: "MacFolio desktop — widgets, folders and the Dock" })} />

        <Note
          viewLang={viewLang}
          no="01"
          title={{ ko: "포트폴리오를 운영체제처럼", en: "A portfolio that behaves like an OS" }}
          body={{
            ko: "한 장짜리 페이지 대신 켜지는 데스크톱. 사과 로고 아래 막대가 차면 메뉴 막대 · 위젯 · Dock 이 나타나고, 궁금한 앱을 열고, 창을 끌어 옮기고, 닫습니다.",
            en: "A desktop that boots instead of a single page — once the bar under the Apple logo fills, the menu bar, widgets and Dock appear; open the apps you like, drag the windows, close them.",
          }}
        />
        <Frame at="wide" video={`${A}/rec-boot.mp4`} src={`${A}/rec-boot-poster.webp`} alt={t({ ko: "부팅 — 눌러서 시작하면 로딩 막대가 차고 데스크톱이 열린다", en: "Boot — click to start, the bar fills and the desktop opens" })} />
        <Frame at="right" video={`${A}/tour.mp4`} src={`${A}/desktop-light.webp`} alt={t({ ko: "Dock 에서 메모 · Finder · 음악을 열고 창을 끌어 옮기는 녹화", en: "Recording: opening Notes, Finder and Music from the Dock and dragging windows" })} />

        <Note
          viewLang={viewLang}
          no="02"
          title={{ ko: "처음 온 사람에게 1분 둘러보기", en: "A one-minute tour for first-timers" }}
          body={{
            ko: "처음 들어오면 Dock · 메뉴 막대 · 이력서를 차례로 짚어 주는 둘러보기를 권합니다. 지나간 설명은 팁 앱에서 주제별로 다시 봅니다.",
            en: "First-time visitors are offered a tour that points out the Dock, menu bar and résumé in turn. Tips can be revisited by topic in the Tips app.",
          }}
        />
        <Frame at="wide" video={`${A}/rec-guide.mp4`} src={`${A}/rec-guide-poster.webp`} alt={t({ ko: "1분 둘러보기 — 다음을 누를 때마다 다음 자리를 짚는다", en: "One-minute tour — each Next points to the next spot" })} />
        <Frame at="left" src={`${A}/tips.webp`} alt={t({ ko: "팁 — 주제별 팁 모음", en: "Tips — tips by topic" })} />

        <Note
          viewLang={viewLang}
          no="03"
          title={{ ko: "바탕화면을 내 것으로", en: "Make the desktop your own" }}
          body={{
            ko: "바탕화면을 오른쪽 클릭해 위젯 갤러리를 열고 시계 · 명언 · 사진 위젯을 더합니다. 배경화면은 여섯 벌, 다크 모드에서는 위젯과 함께 어두운 버전으로 바뀝니다 — 윗줄 라이트, 아랫줄 다크.",
            en: "Right-click the desktop to open the widget gallery and add clock, quote and photo widgets. Six wallpapers, each switching to a dark version with the widgets in dark mode — light on top, dark below.",
          }}
        />
        <Frame at="wide" video={`${A}/rec-widgets.mp4`} src={`${A}/rec-widgets-poster.webp`} alt={t({ ko: "위젯 편집 — 갤러리에서 고르면 바탕화면 칸에 들어간다", en: "Editing widgets — picked from the gallery, dropped into the desktop grid" })} />
        <Marquee
          rows={[
            WALLPAPERS.map((name, i) => ({ src: `${A}/wall-light-${i}.webp`, alt: t({ ko: `${name} — 라이트`, en: `${name} — light` }) })),
            WALLPAPERS.map((name, i) => ({ src: `${A}/wall-dark-${i}.webp`, alt: t({ ko: `${name} — 다크`, en: `${name} — dark` }) })),
          ]}
        />
        <Frame at="right" src={`${A}/settings.webp`} alt={t({ ko: "시스템 설정 — 화면 모드 · 배경화면 · 사운드", en: "System Settings — appearance, wallpaper and sound" })} />

        <Note
          viewLang={viewLang}
          no="04"
          title={{ ko: "블로그가 된 메모 앱", en: "A Notes app that became the blog" }}
          body={{
            ko: "폴더는 분류, 메모는 글. 인기글을 따로 모으고, 목록과 갤러리로 바꿔 봅니다. 관리자로 로그인하면 메모가 그대로 편집기가 됩니다.",
            en: "Folders are categories, notes are posts. Popular posts get their own folder, and lists switch to a gallery. Signed in as admin, a note becomes the editor.",
          }}
        />
        <Frame at="bleed" video={`${A}/rec-memo.mp4`} src={`${A}/rec-memo-poster.webp`} alt={t({ ko: "메모 — 인기글 · 갤러리 보기 · 폴더 · 목록 보기", en: "Notes — popular posts, gallery view, folders and list view" })} />
        <Frame at="left" src={`${A}/memo.webp`} alt={t({ ko: "메모 — 폴더 · 목록 · 본문 세 칸", en: "Notes — folders, list and body" })} />
        <Frame at="bleed" src={`${A}/desktop-dark.webp`} alt={t({ ko: "다크 모드 데스크톱", en: "Desktop in dark mode" })} />

        <Note
          viewLang={viewLang}
          no="05"
          title={{ ko: "익숙한 앱으로 둘러보는 작업과 기록", en: "Work and notes, browsed through familiar apps" }}
          body={{
            ko: "Finder 로 문서와 저장소의 README 를 둘러보고, 음악을 틀고, 사진 앨범을 넘기고, 메시지에 로그인 없이 피드백을 남깁니다. 터미널에 neofetch · skills · projects 를 치면 소개가 나옵니다.",
            en: "Browse docs and the repo README in Finder, play music, flip through photo albums and leave feedback in Messages without signing in. Type neofetch, skills or projects in Terminal for an introduction.",
          }}
        />
        <Frame at="left" src={`${A}/finder.webp`} alt="Finder" />
        <Frame at="right" src={`${A}/music.webp`} alt={t({ ko: "음악", en: "Music" })} />
        <Frame at="center" src={`${A}/photos.webp`} alt={t({ ko: "사진", en: "Photos" })} />
        <Frame at="left" src={`${A}/messages.webp`} alt={t({ ko: "메시지", en: "Messages" })} />
        <Frame at="wide" video={`${A}/rec-terminal.mp4`} src={`${A}/rec-terminal-poster.webp`} alt={t({ ko: "터미널 — neofetch · skills · projects", en: "Terminal — neofetch, skills and projects" })} />
        <Frame at="right" src={`${A}/textedit.webp`} alt={t({ ko: "텍스트 편집기 — Markdown 이력서", en: "TextEdit — a Markdown résumé" })} />

        <Note
          viewLang={viewLang}
          no="06"
          title={{ ko: "Launchpad 안의 앱들", en: "Inside the Launchpad" }}
          body={{
            ko: "날씨(Open-Meteo) · 쿠키 없이 세는 활동 상태 · 창 안에서 실행하는 다른 작업물.",
            en: "Weather (Open-Meteo), a cookie-free Activity Monitor and other projects that run in a window.",
          }}
        />
        <Frame at="bleed" src={`${A}/launchpad.webp`} alt="Launchpad" />
        <Frame at="right" src={`${A}/weather.webp`} alt={t({ ko: "날씨", en: "Weather" })} />
        <Frame at="left" src={`${A}/activity.webp`} alt={t({ ko: "활동 상태 보기", en: "Activity Monitor" })} />
        <Frame at="wide" src={`${A}/sproutfarm.webp`} alt={t({ ko: "새싹 농장 — 창 안에서 실행하는 게임", en: "SproutFarm — a game running in a window" })} />
        <Frame at="right" src={`${A}/newpick.webp`} alt="NewPick" />
        <Frame at="left" src={`${A}/github.webp`} alt="GitHub" />

        <Note
          viewLang={viewLang}
          no="07"
          title={{ ko: "Safari 탭으로 여는 프로젝트", en: "Projects opened in Safari tabs" }}
          body={{
            ko: "작업물은 Safari 에서 열립니다. 프로젝트마다 소개 페이지를 탭으로 넘겨 보고, HYEONIVERSE 탭은 배포한 사이트를 창 안에 그대로 불러옵니다.",
            en: "Projects open in Safari — flip through each project's page in tabs, and the HYEONIVERSE tab loads the deployed site right inside the window.",
          }}
        />
        <Frame at="wide" video={`${A}/rec-safari.mp4`} src={`${A}/rec-safari-poster.webp`} alt={t({ ko: "Safari — HYEONIVERSE 탭에서 배포한 사이트를 그대로 스크롤", en: "Safari — scrolling the deployed HYEONIVERSE site in its tab" })} />
        <Frame at="left" src={`${A}/hyeoniverse.webp`} alt={t({ ko: "Safari 에 열린 HYEONIVERSE", en: "HYEONIVERSE open in Safari" })} />

        <Note
          viewLang={viewLang}
          no="08"
          title={{ ko: "서버까지 직접, 운영비 0원", en: "Running the server too, for $0" }}
          body={{
            ko: "프론트엔드는 Cloudflare Workers, 백엔드(NestJS · PostgreSQL)는 Oracle Cloud 무료 VM 에서 직접 운영합니다. 메뉴 막대에서 서버 상태와 응답 시간을 바로 보고, API 문서도 사이트 안 앱으로 엽니다.",
            en: "Frontend on Cloudflare Workers, backend (NestJS and PostgreSQL) run on a free Oracle Cloud VM — server status and response time show right in the menu bar, and the API docs open as an in-site app.",
          }}
        />
        <Frame at="wide" src={`${A}/server-menu.webp`} width={1440} height={900} alt={t({ ko: "메뉴 막대의 서버 메뉴 — API 상태 · 응답 시간 · 주소", en: "The server menu in the menu bar — API status, response time and address" })} />
        <Frame at="right" src={`${A}/apidocs.webp`} alt={t({ ko: "API 문서 — 백엔드의 OpenAPI 를 사이트 안 앱으로", en: "API docs — the backend's OpenAPI as an in-site app" })} />

        <Note
          viewLang={viewLang}
          no="09"
          title={{ ko: "휴대폰으로 열면 iOS 홈 화면처럼", en: "On a phone, it opens like an iOS home screen" }}
          body={{
            ko: "화면 폭이 좁으면 iOS 홈 화면이 됩니다. 페이지를 넘기는 홈 화면, 길게 눌러 위젯 빼고 더하기, 위에서 쓸어 내리는 제어 센터, 터미널 대신 단축어.",
            en: "On a narrow screen it becomes an iOS home screen — swipe between pages, long-press to add or remove widgets, pull down for Control Center, and Shortcuts in place of Terminal.",
          }}
        />
        <PhoneFlip
          items={[
            { src: `${A}/m-home.webp`, video: `${A}/m-home.mp4`, alt: t({ ko: "홈 화면 — 세 쪽을 넘긴다", en: "Home screen — three pages" }), route: t({ ko: "홈 화면", en: "Home" }) },
            { src: `${A}/m-edit.webp`, video: `${A}/m-edit.mp4`, alt: t({ ko: "길게 눌러 위젯 편집", en: "Long-press to edit widgets" }), route: t({ ko: "위젯 편집", en: "Edit widgets" }) },
            { src: `${A}/m-control.webp`, video: `${A}/m-control.mp4`, alt: t({ ko: "제어 센터", en: "Control Center" }), route: t({ ko: "제어 센터", en: "Control Center" }) },
            { src: `${A}/m-memo.webp`, video: `${A}/m-memo.mp4`, alt: t({ ko: "메모 — 글 목록과 본문", en: "Notes — post list and body" }), route: t({ ko: "메모", en: "Notes" }) },
            { src: `${A}/m-shortcuts.webp`, video: `${A}/m-shortcuts.mp4`, alt: t({ ko: "단축어 — 눌러서 실행하는 터미널 명령", en: "Shortcuts — Terminal commands as taps" }), route: t({ ko: "단축어", en: "Shortcuts" }) },
            { src: `${A}/m-music.webp`, video: `${A}/m-music.mp4`, alt: t({ ko: "음악", en: "Music" }), route: t({ ko: "음악", en: "Music" }) },
            { src: `${A}/m-weather.webp`, video: `${A}/m-weather.mp4`, alt: t({ ko: "날씨", en: "Weather" }), route: t({ ko: "날씨", en: "Weather" }) },
            { src: `${A}/m-settings.webp`, video: `${A}/m-settings.mp4`, alt: t({ ko: "설정 — 배경화면", en: "Settings — wallpaper" }), route: t({ ko: "설정", en: "Settings" }) },
            { src: `${A}/m-safari.webp`, video: `${A}/m-safari.mp4`, alt: "Safari", route: "Safari" },
          ]}
        />

        <Numbers
          viewLang={viewLang}
          items={[
            { value: "20+", label: { ko: "창으로 열리는 앱", en: "Apps that open as windows" } },
            { value: "0원", label: { ko: "운영비", en: "Running cost (KRW)" } },
            { value: "200편+", label: { ko: "메모 앱에 쓴 개발기", en: "Dev notes written in Notes" } },
            { value: "9종", label: { ko: "데스크톱 · 휴대폰 위젯", en: "Widget types on desktop and phone" } },
          ]}
        />
      </Flow>
    </LandingShell>
  );
}
