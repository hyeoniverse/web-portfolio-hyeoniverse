"use client";

/* 몽이 — 사이트의 3D 마스코트. 밤하늘 무대에 몽이 자리(BunnyDock)를 두고, 섹션이 화면에 있는 동안만 떠다니는
   몽이(FloatingObject)를 띄워 그 자리에 내려앉힌다. 직접 만지면 프로필과 똑같이 반응하고(볼 잡기 · 쓰다듬기 ·
   찌르기 · 끌어 돌리기 · 3D 손 커서), 오른쪽 목록의 항목을 누르면 같은 손길을 몽이가 스스로 해 보인다.
   스스로 해 보이기는 직접 만질 때 입력 상자가 하는 일 — profileSectionStore 의 bunnyTouch · bunnyDrag 를 고치는
   것 — 을 시간에 맞춰 대신 하는 것이다. 말풍선은 프로필의 몽이 패널 차례(1)에 맞춘다.
   프레지에서는 단계가 여섯 — 0 은 소개, 1~5 는 손길 하나씩. 단계에 들어서면 몽이가 그 손길을 해 보인다 */
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Pressable from "@/components/ui/Pressable";
import BunnyDock from "@/app/profile/_components/BunnyShowcase/BunnyDock";
import { useProfileSectionStore } from "@/stores/profileSectionStore";
import { bunnyProfile } from "@/data/profile";
import { RowNum, useL } from "./shared";
import { useFrameSteps } from "../prezi/context";
import { GuideAnchor } from "../guide/GuideStar";
import NightSky from "@/app/profile/_components/BunnyShowcase/NightSky";
import styles from "./Features.module.css";
import { useAboutText } from "../../_panels/AboutConfig";
import type { mascotScene as mascotBase } from "../../_data/features";

const FloatingObject = dynamic(() => import("@/app/profile/_components/FloatingObject/FloatingObject"), { ssr: false });

/** 프로필에서 몽이 패널의 차례 — 말풍선 글(profilePage.bubble.1)이 이것으로 정해진다 */
const BUNNY_SECTION = 1;

type Act = (typeof mascotBase.acts)[number]["key"];

/** 몽이 자리 상자 안의 한 점(0~1)을 화면 정규 좌표(NDC)로 — 입력 상자가 넘기는 것과 같은 좌표계 */
function ndcIn(el: HTMLElement, fx: number, fy: number) {
  const r = el.getBoundingClientRect();
  const x = r.left + r.width * fx;
  const y = r.top + r.height * fy;
  return { x: (x / window.innerWidth) * 2 - 1, y: -(y / window.innerHeight) * 2 + 1 };
}

/** ms 동안 매 프레임 f(0~1) 를 부르고, 끝나면 done. 돌려받은 함수로 멈춘다 */
function animate(ms: number, f: (t: number) => void, done: () => void) {
  const start = performance.now();
  let raf = 0;
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / ms);
    f(t);
    if (t < 1) raf = requestAnimationFrame(step);
    else done();
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

/** 단계에 들어선 뒤 손길을 시작하기까지 — 처음 들어올 땐 몽이가 자리에 내려앉을 때를 기다린다(ms) */
const ACT_DELAY = 350;
const ACT_DELAY_FIRST = 1100;

export default function SceneMascot() {
  const { mascotScene } = useAboutText().features;
  const L = useL();
  const acts = mascotScene.acts;
  const { step, setStep, current } = useFrameSteps(acts.length + 1);
  /* 같은 단계를 다시 눌렀을 때도 다시 해 보이게 바꾸는 번호 */
  const [nonce, setNonce] = useState(0);
  const ref = useRef<HTMLElement>(null);
  const dockBoxRef = useRef<HTMLDivElement>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const [seen, setSeen] = useState(false);
  const [playing, setPlaying] = useState<Act | null>(null);

  /* 몽이 3D(three.js · 모델)는 무거워 처음 띄울 때 늦었다 — 페이지가 한가해지면 미리 받아 둔다 */
  useEffect(() => {
    const load = () => { void import("@/app/profile/_components/FloatingObject/FloatingObject"); };
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    const id = ric ? ric(load) : window.setTimeout(load, 1500);
    return () => { if (!ric) clearTimeout(id); };
  }, []);

  /* 3D 를 미리 띄워 둔다 — 캔버스를 만들고 셰이더를 컴파일하는 데 시간이 걸려, 화면에 들어왔을 때 띄우면 늦게 나타났다.
     섹션이 두 화면 앞까지 오면 띄워 두되 보이지 않게(visibility) 두고, 화면에 조금이라도 들어오면 보인다.
     섹션에서 멀리 벗어나면 내린다(그래픽 메모리를 비운다) */
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const near = new IntersectionObserver(([e]) => setMounted(e.isIntersecting), { rootMargin: "200% 0px" });
    const look = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { threshold: 0 });
    near.observe(el);
    look.observe(el);
    return () => {
      near.disconnect();
      look.disconnect();
    };
  }, []);

  /* 화면에 들어와 있고 카메라가 이 프레임에 맞춰졌을 때만 — 옆 프레임으로 미리 띄워진 동안은 감춘다(말풍선이 새지 않게) */
  const active = seen && current;

  /* 이 섹션에선 몽이가 처음부터 자리에 앉아 나타난다 */
  useEffect(() => {
    const eager = useProfileSectionStore.getState().bunnyDockEager;
    eager.on = true;
    return () => { eager.on = false; };
  }, []);

  useEffect(() => {
    if (!active) return;
    const store = useProfileSectionStore.getState();
    const prev = store.activeSection;
    store.setActiveSection(BUNNY_SECTION);
    store.setBunnyExpression("normal");
    return () => {
      stopRef.current?.();
      useProfileSectionStore.getState().setActiveSection(prev);
    };
  }, [active]);

  /** 손길을 끝내고 손 · 표정을 원래대로 */
  const reset = () => {
    const { bunnyTouch: t, setBunnyExpression } = useProfileSectionStore.getState();
    t.over = false;
    t.hand = "";
    t.cheek = 0;
    t.petting = false;
    t.pullX = 0;
    t.pullY = 0;
    setBunnyExpression("normal");
    setPlaying(null);
  };

  const play = (act: Act) => {
    const dockEl = dockBoxRef.current?.firstElementChild as HTMLElement | null;
    if (!dockEl) return;
    stopRef.current?.();
    const store = useProfileSectionStore.getState();
    const t = store.bunnyTouch;
    setPlaying(act);
    const finish = (delay = 400) => {
      const id = window.setTimeout(reset, delay);
      stopRef.current = () => { clearTimeout(id); reset(); };
    };

    if (act === "pinch") {
      /* 왼쪽 볼을 잡고 바깥으로 늘였다 놓는다 */
      const p = ndcIn(dockEl, 0.36, 0.5);
      Object.assign(t, { over: true, hand: "pinching", ndcX: p.x, ndcY: p.y, grabX: p.x, grabY: p.y, cheek: 1, pullX: 0, pullY: 0 });
      store.setBunnyExpression("surprised");
      stopRef.current = animate(1500, (k) => {
        t.pullX = -0.12 * Math.sin(Math.PI * k);
        t.pullY = -0.03 * Math.sin(Math.PI * k);
      }, () => { t.cheek = 0; finish(700); });
    } else if (act === "pet") {
      /* 머리 위를 좌우로 쓰다듬는다 — 하트가 뜬다 */
      const p = ndcIn(dockEl, 0.5, 0.3);
      Object.assign(t, { over: true, hand: "pet", petting: true, ndcX: p.x, ndcY: p.y });
      store.setBunnyExpression("happy");
      stopRef.current = animate(2200, (k) => {
        t.ndcX = p.x + 0.045 * Math.sin(k * Math.PI * 6);
      }, () => { t.petting = false; finish(900); });
    } else if (act === "poke") {
      /* 손가락이 다가와 배를 톡 */
      const p = ndcIn(dockEl, 0.52, 0.66);
      Object.assign(t, { over: true, hand: "poke", ndcX: p.x, ndcY: p.y });
      const id = window.setTimeout(() => {
        Object.assign(t, { grabX: p.x, grabY: p.y, poke: 1 });
        finish(700);
      }, 450);
      stopRef.current = () => { clearTimeout(id); reset(); };
    } else if (act === "spin") {
      /* 끌어 돌리고 놓은 것처럼 — 관성으로 돌다 멈춘다 */
      store.bunnyDrag.vy = 0.34;
      finish(1800);
    } else {
      /* 표정 세 가지를 차례로 */
      const faces = ["surprised", "happy", "normal"] as const;
      const ids = faces.map((f, i) => window.setTimeout(() => store.setBunnyExpression(f), 300 + i * 1100));
      const end = window.setTimeout(() => setPlaying(null), 300 + faces.length * 1100);
      stopRef.current = () => { ids.forEach(clearTimeout); clearTimeout(end); reset(); };
    }
  };

  /* 단계 = 손길 — 들어서면 해 보인다. 0(소개)으로 돌아오면 멈춘다 */
  const playRef = useRef(play);
  useEffect(() => {
    playRef.current = play;
  });
  const firstRef = useRef(true);
  useEffect(() => {
    if (!active) return;
    const delay = firstRef.current ? ACT_DELAY_FIRST : ACT_DELAY;
    firstRef.current = false;
    if (step === 0) {
      stopRef.current?.();
      return;
    }
    const id = window.setTimeout(() => playRef.current(acts[step - 1].key), delay);
    return () => window.clearTimeout(id);
  }, [active, step, nonce, acts]);

  return (
    <section ref={ref} className={`${styles.pz} ${styles.mascot}`} data-step={step}>
      <div className={styles.mascotGrid}>
        <div className={styles.mascotStageCard}>
          {/* 판 없이 — 몽이 밤하늘의 별 · 달 · 구름 · 장식을 뒤의 하늘(TimeSky) 위에 그대로 깐다 */}
          <div className={styles.mascotSky} aria-hidden>
            <NightSky />
          </div>
          <div ref={dockBoxRef} className={styles.mascotDockBox}>
            <BunnyDock className={styles.mascotDock} />
          </div>
          <span className={styles.mascotHint}>{L(mascotScene.hint)}</span>
          <span className={styles.mascotAnchor}>
            <GuideAnchor size="3rem" fill="var(--text-white)" />
          </span>
        </div>
        <div className={styles.mascotSide}>
          <span className={styles.sceneLabel}>{L(mascotScene.label)}</span>
          <h3 className={styles.mascotName}>
            {L(bunnyProfile.name)}
            <span className={styles.mascotSub}>{L(bunnyProfile.subtitle)}</span>
          </h3>
          <p className={styles.mascotStory}>{L(mascotScene.intro)}</p>
          <ol className={styles.mascotActs}>
            {acts.map((a, i) => (
              <li key={a.key}>
                <Pressable
                  className={styles.mascotAct}
                  data-on={step === i + 1 || undefined}
                  data-playing={playing === a.key || undefined}
                  onClick={() => {
                    setStep(i + 1);
                    setNonce((v) => v + 1);
                  }}
                >
                  <RowNum n={i + 1} />
                  <span className={styles.mascotActTitle}>{L(a.title)}</span>
                  <span className={styles.mascotActPlay} aria-hidden>{playing === a.key ? "●" : "▶"}</span>
                  <span className={styles.mascotActBody}>{L(a.body)}</span>
                </Pressable>
              </li>
            ))}
          </ol>
          <Link href="/profile" className={styles.mascotLink}>{L(mascotScene.link)} →</Link>
        </div>
      </div>
      {mounted && (
        <div className={styles.mascotLayer} data-on={active || undefined}>
          <FloatingObject />
        </div>
      )}
    </section>
  );
}
