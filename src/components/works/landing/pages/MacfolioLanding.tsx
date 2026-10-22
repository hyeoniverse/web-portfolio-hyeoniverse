"use client";

import type { Project } from "@/data/projects";
import { Flow, LandingShell, Numbers, Recording, Row, Shot, Statement, type Lang, type L10n } from "../kit/LandingKit";

/**
 * MacFolio 전용 랜딩 페이지 — andreasantonsson.dev/project/secret-level 처럼 화면이 이어지는 구성.
 * 화면은 모두 이 페이지를 위해 배포한 사이트(macfolio.hyeoniverse.com)에서 새로 찍은 캡처 · 녹화다(content/works/macfolio/landing).
 * 글은 화면 사이의 짧은 문장과 그림 아래 한 줄만. 내용 · 숫자는 MacFolio README 에서 옮겼다.
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
      <Shot variant="full" priority src={`${A}/desktop-light.jpg`} alt={t({ ko: "MacFolio 데스크톱 — 위젯 · 바탕화면 폴더 · Dock", en: "MacFolio desktop — widgets, desktop folders and the Dock" })} />

      <Flow>
        <Recording
          src={`${A}/desktop-tour.webm`}
          start={7.5}
          label={t({ ko: "Dock 에서 메모를 열고 창을 끌어 옮긴 뒤 음악을 여는 녹화", en: "Recording: open Notes from the Dock, drag the window, open Music" })}
          caption={t({ ko: "Dock 에서 앱을 열고, 창을 끌어 옮긴다. 배포한 사이트 그대로.", en: "Open apps from the Dock and drag windows around — the deployed site as is." })}
        />

        <Statement
          viewLang={viewLang}
          no="01"
          title={{ ko: "메모 앱이 곧 블로그다", en: "The Notes app is the blog" }}
          body={{ ko: "폴더는 분류, 메모는 글. 관리자로 로그인하면 글이 곧 편집기가 됩니다.", en: "Folders are categories, notes are posts. Signed in as admin, a note becomes the editor." }}
        />
        <Shot src={`${A}/memo-post.jpg`} alt={t({ ko: "메모 앱에 열린 개발기", en: "A dev note open in Notes" })} />
        <Shot src={`${A}/memo.jpg`} alt={t({ ko: "메모 앱 — 폴더 · 글 목록 · 본문", en: "Notes — folders, list and body" })} />
      </Flow>

      <Shot variant="strip" src={`${A}/desktop-dark.jpg`} alt={t({ ko: "다크 모드 데스크톱", en: "Desktop in dark mode" })} />

      <Flow>
        <Statement
          viewLang={viewLang}
          no="02"
          title={{ ko: "앱 20여 개가 창으로 열린다", en: "Twenty-odd apps open as windows" }}
          body={{ ko: "Finder 로 저장소 문서를 파일처럼 열고, 음악 · 사진 · 메시지 · 메일 · 터미널을 macOS 처럼 씁니다.", en: "Finder opens the repo's docs like files; Music, Photos, Messages, Mail and Terminal behave like macOS." }}
        />
        <Shot src={`${A}/finder.jpg`} alt="Finder" caption={t({ ko: "Finder — Macintosh HD › 사용자 › hyeoniverse › 문서", en: "Finder — Macintosh HD › Users › hyeoniverse › Documents" })} />
        <Shot src={`${A}/music.jpg`} alt={t({ ko: "음악 앱", en: "Music" })} caption={t({ ko: "음악 — 재생 목록 · 셔플 · 반복 · 대기열. 메뉴 막대와 위젯에서도 조작한다.", en: "Music — playlists, shuffle, repeat, queue; also controlled from the menu bar and widget." })} />
        <Shot src={`${A}/photos.jpg`} alt={t({ ko: "사진 앱", en: "Photos" })} />
        <Shot src={`${A}/messages.jpg`} alt={t({ ko: "메시지 앱", en: "Messages" })} />
        <Shot src={`${A}/mail.jpg`} alt={t({ ko: "메일 앱", en: "Mail" })} />
        <Shot src={`${A}/terminal.jpg`} alt={t({ ko: "터미널", en: "Terminal" })} />
      </Flow>

      <Shot variant="full" src={`${A}/launchpad.jpg`} alt="Launchpad" />

      <Flow>
        <Statement
          viewLang={viewLang}
          no="03"
          title={{ ko: "Safari 탭마다 프로젝트 하나", en: "One project per Safari tab" }}
          body={{ ko: "프로젝트마다 소개 페이지를 탭으로 넘겨 보고, 배포한 사이트는 Dock 에서 창 안에 바로 실행합니다.", en: "Each project has its own page in a tab; deployed sites run right inside a window from the Dock." }}
        />
        <Shot src={`${A}/safari.jpg`} alt="Safari" />
        <Shot src={`${A}/settings.jpg`} alt={t({ ko: "시스템 설정", en: "System Settings" })} />

        <Statement
          viewLang={viewLang}
          no="04"
          title={{ ko: "휴대폰으로 열면, iOS 홈 화면", en: "On a phone, it becomes an iOS home screen" }}
        />
        <Row
          items={[
            { src: `${A}/phone-home.jpg`, alt: t({ ko: "휴대폰 홈 화면", en: "Phone home screen" }) },
            { src: `${A}/phone-memo.jpg`, alt: t({ ko: "휴대폰에서 연 메모", en: "Notes on a phone" }) },
          ]}
        />

        <Numbers
          viewLang={viewLang}
          items={[
            { value: "20+", label: { ko: "창으로 열리는 앱", en: "Apps that open as windows" } },
            { value: "0원", label: { ko: "운영비", en: "Running cost (KRW)" } },
            { value: "0개", label: { ko: "열린 포트", en: "Open ports" } },
            { value: "200편+", label: { ko: "메모 앱의 개발기", en: "Dev notes in the Notes app" } },
          ]}
        />
      </Flow>
    </LandingShell>
  );
}
