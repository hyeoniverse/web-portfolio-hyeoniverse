"use client";

import type { Project } from "@/data/projects";
import { DemoStage, Flow, LandingShell, Numbers, Stage, Statement, delay, type Lang } from "../kit/LandingKit";
import styles from "./HyeoniverseLanding.module.css";

/**
 * HYEONIVERSE 전용 랜딩 페이지 — 처음부터 따로 만든 장면과 데모로 짰다(기존 캡처 · 본문을 쓰지 않는다).
 * 첫 장면은 사이트 홈을 코드로 다시 그린 것(세리프 문구 · 떠다니는 토러스 · 궤도선), 그 뒤로 큰 문장과 직접 만져 보는 데모가 번갈아 온다.
 * 숫자는 이 저장소에서 센 값이다(API 라우트 · 단위 테스트 · 마이그레이션 · 테마 프리셋).
 */
export default function HyeoniverseLanding({ project, viewLang, next }: {
  project: Project; viewLang: Lang; next?: { href: string; title: string } | null;
}) {
  return (
    <LandingShell
      project={project}
      viewLang={viewLang}
      next={next}
      eyebrow={{ ko: "디자인 시스템부터 관리자 CMS 까지, 혼자 설계하고 운영하는 포트폴리오", en: "A portfolio designed and run solo, from the design system to the admin CMS" }}
    >
      <Stage full tone="light" ratio="16 / 8" label="HYEONIVERSE home">
        <HomeScene />
      </Stage>

      <Flow>
        <Statement
          viewLang={viewLang}
          no="01"
          title={{ ko: "작업물은 여섯 가지 모양으로 흐른다", en: "Works flow in six shapes" }}
          body={{ ko: "Flow · Grid · Cylinder · Fullscreen · Cinematic · Split. 관리자 설정 하나로 바꿔 끼웁니다.", en: "Flow, Grid, Cylinder, Fullscreen, Cinematic, Split — swapped with one admin setting." }}
        />
        <DemoStage demo="layouts" />

        <Statement
          viewLang={viewLang}
          no="02"
          title={{ ko: "색은 열여덟 벌, 대비는 계산해서", en: "Eighteen palettes, contrast computed" }}
          body={{ ko: "프리셋을 고르면 강조색 · 바탕 · 글자색이 바뀌고, 대비가 AA 에 못 미치면 글자색을 다시 고릅니다.", en: "Pick a preset and accent, background and text change; text is re-picked when contrast falls below AA." }}
        />
        <DemoStage demo="themes" />

        <Statement
          viewLang={viewLang}
          no="03"
          title={{ ko: "쓰는 동안, 세 곳에 저장된다", en: "While you write, it saves in three places" }}
          body={{ ko: "입력 즉시 브라우저에, 3초 멈추면 서버 수정본으로, 떠날 때는 마지막 변경을. 두 탭이 함께 저장하면 버전 숫자가 막습니다.", en: "Instantly in the browser, as a server revision after 3 s idle, and the last change on leave. Two tabs saving at once are stopped by a version number." }}
        />
        <DemoStage demo="autosave" />

        <Statement
          viewLang={viewLang}
          no="04"
          title={{ ko: "한 번 쓰면, 두 언어로 읽힌다", en: "Write once, read in two languages" }}
          body={{ ko: "번역 공급자를 차례로 시도해 한쪽이 실패해도 돌려줍니다. 실제 AI 를 부르니 직접 문장을 넣어 보세요.", en: "Providers are tried in order so a failure still returns a translation. This calls real AI — try your own sentence." }}
        />
        <DemoStage demo="translate" />

        <Statement
          viewLang={viewLang}
          no="05"
          title={{ ko: "권한은 코드가 아니라 DB 가 지킨다", en: "Permissions are enforced by the database" }}
          body={{ ko: "소유자 · 관리자 · 저자 · 방문자. API 가 확인을 빠뜨려도 행 단위 보안 정책이 마지막에 남습니다.", en: "Owner, admin, author, visitor. Even if an API forgets a check, row-level security has the last word." }}
        />
        <DemoStage demo="roles" />

        <Statement
          viewLang={viewLang}
          no="06"
          title={{ ko: "작업물은 발표처럼 넘겨 본다", en: "Works play like a talk" }}
          body={{ ko: "슬라이드마다 대본과 음성을 붙여, 상세 화면에서 소리와 자막으로 넘겨 봅니다.", en: "Each slide carries a script and voice, played with sound and captions on the detail page." }}
        />
        <DemoStage demo="slides" />

        <Numbers
          viewLang={viewLang}
          items={[
            { value: "139", label: { ko: "API 라우트", en: "API routes" } },
            { value: "1,351", label: { ko: "단위 테스트", en: "Unit tests" } },
            { value: "74", label: { ko: "DB 마이그레이션", en: "DB migrations" } },
            { value: "18", label: { ko: "테마 프리셋", en: "Theme presets" } },
          ]}
        />
      </Flow>
    </LandingShell>
  );
}

/** 첫 장면 — 사이트 홈을 코드로: 위 막대 · 세리프 세 줄(& 만 강조색) · 떠다니는 토러스 · 궤도선 · 아래 줄 */
function HomeScene() {
  return (
    <div className={styles.home}>
      <div className={styles.homeBar} aria-hidden>
        <span className={styles.homeLogo}>✦</span>
        <span className={styles.homeNav}><i>Works</i><i>Posts</i><i>Profile</i><i>About</i></span>
        <span className={styles.homeCta}>Get in Touch</span>
      </div>
      <span className={styles.orbit} aria-hidden />
      <span className={styles.orbitSmall} aria-hidden />
      <span className={styles.torus} aria-hidden />
      <p className={styles.homeHeadline} aria-hidden>
        <span style={delay(0)}>Creative</span>
        <span style={delay(1)}>Developer</span>
        <span style={delay(2)}><em>&amp;</em> Problem Solver</span>
      </p>
      <div className={styles.homeFoot} aria-hidden>
        <span>Based in Seoul, KR</span>
        <span className={styles.homeLine} />
        <span>Open to Opportunities <b /></span>
      </div>
    </div>
  );
}
