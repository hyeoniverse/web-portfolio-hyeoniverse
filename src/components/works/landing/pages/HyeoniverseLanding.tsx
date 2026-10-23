"use client";

import type { Project } from "@/data/projects";
import { Flow, Frame, LandingShell, Marquee, Note, Numbers, PhoneFlip, Sequence, type Lang, type L10n } from "../kit/LandingKit";

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
          title={{ ko: "스크롤에 반응하는 첫 화면", en: "A home that reacts to the scroll" }}
          body={{
            ko: "스크롤하는 만큼 큰 글자가 흩어지고, 3D 도넛이 화면 안을 떠다니며 작업물 · 글 · 프로필로 이어집니다.",
            en: "Big type scatters as you scroll, a 3D torus drifts across the screen, and the page leads on to works, writing and the profile.",
          }}
        />
        <Frame at="wide" video={`${A}/home.mp4`} src={`${A}/home-light.webp`} alt={t({ ko: "홈을 스크롤하는 녹화", en: "Recording: scrolling the home page" })} />

        <Note
          viewLang={viewLang}
          no="02"
          title={{ ko: "작업물을 여섯 가지 모양으로", en: "Works in six shapes" }}
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
          title={{ ko: "쓴 글이 다시 읽히도록", en: "So that writing gets read again" }}
          body={{
            ko: "글은 쓰는 순간보다 나중에 다시 찾힐 때 쓸모가 생깁니다. 시리즈로 이어 읽고, 초성으로 태그를 거르고, 날짜로 거슬러 오르고, 매일의 기록은 별자리로 쌓습니다.",
            en: "Writing earns its keep when it's found again later — read a series in order, filter tags by initial, walk back through the timeline, and stack daily notes into constellations.",
          }}
        />
        <Frame at="bleed" src={`${A}/blog2-home.webp`} alt={t({ ko: "블로그 첫 화면 — 넘겨 보는 글 표지", en: "Blog home — a carousel of post covers" })} />
        <Frame at="right" src={`${A}/blog2-series.webp`} alt={t({ ko: "시리즈 — 차례대로 이어 읽기", en: "Series — read in order" })} />
        <Frame at="left" src={`${A}/blog2-tags.webp`} alt={t({ ko: "태그 — 초성으로 거르기", en: "Tags — filter by initial" })} />
        <Frame at="center" src={`${A}/blog2-history.webp`} alt={t({ ko: "기록 — 해 · 달로 거슬러 오르는 타임라인", en: "History — a timeline by year and month" })} />
        <Frame at="wide" src={`${A}/blog2-til.webp`} alt={t({ ko: "TIL — 하루 한 칸 잔디와 열두 달 별자리", en: "TIL — a square a day and twelve monthly constellations" })} />
        <Frame at="bleed" video={`${A}/planetarium.mp4`} src={`${A}/blog2-planetarium.webp`} alt={t({ ko: "TIL 플라네타리움 — 한 해가 밤하늘로 펼쳐진다", en: "TIL planetarium — the year as a night sky" })} />
        <Frame at="right" src={`${A}/blog2-post-top.webp`} alt={t({ ko: "글 — 공유 · 듣기 · 언어 바꾸기 · 관련 작업물 · 시리즈", en: "Post — share, listen, language, related work and series" })} />

        <Note
          viewLang={viewLang}
          no="05"
          title={{ ko: "한국어로 쓰고, 어느 언어로든 읽히게", en: "Written in Korean, read in any language" }}
          body={{
            ko: "화면 글은 KO · EN 버튼 하나로 바뀌고, 🌐 메뉴로는 사이트 전체를 다른 언어로 볼 수 있습니다. 글 한 편도 언어를 골라 그 자리에서 옮겨 읽습니다.",
            en: "UI text flips with one KO · EN button, and the 🌐 menu shows the whole site in another language. A single post can be switched and translated in place, too.",
          }}
        />
        <Frame at="bleed" src={`${A}/lang-home-ja.webp`} alt={t({ ko: "일본어로 본 첫 화면", en: "The home page in Japanese" })} />
        <Frame at="left" src={`${A}/lang-works-fr.webp`} alt={t({ ko: "프랑스어로 본 작업물", en: "Works in French" })} />
        <Frame at="right" src={`${A}/lang-profile-de.webp`} alt={t({ ko: "독일어로 본 프로필", en: "The profile in German" })} />
        <Frame at="center" src={`${A}/lang-series-it.webp`} alt={t({ ko: "이탈리아어로 본 시리즈 — 글 제목 · 요약까지", en: "A series in Italian — down to post titles and summaries" })} />
        <Frame at="wide" src={`${A}/lang-til-es.webp`} alt={t({ ko: "스페인어로 본 TIL", en: "TIL in Spanish" })} />

        <Note
          viewLang={viewLang}
          no="06"
          title={{ ko: "글만 쓰면, 나머지는 AI 가", en: "Just write — AI does the rest" }}
          body={{
            ko: "글을 저장하면 AI 가 요약을 블록으로 정리하고, 방문자에게는 글을 소리로 읽어 줍니다. 작업물 슬라이드에는 대본만 적으면 해설 음성이 입혀지고, 다른 언어로 옮기는 일은 05 처럼 맡깁니다. 기능마다 공급자를 줄 세워 두어 한 곳이 실패하면 다음 곳이 이어받고, 호출은 모두 기록에 남습니다.",
            en: "Save a post and AI lays out its summary in blocks, and reads the post aloud to visitors. Write a script for a work's slides and a narration voice is added; translation is handed off as in 05. Each feature lines up several providers so the next takes over when one fails, and every call is logged.",
          }}
        />
        <Frame at="wide" src={`${A}/ai-post-summary.webp`} alt={t({ ko: "글의 AI 요약 — 핵심 · 검증 위치 · 주의 · 키워드를 블록으로", en: "A post's AI summary — key point, checks, caution and keywords as blocks" })} />
        <Frame at="right" src={`${A}/ai-editor-summary.webp`} alt={t({ ko: "편집기 — 저장하면 생기는 AI 요약, 다시 만들기 한 번", en: "Editor — the AI summary made on save, regenerated with one button" })} />
        <Frame at="left" src={`${A}/ai-listen.webp`} alt={t({ ko: "듣기 — 글을 소리로 읽어 준다", en: "Listen — the post read aloud" })} />
        <Frame at="wide" src={`${A}/ai-narration.webp`} alt={t({ ko: "작업물 갤러리 — 슬라이드마다 대본, 음성 만들기로 해설 음성(18/18)", en: "Work gallery — a script per slide, narration voiced with one button (18/18)" })} />
        <Frame at="center" src={`${A}/ai-chain-summary.webp`} width={2280} height={790} alt={t({ ko: "요약 공급자 순서 — 실패하면 다음 모델로", en: "Summary providers in order — on failure, the next model" })} />
        <Frame at="right" src={`${A}/ai-chain-tts.webp`} width={2280} height={750} alt={t({ ko: "음성 공급자 순서 — Fish Audio 다음 Edge TTS", en: "Voice providers in order — Fish Audio, then Edge TTS" })} />
        <Frame at="left" src={`${A}/ai-service-log.webp`} alt={t({ ko: "서비스 호출 기록 — 공급자마다 성공 · 실패를 남긴다", en: "Service call log — success and failure recorded per provider" })} />

        <Note
          viewLang={viewLang}
          no="07"
          title={{ ko: "시각과 날씨에 따라 바뀌는 About", en: "An About that changes with your time and weather" }}
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
        <Frame at="bleed" src={`${A}/api-map.webp`} alt={t({ ko: "API 지도 — 엔드포인트 203개가 /api 태양을 도는 별자리", en: "API map — 203 endpoints as stars around the /api sun" })} />
        <Frame at="wide" video={`${A}/api-journey.mp4`} src={`${A}/api-journey-poster.webp`} alt={t({ ko: "API 지도 — 작업물 수정 요청이 브라우저 → 프록시 → 로그인 → 검사 → DB → 알림 · 캐시 → 응답 정거장을 따라 도는 녹화", en: "API map — a 'save work' request travelling browser → proxy → login → checks → DB → notify and cache → response" })} />
        <Frame at="right" src={`${A}/api-map-group.webp`} alt={t({ ko: "API 지도 — 묶음 하나의 엔드포인트 · 접근 등급 · 테이블", en: "API map — one group's endpoints, access levels and tables" })} />
        <Frame at="wide" src={`${A}/chapter-architecture-4.webp`} alt={t({ ko: "구조 — 요청이 지나가는 길을 별자리로", en: "Architecture — a request's path as a constellation" })} />
        <Frame at="left" src={`${A}/chapter-design-0.webp`} alt={t({ ko: "디자인 — 토큰 몇 백 개로 그린 화면", en: "Design — screens drawn from a few hundred tokens" })} />
        <Frame at="right" src={`${A}/chapter-design-2.webp`} alt={t({ ko: "디자인 — 같은 회색도 뜻이 다르면 이름이 다르다", en: "Design — same grey, different meaning, different name" })} />
        <Frame at="wide" src={`${A}/chapter-code-1.webp`} alt={t({ ko: "코드 — 3D 스크롤 토러스, 코드와 실행 화면", en: "Code — 3D scroll torus, code and live preview" })} />
        <Frame at="left" src={`${A}/chapter-code-3.webp`} alt={t({ ko: "코드 — 속도를 맞춘 스냅 곡선", en: "Code — velocity-matched snap curve" })} />
        <Frame at="right" src={`${A}/chapter-features-2.webp`} alt={t({ ko: "기능 — 읽는 사람이 보는 곳", en: "Features — what readers see" })} />
        <Frame at="center" src={`${A}/chapter-making-5.webp`} alt={t({ ko: "만든 과정 — 8단계 계단", en: "Making — eight stages as steps" })} />

        <Note
          viewLang={viewLang}
          no="08"
          title={{ ko: "스크롤을 따라 옆으로 펼쳐지는 프로필", en: "A profile that unfolds sideways as you scroll" }}
          body={{
            ko: "아래로 굴리면 화면이 옆으로 흐르며, 마스코트 몽이의 인사 · 창처럼 겹친 사진 · GitHub 활동 · 고정한 저장소 · 경력이 차례로 지나갑니다.",
            en: "Scroll down and the page runs sideways — Mongi's hello, photos stacked like windows, GitHub activity, pinned repos and experience pass by in turn.",
          }}
        />
        <Frame at="bleed" video={`${A}/profile.mp4`} src={`${A}/profile-poster.webp`} alt={t({ ko: "프로필을 스크롤하는 녹화", en: "Recording: scrolling the profile" })} />

        <Note
          viewLang={viewLang}
          no="09"
          title={{ ko: "휴대폰에서도 같은 경험", en: "The same experience on a phone" }}
          body={{
            ko: "모든 화면을 휴대폰 폭에서 따로 다듬었습니다. 메뉴는 화면 전체로 열리고, 표와 코드는 옆으로 넘겨 읽습니다.",
            en: "Every screen was tuned at phone width — the menu opens full screen, and tables and code scroll sideways.",
          }}
        />
        <PhoneFlip
          items={[
            { src: `${A}/mobile-home.webp`, video: `${A}/mobile-home.mp4`, alt: t({ ko: "홈", en: "Home" }), route: "/" },
            { src: `${A}/mobile-menu.webp`, video: `${A}/mobile-menu.mp4`, alt: t({ ko: "메뉴", en: "Menu" }), route: "/ · menu" },
            { src: `${A}/mobile-works.webp`, video: `${A}/mobile-works.mp4`, alt: t({ ko: "작업물", en: "Works" }), route: "/works" },
            { src: `${A}/mobile-about.webp`, video: `${A}/mobile-about.mp4`, alt: "About", route: "/about" },
            { src: `${A}/mobile-profile.webp`, video: `${A}/mobile-profile.mp4`, alt: t({ ko: "프로필", en: "Profile" }), route: "/profile" },
            { src: `${A}/mobile-home-dark.webp`, video: `${A}/mobile-home-dark.mp4`, alt: t({ ko: "홈 — 다크", en: "Home — dark" }), route: "/ · dark" },
            { src: `${A}/mobile-design-system.webp`, video: `${A}/mobile-design-system.mp4`, alt: t({ ko: "디자인 시스템", en: "Design system" }), route: "/design-system" },
            { src: `${A}/mobile-posts.webp`, video: `${A}/mobile-posts.mp4`, alt: t({ ko: "블로그", en: "Blog" }), route: "/posts" },
            { src: `${A}/mobile-post.webp`, video: `${A}/mobile-post.mp4`, alt: t({ ko: "글", en: "Post" }), route: "/posts/[slug]" },
            { src: `${A}/mobile-post-body.webp`, video: `${A}/mobile-post-body.mp4`, alt: t({ ko: "글 — 요약과 목차", en: "Post — summary and contents" }), route: "/posts/[slug] · AI" },
            { src: `${A}/mobile-series.webp`, video: `${A}/mobile-series.mp4`, alt: t({ ko: "시리즈", en: "Series" }), route: "/posts/series" },
            { src: `${A}/mobile-tags.webp`, video: `${A}/mobile-tags.mp4`, alt: t({ ko: "태그", en: "Tags" }), route: "/posts/tags" },
            { src: `${A}/mobile-history.webp`, video: `${A}/mobile-history.mp4`, alt: t({ ko: "기록", en: "History" }), route: "/posts/history" },
            { src: `${A}/mobile-til.webp`, video: `${A}/mobile-til.mp4`, alt: "TIL", route: "/posts/til" },
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
