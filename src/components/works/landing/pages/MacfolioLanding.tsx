"use client";

import type { Project } from "@/data/projects";
import { Gallery, LandingShell, Numbers, Pair, Phones, Prose, Recording, Section, SectionHead, Shot, type Lang, type L10n } from "../kit/LandingKit";

/**
 * MacFolio 전용 랜딩 페이지 — andreasantonsson.dev/project/secret-level 처럼 섹션마다 화면 폭 전체를 쓴다.
 * 화면은 모두 이 페이지를 위해 배포한 사이트(macfolio.hyeoniverse.com)에서 2배 해상도로 새로 찍은 캡처 · 녹화다
 * (content/works/macfolio/landing). 창으로 열리는 앱을 하나씩 다 보여 준다. 내용 · 숫자는 MacFolio README 에서 옮겼다.
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
          title={{ ko: "포트폴리오를 운영체제처럼", en: "A portfolio that behaves like an OS" }}
          body={{
            ko: "스크롤해서 읽는 한 장짜리 페이지 대신, 메뉴 막대 · 위젯 · Dock 이 있는 데스크톱을 띄웠습니다. 보는 사람은 궁금한 앱을 골라 열고, 창을 끌어 옮기고, 닫습니다.",
            en: "Instead of a single scrolling page, it boots into a desktop with a menu bar, widgets and a Dock. Visitors open the apps they care about, drag the windows around and close them.",
          }}
        />
        <Prose
          viewLang={viewLang}
          items={[
            {
              label: { ko: "창 관리", en: "Window manager" },
              body: {
                ko: "창마다 위치 · 크기 · 쌓임 순서를 따로 들고 있어서, 여러 앱을 동시에 열어 두고 앞뒤로 오갈 수 있습니다. 앱 이름 · 아이콘 · Dock 자리는 목록 한 곳에서 정하고, Dock · Launchpad · 터미널 · 휴대폰 홈 화면이 모두 그 목록을 읽습니다.",
                en: "Each window keeps its own position, size and stacking order, so several apps stay open at once. App names, icons and Dock slots are defined in one manifest that the Dock, Launchpad, Terminal and the phone home screen all read.",
              },
            },
            {
              label: { ko: "위젯 여덟 가지", en: "Eight widgets" },
              body: {
                ko: "날씨 · 캘린더 · 시계 · 음악 · 메모 · 사진 · GitHub 잔디 · 소개 여덟 가지를 데스크톱과 휴대폰이 같이 씁니다. 위젯 편집으로 갤러리를 열어 더하고, 칸 격자에 끌어 놓습니다.",
                en: "Weather, Calendar, Clock, Music, Notes, Photos, GitHub contributions and About are shared by the desktop and the phone. Add them from the widget gallery and drag them onto the grid.",
              },
            },
          ]}
        />
        <Recording src={`${A}/tour.mp4`} poster={`${A}/desktop-light.webp`} label={t({ ko: "Dock 에서 메모 · Finder · 음악을 여는 녹화", en: "Recording: opening Notes, Finder and Music from the Dock" })} />
      </Section>

      <Section tone="tint">
        <SectionHead
          viewLang={viewLang}
          no="02"
          title={{ ko: "메모 앱이 곧 블로그다", en: "The Notes app is the blog" }}
          body={{
            ko: "폴더는 분류, 메모는 글입니다. 200편이 넘는 개발기가 메모 목록에 쌓여 있고, 관리자로 로그인하면 메모가 그대로 편집기가 됩니다.",
            en: "Folders are categories, notes are posts. More than 200 dev notes sit in the list, and when signed in as admin a note becomes the editor itself.",
          }}
        />
        <Pair>
          <Shot size="wide" src={`${A}/memo.webp`} alt={t({ ko: "메모 — 폴더 목록과 글 목록", en: "Notes — folders and the post list" })} caption={t({ ko: "폴더 · 글 목록 · 본문, 세 칸", en: "Folders, list and body in three columns" })} />
          <Shot size="wide" src={`${A}/memo-post.webp`} alt={t({ ko: "메모 앱에 열린 개발기", en: "A dev note open in Notes" })} caption={t({ ko: "표 · 코드 · 이미지가 들어간 개발기", en: "A dev note with tables, code and images" })} />
        </Pair>
      </Section>

      <Section tone="bleed">
        <Shot src={`${A}/desktop-dark.webp`} alt={t({ ko: "다크 모드 데스크톱", en: "Desktop in dark mode" })} />
      </Section>

      <Section tone="base">
        <SectionHead
          viewLang={viewLang}
          no="03"
          title={{ ko: "기본 앱은 macOS 그대로", en: "The stock apps, as on macOS" }}
          body={{
            ko: "Finder 에서 작업물 폴더를 열고, 음악으로 작업할 때 듣는 곡을 틀고, 사진에서 캡처를 넘겨 보고, 메시지로 말을 겁니다. 생김새와 단축키를 macOS 에 맞췄습니다.",
            en: "Open project folders in Finder, play work music in Music, flip through captures in Photos and start a chat in Messages. Looks and shortcuts follow macOS.",
          }}
        />
        <Pair>
          <Shot size="wide" src={`${A}/finder.webp`} alt="Finder" caption="Finder" />
          <Shot size="wide" src={`${A}/music.webp`} alt={t({ ko: "음악", en: "Music" })} caption={t({ ko: "음악", en: "Music" })} />
          <Shot size="wide" src={`${A}/photos.webp`} alt={t({ ko: "사진", en: "Photos" })} caption={t({ ko: "사진", en: "Photos" })} />
          <Shot size="wide" src={`${A}/messages.webp`} alt={t({ ko: "메시지", en: "Messages" })} caption={t({ ko: "메시지", en: "Messages" })} />
        </Pair>
      </Section>

      <Section tone="bleed">
        <Shot src={`${A}/launchpad.webp`} alt="Launchpad" />
      </Section>

      <Section tone="tint">
        <SectionHead
          viewLang={viewLang}
          no="04"
          title={{ ko: "Launchpad 안의 앱들", en: "Inside the Launchpad" }}
          body={{
            ko: "Dock 에 다 못 올린 앱은 Launchpad 에 모았습니다. 하나하나가 실제 데이터를 다루는 작은 앱입니다.",
            en: "Apps that did not fit in the Dock live in the Launchpad. Each one is a small app working on real data.",
          }}
        />
        <Prose
          viewLang={viewLang}
          items={[
            {
              label: { ko: "날씨", en: "Weather" },
              body: {
                ko: "도시를 검색해 시간별 · 열흘 예보, 체감 온도, 습도, 바람을 봅니다. 데이터는 API 키가 필요 없는 Open-Meteo 에서 받습니다.",
                en: "Search a city for hourly and ten-day forecasts, feels-like temperature, humidity and wind. Data comes from Open-Meteo, which needs no API key.",
              },
            },
            {
              label: { ko: "활동 상태 보기", en: "Activity Monitor" },
              body: {
                ko: "방문 · 순방문자 · 앱 열기 · 머문 시간, 유입 경로, 지역 · 기기, 실시간 접속과 서버 상태를 봅니다. 방문자는 쿠키 없이 날마다 바뀌는 해시로 셉니다.",
                en: "Visits, unique visitors, app opens, time spent, referrers, regions, devices, live sessions and server health. Visitors are counted with a daily hash, without cookies.",
              },
            },
            {
              label: { ko: "API 문서 · 텍스트 편집기", en: "API docs and TextEdit" },
              body: {
                ko: "백엔드의 OpenAPI 문서를 앱으로 열어 엔드포인트마다 요청 · 응답 예시를 봅니다. 이력서는 Markdown 한 장이라, 텍스트 편집기에서 미리보기로 읽고 PDF 로 받습니다.",
                en: "The backend's OpenAPI reference opens as an app with request and response samples per endpoint. The résumé is a single Markdown file, read in TextEdit's preview and downloadable as PDF.",
              },
            },
            {
              label: { ko: "팁 · 다른 작업물", en: "Tips and other projects" },
              body: {
                ko: "처음 온 방문자에게는 Dock · 메뉴 막대 · 이력서를 짚어 주는 1분 둘러보기가 뜨고, 팁 앱에서 주제별 팁을 다시 봅니다. 새싹 농장(게임)과 NewPick(AI 뉴스레터) 같은 다른 작업물은 창 안에서 바로 실행합니다.",
                en: "First-time visitors get a one-minute tour of the Dock, menu bar and résumé, and Tips keeps the topics for later. Other projects such as SproutFarm (a game) and NewPick (an AI newsletter) run right in a window.",
              },
            },
          ]}
        />
        <Gallery
          items={[
            { src: `${A}/weather.webp`, alt: t({ ko: "날씨", en: "Weather" }) },
            { src: `${A}/activity.webp`, alt: t({ ko: "활동 상태 보기", en: "Activity Monitor" }) },
            { src: `${A}/apidocs.webp`, alt: t({ ko: "API 문서", en: "API docs" }) },
            { src: `${A}/textedit.webp`, alt: t({ ko: "텍스트 편집기", en: "TextEdit" }) },
            { src: `${A}/tips.webp`, alt: t({ ko: "팁", en: "Tips" }) },
            { src: `${A}/sproutfarm.webp`, alt: "SproutFarm" },
            { src: `${A}/newpick.webp`, alt: "NewPick" },
            { src: `${A}/github.webp`, alt: "GitHub" },
            { src: `${A}/mail.webp`, alt: t({ ko: "메일", en: "Mail" }) },
          ]}
        />
      </Section>

      <Section tone="base">
        <SectionHead
          viewLang={viewLang}
          no="05"
          title={{ ko: "Safari 탭마다 프로젝트 하나", en: "One project per Safari tab" }}
          body={{
            ko: "작업물은 Safari 에서 열립니다. HYEONIVERSE 탭은 배포한 사이트를 iframe 으로 그대로 불러와, 창 안에서 다른 포트폴리오를 직접 써 볼 수 있습니다.",
            en: "Projects open in Safari. The HYEONIVERSE tab loads the deployed site in an iframe, so you can use the other portfolio right inside the window.",
          }}
        />
        <Pair>
          <Shot size="wide" src={`${A}/safari.webp`} alt="Safari" caption={t({ ko: "작업물 소개 탭", en: "Project tab" })} />
          <Shot size="wide" src={`${A}/hyeoniverse.webp`} alt={t({ ko: "Safari 에 열린 HYEONIVERSE", en: "HYEONIVERSE open in Safari" })} caption={t({ ko: "HYEONIVERSE 를 창 안에서", en: "HYEONIVERSE inside the window" })} />
        </Pair>
      </Section>

      <Section tone="dark">
        <SectionHead
          viewLang={viewLang}
          no="06"
          title={{ ko: "서버까지 직접, 운영비 0원", en: "Running the server too, for $0" }}
          body={{
            ko: "프론트엔드는 Cloudflare Workers, 백엔드는 Oracle Cloud 무료 VM 위의 Docker Compose 입니다. 포트를 하나도 열지 않고 Cloudflare Tunnel 로만 요청을 받습니다.",
            en: "The frontend runs on Cloudflare Workers, the backend on Docker Compose on a free Oracle Cloud VM. No ports are open; requests arrive only through a Cloudflare Tunnel.",
          }}
        />
        <Prose
          viewLang={viewLang}
          items={[
            {
              label: { ko: "기술", en: "Stack" },
              body: {
                ko: "React 19 · Vite · TypeScript 로 데스크톱을 그리고, NestJS · Prisma 7 · PostgreSQL 로 글 · 방명록 · 통계를 저장합니다. 푸시하면 GitHub Actions 가 검사하고 배포합니다.",
                en: "React 19, Vite and TypeScript draw the desktop; NestJS, Prisma 7 and PostgreSQL store posts, the guestbook and stats. GitHub Actions checks and deploys on every push.",
              },
            },
            {
              label: { ko: "터미널", en: "Terminal" },
              body: {
                ko: "터미널에서는 help · whoami · neofetch · skills · projects 로 저에 대해 알아보고, open memo 처럼 앱을 엽니다. 휴대폰에서는 명령을 눌러 실행하는 단축어로 바뀝니다.",
                en: "In Terminal, help, whoami, neofetch, skills and projects tell you about me, and open memo launches an app. On a phone it becomes Shortcuts, where commands run with a tap.",
              },
            },
          ]}
        />
        <Pair>
          <Shot size="wide" src={`${A}/terminal.webp`} alt={t({ ko: "터미널", en: "Terminal" })} caption={t({ ko: "터미널", en: "Terminal" })} />
          <Shot size="wide" src={`${A}/settings.webp`} alt={t({ ko: "시스템 설정", en: "System Settings" })} caption={t({ ko: "시스템 설정 — 화면 모드 · 배경화면 · 관리자 계정", en: "System Settings — appearance, wallpaper, admin account" })} />
        </Pair>
      </Section>

      <Section tone="tint">
        <SectionHead
          viewLang={viewLang}
          no="07"
          title={{ ko: "휴대폰으로 열면, iOS 홈 화면", en: "On a phone, an iOS home screen" }}
          body={{
            ko: "작은 화면에서 창을 끌어 옮기는 건 불편합니다. 그래서 휴대폰에서는 같은 앱을 iOS 홈 화면처럼 아이콘으로 늘어놓고, 누르면 화면 전체로 엽니다.",
            en: "Dragging windows on a small screen is awkward, so on a phone the same apps are laid out as an iOS home screen and open full screen.",
          }}
        />
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
