"use client";

import type { Project } from "@/data/projects";
import { DemoStage, Gallery, LandingShell, Numbers, Pair, Phones, Prose, Recording, Section, SectionHead, Shot, type Lang, type L10n } from "../kit/LandingKit";

/**
 * HYEONIVERSE 전용 랜딩 페이지 — andreasantonsson.dev/project/secret-level 처럼 섹션마다 화면 폭 전체를 쓴다.
 * 화면은 모두 이 페이지를 위해 배포한 사이트(www.hyeoniverse.com · blog.hyeoniverse.com)에서 2배 해상도로 새로 찍은 캡처 · 녹화다
 * (content/works/hyeoniverse/landing). 홈 · 작업물 · 블로그 · TIL · About · Profile · 그 밖의 페이지 · 휴대폰까지 화면을 다 보여 준다.
 * 사이에 직접 만져 보는 데모 둘(테마 · 번역). 숫자는 이 저장소에서 센 값이다.
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
      <Section tone="bleed">
        <Recording src={`${A}/home.mp4`} poster={`${A}/home-light.webp`} label={t({ ko: "홈을 스크롤하는 녹화", en: "Recording: scrolling the home page" })} />
      </Section>

      <Section tone="base">
        <SectionHead
          viewLang={viewLang}
          no="01"
          title={{ ko: "만들고, 쓰고, 운영하는 한 곳", en: "One place to build, write and run" }}
          body={{
            ko: "작업물을 보여 주는 포트폴리오, 개발기를 쓰는 블로그, 매일 배운 것을 남기는 TIL, 이 모두를 고치는 관리자 CMS 를 한 저장소에서 만들었습니다.",
            en: "A portfolio for projects, a blog for dev notes, a TIL log for what I learn each day, and the admin CMS that edits all of them — built in one repository.",
          }}
        />
        <Prose
          viewLang={viewLang}
          items={[
            {
              label: { ko: "왜 직접 만들었나", en: "Why build it" },
              body: {
                ko: "템플릿이나 블로그 서비스를 쓰면 화면도 데이터도 남의 규칙을 따라야 합니다. 보는 화면과 쓰는 화면을 모두 직접 만들면, 글 하나를 고치는 흐름부터 페이지가 그려지는 속도까지 원하는 기준으로 맞출 수 있습니다.",
                en: "With a template or a hosted blog, both the screens and the data follow someone else's rules. Building the reading side and the writing side myself lets me set the bar for everything, from editing a post to how fast a page paints.",
              },
            },
            {
              label: { ko: "기술", en: "Stack" },
              body: {
                ko: "Next.js 16 · React 19 · TypeScript, 스타일은 CSS Modules 와 디자인 토큰. 데이터는 Supabase(PostgreSQL)에 두고 RLS 정책으로 지킵니다. 움직임은 GSAP · Lenis · Framer Motion, 3D 는 Three.js 로 그리고 Vercel 에 배포합니다.",
                en: "Next.js 16, React 19 and TypeScript, styled with CSS Modules and design tokens. Data lives in Supabase (PostgreSQL), guarded by RLS policies. Motion uses GSAP, Lenis and Framer Motion, 3D uses Three.js, and it ships on Vercel.",
              },
            },
          ]}
        />
        <Shot size="wide" src={`${A}/about-0.webp`} alt={t({ ko: "About 첫 화면 — 별자리로 고르는 챕터", en: "About opening — chapters picked from a constellation" })} />
      </Section>

      <Section tone="tint">
        <SectionHead
          viewLang={viewLang}
          no="02"
          title={{ ko: "작업물은 여섯 가지 모양으로 흐른다", en: "Works flow in six shapes" }}
          body={{
            ko: "같은 작업물 목록을 Cylinder · Flow · Grid · Fullscreen · Cinematic · Split 로 보여 줍니다. 관리자 설정 하나로 바꿔 끼우고, 코드는 고치지 않습니다.",
            en: "The same list of works renders as Cylinder, Flow, Grid, Fullscreen, Cinematic or Split. One admin setting swaps them; no code changes.",
          }}
        />
        <Recording size="wide" src={`${A}/cylinder.mp4`} label={t({ ko: "Cylinder 레이아웃을 스크롤하는 녹화", en: "Recording: scrolling the Cylinder layout" })} />
        <Pair>
          <Shot size="wide" src={`${A}/works-flow.webp`} alt="Flow" caption="Flow" />
          <Shot size="wide" src={`${A}/works-grid.webp`} alt="Grid" caption="Grid" />
          <Shot size="wide" src={`${A}/works-cinematic.webp`} alt="Cinematic" caption="Cinematic" />
          <Shot size="wide" src={`${A}/works-split.webp`} alt="Split" caption="Split" />
        </Pair>
      </Section>

      <Section tone="bleed">
        <Shot src={`${A}/works-fullscreen.webp`} alt="Fullscreen" />
      </Section>

      <Section tone="base">
        <SectionHead
          viewLang={viewLang}
          no="03"
          title={{ ko: "작업물 하나를 끝까지 읽는 페이지", en: "A page to read one project end to end" }}
          body={{
            ko: "큰 제목 아래 기간 · 역할 · 기술 · 사이트를 한 번에 보이고, AI 요약과 핵심 성과를 먼저 놓습니다. 본문은 목차를 따라 읽고, 마지막에 화면 갤러리를 둡니다.",
            en: "Under a big title sit period, role, stack and links, followed by an AI summary and key results. The body follows a table of contents and ends in a screen gallery.",
          }}
        />
        <Gallery
          items={[
            { src: `${A}/work-top.webp`, alt: t({ ko: "머리 — 정보와 AI 요약", en: "Header — facts and AI summary" }) },
            { src: `${A}/work-body.webp`, alt: t({ ko: "본문 — 개요와 목차", en: "Body — overview and contents" }) },
            { src: `${A}/work-gallery.webp`, alt: t({ ko: "갤러리", en: "Gallery" }) },
          ]}
        />
      </Section>

      <Section tone="dark">
        <SectionHead
          viewLang={viewLang}
          no="04"
          title={{ ko: "같은 화면, 다른 밤", en: "Same screens, after dark" }}
          body={{
            ko: "다크 테마는 화면을 다시 그리지 않습니다. 의미 토큰이 가리키는 값만 바꿔서, 모든 컴포넌트가 함께 넘어갑니다.",
            en: "The dark theme redraws nothing. Only the values the semantic tokens point to change, so every component follows at once.",
          }}
        />
        <Shot size="wide" src={`${A}/home-dark.webp`} alt={t({ ko: "다크 테마 홈", en: "Home in the dark theme" })} />
      </Section>

      <Section tone="tint">
        <SectionHead
          viewLang={viewLang}
          no="05"
          title={{ ko: "색은 열여덟 벌, 대비는 계산해서", en: "Eighteen palettes, contrast computed" }}
          body={{
            ko: "강조색 프리셋 열여덟 가지 중 하나를 고르면, 글자색은 배경과의 대비를 계산해 읽히는 쪽으로 정합니다. 아래에서 직접 골라 보세요.",
            en: "Pick one of eighteen accent presets and the text colour is chosen by computing contrast against the background. Try one below.",
          }}
        />
        <DemoStage demo="themes" />
      </Section>

      <Section tone="base">
        <SectionHead
          viewLang={viewLang}
          no="06"
          title={{ ko: "토큰 세 층, 디자인 시스템 페이지", en: "Three token layers, documented" }}
          body={{
            ko: "Raw → Semantic → Component 세 층으로 값을 나눴습니다. 컴포넌트는 원시 색을 직접 쓰지 않고, 이 규칙은 스타일 검사가 막습니다. 색 · 글자 · 간격 · 그림자 · 움직임을 한 페이지에 정리해 두었습니다.",
            en: "Values are split into Raw → Semantic → Component. Components never touch raw colours, and style linting enforces it. Colours, type, spacing, shadows and motion are documented on one page.",
          }}
        />
        <Pair>
          <Shot size="wide" src={`${A}/design-system.webp`} alt={t({ ko: "디자인 시스템 — 원칙", en: "Design system — principles" })} caption={t({ ko: "원칙 — 3단 추상화 · 단일 출처 · 의미 토큰", en: "Principles — three tiers, single source, semantic tokens" })} />
          <Shot size="wide" src={`${A}/design-system-2.webp`} alt={t({ ko: "디자인 시스템 — 색", en: "Design system — colours" })} caption={t({ ko: "색 — 프리셋 · 브랜드 · 중립", en: "Colours — presets, brand, neutral" })} />
        </Pair>
      </Section>

      <Section tone="bleed">
        <Shot src={`${A}/posts-magazine.webp`} alt={t({ ko: "블로그 — Magazine 레이아웃", en: "Blog — Magazine layout" })} />
      </Section>

      <Section tone="tint">
        <SectionHead
          viewLang={viewLang}
          no="07"
          title={{ ko: "블로그는 여덟 가지 모양으로", en: "The blog in eight layouts" }}
          body={{
            ko: "글 목록도 작업물처럼 레이아웃을 고릅니다. 잡지처럼 크게, 일기처럼 날짜순으로, 카드 격자로, 촘촘한 목록으로. 블로그는 blog.hyeoniverse.com 하위 도메인에서 따로 열립니다.",
            en: "The post list picks its layout too: big like a magazine, dated like a journal, as a card grid or a dense list. The blog lives on its own subdomain, blog.hyeoniverse.com.",
          }}
        />
        <Gallery
          items={[
            { src: `${A}/posts-journal.webp`, alt: "Journal" },
            { src: `${A}/posts-blog.webp`, alt: "Blog" },
            { src: `${A}/posts-grid.webp`, alt: "Grid" },
            { src: `${A}/posts-compact.webp`, alt: "Compact" },
            { src: `${A}/posts-masonry.webp`, alt: "Masonry" },
            { src: `${A}/posts-featured.webp`, alt: "Featured" },
          ]}
        />
      </Section>

      <Section tone="base">
        <SectionHead
          viewLang={viewLang}
          no="08"
          title={{ ko: "글을 찾는 길은 여러 갈래", en: "Many ways to find a post" }}
          body={{
            ko: "시간순 기록, 카테고리, 시리즈, 태그. 같은 글을 네 방향에서 묶어 두었습니다. 시리즈는 순서대로 이어 읽고, 태그는 초성으로 걸러 찾습니다.",
            en: "History, categories, series and tags group the same posts four ways. Series read in order; tags filter by initial letter.",
          }}
        />
        <Gallery
          items={[
            { src: `${A}/history.webp`, alt: t({ ko: "History — 시간순 기록", en: "History — timeline" }) },
            { src: `${A}/categories.webp`, alt: t({ ko: "카테고리 모음", en: "Categories" }) },
            { src: `${A}/series.webp`, alt: t({ ko: "시리즈 목록", en: "Series" }) },
            { src: `${A}/series-detail.webp`, alt: t({ ko: "시리즈 — hyeoniverse 개발기", en: "Series — hyeoniverse devlog" }) },
            { src: `${A}/tags.webp`, alt: t({ ko: "태그 — 초성으로 거르기", en: "Tags — filter by initial" }) },
            { src: `${A}/tag.webp`, alt: t({ ko: "태그 하나 — TOTP", en: "One tag — TOTP" }) },
          ]}
        />
      </Section>

      <Section tone="bleed">
        <Shot src={`${A}/post-top.webp`} alt={t({ ko: "글 머리 — 표지 · 제목 · 공유 · 듣기 · 언어", en: "Post header — cover, title, share, listen, language" })} />
      </Section>

      <Section tone="base">
        <SectionHead
          viewLang={viewLang}
          no="09"
          title={{ ko: "글 한 편을 읽는 데 필요한 것", en: "Everything a single post needs" }}
          body={{
            ko: "개발기는 길고 표 · 코드 · 다이어그램이 많습니다. 그래서 읽는 사람이 길을 잃지 않게 하는 장치를 글마다 붙였습니다.",
            en: "Dev notes run long, full of tables, code and diagrams, so every post carries tools that keep readers oriented.",
          }}
        />
        <Prose
          viewLang={viewLang}
          items={[
            {
              label: { ko: "요약과 목차", en: "Summary and contents" },
              body: {
                ko: "본문 위에 AI 요약을 두고, 오른쪽에는 지금 읽는 위치를 따라가는 목차를 붙였습니다. 시리즈 글이면 몇 번째 글인지와 앞뒤 글이 함께 보입니다.",
                en: "An AI summary sits above the body, and a table of contents on the right follows your position. Series posts show their place and the posts before and after.",
              },
            },
            {
              label: { ko: "본문", en: "Body" },
              body: {
                ko: "표, 문법 강조된 코드, Mermaid 다이어그램, 각주를 편집기에서 그대로 옮겨 그립니다. 듣기 버튼은 글을 소리로 읽어 줍니다.",
                en: "Tables, highlighted code, Mermaid diagrams and footnotes come straight from the editor. The Listen button reads the post aloud.",
              },
            },
            {
              label: { ko: "끝", en: "The end" },
              body: {
                ko: "글 끝에는 관련 작업물과 관련 글, 그리고 로그인 없이 남기는 댓글이 있습니다. 댓글도 번역 버튼으로 다른 언어로 읽습니다.",
                en: "Each post ends with related projects and posts, plus comments that need no sign-in. Comments can be translated too.",
              },
            },
          ]}
        />
        <Gallery
          items={[
            { src: `${A}/post-body-1.webp`, alt: t({ ko: "요약 · 목차 · 시리즈", en: "Summary, contents, series" }) },
            { src: `${A}/post-body-2.webp`, alt: t({ ko: "표와 다이어그램", en: "Tables and diagrams" }) },
            { src: `${A}/post-body-3.webp`, alt: t({ ko: "코드와 각주", en: "Code and footnotes" }) },
          ]}
        />
        <Shot size="wide" src={`${A}/post-end.webp`} alt={t({ ko: "글 끝 — 관련 작업물 · 댓글", en: "Post end — related project, comments" })} caption={t({ ko: "글 끝 — 관련 작업물 · 관련 글 · 댓글", en: "Post end — related project, posts, comments" })} />
      </Section>

      <Section tone="tint">
        <SectionHead
          viewLang={viewLang}
          no="10"
          title={{ ko: "한국어로 쓰면, 영어로도 읽힌다", en: "Write in Korean, read in English too" }}
          body={{
            ko: "글을 한국어로 쓰면 영어판을 AI 로 번역해 함께 저장합니다. 읽는 사람은 KO · EN 을 눌러 바로 바꿉니다. 아래 데모는 실제 번역 API 를 부릅니다.",
            en: "Posts written in Korean get an English version translated by AI and stored alongside. Readers flip with KO · EN. The demo below calls the real translation API.",
          }}
        />
        <DemoStage demo="translate" />
      </Section>

      <Section tone="dark">
        <SectionHead
          viewLang={viewLang}
          no="11"
          title={{ ko: "TIL — 하루 한 칸, 열두 별자리", en: "TIL — a square a day, twelve constellations" }}
          body={{
            ko: "매일 배운 것을 짧게 남기면 잔디 한 칸이 채워지고, 그 달의 별자리에 별이 하나 켜집니다. 한 달을 다 채우면 별자리 하나가 완성됩니다.",
            en: "Each short note fills one square of the grid and lights one star in that month's constellation. Fill the month and the constellation is complete.",
          }}
        />
        <Shot size="wide" src={`${A}/til.webp`} alt={t({ ko: "TIL — 열두 달 별자리와 잔디", en: "TIL — twelve monthly constellations and the grid" })} caption={t({ ko: "TIL 첫 화면 — 열두 달 별자리 · 잔디 · 연속 기록", en: "TIL — monthly constellations, the grid and streaks" })} />
      </Section>

      <Section tone="bleed">
        <Recording src={`${A}/planetarium.mp4`} poster={`${A}/til-planetarium.webp`} label={t({ ko: "별자리 하늘을 끌어 둘러보고 별자리로 다가가는 녹화", en: "Recording: dragging around the sky and zooming into a constellation" })} />
      </Section>

      <Section tone="dark">
        <SectionHead
          viewLang={viewLang}
          no="12"
          title={{ ko: "별자리 하늘, 플라네타리움", en: "The planetarium" }}
          body={{
            ko: "‘별자리 하늘 보기’를 누르면 한 해가 밤하늘로 펼쳐집니다. 끌어서 하늘을 둘러보고, 별자리를 누르면 가까이 다가가 그 달의 기록으로 이어집니다. 아직 비어 있는 달은 별이 꺼진 채로 남습니다.",
            en: "‘View the sky’ spreads the year across a night sky. Drag to look around, tap a constellation to fly in and jump to that month's notes. Months without notes keep their stars dark.",
          }}
        />
        <Pair>
          <Shot size="wide" src={`${A}/til-planetarium.webp`} alt={t({ ko: "플라네타리움 — 한 해의 하늘", en: "Planetarium — the year's sky" })} caption={t({ ko: "한 해의 하늘 — 올해 완성 수", en: "The year's sky — months completed" })} />
          <Shot size="wide" src={`${A}/til-planetarium-2.webp`} alt={t({ ko: "플라네타리움 — 다른 방향의 별자리", en: "Planetarium — another part of the sky" })} caption={t({ ko: "끌어서 둘러본 다른 방향", en: "Another direction, dragged into view" })} />
        </Pair>
      </Section>

      <Section tone="bleed">
        <Shot src={`${A}/about-2.webp`} alt={t({ ko: "About — 숫자로 본 사이트", en: "About — the site in numbers" })} />
      </Section>

      <Section tone="base">
        <SectionHead
          viewLang={viewLang}
          no="13"
          title={{ ko: "About 은 챕터를 넘기는 이야기", en: "About reads as chapters" }}
          body={{
            ko: "첫 화면의 별을 누르면 해당 챕터로 갑니다. 숫자, 보는 화면과 쓰는 화면, 공개 화면, 관리자 화면을 차례로 넘기며 사이트가 어떻게 만들어졌는지 보여 줍니다.",
            en: "Each star on the opening screen jumps to a chapter. Numbers, the reading and writing sides, the public pages and the admin — the chapters walk through how the site was built.",
          }}
        />
        <Gallery
          items={[
            { src: `${A}/about-3.webp`, alt: t({ ko: "보는 화면, 쓰는 화면", en: "Screens to read, screens to write" }) },
            { src: `${A}/about-4.webp`, alt: t({ ko: "공개 화면 — 홈", en: "Public — home" }) },
            { src: `${A}/about-5.webp`, alt: t({ ko: "공개 화면 — 글과 시리즈", en: "Public — posts and series" }) },
            { src: `${A}/about-6.webp`, alt: t({ ko: "공개 화면 — 상세 페이지와 AI 요약", en: "Public — detail and AI summary" }) },
            { src: `${A}/about-7.webp`, alt: t({ ko: "공개 화면 — 게스트 댓글", en: "Public — guest comments" }) },
            { src: `${A}/about-8.webp`, alt: t({ ko: "공개 화면 — 번역 배너", en: "Public — translation banner" }) },
          ]}
        />
      </Section>

      <Section tone="tint">
        <SectionHead
          viewLang={viewLang}
          no="14"
          title={{ ko: "프로필은 가로로 걷는다", en: "The profile walks sideways" }}
          body={{
            ko: "세로로 스크롤하면 화면은 가로로 흐릅니다. 마스코트 몽이가 인사하고, 창처럼 겹친 사진과 정보 카드를 지나 경력과 기술로 이어집니다.",
            en: "Scroll down and the page travels sideways. The mascot Mongi says hello, then overlapping photo windows and info cards lead into experience and skills.",
          }}
        />
        <Gallery
          items={[
            { src: `${A}/profile-0.webp`, alt: t({ ko: "첫 화면 — Crafting Digital Experiences", en: "Opening — Crafting Digital Experiences" }) },
            { src: `${A}/profile-3.webp`, alt: t({ ko: "몽이의 인사", en: "Mongi says hello" }) },
            { src: `${A}/profile-4.webp`, alt: t({ ko: "몽이의 표정", en: "Mongi's moods" }) },
            { src: `${A}/profile-5.webp`, alt: t({ ko: "창처럼 겹친 사진", en: "Photos as windows" }) },
            { src: `${A}/profile-6.webp`, alt: t({ ko: "프로필", en: "Profile" }) },
          ]}
        />
      </Section>

      <Section tone="base">
        <SectionHead
          viewLang={viewLang}
          no="15"
          title={{ ko: "구석에 있는 페이지도 같은 결로", en: "The quiet corners, in the same style" }}
          body={{
            ko: "연락하기 · 개인정보 처리방침 · 찾을 수 없는 페이지까지 같은 토큰과 글꼴로 만들었습니다. 연락하기는 이미지 · 문서 · 압축 파일을 25MB 까지 첨부해 보낼 수 있습니다.",
            en: "Contact, the privacy policy and even the not-found page use the same tokens and type. Contact accepts images, documents and archives up to 25 MB.",
          }}
        />
        <Gallery
          items={[
            { src: `${A}/contact.webp`, alt: t({ ko: "연락하기", en: "Contact" }) },
            { src: `${A}/privacy.webp`, alt: t({ ko: "개인정보 처리방침", en: "Privacy policy" }) },
            { src: `${A}/not-found.webp`, alt: t({ ko: "찾을 수 없는 페이지", en: "Not found" }) },
          ]}
        />
      </Section>

      <Section tone="tint">
        <SectionHead
          viewLang={viewLang}
          no="16"
          title={{ ko: "휴대폰에서도 같은 화면", en: "The same screens on a phone" }}
          body={{
            ko: "모든 페이지를 휴대폰 폭에서 따로 확인했습니다. 메뉴는 화면 전체로 열리고, 표와 코드는 가로로 넘겨 읽습니다.",
            en: "Every page was checked at phone width. The menu opens full screen, and tables and code scroll sideways.",
          }}
        />
        <Phones
          items={[
            { src: `${A}/m-home.webp`, alt: t({ ko: "홈", en: "Home" }) },
            { src: `${A}/m-menu.webp`, alt: t({ ko: "메뉴", en: "Menu" }) },
            { src: `${A}/m-works.webp`, alt: t({ ko: "작업물", en: "Works" }) },
            { src: `${A}/m-posts.webp`, alt: t({ ko: "블로그", en: "Blog" }) },
          ]}
        />
        <Phones
          items={[
            { src: `${A}/m-post.webp`, alt: t({ ko: "글", en: "Post" }) },
            { src: `${A}/m-til.webp`, alt: "TIL" },
            { src: `${A}/m-about.webp`, alt: "About" },
            { src: `${A}/m-profile.webp`, alt: "Profile" },
          ]}
        />
      </Section>

      <Section tone="base">
        <Numbers
          viewLang={viewLang}
          items={[
            { value: "139", label: { ko: "API 라우트", en: "API routes" } },
            { value: "1,343", label: { ko: "단위 테스트", en: "Unit tests" } },
            { value: "74", label: { ko: "DB 마이그레이션", en: "DB migrations" } },
            { value: "18", label: { ko: "테마 프리셋", en: "Theme presets" } },
          ]}
        />
      </Section>
    </LandingShell>
  );
}
