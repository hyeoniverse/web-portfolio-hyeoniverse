"use client";

import type { Project } from "@/data/projects";
import { Flow, Frame, LandingShell, Marquee, Note, Numbers, Phones, Sequence, type Lang, type L10n } from "../kit/LandingKit";

/** 테마 프리셋 이름 — 설정 화면의 THEME_PRESETS 순서(캡처 theme-light-00 … 17 · theme-dark-00 … 17 과 같다) */
const THEME_PRESETS = ["Default", "Ruby", "Meadow", "Coral", "Azure", "Sand", "Harvest", "Honey", "Forest", "Rosewood", "Dusk", "Arctic", "Baltic", "Sorbet", "Twilight", "Tropica", "Petal", "Slate"];

/**
 * HYEONIVERSE 전용 랜딩 페이지 — andreasantonsson.dev/project/synthetic-theatre 처럼 이미지가 중심이다.
 * 강한 장면만 화면 폭 전체로, 나머지는 한 장씩 폭 · 위치를 바꿔 가며 잇는다(격자 · 카드로 늘어놓지 않는다). 글은 묶음마다 번호 · 제목 · 한 줄뿐.
 * 게시물(블로그 글 · 글 목록 · 작업물 상세)은 보여 주지 않는다 — 사이트를 이루는 화면과 장치를 보여 준다.
 * 화면은 모두 이 페이지를 위해 배포한 사이트(www.hyeoniverse.com)에서 2배 해상도로 새로 찍은 캡처 · 녹화다
 * (content/works/hyeoniverse/landing). 레이아웃 여섯은 녹화, 테마는 프리셋 열여덟 벌을 입힌 실제 홈 화면이 흐르는 띠. 숫자는 이 저장소에서 센 값이다.
 */
const A = "/content/works/hyeoniverse/landing";

export default function HyeoniverseLanding({ project, viewLang, next }: {
  project: Project; viewLang: Lang; next?: { href: string; title: string } | null;
}) {
  const t = (v: L10n) => v[viewLang];
  return (
    <LandingShell
      project={project}
      viewLang={viewLang}
      next={next}
      eyebrow={{ ko: "디자인 시스템부터 관리자 CMS 까지, 혼자 설계하고 운영하는 포트폴리오", en: "A portfolio designed and run solo, from the design system to the admin CMS" }}
    >
      <Flow>
        <Frame at="bleed" priority src={`${A}/home-light.webp`} alt={t({ ko: "홈 첫 화면", en: "Home" })} />

        <Note
          viewLang={viewLang}
          no="01"
          title={{ ko: "스크롤에 답하는 첫 화면", en: "A home that answers the scroll" }}
          body={{
            ko: "스크롤하는 만큼 큰 글자가 흩어지고, 3D 도넛이 화면 안을 떠다니며 작업물 · 글 · 프로필로 이어집니다.",
            en: "Big type scatters as you scroll, a 3D torus drifts across the screen, and the page leads on to works, writing and the profile.",
          }}
        />
        <Frame at="wide" video={`${A}/home.mp4`} src={`${A}/home-light.webp`} alt={t({ ko: "홈을 스크롤하는 녹화", en: "Recording: scrolling the home page" })} />

        <Note
          viewLang={viewLang}
          no="02"
          title={{ ko: "작업물은 여섯 가지 모양으로 흐른다", en: "Works flow in six shapes" }}
          body={{
            ko: "Cylinder · Grid · Fullscreen · Flow · Cinematic · Split. 관리자 설정 하나로 바꿔 끼웁니다 — 실제 화면을 그대로 녹화했습니다.",
            en: "Cylinder, Grid, Fullscreen, Flow, Cinematic and Split, swapped with one admin setting — recorded from the real screens.",
          }}
        />
        <Frame at="wide" video={`${A}/works-cylinder.mp4`} src={`${A}/works-cylinder-poster.webp`} alt={t({ ko: "Cylinder — 스크롤하면 3D 원통이 돈다", en: "Cylinder — the 3D cylinder turns with the scroll" })} />
        <Frame at="left" video={`${A}/works-grid.mp4`} src={`${A}/works-grid-poster.webp`} alt={t({ ko: "Grid — 마우스를 올린 칸의 행과 열이 커진다", en: "Grid — the hovered cell's row and column grow" })} />
        <Frame at="right" video={`${A}/works-fullscreen.mp4`} src={`${A}/works-fullscreen-poster.webp`} alt={t({ ko: "Fullscreen — 한 화면에 작업물 하나", en: "Fullscreen — one work per screen" })} />
        <Frame at="center" video={`${A}/works-flow.mp4`} src={`${A}/works-flow-poster.webp`} alt={t({ ko: "Flow — 카드 띠가 끝없이 돌아온다(순환 스크롤)", en: "Flow — the card strip loops endlessly" })} />
        <Frame at="left" video={`${A}/works-cinematic.mp4`} src={`${A}/works-cinematic-poster.webp`} alt={t({ ko: "Cinematic — 한 번 굴리면 한 판, 끝나면 다시 처음 판", en: "Cinematic — one scroll, one panel, looping back to the first" })} />
        <Frame at="right" video={`${A}/works-split.mp4`} src={`${A}/works-split-poster.webp`} alt={t({ ko: "Split — 글과 그림을 반씩 나눈 판", en: "Split — panels split between text and image" })} />

        <Note
          viewLang={viewLang}
          no="03"
          title={{ ko: "같은 화면, 다른 테마", en: "Same screens, different themes" }}
          body={{
            ko: "테마는 의미 토큰이 가리키는 값만 바꿉니다. 프리셋 열여덟 벌을 모두 입힌 실제 홈 화면 — 윗줄 라이트, 아랫줄 다크.",
            en: "Themes only swap what the semantic tokens point to. The real home page in all eighteen presets — light on top, dark below.",
          }}
        />
        <Marquee
          rows={[
            THEME_PRESETS.map((name, i) => ({ src: `${A}/theme-light-${String(i).padStart(2, "0")}.webp`, alt: t({ ko: `${name} — 라이트`, en: `${name} — light` }) })),
            THEME_PRESETS.map((name, i) => ({ src: `${A}/theme-dark-${String(i).padStart(2, "0")}.webp`, alt: t({ ko: `${name} — 다크`, en: `${name} — dark` }) })),
          ]}
        />
        <Frame at="left" src={`${A}/design-system.webp`} alt={t({ ko: "디자인 시스템 — 원칙", en: "Design system — principles" })} />
        <Frame at="right" src={`${A}/design-system-2.webp`} alt={t({ ko: "디자인 시스템 — 색", en: "Design system — colours" })} />

        <Note
          viewLang={viewLang}
          no="04"
          title={{ ko: "블로그 — 모든 화면", en: "The blog — every screen" }}
          body={{
            ko: "blog.hyeoniverse.com 의 아홉 갈래 길. 글 목록(레이아웃 일곱 가지) · 기록 · 카테고리 · 시리즈 · 태그 · TIL · 글 한 편까지.",
            en: "Nine routes on blog.hyeoniverse.com — the post list in seven layouts, history, categories, series, tags, TIL and the post page.",
          }}
        />
        <Frame at="bleed" src={`${A}/blog-posts-magazine.webp`} alt={t({ ko: "글 목록 — Magazine", en: "Posts — Magazine" })} />
        <Frame at="left" src={`${A}/blog-posts-journal.webp`} alt={t({ ko: "글 목록 — Journal", en: "Posts — Journal" })} />
        <Frame at="right" src={`${A}/blog-posts-grid.webp`} alt={t({ ko: "글 목록 — Grid", en: "Posts — Grid" })} />
        <Frame at="center" src={`${A}/blog-posts-masonry.webp`} alt={t({ ko: "글 목록 — Masonry", en: "Posts — Masonry" })} />
        <Frame at="left" src={`${A}/blog-posts-featured.webp`} alt={t({ ko: "글 목록 — Featured", en: "Posts — Featured" })} />
        <Frame at="right" src={`${A}/blog-posts-compact.webp`} alt={t({ ko: "글 목록 — Compact", en: "Posts — Compact" })} />
        <Frame at="wide" src={`${A}/blog-posts-blog.webp`} alt={t({ ko: "글 목록 — Blog", en: "Posts — Blog" })} />
        <Frame at="right" src={`${A}/blog-history.webp`} alt={t({ ko: "기록 — 시간순", en: "History — timeline" })} />
        <Frame at="left" src={`${A}/blog-categories.webp`} alt={t({ ko: "카테고리", en: "Categories" })} />
        <Frame at="center" src={`${A}/blog-series.webp`} alt={t({ ko: "시리즈 목록", en: "Series" })} />
        <Frame at="wide" src={`${A}/blog-series-detail.webp`} alt={t({ ko: "시리즈 — 차례대로 이어 읽기", en: "Series — read in order" })} />
        <Frame at="left" src={`${A}/blog-tags.webp`} alt={t({ ko: "태그 — 초성으로 거르기", en: "Tags — filter by initial" })} />
        <Frame at="right" src={`${A}/blog-tag.webp`} alt={t({ ko: "태그 하나", en: "One tag" })} />
        <Frame at="center" src={`${A}/til.webp`} alt={t({ ko: "TIL — 열두 달 별자리와 잔디", en: "TIL — monthly constellations and the grid" })} />
        <Frame at="bleed" video={`${A}/planetarium.mp4`} src={`${A}/til-planetarium.webp`} alt={t({ ko: "TIL 플라네타리움 — 별자리 하늘을 끌어 둘러보는 녹화", en: "TIL planetarium — dragging around the sky" })} />
        <Frame at="right" src={`${A}/til-planetarium-2.webp`} alt={t({ ko: "플라네타리움 — 다른 방향", en: "Planetarium — another direction" })} />
        <Frame at="bleed" src={`${A}/blog-post-top.webp`} alt={t({ ko: "글 — 표지 · 제목 · 공유 · 듣기 · 언어", en: "Post — cover, title, share, listen, language" })} />
        <Frame at="left" src={`${A}/blog-post-body-1.webp`} alt={t({ ko: "글 — AI 요약 · 따라오는 목차 · 시리즈", en: "Post — AI summary, following contents, series" })} />
        <Frame at="right" src={`${A}/blog-post-body-2.webp`} alt={t({ ko: "글 — 표와 다이어그램", en: "Post — tables and diagrams" })} />
        <Frame at="center" src={`${A}/blog-post-end.webp`} alt={t({ ko: "글 끝 — 관련 작업물 · 댓글", en: "Post end — related project, comments" })} />

        <Note
          viewLang={viewLang}
          no="05"
          title={{ ko: "하늘은 방문자의 시각과 날씨를 따른다", en: "The sky follows your time and weather" }}
          body={{
            ko: "About 의 배경은 방문자 시계로 새벽부터 밤까지 일곱 단계를 지나고, 그 도시의 날씨(Open-Meteo)에 따라 구름 · 안개 · 비 · 눈 · 뇌우가 내립니다. 스크롤하면 하루가 흐릅니다.",
            en: "The About background moves through seven stages from dawn to night by your clock, and clouds, fog, rain, snow or storms fall with your city's weather (Open-Meteo). Scroll to pass the day.",
          }}
        />
        <Sequence
          items={[
            { src: `${A}/sky-01-dawn.webp`, label: t({ ko: "05:40 새벽", en: "05:40 Dawn" }) },
            { src: `${A}/sky-02-sunrise.webp`, label: t({ ko: "06:25 해돋이", en: "06:25 Sunrise" }) },
            { src: `${A}/sky-03-morning.webp`, label: t({ ko: "08:30 아침", en: "08:30 Morning" }) },
            { src: `${A}/sky-04-day.webp`, label: t({ ko: "12:30 한낮", en: "12:30 Midday" }) },
            { src: `${A}/sky-05-dusk.webp`, label: t({ ko: "18:12 노을", en: "18:12 Sunset" }) },
            { src: `${A}/sky-06-evening.webp`, label: t({ ko: "19:12 저녁", en: "19:12 Blue hour" }) },
            { src: `${A}/sky-07-night.webp`, label: t({ ko: "22:30 밤", en: "22:30 Night" }) },
            { src: `${A}/sky-w1-cloudy.webp`, label: t({ ko: "흐림 · 한낮", en: "Cloudy · midday" }) },
            { src: `${A}/sky-w2-fog.webp`, label: t({ ko: "안개 · 아침", en: "Fog · morning" }) },
            { src: `${A}/sky-w3-rain.webp`, label: t({ ko: "비 · 한낮", en: "Rain · midday" }) },
            { src: `${A}/sky-w4-snow.webp`, label: t({ ko: "눈 · 저녁", en: "Snow · blue hour" }) },
            { src: `${A}/sky-w5-storm.webp`, label: t({ ko: "뇌우 · 밤", en: "Storm · night" }) },
          ].map(({ src, label }) => ({ src, alt: t({ ko: `About 하늘 — ${label}`, en: `About sky — ${label}` }) }))}
        />
        <Frame at="wide" src={`${A}/chapter-architecture-4.webp`} alt={t({ ko: "구조 — 요청이 지나가는 길을 별자리로", en: "Architecture — a request's path as a constellation" })} />
        <Frame at="right" src={`${A}/chapter-ai-3.webp`} alt={t({ ko: "AI — 제목 한 줄로 커버 만들기", en: "AI — a cover from one title line" })} />
        <Frame at="left" src={`${A}/chapter-design-0.webp`} alt={t({ ko: "디자인 — 토큰 몇 백 개로 그린 화면", en: "Design — screens drawn from a few hundred tokens" })} />
        <Frame at="right" src={`${A}/chapter-design-2.webp`} alt={t({ ko: "디자인 — 같은 회색도 뜻이 다르면 이름이 다르다", en: "Design — same grey, different meaning, different name" })} />
        <Frame at="wide" src={`${A}/chapter-code-1.webp`} alt={t({ ko: "코드 — 3D 스크롤 토러스, 코드와 실행 화면", en: "Code — 3D scroll torus, code and live preview" })} />
        <Frame at="left" src={`${A}/chapter-code-3.webp`} alt={t({ ko: "코드 — 속도를 맞춘 스냅 곡선", en: "Code — velocity-matched snap curve" })} />
        <Frame at="right" src={`${A}/chapter-features-2.webp`} alt={t({ ko: "기능 — 읽는 사람이 보는 곳", en: "Features — what readers see" })} />
        <Frame at="center" src={`${A}/chapter-making-5.webp`} alt={t({ ko: "만든 과정 — 8단계 계단", en: "Making — eight stages as steps" })} />

        <Note
          viewLang={viewLang}
          no="06"
          title={{ ko: "프로필은 가로로 걷는다", en: "The profile walks sideways" }}
          body={{
            ko: "세로로 스크롤하면 화면은 가로로 흐릅니다. 마스코트 몽이가 인사하고, 창처럼 겹친 사진을 지나 경력으로 이어집니다.",
            en: "Scroll down and the page travels sideways — Mongi says hello, then photo windows lead into experience.",
          }}
        />
        <Frame at="wide" src={`${A}/profile-0.webp`} alt={t({ ko: "프로필 — Crafting Digital Experiences", en: "Profile — Crafting Digital Experiences" })} />
        <Frame at="right" src={`${A}/profile-3.webp`} alt={t({ ko: "몽이의 인사", en: "Mongi says hello" })} />
        <Frame at="left" src={`${A}/profile-5.webp`} alt={t({ ko: "창처럼 겹친 사진", en: "Photos as windows" })} />
        <Frame at="center" src={`${A}/profile-6.webp`} alt={t({ ko: "프로필", en: "Profile" })} />

        <Note
          viewLang={viewLang}
          no="07"
          title={{ ko: "구석에 있는 페이지도 같은 결로", en: "The quiet corners, in the same style" }}
          body={{
            ko: "연락하기 · 개인정보 처리방침 · 찾을 수 없는 페이지까지 같은 토큰과 글꼴로. 연락하기는 25MB 까지 첨부합니다.",
            en: "Contact, privacy policy and even the not-found page share the same tokens and type. Contact takes attachments up to 25 MB.",
          }}
        />
        <Frame at="right" src={`${A}/contact.webp`} alt={t({ ko: "연락하기", en: "Contact" })} />
        <Frame at="left" src={`${A}/not-found.webp`} alt={t({ ko: "찾을 수 없는 페이지", en: "Not found" })} />

        <Note viewLang={viewLang} no="08" title={{ ko: "휴대폰에서도 같은 화면", en: "The same screens on a phone" }} />
        <Phones
          items={[
            { src: `${A}/m-home.webp`, alt: t({ ko: "홈", en: "Home" }) },
            { src: `${A}/m-works.webp`, alt: t({ ko: "작업물", en: "Works" }) },
            { src: `${A}/m-til.webp`, alt: "TIL" },
            { src: `${A}/m-about.webp`, alt: "About" },
            { src: `${A}/m-profile.webp`, alt: "Profile" },
          ]}
        />

        <Numbers
          viewLang={viewLang}
          items={[
            { value: "139", label: { ko: "API 라우트", en: "API routes" } },
            { value: "1,343", label: { ko: "단위 테스트", en: "Unit tests" } },
            { value: "74", label: { ko: "DB 마이그레이션", en: "DB migrations" } },
            { value: "18", label: { ko: "테마 프리셋", en: "Theme presets" } },
          ]}
        />
      </Flow>
    </LandingShell>
  );
}
