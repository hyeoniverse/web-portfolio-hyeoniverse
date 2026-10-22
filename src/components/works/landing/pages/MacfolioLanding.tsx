"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Project } from "@/data/projects";
import { Flow, LandingShell, Numbers, Stage, Statement, delay, type Lang, type L10n } from "../kit/LandingKit";
import styles from "./MacfolioLanding.module.css";

/**
 * MacFolio 전용 랜딩 페이지 — 처음부터 따로 만든 장면으로 짰다(기존 캡처를 쓰지 않는다).
 * macOS 데스크톱(메뉴 막대 · 바탕화면 폴더 · 열리는 메모 창 · Dock), 글을 써 내려가는 메모 앱, 선택이 옮겨 가는 Finder,
 * ops/deploy.sh 를 다시 도는 터미널과 Cloudflare Tunnel 구성, iOS 홈 화면이 된 휴대폰. 모두 코드로 그렸다.
 * 내용 · 숫자는 MacFolio 저장소(README · ops/deploy.sh)에서 옮겼다.
 */

/* 장면의 색 — macOS 처럼 보여야 해서 사이트 토큰이 아닌 고유한 색이다. CSS 가 아니라 style 로 넣는다 */
const WALLPAPER = "linear-gradient(180deg, #3b2d6b 0%, #b04a68 46%, #f08a4b 64%, #f6c37a 100%)";
const MOUNTAINS = "linear-gradient(180deg, #4a2a4f 0%, #24163a 100%)";
const MOUNTAINS_NEAR = "linear-gradient(180deg, #2a1830 0%, #120a1d 100%)";

const APPS: { name: string; glyph: string; bg: string }[] = [
  { name: "Finder", glyph: "☺", bg: "linear-gradient(180deg, #6ec8ff, #1f7ae0)" },
  { name: "Music", glyph: "♪", bg: "linear-gradient(180deg, #ff6b81, #e8264a)" },
  { name: "Safari", glyph: "◎", bg: "linear-gradient(180deg, #7fd1ff, #2a7de1)" },
  { name: "Photos", glyph: "✿", bg: "linear-gradient(180deg, #fff6d6, #ffd36b)" },
  { name: "Messages", glyph: "❝", bg: "linear-gradient(180deg, #7ef08f, #2fc44b)" },
  { name: "Notes", glyph: "✎", bg: "linear-gradient(180deg, #fff3a8, #ffd43b)" },
  { name: "GitHub", glyph: "⌥", bg: "linear-gradient(180deg, #8a7ad6, #5b3fb8)" },
  { name: "Mail", glyph: "✉", bg: "linear-gradient(180deg, #6fc2ff, #2b84f0)" },
  { name: "Terminal", glyph: ">_", bg: "linear-gradient(180deg, #3a3a3a, #111111)" },
  { name: "Settings", glyph: "⚙", bg: "linear-gradient(180deg, #c9c9cf, #7d7d86)" },
  { name: "Sprout Farm", glyph: "✦", bg: "linear-gradient(180deg, #b8f28a, #4fae3c)" },
  { name: "Trash", glyph: "⌫", bg: "linear-gradient(180deg, #e7e9ee, #b9bdc6)" },
];

const FOLDERS = ["공용", "그림", "다운로드", "데스크탑", "동영상", "문서", "블로그", "음악"];

/* 메모 장면의 글 — 첫 글은 MacFolio 메모 앱의 실제 글(CRA → Vite), 나머지는 README 의 기능 설명 */
const POSTS: { title: string; body: string }[] = [
  { title: "CRA에서 Vite로 옮기기", body: "이 포트폴리오는 원래 Create React App으로 만들었다. Vite로 옮기니 dev 서버 시작은 약 8배 빨라졌고, 설치되는 패키지는 1,438개에서 171개로 줄었다." },
  { title: "메모 = 블로그", body: "폴더(분류) · 목록/갤러리 보기 · 검색과 찾기·대치. 관리자로 로그인하면 글이 곧 편집기가 되고, 임시 저장 · 게시 · 버전 기록 · 예약 발행을 남긴다." },
  { title: "Safari = 프로젝트", body: "프로젝트마다 소개 페이지를 탭으로 넘겨 본다. 배포한 사이트는 Dock의 프로젝트 앱으로 창 안에서 바로 실행한다." },
];

const DEPLOY: { text: string; tone?: "cmd" | "ok" | "dim" }[] = [
  { text: "$ ops/deploy.sh sha-1a2b3c4", tone: "cmd" },
  { text: "▸ 태그 검사 · 잠금", tone: "dim" },
  { text: "▸ 배포 직전 백업", tone: "dim" },
  { text: "▸ .env  API_TAG=sha-1a2b3c4" },
  { text: "▸ docker compose pull api" },
  { text: "▸ docker compose up -d api" },
  { text: "▸ healthy 기다리는 중 … 마이그레이션", tone: "dim" },
  { text: "✓ healthy · 버전 확인", tone: "ok" },
  { text: "✓ 지금 · 이전 버전 말고 이미지 정리", tone: "ok" },
];

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
      <Stage full tone="dark" ratio="16 / 9" label={t({ ko: "MacFolio 데스크톱", en: "MacFolio desktop" })}>
        <DesktopScene />
      </Stage>

      <Flow>
        <Statement
          viewLang={viewLang}
          no="01"
          title={{ ko: "메모 앱이 곧 블로그다", en: "The Notes app is the blog" }}
          body={{ ko: "폴더는 분류, 메모는 글. 관리자로 로그인하면 글이 곧 편집기가 되고, 임시 저장 · 게시 · 버전 기록 · 예약 발행을 남깁니다.", en: "Folders are categories, notes are posts. Signed in as admin, a note becomes the editor — drafts, publishing, history, scheduling." }}
        />
        <Stage tone="accent" ratio="16 / 10" label={t({ ko: "메모 앱", en: "Notes app" })}>
          <NotesScene />
        </Stage>

        <Statement
          viewLang={viewLang}
          no="02"
          title={{ ko: "저장소를 Finder 로 둘러본다", en: "Browse the repository in Finder" }}
          body={{ ko: "Macintosh HD › 사용자 › 홈. 문서 · 블로그 · 사진 · 음악을 파일처럼 열고, 관리자는 파일을 끌어다 올립니다.", en: "Macintosh HD › Users › home. Open docs, posts, photos and music like files; admins drag files in to upload." }}
        />
        <Stage tone="light" ratio="16 / 10" label="Finder">
          <FinderScene />
        </Stage>

        <Statement
          viewLang={viewLang}
          no="03"
          title={{ ko: "서버까지 직접, 운영비는 0원", en: "Running the server too, for $0" }}
          body={{ ko: "프론트엔드는 Cloudflare Worker, API 는 무료 VM 한 대. 서버는 포트를 열지 않고 Tunnel 로만 요청을 받습니다. 배포가 건강하지 않으면 이전 버전으로 되돌립니다.", en: "Frontend on a Cloudflare Worker, API on one free VM. The server opens no ports and takes requests only through a Tunnel. Unhealthy deploys roll back." }}
        />
      </Flow>

      <Stage full tone="dark" ratio="16 / 8" label={t({ ko: "배포 터미널과 서버 구성", en: "Deploy terminal and topology" })}>
        <ServerScene />
      </Stage>

      <Flow>
        <Statement
          viewLang={viewLang}
          no="04"
          title={{ ko: "휴대폰으로 열면, iOS 홈 화면", en: "On a phone, it becomes an iOS home screen" }}
          body={{ ko: "같은 앱들이 아이콘으로 놓이고, 위젯에서 음악을 조작합니다.", en: "The same apps sit as icons, and a widget controls the music." }}
        />
        <Stage tone="accent" ratio="16 / 10" label={t({ ko: "휴대폰 홈 화면", en: "Phone home screen" })}>
          <PhoneScene />
        </Stage>

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

/** 화면에 들어와 있는가 — 들어오면 true, 나가면 false */
function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setInView(!!e?.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, inView] as const;
}

const reduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** 메뉴 막대의 시계 */
function useClock() {
  const [now, setNow] = useState<string>("");
  useEffect(() => {
    const fmt = () => new Date().toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });
    const tick = () => setNow(fmt());
    const first = requestAnimationFrame(tick);
    const id = window.setInterval(tick, 15_000);
    return () => { cancelAnimationFrame(first); window.clearInterval(id); };
  }, []);
  return now;
}

/** 첫 장면 — 바탕화면 · 메뉴 막대 · 바탕화면 폴더 · 열리는 메모 창 · Dock */
function DesktopScene() {
  const clock = useClock();
  return (
    <div className={styles.desktop} style={{ background: WALLPAPER }}>
      <span className={styles.mountain} style={{ background: MOUNTAINS }} aria-hidden />
      <span className={styles.mountainNear} style={{ background: MOUNTAINS_NEAR }} aria-hidden />

      <div className={styles.menubar} aria-hidden>
        <span className={styles.menuApple}>●</span>
        <b>메모</b><i>파일</i><i>편집</i><i>보기</i><i>윈도우</i><i>도움말</i>
        <span className={styles.menuRight}>{clock}</span>
      </div>

      <div className={styles.desktopIcons} aria-hidden>
        {["블로그", "프로젝트", "음악"].map((f, i) => (
          <span key={f} className={styles.deskFolder} style={delay(i)}><i />{f}</span>
        ))}
      </div>

      <div className={styles.window} aria-hidden>
        <WindowBar title="메모" />
        <div className={styles.notesMini}>
          <div className={styles.notesSide}>
            {["모든 글", "개발 기록", "MacFolio", "기술 노트", "회고"].map((f, i) => <span key={f} className={i === 0 ? styles.on : undefined}>{f}</span>)}
          </div>
          <div className={styles.notesList}>
            {POSTS.map((p, i) => <span key={p.title} className={i === 0 ? styles.on : undefined}>{p.title}</span>)}
          </div>
          <div className={styles.notesBody}>
            <b>{POSTS[0].title}</b>
            <span>{POSTS[0].body}</span>
          </div>
        </div>
      </div>

      <div className={styles.dock} aria-hidden>
        {APPS.map((a, i) => (
          <span key={a.name} className={styles.dockIcon} style={{ background: a.bg, ...delay(i) } as CSSProperties} title={a.name}>{a.glyph}</span>
        ))}
      </div>
    </div>
  );
}

function WindowBar({ title }: { title: string }) {
  return (
    <div className={styles.windowBar}>
      <span className={styles.lights}><i /><i /><i /></span>
      <span className={styles.windowTitle}>{title}</span>
    </div>
  );
}

/** 메모 앱 — 글을 차례로 골라 본문을 써 내려간다(화면에 보일 때만) */
function NotesScene() {
  const [ref, inView] = useInView<HTMLDivElement>();
  const [post, setPost] = useState(0);
  const [typed, setTyped] = useState(0);
  const body = POSTS[post].body;

  useEffect(() => {
    if (!inView) return;
    if (reduced()) { const r = requestAnimationFrame(() => setTyped(body.length)); return () => cancelAnimationFrame(r); }
    if (typed < body.length) {
      const id = window.setTimeout(() => setTyped((n) => n + 1), 28);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => { setPost((p) => (p + 1) % POSTS.length); setTyped(0); }, 2400);
    return () => window.clearTimeout(id);
  }, [inView, typed, body.length]);

  return (
    <div ref={ref} className={styles.scenePad}>
      <div className={`${styles.window} ${styles.windowBig}`}>
        <WindowBar title="메모" />
        <div className={styles.notesBig}>
          <div className={styles.notesSide}>
            {["모든 글", "인기글", "개발 기록", "MacFolio", "백엔드", "인프라", "프론트엔드", "회고"].map((f, i) => (
              <span key={f} className={i === 3 ? styles.on : undefined}>{f}</span>
            ))}
          </div>
          <div className={styles.notesList}>
            {POSTS.map((p, i) => (
              <span key={p.title} className={i === post ? styles.on : undefined}>
                <b>{p.title}</b>
                <small>{p.body.slice(0, 28)}…</small>
              </span>
            ))}
          </div>
          <div className={styles.notesBody}>
            <small className={styles.notesMeta}>2026. 9. 28 · 개발 기록 · MacFolio</small>
            <b className={styles.notesTitle}>{POSTS[post].title}</b>
            <span className={styles.notesText}>
              {body.slice(0, typed)}
              <i className={styles.caret} aria-hidden />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Finder — 홈 폴더의 폴더들, 선택이 차례로 옮겨 간다 */
function FinderScene() {
  const [ref, inView] = useInView<HTMLDivElement>();
  const [picked, setPicked] = useState(6);
  useEffect(() => {
    if (!inView || reduced()) return;
    const id = window.setInterval(() => setPicked((p) => (p + 1) % FOLDERS.length), 1400);
    return () => window.clearInterval(id);
  }, [inView]);
  return (
    <div ref={ref} className={styles.scenePad}>
      <div className={`${styles.window} ${styles.windowBig} ${styles.windowLight}`}>
        <WindowBar title="hyeoniverse" />
        <div className={styles.finder}>
          <div className={styles.finderSide}>
            <small>즐겨찾기</small>
            {["AirDrop", "최근 항목", "응용 프로그램", "데스크탑", "문서", "다운로드"].map((f) => <span key={f}>{f}</span>)}
            <small>위치</small>
            <span>Macintosh HD</span>
          </div>
          <div className={styles.finderMain}>
            <div className={styles.finderPath}>Macintosh HD › 사용자 › hyeoniverse</div>
            <div className={styles.finderGrid}>
              {FOLDERS.map((f, i) => (
                <span key={f} className={`${styles.folder} ${i === picked ? styles.folderOn : ""}`}>
                  <i />
                  <b>{f}</b>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 서버 — ops/deploy.sh 를 다시 도는 터미널(한 줄씩) · 브라우저 → Cloudflare → Tunnel → VM 구성(요청 점이 흐른다) */
function ServerScene() {
  const [ref, inView] = useInView<HTMLDivElement>();
  const [lines, setLines] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (reduced()) { const r = requestAnimationFrame(() => setLines(DEPLOY.length)); return () => cancelAnimationFrame(r); }
    const id = window.setTimeout(() => setLines((n) => (n >= DEPLOY.length ? 0 : n + 1)), lines >= DEPLOY.length ? 3200 : 520);
    return () => window.clearTimeout(id);
  }, [inView, lines]);
  return (
    <div ref={ref} className={styles.server}>
      <div className={styles.terminal}>
        <WindowBar title="deploy — ssh" />
        <div className={styles.terminalBody}>
          {DEPLOY.slice(0, lines).map((l, i) => (
            <span key={i} className={l.tone ? styles[`term_${l.tone}`] : undefined}>{l.text}</span>
          ))}
          <i className={styles.caret} aria-hidden />
        </div>
      </div>
      <div className={styles.topology} aria-hidden>
        {[
          { name: "브라우저", note: "React SPA" },
          { name: "Cloudflare", note: "Worker · 정적 파일" },
          { name: "Tunnel", note: "바깥으로만 연결" },
          { name: "Oracle VM", note: "NestJS · PostgreSQL · 열린 포트 0" },
        ].map((n, i) => (
          <div key={n.name} className={styles.node} style={delay(i)}>
            <b>{n.name}</b>
            <small>{n.note}</small>
            {i < 3 && <span className={styles.wire}><i /></span>}
          </div>
        ))}
      </div>
    </div>
  );
}

/** 휴대폰 — 위젯(음악) · 앱 아이콘 · Dock */
function PhoneScene() {
  return (
    <div className={styles.phones}>
      {[0, 1].map((k) => (
        <div key={k} className={`${styles.phone} ${k === 1 ? styles.phoneBack : ""}`} style={{ background: WALLPAPER }}>
          <span className={styles.phoneTime}>12:59</span>
          <div className={styles.widget}>
            <small>PORTFOLIO</small>
            <b>김정현</b>
            <span>Frontend Focused Fullstack Developer</span>
          </div>
          <div className={styles.widget}>
            <small>지금 재생 중</small>
            <b>Inochi No Namae</b>
            <span className={styles.widgetBar}><i /></span>
          </div>
          <div className={styles.phoneGrid}>
            {APPS.slice(0, 8).map((a) => <span key={a.name} style={{ background: a.bg }}>{a.glyph}</span>)}
          </div>
          <div className={styles.phoneDock}>
            {APPS.slice(2, 6).map((a) => <span key={a.name} style={{ background: a.bg }}>{a.glyph}</span>)}
          </div>
        </div>
      ))}
    </div>
  );
}
