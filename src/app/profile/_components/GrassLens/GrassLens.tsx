"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./GrassLens.module.css";

/** 커서가 끌어당기는 범위(px). 잔디 높이(약 90px)만큼 잡아야 위아래로도 부푼 게 보인다. */
const RADIUS = 86;
/** 한가운데 칸이 몇 배까지 커지는가. */
const PEAK = 1.15;
/** 한가운데 칸이 몇 px 떠오르는가. */
const LIFT = 6;
/** 바깥으로 미는 정도 — 커진 만큼의 몇 할을 밀어낼지. 1 이면 격자가 완전히 벌어져 성글어진다.
    위아래로 밀려나는 최댓값이 잔디의 안쪽 여백보다 커지면 잘리므로 같이 봐야 한다. */
const SPREAD = 0.38;
/** 격자 좌우 끝에서 미는 힘을 줄이기 시작하는 거리(px). 끝에서는 밀어 봐야 잘려서 안 보인다. */
const EDGE_FADE = 26;
/** 이 세기를 넘으면 그림자를 켠다. */
const SHADOW_AT = 0.18;
/** 커서가 들어오고 나갈 때 세기가 따라붙는 빠르기(프레임당 비율). */
const EASE = 0.2;

/**
 * 잔디 그래프 위에서 커서가 있는 자리가 볼록해진다.
 *
 * 픽셀을 미는 방식(`feDisplacementMap`)이 아니라 **칸 자체**를 옮긴다. 그래서 확대해도
 * 흐려지지 않고 칸의 모서리가 끝까지 또렷하다. 커서에 가까울수록 크게 키우고 바깥으로 밀어
 * 격자가 벌어지게 하는데, 이게 볼록렌즈로 본 격자와 같은 모양이다.
 *
 * 움직이는 건 커밋이 있는 칸뿐이다. 빈 칸은 제자리에 두어 바닥 격자로 남긴다 — 그래야 칸들이
 * 바닥에서 솟아오르는 것처럼 보인다. 다 같이 움직이면 그냥 화면이 늘어난 것으로 보인다.
 *
 * 자리는 `offsetLeft/offsetTop` 으로 한 번만 잰다. 이 패널은 가로 스크롤 트랙 안에 있어서
 * 화면 좌표는 매 프레임 바뀌지만 부모 기준 좌표는 그대로다 — 커서만 같은 기준으로 옮기면
 * 프레임마다 수백 칸의 자리를 다시 잴 필요가 없다. 그 기준이 되려면 감싼 div 가 자리를 잡고
 * 있어야 한다(`position: relative`). `offsetParent` 는 자리를 잡은 조상만 타고 올라가므로,
 * static 으로 두면 이 div 를 지나쳐 버리고 좌표가 문서 기준으로 잡힌다.
 *
 * 커서를 놓으면 세기를 0 으로 잦아들게 해서 되돌린다. CSS 전환으로 처리하면 따라올 때도 같이
 * 늦어져 커서 뒤를 흐물흐물 쫓아온다.
 */
export default function GrassLens({ children }: { children: ReactNode }) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    /** 커밋이 있는 칸과 그 자리. 처음 커서가 들어왔을 때 한 번만 잰다. */
    let cells: { el: HTMLElement; x: number; y: number; moved: boolean }[] = [];
    /** 격자의 좌우 끝 — 여기 가까운 칸은 바깥으로 덜 민다. */
    let bounds = { left: 0, right: 0 };
    const pointer = { x: 0, y: 0 };
    /* 지금 세기와 목표 세기. 커서가 나가면 목표가 0 이 되고 천천히 잦아든다. */
    const power = { now: 0, to: 0 };
    let raf = 0;

    const draw = () => {
      raf = 0;
      power.now += (power.to - power.now) * EASE;
      /* 0.01 이면 칸이 1.01 배 — 눈에 안 띈다. 여기서 끊어야 되돌아가는 게 질질 끌지 않는다. */
      if (power.to === 0 && power.now < 0.01) power.now = 0;

      for (const cell of cells) {
        const dx = cell.x - pointer.x;
        const dy = cell.y - pointer.y;
        const d2 = dx * dx + dy * dy;
        /* 가운데에서 1, 테두리에서 0. 테두리에서 0 이라야 원 밖과 자연스럽게 이어진다. */
        const k = d2 > RADIUS * RADIUS ? 0 : (1 - d2 / (RADIUS * RADIUS)) * power.now;
        if (k <= 0.001) {
          if (cell.moved) {
            cell.el.style.transform = "";
            cell.el.style.zIndex = "";
            cell.el.classList.remove(styles.lifted);
            cell.moved = false;
          }
          continue;
        }
        const scale = 1 + PEAK * k;
        /* 좌우 여백은 위 라벨과 줄을 맞추느라 좁다. 끝에 가까운 칸은 옆으로 덜 밀어
           잘려 나가지 않게 한다. 위아래는 여백이 넉넉해 그대로 둔다. */
        const room = Math.min(cell.x - bounds.left, bounds.right - cell.x) / EDGE_FADE;
        const push = (scale - 1) * SPREAD;
        cell.el.style.transform =
          `translate(${dx * push * Math.min(1, room)}px, ${dy * push - LIFT * k}px) scale(${scale})`;
        cell.el.style.zIndex = String(1 + Math.round(k * 10));
        cell.el.classList.toggle(styles.lifted, k > SHADOW_AT);
        cell.moved = true;
      }

      if (power.now > 0) raf = requestAnimationFrame(draw);
    };

    const kick = () => {
      if (raf === 0) raf = requestAnimationFrame(draw);
    };

    const track = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      if (cells.length === 0) {
        /* 커밋이 있는 칸만 고른다. data-level 은 잔디가 이미 붙여 두는 값이다. */
        cells = Array.from(wrap.querySelectorAll<HTMLElement>("[data-level]"))
          .filter((el) => el.dataset.level !== "0")
          .map((el) => ({
            el,
            x: offsetWithin(el, wrap) + el.offsetWidth / 2,
            y: offsetWithin(el, wrap, true) + el.offsetHeight / 2,
            moved: false,
          }));
        /* 빈 칸까지 세어야 진짜 격자 끝이 나온다 — 색칸만 보면 끝이 안쪽으로 들어온다. */
        const all = Array.from(wrap.querySelectorAll<HTMLElement>("[data-level]"));
        const xs = all.map((el) => offsetWithin(el, wrap) + el.offsetWidth / 2);
        bounds = { left: Math.min(...xs), right: Math.max(...xs) };
      }
      const r = wrap.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
      power.to = 1;
      kick();
    };

    const release = () => {
      power.to = 0;
      kick();
    };

    wrap.addEventListener("pointermove", track);
    wrap.addEventListener("pointerleave", release);
    return () => {
      wrap.removeEventListener("pointermove", track);
      wrap.removeEventListener("pointerleave", release);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={wrapRef} className={styles.wrap}>
      {children}
    </div>
  );
}

/** 조상 사슬을 타고 올라가며 기준 요소까지의 거리를 더한다. */
function offsetWithin(el: HTMLElement, root: HTMLElement, vertical = false): number {
  let sum = 0;
  let node: HTMLElement | null = el;
  while (node && node !== root) {
    sum += vertical ? node.offsetTop : node.offsetLeft;
    node = node.offsetParent as HTMLElement | null;
  }
  return sum;
}
