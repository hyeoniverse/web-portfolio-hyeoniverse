"use client";

import type { Project } from "@/data/projects";
import { DemoStage, Flow, LandingShell, Numbers, Recording, Row, Shot, Statement, type Lang, type L10n } from "../kit/LandingKit";

/**
 * HYEONIVERSE 전용 랜딩 페이지 — andreasantonsson.dev/project/secret-level 처럼 화면이 이어지는 구성.
 * 화면은 모두 이 페이지를 위해 배포한 사이트(www.hyeoniverse.com)에서 새로 찍은 캡처 · 녹화다(content/works/hyeoniverse/landing).
 * 사이에 직접 만져 보는 데모 둘(테마 · 번역)을 둔다. 숫자는 이 저장소에서 센 값이다.
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
      <Shot variant="full" priority src={`${A}/home-light.jpg`} alt={t({ ko: "HYEONIVERSE 홈", en: "HYEONIVERSE home" })} />

      <Flow>
        <Recording
          src={`${A}/home-scroll.webm`}
          start={6}
          label={t({ ko: "홈을 스크롤하는 녹화", en: "Recording: scrolling the home page" })}
          caption={t({ ko: "스크롤을 따라 토러스와 궤도선이 움직이고, 끝에서 처음으로 이어진다.", en: "The torus and orbits follow the scroll, which loops back to the start." })}
        />

        <Statement
          viewLang={viewLang}
          no="01"
          title={{ ko: "작업물은 여섯 가지 모양으로 흐른다", en: "Works flow in six shapes" }}
          body={{ ko: "관리자 설정 하나로 바꿔 끼웁니다.", en: "Swapped with one admin setting." }}
        />
        <Recording start={6} src={`${A}/cylinder-scroll.webm`} label={t({ ko: "Cylinder 레이아웃을 스크롤하는 녹화", en: "Recording: scrolling the Cylinder layout" })} caption="Cylinder" />
        <Shot src={`${A}/works-flow.jpg`} alt="Flow" caption="Flow" />
        <Shot src={`${A}/works-grid.jpg`} alt="Grid" caption="Grid" />
      </Flow>

      <Shot variant="strip" src={`${A}/home-dark.jpg`} alt={t({ ko: "다크 테마 홈", en: "Home in the dark theme" })} />

      <Flow>
        <Shot src={`${A}/works-fullscreen.jpg`} alt="Fullscreen" caption="Fullscreen" />
        <Shot src={`${A}/works-cinematic.jpg`} alt="Cinematic" caption="Cinematic" />
        <Shot src={`${A}/works-split.jpg`} alt="Split" caption="Split" />

        <Statement
          viewLang={viewLang}
          no="02"
          title={{ ko: "색은 열여덟 벌, 대비는 계산해서", en: "Eighteen palettes, contrast computed" }}
          body={{ ko: "직접 골라 보세요.", en: "Try one." }}
        />
        <DemoStage demo="themes" />

        <Statement
          viewLang={viewLang}
          no="03"
          title={{ ko: "글은 블로그로, 두 언어로", en: "Writing as a blog, in two languages" }}
        />
        <Shot src={`${A}/posts.jpg`} alt={t({ ko: "블로그 글 목록", en: "Blog list" })} />
        <Shot src={`${A}/post.jpg`} alt={t({ ko: "블로그 글 — 관련 프로젝트 · 시리즈 · AI 요약 · 목차", en: "A post — related work, series, AI summary, TOC" })} />
        <DemoStage demo="translate" />
      </Flow>

      <Shot variant="full" src={`${A}/about.jpg`} alt={t({ ko: "About — 별자리로 고르는 챕터", en: "About — chapters picked from a constellation" })} />

      <Flow>
        <Shot src={`${A}/profile.jpg`} alt={t({ ko: "프로필", en: "Profile" })} />
        <Shot src={`${A}/design-system.jpg`} alt={t({ ko: "디자인 시스템", en: "Design system" })} />

        <Statement viewLang={viewLang} no="04" title={{ ko: "휴대폰에서도 같은 화면", en: "The same screens on a phone" }} />
        <Row
          items={[
            { src: `${A}/phone-home.jpg`, alt: t({ ko: "휴대폰 홈", en: "Phone home" }) },
            { src: `${A}/phone-works.jpg`, alt: t({ ko: "휴대폰 작업물", en: "Phone works" }) },
            { src: `${A}/phone-posts.jpg`, alt: t({ ko: "휴대폰 블로그", en: "Phone blog" }) },
          ]}
        />

        <Numbers
          viewLang={viewLang}
          items={[
            { value: "139", label: { ko: "API 라우트", en: "API routes" } },
            { value: "1,340", label: { ko: "단위 테스트", en: "Unit tests" } },
            { value: "74", label: { ko: "DB 마이그레이션", en: "DB migrations" } },
            { value: "18", label: { ko: "테마 프리셋", en: "Theme presets" } },
          ]}
        />
      </Flow>
    </LandingShell>
  );
}
