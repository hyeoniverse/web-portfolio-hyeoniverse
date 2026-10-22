"use client";

import type { Project } from "@/data/projects";
import { DemoStage, Duo, Flow, Frame, LandingShell, Note, Numbers, Phones, type Lang, type L10n } from "../kit/LandingKit";

/**
 * HYEONIVERSE 전용 랜딩 페이지 — andreasantonsson.dev/project/synthetic-theatre 처럼 이미지가 중심이다.
 * 화면 폭 전체 컷과 위치를 엇갈린 큰 화면 · 높이를 어긋나게 둔 두 장이 틀 없이 이어지고, 글은 묶음마다 번호 · 제목 · 한 줄뿐.
 * 화면은 모두 이 페이지를 위해 배포한 사이트(www.hyeoniverse.com · blog.hyeoniverse.com)에서 2배 해상도로 새로 찍은 캡처 · 녹화다
 * (content/works/hyeoniverse/landing). 사이에 직접 만져 보는 데모 둘(테마 · 번역). 숫자는 이 저장소에서 센 값이다.
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
        <Frame at="bleed" video={`${A}/home.mp4`} src={`${A}/home-light.webp`} alt={t({ ko: "홈을 스크롤하는 녹화", en: "Recording: scrolling the home page" })} />

        <Note
          viewLang={viewLang}
          no="01"
          title={{ ko: "만들고, 쓰고, 운영하는 한 곳", en: "One place to build, write and run" }}
          body={{
            ko: "작업물을 보여 주는 포트폴리오, 개발기를 쓰는 블로그, 매일 남기는 TIL, 이 모두를 고치는 관리자 CMS 를 한 저장소에서 만들었습니다.",
            en: "A portfolio, a blog for dev notes, a daily TIL log and the admin CMS that edits them all — built in one repository.",
          }}
        />
        <Frame at="right" src={`${A}/about-0.webp`} alt={t({ ko: "About 첫 화면 — 별자리로 고르는 챕터", en: "About opening — chapters picked from a constellation" })} />
        <Duo>
          <Frame src={`${A}/posts-blog.webp`} alt={t({ ko: "블로그 글 목록", en: "Blog list" })} />
          <Frame src={`${A}/series.webp`} alt={t({ ko: "시리즈 목록", en: "Series" })} />
        </Duo>

        <Note
          viewLang={viewLang}
          no="02"
          title={{ ko: "작업물은 여섯 가지 모양으로 흐른다", en: "Works flow in six shapes" }}
          body={{
            ko: "Cylinder · Flow · Grid · Fullscreen · Cinematic · Split. 관리자 설정 하나로 바꿔 끼웁니다.",
            en: "Cylinder, Flow, Grid, Fullscreen, Cinematic and Split, swapped with one admin setting.",
          }}
        />
        <Frame at="wide" video={`${A}/cylinder.mp4`} alt={t({ ko: "Cylinder — 3D 원통을 스크롤하는 녹화", en: "Cylinder — recording of the 3D cylinder" })} />
        <Duo>
          <Frame src={`${A}/works-flow.webp`} alt="Flow" />
          <Frame src={`${A}/works-grid.webp`} alt="Grid" />
        </Duo>
        <Frame at="left" src={`${A}/works-fullscreen.webp`} alt="Fullscreen" />
        <Duo reverse>
          <Frame src={`${A}/works-split.webp`} alt="Split" />
          <Frame src={`${A}/works-cinematic.webp`} alt="Cinematic" />
        </Duo>

        <Note
          viewLang={viewLang}
          no="03"
          title={{ ko: "작업물 하나를 끝까지 읽는 페이지", en: "A page to read one project end to end" }}
          body={{
            ko: "정보 한 줄과 AI 요약, 목차를 따라 읽는 본문, 글 칼럼보다 넓은 갤러리.",
            en: "Facts and an AI summary, a body that follows its contents, and a gallery wider than the text.",
          }}
        />
        <Frame at="center" src={`${A}/work-top.webp`} alt={t({ ko: "작업물 상세 — 정보와 AI 요약", en: "Work detail — facts and AI summary" })} />
        <Duo>
          <Frame src={`${A}/work-body.webp`} alt={t({ ko: "본문 — 개요와 목차", en: "Body — overview and contents" })} />
          <Frame src={`${A}/work-gallery.webp`} alt={t({ ko: "갤러리", en: "Gallery" })} />
        </Duo>

        <Note
          viewLang={viewLang}
          no="04"
          title={{ ko: "같은 화면, 다른 밤", en: "Same screens, after dark" }}
          body={{
            ko: "테마는 의미 토큰이 가리키는 값만 바꿉니다. 강조색은 열여덟 벌, 글자색은 대비를 계산해 정합니다 — 직접 골라 보세요.",
            en: "Themes only swap what the semantic tokens point to. Eighteen accent presets, text colour chosen by computed contrast — try one.",
          }}
        />
        <Frame at="bleed" src={`${A}/home-dark.webp`} alt={t({ ko: "다크 테마 홈", en: "Home in the dark theme" })} />
        <DemoStage demo="themes" />
        <Duo reverse>
          <Frame src={`${A}/design-system-2.webp`} alt={t({ ko: "디자인 시스템 — 색", en: "Design system — colours" })} />
          <Frame src={`${A}/design-system.webp`} alt={t({ ko: "디자인 시스템 — 원칙", en: "Design system — principles" })} />
        </Duo>

        <Note
          viewLang={viewLang}
          no="05"
          title={{ ko: "블로그는 여덟 가지 모양으로", en: "The blog in eight layouts" }}
          body={{
            ko: "잡지처럼, 일기처럼, 카드 격자로, 촘촘한 목록으로. blog.hyeoniverse.com 에서 따로 열립니다.",
            en: "Like a magazine, a journal, a card grid or a dense list — on its own subdomain, blog.hyeoniverse.com.",
          }}
        />
        <Frame at="bleed" src={`${A}/posts-magazine.webp`} alt={t({ ko: "블로그 — Magazine", en: "Blog — Magazine" })} />
        <Duo>
          <Frame src={`${A}/posts-journal.webp`} alt="Journal" />
          <Frame src={`${A}/posts-grid.webp`} alt="Grid" />
        </Duo>
        <Duo reverse>
          <Frame src={`${A}/posts-compact.webp`} alt="Compact" />
          <Frame src={`${A}/posts-masonry.webp`} alt="Masonry" />
        </Duo>
        <Frame at="right" src={`${A}/posts-featured.webp`} alt="Featured" />

        <Note
          viewLang={viewLang}
          no="06"
          title={{ ko: "글을 찾는 길은 여러 갈래", en: "Many ways to find a post" }}
          body={{
            ko: "시간순 기록 · 카테고리 · 시리즈 · 태그. 같은 글을 네 방향에서 묶었습니다.",
            en: "History, categories, series and tags group the same posts four ways.",
          }}
        />
        <Frame at="left" src={`${A}/series-detail.webp`} alt={t({ ko: "시리즈 — hyeoniverse 개발기", en: "Series — hyeoniverse devlog" })} />
        <Duo reverse>
          <Frame src={`${A}/categories.webp`} alt={t({ ko: "카테고리", en: "Categories" })} />
          <Frame src={`${A}/history.webp`} alt={t({ ko: "History — 시간순 기록", en: "History — timeline" })} />
        </Duo>
        <Duo>
          <Frame src={`${A}/tag.webp`} alt={t({ ko: "태그 하나 — TOTP", en: "One tag — TOTP" })} />
          <Frame src={`${A}/tags.webp`} alt={t({ ko: "태그 — 초성으로 거르기", en: "Tags — filter by initial" })} />
        </Duo>

        <Note
          viewLang={viewLang}
          no="07"
          title={{ ko: "글 한 편을 읽는 데 필요한 것", en: "Everything a single post needs" }}
          body={{
            ko: "AI 요약 · 따라오는 목차 · 표와 다이어그램 · 각주 · 듣기 · 로그인 없는 댓글. 한국어로 쓰면 영어판도 함께 저장합니다.",
            en: "AI summary, a following table of contents, tables and diagrams, footnotes, listen, sign-in-free comments — and an English version saved alongside.",
          }}
        />
        <Frame at="bleed" src={`${A}/post-top.webp`} alt={t({ ko: "글 머리 — 표지 · 제목 · 공유 · 듣기 · 언어", en: "Post header — cover, title, share, listen, language" })} />
        <Duo>
          <Frame src={`${A}/post-body-1.webp`} alt={t({ ko: "요약 · 목차 · 시리즈", en: "Summary, contents, series" })} />
          <Frame src={`${A}/post-body-2.webp`} alt={t({ ko: "표와 다이어그램", en: "Tables and diagrams" })} />
        </Duo>
        <Frame at="right" src={`${A}/post-body-3.webp`} alt={t({ ko: "코드와 각주", en: "Code and footnotes" })} />
        <Frame at="left" src={`${A}/post-end.webp`} alt={t({ ko: "글 끝 — 관련 작업물 · 댓글", en: "Post end — related project, comments" })} />
        <DemoStage demo="translate" />

        <Note
          viewLang={viewLang}
          no="08"
          title={{ ko: "TIL — 하루 한 칸, 열두 별자리", en: "TIL — a square a day, twelve constellations" }}
          body={{
            ko: "매일 배운 것을 남기면 잔디 한 칸이 채워지고, 그 달의 별자리에 별이 하나 켜집니다. 한 해는 플라네타리움으로 펼쳐집니다.",
            en: "Each note fills a square and lights a star in that month's constellation. The year opens as a planetarium.",
          }}
        />
        <Frame at="center" src={`${A}/til.webp`} alt={t({ ko: "TIL — 열두 달 별자리와 잔디", en: "TIL — monthly constellations and the grid" })} />
        <Frame at="bleed" video={`${A}/planetarium.mp4`} src={`${A}/til-planetarium.webp`} alt={t({ ko: "별자리 하늘을 끌어 둘러보는 녹화", en: "Recording: dragging around the sky" })} />
        <Duo>
          <Frame src={`${A}/til-planetarium.webp`} alt={t({ ko: "플라네타리움 — 한 해의 하늘", en: "Planetarium — the year's sky" })} />
          <Frame src={`${A}/til-planetarium-2.webp`} alt={t({ ko: "플라네타리움 — 다른 방향", en: "Planetarium — another direction" })} />
        </Duo>

        <Note
          viewLang={viewLang}
          no="09"
          title={{ ko: "About 은 챕터를 넘기는 이야기", en: "About reads as chapters" }}
          body={{
            ko: "별을 누르면 그 챕터로. 숫자, 보는 화면과 쓰는 화면, 공개 화면을 차례로 넘깁니다.",
            en: "Tap a star to open its chapter — numbers, the reading and writing sides, the public pages.",
          }}
        />
        <Frame at="bleed" src={`${A}/about-2.webp`} alt={t({ ko: "About — 숫자로 본 사이트", en: "About — the site in numbers" })} />
        <Duo>
          <Frame src={`${A}/about-4.webp`} alt={t({ ko: "공개 화면 — 홈", en: "Public — home" })} />
          <Frame src={`${A}/about-3.webp`} alt={t({ ko: "보는 화면, 쓰는 화면", en: "Screens to read, screens to write" })} />
        </Duo>
        <Duo reverse>
          <Frame src={`${A}/about-7.webp`} alt={t({ ko: "공개 화면 — 게스트 댓글", en: "Public — guest comments" })} />
          <Frame src={`${A}/about-6.webp`} alt={t({ ko: "공개 화면 — 상세 페이지와 AI 요약", en: "Public — detail and AI summary" })} />
        </Duo>
        <Frame at="right" src={`${A}/about-5.webp`} alt={t({ ko: "공개 화면 — 글과 시리즈", en: "Public — posts and series" })} />

        <Note
          viewLang={viewLang}
          no="10"
          title={{ ko: "프로필은 가로로 걷는다", en: "The profile walks sideways" }}
          body={{
            ko: "세로로 스크롤하면 화면은 가로로 흐릅니다. 마스코트 몽이가 인사하고, 창처럼 겹친 사진을 지나 경력으로 이어집니다.",
            en: "Scroll down and the page travels sideways — Mongi says hello, then photo windows lead into experience.",
          }}
        />
        <Frame at="wide" src={`${A}/profile-0.webp`} alt={t({ ko: "프로필 — Crafting Digital Experiences", en: "Profile — Crafting Digital Experiences" })} />
        <Duo>
          <Frame src={`${A}/profile-5.webp`} alt={t({ ko: "창처럼 겹친 사진", en: "Photos as windows" })} />
          <Frame src={`${A}/profile-3.webp`} alt={t({ ko: "몽이의 인사", en: "Mongi says hello" })} />
        </Duo>
        <Frame at="left" src={`${A}/profile-6.webp`} alt={t({ ko: "프로필", en: "Profile" })} />

        <Note
          viewLang={viewLang}
          no="11"
          title={{ ko: "구석에 있는 페이지도 같은 결로", en: "The quiet corners, in the same style" }}
          body={{
            ko: "연락하기 · 개인정보 처리방침 · 찾을 수 없는 페이지까지 같은 토큰과 글꼴로. 연락하기는 25MB 까지 첨부합니다.",
            en: "Contact, privacy policy and even the not-found page share the same tokens and type. Contact takes attachments up to 25 MB.",
          }}
        />
        <Duo>
          <Frame src={`${A}/contact.webp`} alt={t({ ko: "연락하기", en: "Contact" })} />
          <Frame src={`${A}/not-found.webp`} alt={t({ ko: "찾을 수 없는 페이지", en: "Not found" })} />
        </Duo>
        <Frame at="right" src={`${A}/privacy.webp`} alt={t({ ko: "개인정보 처리방침", en: "Privacy policy" })} />

        <Note viewLang={viewLang} no="12" title={{ ko: "휴대폰에서도 같은 화면", en: "The same screens on a phone" }} />
        <Phones
          items={[
            { src: `${A}/m-home.webp`, alt: t({ ko: "홈", en: "Home" }) },
            { src: `${A}/m-works.webp`, alt: t({ ko: "작업물", en: "Works" }) },
            { src: `${A}/m-posts.webp`, alt: t({ ko: "블로그", en: "Blog" }) },
            { src: `${A}/m-post.webp`, alt: t({ ko: "글", en: "Post" }) },
          ]}
        />
        <Phones
          items={[
            { src: `${A}/m-menu.webp`, alt: t({ ko: "메뉴", en: "Menu" }) },
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
