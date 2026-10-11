"use client";

/* 엔딩 크레딧 — 한 화면 프레임 안에서 자막 기둥이 아래에서 위로 올라간다(영화 끝 자막). 프레임은 스크롤하지 않고,
   가장자리가 흐린 무대 안에서 기둥만 옮긴다(Web Animations 의 translateY). 기둥 끝에 마무리 CTA 가 붙어 있어
   다 흐르면 그것이 무대 가운데에 멈춘다(이 페이지의 마지막 화면).
   - 이 프레임에 들어오면 천천히 끝까지 흐른다. 흐르는 동안 휠 · 키 · 스와이프 한 걸음은 다음으로 넘어가지 않고 빨리 감는다
   - 끝난 뒤 한 걸음 더면 프레지가 처음 지도로 돌아간다. 떠났다 다시 들어오면 처음부터 흐른다
   - 움직임 줄이기면 흐르지 않고 바로 끝 자리(마무리 CTA)를 보인다
   값은 다른 곳과 같은 데이터에서 온다: 장 이름 = 이 페이지 목차, 도구 = data/about/stack, 기록 = 작업 과정 단계의 기간 · 커밋 · PR */
import { useEffect, useRef } from "react";
import { FinalCta } from "./Landing";
import { techStack } from "@/data/about/stack";
import { aboutProcess } from "@/data/generated/aboutContent";
import { toc } from "../../_data/showcase";
import { credits } from "../../_data/landing";
import { useFrame, usePrezi } from "../prezi/context";
import { useL } from "../features/shared";
import styles from "./Landing.module.css";

/** 들어온 직후 · 다 흐른 직후 이 시간 동안의 걸음은 삼킨다 — 들어오던(관성) 휠의 꼬리가 빨리 감기 · 지도로 가기를 부르지 않게(ms) */
const GRACE_MS = 1200;
/** 빨리 감기 — 남은 자막을 이 시간 안에 다 올린다(ms) */
const FAST_MS = 1400;
/** 들어오고 나서 흐르기 시작할 때까지(카메라가 자리 잡는 시간, ms) */
const DELAY_MS = 600;
/** 무대 한 화면 높이를 지나는 데 걸리는 시간 — 읽을 수 있는 빠르기(ms) */
const PER_SCREEN_MS = 7000;
/** 기둥의 처음 자리(무대 높이의 30%, CSS .creditsRoll top) */
const ROLL_TOP = 0.3;
/** 한 줄을 쓸 때 별이 한 번 부푸는 시간(ms) — CSS 의 한 줄 펼치는 시간(--_write)과 같게 */
const WRITE_MS = 520;
/** 크레딧 끝 — 남은 자막이 빠르게 위로 비켜나는 시간(ms). 그 끝에 별똥별이 마무리 자리에 떨어진다 */
const DIVE_MS = 1100;
/** 비켜나며 지나는 거리 — 마무리가 화면 아래 끝 너머에서 가운데까지 오는 거리(무대 높이 대비) */
const DIVE_SPAN = 0.6;
/** 별똥별이 떨어지는 시간(ms) — 자막이 다 비켜나는 순간 마무리의 별 자리에 닿는다 */
const METEOR_MS = 1000;
/** 쓰는 자리 크기(px) — CSS .creditsPen(--spacing-20) 과 같게 */
const PEN = 20;

export default function CreditsRoll() {
  const L = useL();
  const stageRef = useRef<HTMLDivElement>(null);
  const rollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const penRef = useRef<HTMLSpanElement>(null);
  const meteorRef = useRef<HTMLSpanElement>(null);
  const burstRef = useRef<HTMLSpanElement>(null);
  const prezi = usePrezi();
  const { current, setIntercept } = useFrame();

  /* 자동 재생 — 이 프레임이 지금이 되면 기둥을 마무리 CTA 가 무대 가운데에 올 때까지 올린다. 떠나면 처음 자리로 되돌린다 */
  useEffect(() => {
    const stage = stageRef.current;
    const roll = rollRef.current;
    const end = endRef.current;
    if (!prezi || !current || !stage || !roll || !end) return;
    const h = stage.offsetHeight;
    /* 마무리는 무대 가운데에 멈춘다. 별이 쓰는 줄은 그때 마무리의 별 자리가 오는 높이 — 별이 쓰는 내내 · 별똥별이 꽂힐 때
       같은 높이에 있어 쓰던 줄에서 마무리로 오르내리지 않는다 */
    const finalSpot = end.querySelector<HTMLElement>("[data-guide]");
    /* 화면 좌표는 카메라 배율이 곱해져 있다(들어오는 중이면 아주 작다) — 무대 높이로 나눠 제 크기 px 로 */
    const sr0 = stage.getBoundingClientRect();
    const k0 = sr0.height / h || 1;
    const fr0 = finalSpot?.getBoundingClientRect();
    const spotY0 = fr0 ? (fr0.top + fr0.height / 2 - sr0.top) / k0 : end.offsetTop + h * ROLL_TOP;
    const er0 = end.getBoundingClientRect();
    const endMid0 = (er0.top + er0.height / 2 - sr0.top) / k0;
    /* 마무리 가운데가 무대 가운데(50%)에 오는 거리, 그때의 별 자리 높이 */
    const dist = Math.max(0, endMid0 - h / 2);
    const writeY = fr0 ? spotY0 - dist : h * 0.4;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    /* 천천히 흐르는 구간 + 마지막에 날아 내려가는 구간(dive). 움직임 줄이기면 날지 않고 한 번에 끝 자리 */
    const diveDist = reduce ? 0 : Math.min(dist, h * DIVE_SPAN);
    const rollDist = dist - diveDist;
    const anim = roll.animate([{ transform: "translateY(0)" }, { transform: `translateY(${-rollDist}px)` }], {
      duration: reduce ? 1 : Math.max(1, (rollDist / h) * PER_SCREEN_MS),
      delay: reduce ? 0 : DELAY_MS,
      easing: "linear",
      fill: "forwards",
    });
    const entered = performance.now();
    let endedAt = 0;
    /* 별이 쓰는 줄 — 별은 무대 가운데, 정해진 높이(WRITE_AT)에 머문다. 자막 줄이 그 선을 지나면 별 자리(가운데)에서 양옆으로
       펼쳐지며 써지고, 그때마다 별이 한 번 부푼다. 줄마다 왼쪽 끝으로 돌아가 쓸고 지나가면 줄 폭이 제각각이라 별이 지그재그로 튀었다.
       흐르는 동안 매 프레임 줄의 자리를 잰다(빨리 감기 때도 같다). 마지막 줄을 쓰면 펜 별은 사라진다(길잡이 별을 잠시 감춘다) */
    const pen = penRef.current;
    const lines = [...roll.querySelectorAll<HTMLElement>("[data-credit]")];
    let raf = 0;
    let dive: Animation[] = [];
    let land = 0;
    const meteor = meteorRef.current;
    const burst = burstRef.current;
    if (!reduce && pen) {
      stage.dataset.writing = "";
      pen.style.translate = `${stage.offsetWidth / 2 - PEN / 2}px ${writeY - PEN / 2}px`;
      /* 쓰는 자리를 사이트의 길잡이 별이 따라간다(별 하나로 — 길잡이 별이 펜이 된다) */
      pen.dataset.guide = "";
      pen.dataset.guidePriority = "3";
      const write = () => {
        const sr = stage.getBoundingClientRect();
        const lineY = sr.top + writeY * (sr.height / h);
        let wrote = false;
        let left = 0;
        for (const el of lines) {
          if (el.dataset.shown !== undefined) continue;
          const r = el.getBoundingClientRect();
          if (r.top + r.height / 2 > lineY) {
            left += 1;
            continue;
          }
          el.dataset.shown = "";
          wrote = true;
        }
        if (wrote) pen.animate([{ scale: 1 }, { scale: 1.6 }, { scale: 1 }], { duration: WRITE_MS, easing: "ease-out" });
        if (left === 0) {
          /* 다 썼다 — 펜 별은 별똥별이 될 차례. 길잡이 별을 감추고 마무리에서 다시 나타나게 한다 */
          document.documentElement.dataset.guideHold = "";
          delete pen.dataset.guide;
          return;
        }
        raf = requestAnimationFrame(write);
      };
      raf = requestAnimationFrame(write);
    }
    /* 별똥별 — 남은 자막이 빠르게 위로 비켜나며 마무리 자리를 비우는 동안, 왼쪽 위에서 꼬리를 단 별똥별이 대각선으로 떨어져
       마무리의 별 자리에 꽂힌다. 닿는 순간 빛이 퍼지고, 감춰 두었던 마무리가 흐릿하게서 또렷하게 피어나며 길잡이 별이 그 자리에 나타난다 */
    const startDive = () => {
      cancelAnimationFrame(raf);
      lines.forEach((el) => { el.dataset.shown = ""; });
      document.documentElement.dataset.guideHold = "";
      if (pen) delete pen.dataset.guide;
      dive = [
        roll.animate([{ transform: `translateY(${-rollDist}px)` }, { transform: `translateY(${-dist}px)` }], {
          duration: DIVE_MS,
          easing: "cubic-bezier(0.3, 0, 0.2, 1)",
          fill: "forwards",
        }),
        /* 지나간 자막은 흐려진다 — 마무리가 쓰는 줄 높이에 멈춰 마지막 몇 줄이 화면 위쪽에 남기 때문 */
        ...[...roll.children]
          .filter((el) => el !== end)
          .map((el) => el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: DIVE_MS, easing: "ease-out", fill: "forwards" })),
      ];
      /* 떨어질 자리 — 자막이 다 비켜난 뒤의 마무리 별 자리(지금 자리에서 남은 거리만큼 위) */
      const sr = stage.getBoundingClientRect();
      const fr = finalSpot?.getBoundingClientRect();
      const k = sr.height / h || 1;
      const tx = fr ? (fr.left + fr.width / 2 - sr.left) / k : stage.offsetWidth / 2;
      /* 높이는 쓰는 줄 그대로 — 펜 별이 있던 자리에 꽂힌다 */
      const ty = writeY;
      const fx = tx - stage.offsetWidth * 0.42;
      const fy = ty - h * 0.7;
      if (meteor) {
        meteor.style.setProperty("--_angle", `${Math.atan2(ty - fy, tx - fx)}rad`);
        dive.push(
          meteor.animate(
            [
              { translate: `${fx}px ${fy}px`, opacity: 0 },
              { opacity: 1, offset: 0.15 },
              { translate: `${tx}px ${ty}px`, opacity: 1 },
            ],
            { duration: METEOR_MS, delay: DIVE_MS - METEOR_MS, easing: "cubic-bezier(0.45, 0, 0.75, 0.55)", fill: "forwards" },
          ),
        );
      }
      land = window.setTimeout(() => {
        meteor?.getAnimations().forEach((a) => a.cancel());
        if (burst) {
          burst.style.translate = `${tx}px ${ty}px`;
          burst.animate([{ scale: 0.2, opacity: 1 }, { scale: 4, opacity: 0 }], { duration: 700, easing: "ease-out" });
        }
        stage.dataset.landed = "";
        delete document.documentElement.dataset.guideHold;
      }, DIVE_MS);
      Promise.all(dive.map((a) => a.finished)).then(
        () => { endedAt = performance.now(); },
        () => {}, // 떠나서 취소됨
      );
    };
    anim.finished.then(
      () => {
        if (reduce || !diveDist) {
          endedAt = performance.now();
          if (penRef.current) delete penRef.current.dataset.guide;
          stage.dataset.landed = "";
          delete document.documentElement.dataset.guideHold;
          return;
        }
        startDive();
      },
      () => {}, // 떠나서 취소됨
    );
    setIntercept((dir) => {
      if (dir < 0) return false; // 뒤로는 그냥 앞 프레임으로
      const now = performance.now();
      if (now - entered < GRACE_MS) return true;
      if (endedAt) return now - endedAt < GRACE_MS;
      if (dive.length) return true; // 날아 내려가는 중 — 그대로 둔다
      /* 빨리 감기 — 남은 자막을 FAST_MS 안에. 이미 빨리 감는 중이면 그대로 */
      const t = anim.effect?.getComputedTiming();
      const left = Number(t?.endTime ?? 0) - Number(anim.currentTime ?? 0);
      const rate = Math.max(1, left / FAST_MS);
      if (rate > anim.playbackRate) anim.updatePlaybackRate(rate);
      return true;
    });
    return () => {
      setIntercept(null);
      anim.cancel();
      dive.forEach((a) => a.cancel());
      window.clearTimeout(land);
      burst?.getAnimations().forEach((a) => a.cancel());
      delete stage.dataset.landed;
      delete document.documentElement.dataset.guideHold;
      cancelAnimationFrame(raf);
      delete stage.dataset.writing;
      lines.forEach((el) => delete el.dataset.shown);
      if (pen) {
        pen.getAnimations().forEach((a) => a.cancel());
        pen.style.translate = "";
        delete pen.dataset.guide;
        delete pen.dataset.guidePriority;
      }
    };
  }, [prezi, current, setIntercept]);

  const steps = aboutProcess;
  const timed = steps.length > 0 && steps.every((s) => s.start && s.end);
  const record = timed
    ? {
        days: Math.round((Date.parse(steps[steps.length - 1].end!) - Date.parse(steps[0].start!)) / 86_400_000) + 1,
        commits: steps.reduce((n, s) => n + (Number(s.commits) || 0), 0),
        prs: steps.reduce((n, s) => n + (Number(s.prs) || 0), 0),
      }
    : null;

  return (
    <section className={styles.credits} aria-label={L(credits.label)}>
      <div ref={stageRef} className={styles.creditsStage}>
        {/* 쓰는 자리 — 쓰는 줄 높이 가운데. 보이는 별은 사이트의 길잡이 별이 이 자리를 따라온다 */}
        <span ref={penRef} className={styles.creditsPen} aria-hidden="true" />
        {/* 별똥별 · 닿을 때 퍼지는 빛 — 크레딧 끝에 마무리의 별 자리로 떨어진다 */}
        <span ref={meteorRef} className={styles.creditsMeteor} aria-hidden="true" />
        <span ref={burstRef} className={styles.creditsBurst} aria-hidden="true" />
        <div ref={rollRef} className={styles.creditsRoll}>
          {/* 맨 위 여백 — 제목 위 숨 고르는 자리 */}
          <span className={styles.creditsStar} />
          <p className={styles.creditsEyebrow} data-credit="">{L(credits.eyebrow)}</p>
          <h2 className={styles.creditsTitle} data-credit="">{L(credits.title)}</h2>
          <dl className={styles.creditsList}>
            <div>
              <dt data-credit="">{L(credits.chapters)}</dt>
              {toc.map((t) => <dd key={t.href} data-credit="">{L(t.label)}</dd>)}
            </div>
            <div>
              <dt data-credit="">{L(credits.tools)}</dt>
              {techStack.map((t) => <dd key={t.name} data-credit="">{t.name}</dd>)}
            </div>
            {record && (
              <div>
                <dt data-credit="">{L(credits.record)}</dt>
                <dd data-credit="">{record.days.toLocaleString()} {L(credits.days)}</dd>
                <dd data-credit="">{record.commits.toLocaleString()} {L(credits.commits)}</dd>
                <dd data-credit="">{record.prs.toLocaleString()} PR</dd>
              </div>
            )}
          </dl>
          {/* 끝 — 다 흐르면 무대 가운데에 멈추는 마무리 */}
          <div ref={endRef} className={styles.creditsEnd}>
            <FinalCta />
          </div>
        </div>
      </div>
    </section>
  );
}
