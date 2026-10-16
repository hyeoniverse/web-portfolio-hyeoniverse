"use client";

/* 기능 장 — 형식이 다른 장면들. 모두 프레지 프레임 하나(한 화면)에 들어가고, 휠 · 키 한 번이 프레임 안 단계를 넘긴다.
   1 공개 화면: 단계마다 카메라가 다음 화면 캡처로 옮겨 가 가운데에 크게 놓는다
   2 작업물 레이아웃: 실제 /works?layout= 을 브라우저 창에 띄우고, 단계마다 레이아웃을 바꾼다
   3 몽이: 3D 마스코트 — 단계마다 손길을 하나씩 해 보인다(SceneMascot)
   4 관리자: 단계마다 기능 하나 — 그 기능의 화면들은 저절로 넘어간다
   5 관리자를 직접: 첫 단계는 여섯 데모의 목차, 다음 단계부터 같은 크기 창 안에서 데모 하나씩
   6 발표 갤러리 · 파형 편집 · 발표 파일 변환: 프레임 셋으로 나눴다
   7 테마: 프리셋이 저절로 바뀌고, 다음 단계에서 대비 점검표가 들어온다 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Pressable from "@/components/ui/Pressable";
import { THEME_PRESETS } from "@/app/admin/(dashboard)/settings/_data/settingsConstants";
import { auditTheme } from "@/lib/themeAudit";
import { publicScene, layoutsScene, adminScene, adminItems, voiceScene, cmsScene, themeScene } from "../../_data/features";
import type { L10n } from "../../_data/showcase";
import { AutoBar, BrowserFrame, RowNum, SceneHead, ShotMedia, STAR_PATH, useAutoStep, useL, useShotSrc, useTouchInput, WithCode } from "./shared";
import { useFrameSteps } from "../prezi/context";
import FitZoom from "./FitZoom";
import { SlidesDemo, WaveDemo, ConvertDemo } from "../demos/media";
import { cmsDemos } from "../demos/cms";
import { DemoChip, DemoReplayContext, DemoStatusContext, type DemoStatus } from "../demos/cms/Script";
import { GuideAnchor } from "../guide/GuideStar";
import { WORKS_LAYOUT_MESSAGE } from "@/lib/worksLayoutMessage";
import styles from "./Features.module.css";

const pad = (n: number) => String(n).padStart(2, "0");

/** 단계 점 — 지금 단계가 길게, 누르면 그 단계로 */
function StepDots({ n, step, setStep, label }: { n: number; step: number; setStep: (i: number) => void; label: (i: number) => string }) {
  return (
    <ol className={styles.dots}>
      {Array.from({ length: n }, (_, i) => (
        <li key={i}>
          <Pressable className={styles.dot} data-on={i === step || undefined} aria-label={label(i)} title={label(i)} onClick={() => setStep(i)} />
        </li>
      ))}
    </ol>
  );
}

/** 별자리 단계 표시 — 왼쪽에 "01 / 06"(숫자 폭 고정, 바뀌어도 자리 그대로), 오른쪽에 점선에 꿰인 별 줄.
    빛나는 별 하나가 지금 단계로 미끄러진다. 별을 누르면 그 단계로 */
function StarSteps({ n, step, setStep, label }: { n: number; step: number; setStep: (i: number) => void; label: (i: number) => string }) {
  return (
    <div className={styles.starSteps}>
      <span className={styles.starCount} aria-hidden>
        {pad(step + 1)} / {pad(n)}
      </span>
      <nav className={styles.cmsStars} aria-label={label(step)}>
        <ol className={styles.cmsStarRow}>
          {Array.from({ length: n }, (_, i) => (
            <li key={i}>
              <Pressable
                className={styles.cmsStar}
                data-on={i === step || undefined}
                data-done={i < step || undefined}
                aria-current={i === step || undefined}
                aria-label={label(i)}
                title={label(i)}
                onClick={() => setStep(i)}
              >
                <svg viewBox="0 0 100 100" aria-hidden="true">
                  <path d={STAR_PATH} />
                </svg>
              </Pressable>
            </li>
          ))}
        </ol>
        <span className={styles.cmsStarGlow} style={{ "--at": step } as React.CSSProperties} aria-hidden="true">
          <svg viewBox="0 0 100 100">
            <path d={STAR_PATH} />
          </svg>
        </span>
      </nav>
    </div>
  );
}

/* ── 1 · 공개 화면 — 화면 캡처를 가로로 늘어놓고, 단계마다 카메라가 다음 장으로 옮겨 간다.
   가운데 장은 크게, 양옆은 작고 흐리게 — 옆 장을 누르면 그 장으로 ── */

export function ScenePublic() {
  const L = useL();
  const shotSrc = useShotSrc();
  const cards = publicScene.cards;
  const { step, setStep } = useFrameSteps(cards.length);
  const card = cards[step];
  return (
    <section className={`${styles.pz} ${styles.pub}`}>
      <div className={styles.pzTop}>
        <SceneHead label={publicScene.label} title={publicScene.title} />
        <StarSteps n={cards.length} step={step} setStep={setStep} label={(i) => L(cards[i].title)} />
      </div>
      <div className={styles.pubStage}>
        {cards.map((c, i) => {
          const o = i - step;
          const pos = o === 0 ? "center" : Math.abs(o) === 1 ? "side" : "far";
          return (
            <Pressable
              key={i}
              className={styles.pubCard}
              data-pos={pos}
              style={{ "--o": o } as React.CSSProperties}
              tabIndex={pos === "far" ? -1 : undefined}
              aria-label={L(c.title)}
              onClick={() => setStep(i)}
            >
              <Image className={styles.media} src={shotSrc(c.shot)} alt="" fill sizes="(width <= 1024px) 85vw, 60vw" />
            </Pressable>
          );
        })}
      </div>
      <div className={styles.pubCaption} key={step}>
        <span className={styles.num}>{pad(step + 1)}</span>
        <h4 className={styles.pageTitle}>{L(card.title)}</h4>
        <p className={styles.pageBody}>{L(card.body)}</p>
      </div>
    </section>
  );
}

/* ── 2 · 작업물 레이아웃 — 실제 페이지를 창에 띄운다. 창 안은 보기 전용(스크롤이 갇히지 않게) ── */

/** 데스크톱 폭(1440)으로 그린 페이지를 창 폭에 맞게 줄인다 */
const IFRAME_W = 1440;
const IFRAME_H = 900;
/** 창 안 자동 스크롤 — 휠 양(px/ms), 내려가는 시간(ms), 끝 · 처음에서 쉬는 시간(ms) */
const AUTO_SCROLL_SPEED = 0.25;
const AUTO_SCROLL_DOWN = 9000;
const AUTO_SCROLL_REST = 1500;

export function SceneLayouts() {
  const L = useL();
  const n = layoutsScene.layouts.length;
  const { step: index, setStep } = useFrameSteps(n);
  const ref = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [near, setNear] = useState(false);
  const [scale, setScale] = useState(0.5);
  const layout = layoutsScene.layouts[index];
  /* iframe 은 처음 고른 배치로 한 번만 불러오고, 단계가 바뀌면 그 안에서 배치만 바꾼다(WorksSection 이 메시지를 받는다).
     배치마다 주소를 바꿔 새로 불러오면 로딩 화면 · 데이터 · 3D 를 매번 다시 받아 몇 초씩 걸렸다 */
  const [firstKey] = useState(layout.key);
  const [loaded, setLoaded] = useState(false);

  /* 가까워졌을 때만 페이지를 불러온다 */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setNear(true); }, { rootMargin: "100% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const ro = new ResizeObserver(() => setScale(body.clientWidth / IFRAME_W));
    ro.observe(body);
    return () => ro.disconnect();
  }, []);

  /* 불러온 뒤 창 안 페이지를 천천히 내린다 — 레이아웃마다 움직이는 방식이 달라(Lenis · 휠로 도는 원통 · 가로 갤러리)
     스크롤 값을 바꾸는 대신 창 안에 휠 이벤트를 흘려 넣는다. 일정 시간 내려가고, 쉬고, 내려간 만큼 되돌아온 뒤
     다시. 레이아웃이 바뀌거나(iframe 이 새로 그려짐) 장면을 떠나면 멈춘다 */
  const scrollLoop = useRef<{ stop: () => void } | null>(null);
  useEffect(() => () => scrollLoop.current?.stop(), []);
  const startLoop = (wait: number) => {
    scrollLoop.current?.stop();
    const frame = frameRef.current;
    const win = frame?.contentWindow;
    if (!frame || !win) return;
    let raf = 0, timer = 0, stopped = false, last = 0, phaseStart = 0, sent = 0;
    let phase: "down" | "up" = "down";
    const stop = () => { stopped = true; cancelAnimationFrame(raf); clearTimeout(timer); };
    scrollLoop.current = { stop };
    const wheel = (deltaY: number) => {
      try {
        const target = win.document.elementFromPoint(IFRAME_W / 2, IFRAME_H / 2) ?? win.document.body;
        target.dispatchEvent(new (win as Window & typeof globalThis).WheelEvent("wheel", { deltaY, bubbles: true, cancelable: true }));
      } catch {
        stop(); // 다른 출처면 그만둔다
      }
    };
    const tick = (now: number) => {
      if (stopped || !frame.isConnected) return;
      const dt = last ? Math.min(50, now - last) : 16;
      last = now;
      if (!phaseStart) phaseStart = now;
      if (phase === "down") {
        const d = dt * AUTO_SCROLL_SPEED;
        sent += d;
        wheel(d);
        if (now - phaseStart > AUTO_SCROLL_DOWN) {
          phase = "up";
          phaseStart = 0;
          last = 0;
          timer = window.setTimeout(() => { raf = requestAnimationFrame(tick); }, AUTO_SCROLL_REST);
          return;
        }
      } else {
        /* 되돌아오기는 빠르게 — 내려간 만큼만 */
        const d = Math.min(sent, dt * AUTO_SCROLL_SPEED * 4);
        sent -= d;
        wheel(-d);
        if (sent <= 0) {
          phase = "down";
          phaseStart = 0;
          last = 0;
          timer = window.setTimeout(() => { raf = requestAnimationFrame(tick); }, AUTO_SCROLL_REST);
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    /* 로딩 화면 · 배치가 자리 잡을 때까지 기다렸다 시작 */
    timer = window.setTimeout(() => { raf = requestAnimationFrame(tick); }, wait);
  };
  const onLoad = () => {
    setLoaded(true);
    startLoop(2000);
  };

  /* 단계가 바뀌면 이미 불러온 창 안에서 배치만 바꾸고, 자동 내리기를 처음부터 */
  const shownKey = useRef(firstKey);
  useEffect(() => {
    if (!loaded || shownKey.current === layout.key) return;
    shownKey.current = layout.key;
    frameRef.current?.contentWindow?.postMessage({ type: WORKS_LAYOUT_MESSAGE, layout: layout.key }, window.location.origin);
    startLoop(900);
  }, [loaded, layout.key]);

  const url = `/works?layout=${layout.key}`;
  return (
    <section ref={ref} className={`${styles.pz} ${styles.layouts}`}>
      <div className={styles.layoutsText}>
        <SceneHead label={layoutsScene.label} title={layoutsScene.title} body={layoutsScene.body} />
        <ol className={styles.stepList}>
          {layoutsScene.layouts.map((l, i) => (
            <li key={l.key}>
              <Pressable className={styles.stepRow} data-on={i === index || undefined} onClick={() => setStep(i)}>
                <RowNum n={i + 1} />
                <span className={styles.stepName}>{l.key[0].toUpperCase() + l.key.slice(1)}</span>
                <span className={styles.stepNote}>{L(l.note)}</span>
              </Pressable>
            </li>
          ))}
        </ol>
      </div>
      <div className={styles.fitBox}>
        <div className={styles.layoutsWindow}>
          <BrowserFrame
            guide
            url={`hyeoniverse.com${url}`}
            actions={
              <a className={styles.browserOpen} href={url} target="_blank" rel="noreferrer">
                {L(layoutsScene.open)} ↗
              </a>
            }
          >
            <div ref={bodyRef} className={styles.iframeBox} style={{ "--scale": scale } as React.CSSProperties}>
              {near && (
                <iframe
                  ref={frameRef}
                  className={styles.iframe}
                  src={`/works?layout=${firstKey}`}
                  title={`works — ${layout.key}`}
                  width={IFRAME_W}
                  height={IFRAME_H}
                  tabIndex={-1}
                  onLoad={onLoad}
                />
              )}
            </div>
          </BrowserFrame>
        </div>
      </div>
    </section>
  );
}

/* ── 4 · 관리자 — 단계마다 기능 하나. 그 기능의 화면(2~4장)은 칩으로 고르거나 저절로 넘어간다 ── */

/** 한 기능의 화면들 — 기능이 바뀌면 새로 그려 첫 화면부터 다시 센다 */
function AdminShots({ item }: { item: (typeof adminItems)[number] }) {
  const L = useL();
  const shotSrc = useShotSrc();
  const { ref, index, go } = useAutoStep<HTMLDivElement>(item.shots.length, 3500);
  const shot = item.shots[index];
  return (
    <div ref={ref} className={styles.adminStage}>
      <div className={styles.fitBox}>
        {/* 화면과 그 바로 아래 화면 고르기 — 둘이 한 덩어리로, 고르기 줄은 화면 폭에 맞춘다 */}
        <div className={styles.adminShotWrap}>
          <div className={styles.adminShot}>
            <ShotMedia src={shotSrc(shot)} video={shot.video} alt={`${L(item.title)} — ${L(shot.label)}`} sizes="(width <= 1024px) 100vw, 60vw" />
          </div>
          <div className={styles.shotTabs} role="tablist" aria-label={L(item.title)}>
            {item.shots.map((s, j) => (
              <Pressable key={j} role="tab" aria-selected={j === index} className={styles.shotTab} data-on={j === index || undefined} onClick={() => go(j)}>
                {/* 지금 화면 — 앞에 길잡이 별이 앉고, 아래 선이 다음 화면까지 남은 시간만큼 찬다 */}
                {j === index && <GuideAnchor size="0.9rem" />}
                {L(s.label)}
                {j === index && <span className={styles.shotTabBar} aria-hidden />}
              </Pressable>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SceneAdmin() {
  const L = useL();
  const { step, setStep } = useFrameSteps(adminItems.length);
  const item = adminItems[step];
  return (
    <section className={`${styles.pz} ${styles.admin}`}>
      <div className={styles.adminText}>
        <div className={styles.pzTop}>
          <SceneHead label={adminScene.label} title={adminScene.title} />
          <span className={styles.stepCount} aria-hidden>
            {pad(step + 1)} / {pad(adminItems.length)}
          </span>
        </div>
        <ol className={styles.adminIndex}>
          {adminItems.map((it, i) => (
            <li key={i} data-on={i === step || undefined}>
              <Pressable className={styles.adminIndexRow} data-on={i === step || undefined} onClick={() => setStep(i)}>
                <RowNum n={i + 1} />
                {L(it.title)}
              </Pressable>
              {i === step && (
                <div className={styles.adminDetail}>
                  <p className={styles.adminBody}><WithCode text={L(it.body)} /></p>
                  <ul className={styles.points}>
                    {it.points.map((p, j) => (
                      <li key={j}>{L(p)}</li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ol>
      </div>
      <AdminShots key={step} item={item} />
    </section>
  );
}

/* ── 4-1 · 관리자를 직접 — 관리자 화면의 규칙대로 움직이는 작은 화면 여섯 개.
   첫 단계는 목차(데모마다 무엇을 보여 주는지 한 줄), 다음 단계부터 데모 하나씩. 데모 창은 크기가 하나로 정해져 있어
   데모를 바꿔도 틀이 들썩이지 않는다. 데모는 보이면 짧은 대본을 한 번 돌리고, '다시 보기'는 데모를 새로 띄워 처음부터.
   화면마다 보이는 규칙 · 숫자는 이 레포 코드에서 확인한 값이다(demos/cms/data) ── */

/** 목차 별자리 — 데모 별 여섯의 자리(넓은 화면, 상자 대비 %). 위아래로 엇갈려 점선이 지그재그로 잇는다.
    양끝은 안쪽으로 — 별 아래 가운데 놓이는 이름이 상자 가장자리에서 잘리지 않게 */
const CMS_MAP: [number, number][] = [
  [12, 28],
  [27, 68],
  [42, 24],
  [58, 66],
  [73, 26],
  [88, 64],
];

export function SceneCms() {
  const L = useL();
  const { step, setStep } = useFrameSteps(cmsDemos.length + 1);
  const [run, setRun] = useState(0);
  const replay = useCallback(() => setRun((r) => r + 1), []);
  /* 데모의 대본 상태 — 자동 재생 · 처음부터 칩을 왼쪽 설명의 '해 볼 차례' 아래에 그린다 */
  const [demoStatus, setDemoStatus] = useState<DemoStatus | null>(null);
  const pick = Math.max(0, step - 1);
  const demo = cmsDemos[pick];
  const Demo = demo.Component;
  const open = step > 0;

  /* 별자리로 확대해 들어가기 — 목차가 고른 별을 중심으로 커지며 사라지고, 데모 창이 같은 별에서 자라 나온다(돌아올 땐 거꾸로).
     별 자리는 목차가 제 크기일 때(닫혀 있을 때) 재어 둔다 — 열려 있으면 목차가 확대돼 있어 잴 수 없다 */
  const sectionRef = useRef<HTMLElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const origins = useRef<string[]>([]);
  useEffect(() => {
    const intro = introRef.current;
    if (!intro || open) return;
    const measure = () => {
      const ir = intro.getBoundingClientRect();
      if (!ir.width || !ir.height) return;
      origins.current = [...intro.querySelectorAll("[data-cms-star]")].map((el) => {
        const r = el.getBoundingClientRect();
        const x = ((r.left + r.width / 2 - ir.left) / ir.width) * 100;
        const y = ((r.top + r.height / 2 - ir.top) / ir.height) * 100;
        return `${x.toFixed(1)}% ${y.toFixed(1)}%`;
      });
    };
    /* 별이 차례로 떠오르는 등장이 끝난 뒤에 잰다 */
    const t = window.setTimeout(measure, 1200);
    const ro = new ResizeObserver(measure);
    ro.observe(intro);
    return () => {
      window.clearTimeout(t);
      ro.disconnect();
    };
  }, [open]);
  /* 바뀌는 그 순간의 스타일 계산에 들어가야 해서 그리기 전에 넣는다 */
  useLayoutEffect(() => {
    const o = origins.current[pick];
    if (o) sectionRef.current?.style.setProperty("--z-origin", o);
  }, [pick, open]);

  return (
    <section ref={sectionRef} className={`${styles.pz} ${styles.cms}`} data-cms-scene="" data-open={open || undefined}>
      {/* 목차 — 여섯 데모가 무엇을 보여 주는지 */}
      <div ref={introRef} className={styles.cmsIntro} aria-hidden={open || undefined} inert={open || undefined}>
        <SceneHead label={cmsScene.label} title={cmsScene.title} body={cmsScene.body} />
        {/* 목차 — 데모 여섯이 별자리처럼 놓인다(넓은 화면은 지그재그로 점선에 꿰인 별, 좁은 화면은 세로 별 줄).
            들어오면 선이 그려지고 별이 차례로 켜진다. 별을 누르면 그 데모로 */}
        <div className={styles.cmsSky}>
          <svg className={styles.cmsSkyLine} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <polyline points={CMS_MAP.map(([x, y]) => `${x},${y}`).join(" ")} pathLength={1} />
          </svg>
          <ol className={styles.cmsIndex}>
            {cmsDemos.map((d, i) => (
              <li
                key={d.id}
                data-picked={(open && i === pick) || undefined}
                style={{ "--x": `${CMS_MAP[i][0]}%`, "--y": `${CMS_MAP[i][1]}%`, "--i": i } as React.CSSProperties}
              >
                <Pressable className={styles.cmsNode} onClick={() => setStep(i + 1)}>
                  <svg className={styles.cmsNodeStar} viewBox="0 0 100 100" aria-hidden="true" data-cms-star="">
                    <path d={STAR_PATH} />
                  </svg>
                  <span className={styles.cmsNodeText}>
                    <span className={styles.cmsNodeName}>
                      <span className={styles.cmsNum}>{pad(i + 1)}</span> {L(d.label)}
                    </span>
                    <span className={styles.cmsNodeWhat}>{L(d.title)}</span>
                  </span>
                </Pressable>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* 데모 창 — 크기는 하나로 정해져 있다 */}
      <div className={styles.cmsConsole} aria-hidden={!open || undefined} inert={!open || undefined}>
        <div className={styles.cmsBar}>
          {/* 데모 고르기 — 작은 별자리. 옅은 점선 위 별 여섯(지나온 데모는 흰 별, 아직은 희미한 별)을 따라
              빛나는 강조색 별 하나가 지금 데모 자리로 미끄러져 간다 */}
          <nav className={styles.cmsStars} aria-label={L(cmsScene.label)}>
            <ol className={styles.cmsStarRow}>
              {cmsDemos.map((d, i) => (
                <li key={d.id}>
                  <Pressable
                    className={styles.cmsStar}
                    data-on={i === pick || undefined}
                    data-done={i < pick || undefined}
                    aria-current={i === pick || undefined}
                    aria-label={`${pad(i + 1)} ${L(d.label)}`}
                    title={L(d.label)}
                    onClick={() => {
                      setStep(i + 1);
                      setRun(0);
                    }}
                  >
                    <svg viewBox="0 0 100 100" aria-hidden="true">
                      <path d={STAR_PATH} />
                    </svg>
                  </Pressable>
                </li>
              ))}
            </ol>
            <span className={styles.cmsStarGlow} style={{ "--at": pick } as React.CSSProperties} aria-hidden="true">
              <svg viewBox="0 0 100 100">
                <path d={STAR_PATH} />
              </svg>
            </span>
          </nav>
        </div>
        <div key={demo.id} className={styles.cmsStage} data-cms-stage="">
          <div className={styles.cmsCopy}>
            {/* 지금 데모 — 장 이름과 번호 · 이름. 오른쪽 데모의 첫 줄과 같은 줄에 선다(별 줄은 그 위로 튀어나온다) */}
            <p className={styles.cmsBarTitle}>
              <span className={styles.sceneLabel}>{L(cmsScene.label)}</span>
              <span key={demo.id} className={styles.cmsStarsNow}>
                <span className={styles.cmsNum}>{pad(pick + 1)}</span> {L(demo.label)}
              </span>
            </p>
            <h3 className={styles.cmsTitle}>{L(demo.title)}</h3>
            {/* 왜 필요한지 — 이 장치가 막는 문제(강조) → 어떻게 하는지 */}
            <p className={styles.cmsWhy}>{L(demo.why)}</p>
            <p className={styles.cmsWhat}>{L(demo.what)}</p>
            <ol className={styles.cmsSteps} aria-label={L(cmsScene.steps)}>
              {demo.steps.map((s, i) => (
                <li key={i}>
                  <span className={styles.cmsStepNum}>{i + 1}</span>
                  {L(s)}
                </li>
              ))}
            </ol>
            {/* 자동 재생 · 처음부터 — 누르면 데모의 대본도 멈춘다 */}
            {demoStatus && (
              <div className={styles.cmsChipSlot} onPointerDownCapture={demoStatus.stop}>
                <DemoChip playing={demoStatus.playing} onReplay={replay} />
              </div>
            )}
          </div>
          {/* 데모가 창보다 크면(작은 화면) 잘리거나 스크롤되지 않게 조금 줄인다. 처음부터 다시 보기는 데모 위 상태 칩 끝에 붙는다 */}
          <DemoReplayContext.Provider value={replay}>
            <DemoStatusContext.Provider value={setDemoStatus}>
              <FitZoom className={styles.cmsDemo}>{open && <Demo key={run} />}</FitZoom>
            </DemoStatusContext.Provider>
          </DemoReplayContext.Provider>
        </div>
      </div>
    </section>
  );
}

/* ── 5 · 발표 갤러리 · 편집 — 프레임 셋. 실제 작업물 갤러리처럼 발표 슬라이드를 Fish 음성과 자막으로 넘기고(SlidesDemo),
   그 음성을 만드는 편집 화면의 두 도구(파형 편집 · PDF/PPTX 변환)를 다음 두 프레임에 하나씩 둔다. 셋 다 직접 만질 수 있다 ── */

export function SceneVoice() {
  return (
    <section className={`${styles.pz} ${styles.voice}`}>
      <SceneHead label={voiceScene.label} title={voiceScene.title} body={voiceScene.body} />
      <div className={styles.voiceSlides}>
        <SlidesDemo />
      </div>
    </section>
  );
}

/** 편집 도구 프레임의 글 칸 — 머리, 무엇인지, 해 볼 차례 */
function VoiceToolText({ title, body, steps }: { title: L10n; body: L10n; steps?: (L10n & { touch?: L10n })[] }) {
  const L = useL();
  const touch = useTouchInput();
  return (
    <div className={styles.voiceToolText}>
      <SceneHead label={voiceScene.label} title={title} body={body} />
      {steps && (
        <ol className={styles.toolSteps} aria-label={L(cmsScene.steps)}>
          {steps.map((s, i) => (
            <li key={i}>
              <span className={styles.cmsStepNum}>{i + 1}</span>
              {L(touch && s.touch ? s.touch : s)}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function SceneVoiceWave() {
  return (
    <section className={`${styles.pz} ${styles.voiceTool}`}>
      <VoiceToolText title={voiceScene.wave} body={voiceScene.waveBody} steps={voiceScene.waveSteps} />
      <div className={styles.voiceToolBody}>
        <WaveDemo />
      </div>
    </section>
  );
}

export function SceneVoiceConvert() {
  return (
    <section className={`${styles.pz} ${styles.voiceTool}`}>
      <VoiceToolText title={voiceScene.convert} body={voiceScene.convertBody} />
      <div className={styles.voiceToolBody}>
        <ConvertDemo />
      </div>
    </section>
  );
}

/* ── 6 · 테마 — 프리셋(설정 화면의 THEME_PRESETS)이 저절로 차례로 입혀진다. 다음 단계에서 미니 홈이 위로 물러나고
   설정 화면과 같은 auditTheme 로 계산한 대비 점검표가 들어온다 ── */

function MiniHome({ bg, text, accent }: { bg: string; text: string; accent: string }) {
  const s = themeScene.sample;
  return (
    <div className={styles.miniHome} style={{ background: bg, color: text }}>
      <span className={styles.miniEyebrow} style={{ color: accent }}>{s.eyebrow}</span>
      <span className={styles.miniTitle}>{s.title}</span>
      <span className={styles.miniTitle}>
        <em style={{ color: accent }}>{s.accent}</em>
      </span>
      <span className={styles.miniButton} style={{ borderColor: text }}>{s.button}</span>
    </div>
  );
}

/** 테마 장면의 두 단계 — 점 이름 */
const THEME_STEPS = [
  { ko: "프리셋", en: "Presets" },
  { ko: "대비 점검", en: "Contrast check" },
];

export function SceneTheme() {
  const L = useL();
  const { step, setStep } = useFrameSteps(2);
  const n = THEME_PRESETS.length;
  const { ref, index, go: goTo } = useAutoStep<HTMLElement>(n, 2200);
  const preset = THEME_PRESETS[index];
  const t = preset.theme;
  const audit = useMemo(() => auditTheme(t), [t]);
  /* 2단계 — 줄어든 미니 홈과 점검표를 한 덩어리로 무대 가운데에 둔다. 둘의 실제 높이를 재어 CSS 에 넘긴다 */
  const stageRef = useRef<HTMLDivElement>(null);
  const pairRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  useEffect(() => {
    const stage = stageRef.current, pair = pairRef.current, table = tableRef.current;
    if (!stage || !pair || !table) return;
    const read = () => {
      stage.style.setProperty("--pair-h", `${pair.offsetHeight}px`);
      stage.style.setProperty("--tbl-h", `${table.offsetHeight}px`);
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(pair);
    ro.observe(table);
    return () => ro.disconnect();
  }, []);
  return (
    <section ref={ref} className={`${styles.pz} ${styles.theme}`} data-step={step}>
      <div className={styles.themeText}>
        <SceneHead label={themeScene.label} title={themeScene.title} body={themeScene.body} />
        <div className={styles.swatches}>
          {THEME_PRESETS.map((p, i) => (
            <Pressable
              key={p.name}
              className={styles.swatch}
              data-on={i === index || undefined}
              style={{ "--sw": p.theme.accentColor } as React.CSSProperties}
              onClick={() => goTo(i)}
              aria-label={p.name}
            />
          ))}
        </div>
        <AutoBar />
        <span className={styles.presetName}>
          <span className={styles.num}>{pad(index + 1)}</span> {preset.name} <GuideAnchor size="0.8em" fill={t.accentColor} />
        </span>
        <StepDots n={2} step={step} setStep={setStep} label={(i) => L(THEME_STEPS[i])} />
      </div>
      <div ref={stageRef} className={styles.themeStage}>
        <div ref={pairRef} className={styles.miniPair}>
          <MiniHome bg={t.lightBg} text={t.lightText} accent={t.accentColor} />
          <MiniHome bg={t.darkBg} text={t.darkText} accent={t.accentColor} />
        </div>
        <table ref={tableRef} className={styles.auditTable} aria-hidden={step === 0 || undefined}>
          <thead>
            <tr>
              <th />
              {audit.modes.map((m) => (
                <th key={m.mode}>{m.mode === "light" ? "Light" : "Dark"}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {audit.modes[0].rows.map((row, ri) => (
              <tr key={row.key}>
                <th>{L(themeScene.rows[row.key])}</th>
                {audit.modes.map((m) => {
                  const r = m.rows[ri];
                  return (
                    <td key={m.mode} data-status={r.status}>
                      {r.key === "distinct" ? `ΔE ${r.value.toFixed(0)}` : `${r.value.toFixed(1)}:1`}
                      {r.grade && <span className={styles.grade}>{r.grade === "미달" ? L(themeScene.fail) : r.grade}</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
