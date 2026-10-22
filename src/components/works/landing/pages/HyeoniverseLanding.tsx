"use client";

import type { Project } from "@/data/projects";
import { DemoStage, LandingShell, Numbers, Pair, Phones, Recording, Section, SectionHead, Shot, type Lang, type L10n } from "../kit/LandingKit";

/**
 * HYEONIVERSE 전용 랜딩 페이지 — andreasantonsson.dev/project/secret-level 처럼 섹션마다 화면 폭 전체를 쓴다.
 * 화면은 모두 이 페이지를 위해 배포한 사이트(www.hyeoniverse.com)에서 2배 해상도로 새로 찍은 캡처 · 녹화다
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
      <Section tone="bleed">
        <Recording src={`${A}/home.mp4`} poster={`${A}/home-light.webp`} label={t({ ko: "홈을 스크롤하는 녹화", en: "Recording: scrolling the home page" })} />
      </Section>

      <Section tone="base">
        <SectionHead
          viewLang={viewLang}
          no="01"
          title={{ ko: "작업물은 여섯 가지 모양으로 흐른다", en: "Works flow in six shapes" }}
          body={{ ko: "관리자 설정 하나로 바꿔 끼웁니다.", en: "Swapped with one admin setting." }}
        />
        <Recording size="wide" src={`${A}/cylinder.mp4`} label={t({ ko: "Cylinder 레이아웃을 스크롤하는 녹화", en: "Recording: scrolling the Cylinder layout" })} />
        <Pair>
          <Shot size="wide" src={`${A}/works-flow.webp`} alt="Flow" />
          <Shot size="wide" src={`${A}/works-grid.webp`} alt="Grid" />
          <Shot size="wide" src={`${A}/works-cinematic.webp`} alt="Cinematic" />
          <Shot size="wide" src={`${A}/works-split.webp`} alt="Split" />
        </Pair>
      </Section>

      <Section tone="bleed">
        <Shot src={`${A}/works-fullscreen.webp`} alt="Fullscreen" />
      </Section>

      <Section tone="dark">
        <SectionHead viewLang={viewLang} no="02" title={{ ko: "같은 화면, 다른 밤", en: "Same screens, after dark" }} body={{ ko: "테마는 토큰 값만 바꿔 전환합니다.", en: "Themes switch by swapping token values only." }} />
        <Shot size="wide" src={`${A}/home-dark.webp`} alt={t({ ko: "다크 테마 홈", en: "Home in the dark theme" })} />
      </Section>

      <Section tone="tint">
        <SectionHead viewLang={viewLang} no="03" title={{ ko: "색은 열여덟 벌, 대비는 계산해서", en: "Eighteen palettes, contrast computed" }} body={{ ko: "직접 골라 보세요.", en: "Try one." }} />
        <DemoStage demo="themes" />
      </Section>

      <Section tone="base">
        <SectionHead viewLang={viewLang} no="04" title={{ ko: "글은 블로그로, 두 언어로", en: "Writing as a blog, in two languages" }} />
        <Pair>
          <Shot size="wide" src={`${A}/posts.webp`} alt={t({ ko: "블로그 글 목록", en: "Blog list" })} />
          <Shot size="wide" src={`${A}/post.webp`} alt={t({ ko: "블로그 글", en: "A post" })} />
        </Pair>
        <DemoStage demo="translate" />
      </Section>

      <Section tone="bleed">
        <Shot src={`${A}/about.webp`} alt={t({ ko: "About — 별자리로 고르는 챕터", en: "About — chapters picked from a constellation" })} />
      </Section>

      <Section tone="base">
        <SectionHead viewLang={viewLang} no="05" title={{ ko: "프로필은 가로로 걷는다", en: "The profile walks sideways" }} />
        <Shot size="wide" src={`${A}/profile.webp`} alt={t({ ko: "프로필", en: "Profile" })} />
      </Section>

      <Section tone="tint">
        <SectionHead viewLang={viewLang} no="06" title={{ ko: "휴대폰에서도 같은 화면", en: "The same screens on a phone" }} />
        <Phones
          items={[
            { src: `${A}/phone-home.webp`, alt: t({ ko: "휴대폰 홈", en: "Phone home" }) },
            { src: `${A}/phone-works.webp`, alt: t({ ko: "휴대폰 작업물", en: "Phone works" }) },
            { src: `${A}/phone-posts.webp`, alt: t({ ko: "휴대폰 블로그", en: "Phone blog" }) },
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
