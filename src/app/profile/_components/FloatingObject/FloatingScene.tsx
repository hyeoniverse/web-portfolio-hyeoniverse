"use client";

import { useRef, useMemo, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useSiteConfig } from "@/providers/SiteConfigProvider";
import { useSoundStore } from "@/stores/soundStore";
import { useProfileSectionStore } from "@/stores/profileSectionStore";
import TouchHand from "./TouchHand";

/** 도킹은 시작과 끝이 부드러워야 "날아가서 앉는다" 로 읽힌다. */
/** 머리 mesh 의 자리·반지름·배율. JSX 의 값과 같아야 만진 자리를 머리 위에 얹을 수 있다. */
const HEAD_POS = [0, 0.42, 0.06] as const;
const HEAD_R = 0.48;
const HEAD_SCALE = [1.15, 1, 0.95] as const;
/** 손이 닿은 자리에서 이만큼 떨어진 곳까지 딸려 온다(머리 로컬). 볼 하나 크기다.
    눈까지 닿으면 살이 눈을 뚫고 나온 것처럼 보이므로, 볼에서 눈까지의 거리보다 작아야 한다. */
const DENT_RADIUS = 0.22;
/** 끈 거리를 얼마나 살로 옮길지. 1 이면 손을 그대로 따라가서 살이 아니라 풍선이 된다.
    밀려나는 거리가 위 반지름을 넘으면 살이 아니라 뿔처럼 뾰족하게 뽑힌다 — 절반 언저리로 둔다. */
const PULL_GAIN = 0.3;
/** 톡 찔렀을 때 안으로 들어가는 세기. */
const POKE_DEPTH = 1.8;
/** 쓰다듬을 때 눌리는 깊이. 손이 지나가는 자리라 얕지만, 아주 얕으면 만지는 티가 안 난다. */
const PET_DEPTH = 0.1;
/** 머리에 심은 털의 길이(머리 지오메트리 좌표). */
const HEAD_FUR_LEN = 0.062;
/** 몽이가 자리에 앉았을 때의 배율. 이때를 기준으로 털 길이를 잡았다. */
const FUR_REF_SCALE = 1.89;
/** 작아졌을 때 털을 최대 몇 배까지 길게 뽑을지. */
const FUR_MAX_BOOST = 2.1;
/** 얼굴을 위아래로 가르는 높이(몽이 로컬). 위는 쓰다듬는 자리, 아래는 볼과 코다. */
const FACE_SPLIT_Y = 0.36;
/** 이보다 가운데면 볼이 아니라 코 — 찌르는 자리다. */
const NOSE_HALF_W = 0.08;
/** 귀를 받기 위해 머리 구를 몇 배로 키워 광선을 받을지. */
const EAR_REACH = 1.7;
/** 손을 몽이 중심에서 카메라 쪽으로 얼마나 당겨 세울지(몽이 크기 기준).
    몽이를 감싸는 반지름(약 1.05)보다 커야 어느 각도에서도 몸에 안 가려진다. */
const HAND_CLEAR = 1.35;

/* ── 말랑한 정도 ──
   찌르면 눌렸다가 몇 번 출렁이고 멎는다. 용수철 상수 K 가 빠르기, D 가 잦아드는 정도다.
   D 를 2√K 보다 훨씬 작게 둬야 출렁임이 남는다 — 같으면 한 번에 멎어서 딱딱해 보인다. */
const SQUISH_K = 190;
const SQUISH_D = 8;
/** 한 번 찌를 때 넣는 세기. 눌리는 깊이가 대략 이 값을 √K 로 나눈 만큼이다. */
const POKE_IMPULSE = 4.6;

/**
 * 손이 닿은 자리에서 얼마나 딸려 오는가. 인자는 (거리 / 반지름)의 제곱이다.
 *
 * 코사인을 쓰는 이유는 가운데와 가장자리 **둘 다** 기울기가 0 이라서다. 거리의 제곱을
 * 그대로 쓰면 가운데가 뾰족해서 살이 아니라 뿔처럼 끌려 나오고, 가장자리는 꺾여서
 * 밀린 자리의 테두리가 선으로 보인다.
 */
function falloff(q: number): number {
  if (q >= 1) return 0;
  return 0.5 * (1 + Math.cos(Math.PI * Math.sqrt(q)));
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * 각도 사이의 보간 — **가까운 쪽으로 돈다**.
 *
 * 떠다니는 동안 회전각은 계속 커지기만 한다(x 는 초당 0.06rad). 그걸 그냥 lerp 하면
 * 섞이는 값이 `각 × (1-k)` 라서, 앉기 시작하는 순간 그 큰 각이 빠르게 깎여 나간다 —
 * 몽이가 자리를 잡으면서 늘 같은 쪽으로 고개를 처박는다. 페이지를 오래 켜 둘수록 심해진다.
 * 차이를 -π~π 로 접어 두면 어느 각도에서 앉든 반 바퀴 안에서 가까운 쪽으로 돌아선다.
 */
function lerpAngle(from: number, to: number, k: number): number {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  else if (d < -Math.PI) d += Math.PI * 2;
  return from + d * k;
}
import {
  BUNNY,
  EYE_COLOR,
  EYE_LOCAL,
  BARE_RIN,
  BARE_ROUT,
  BARE_YW,
  BODY_GEO,
  HEAD_GEO,
  EAR_GEO,
  ARM_GEO,
  FOOT_GEO,
  TAIL_GEO,
} from "./bunnyGeometry";
import BunnySkin from "./BunnySkin";
import BunnyFur from "./BunnyFur";

/* ── Component ── */

interface FloatingSceneProps {
  theme: "dark" | "light";
  isMobile: boolean;
  mouseNDC: React.RefObject<{ x: number; y: number }>;
  pointerActive: React.RefObject<boolean>;
  screenPosRef?: React.RefObject<{ x: number; y: number }>;
  smileRef?: React.RefObject<boolean>;
  /** 지금 쓰다듬고 있는지 — 하트 연출이 읽는다. */
  pettingRef?: React.RefObject<boolean>;
  scrollVelRef?: React.RefObject<number>;
}

export default function FloatingScene({
  theme: _theme,
  isMobile,
  mouseNDC,
  pointerActive,
  screenPosRef,
  smileRef,
  pettingRef,
  scrollVelRef,
}: FloatingSceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const leftEarRef = useRef<THREE.Mesh>(null);
  const rightEarRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const tailRef = useRef<THREE.Mesh>(null);
  const leftEyeRef = useRef<THREE.Mesh>(null);
  const rightEyeRef = useRef<THREE.Mesh>(null);
  const leftSquintRef = useRef<THREE.Group>(null);
  const rightSquintRef = useRef<THREE.Group>(null);
  const leftSmileRef = useRef<THREE.Group>(null);
  const rightSmileRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Mesh>(null);
  /** 손대기 전의 머리 꼭짓점. 매 프레임 여기서 다시 밀어야 변형이 쌓이지 않는다. */
  const headRest = useRef<Float32Array | null>(null);
  /** 손이 닿은 자리(머리 로컬)와 그 자리가 밀려난 양. 용수철로 제자리에 돌아간다. */
  const dent = useRef({
    at: new THREE.Vector3(),
    now: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    /** 지금 살이 밀려 있는지 — 다 돌아온 뒤에는 꼭짓점을 건드리지 않는다. */
    live: false,
    /** 볼을 잡은 자리를 이미 정했는지. 잡고 있는 동안 다시 안 고른다. */
    holding: false,
  });
  const _dentTmp = useMemo(() => new THREE.Vector3(), []);
  const _handAt = useMemo(() => new THREE.Vector3(), []);
  const _rayA = useMemo(() => new THREE.Vector3(), []);
  const _rayB = useMemo(() => new THREE.Vector3(), []);
  const _pickAt = useMemo(() => new THREE.Vector3(), []);
  const _inv = useMemo(() => new THREE.Matrix4(), []);
  const _handWorld = useMemo(() => new THREE.Vector3(), []);
  const _handNrm = useMemo(() => new THREE.Vector3(), []);
  /** 손이 설 자리와 크기. TouchHand 가 매 프레임 읽는다. */
  const handAnchorRef = useRef({
    pos: new THREE.Vector3(),
    /** 만지는 자리의 바깥 방향(월드). 손바닥이 이 반대를 봐야 살에 얹힌 손이 된다. */
    normal: new THREE.Vector3(0, 1, 0),
    scale: 1,
    side: 1,
    active: false,
  });
  /** 찌른 자국(몸 전체) — a 가 눌린 깊이, v 가 그 속도. */
  const squish = useRef({ a: 0, v: 0, x: 0, y: 0 });
  /* 첫 깜빡임까지의 시간은 인스턴스마다 달라야 하지만 렌더마다 달라질 이유는 없다.
     useRef 의 인자는 첫 값만 쓰이면서도 렌더할 때마다 평가되므로, 여기서 Math.random 을
     부르면 리렌더마다 난수를 뽑아 버린다. useState 의 지연 초기화는 마운트 때 한 번만 돈다. */
  const [firstBlinkAt] = useState(() => 2 + Math.random() * 3);
  const nextBlink = useRef(firstBlinkAt);
  const blinkPhase = useRef(-1); // -1 = idle, 0~1 = blinking
  const hitTime = useRef(-1); // 충돌 시점 (초)
  const { camera, size } = useThree();
  const cfg = useSiteConfig();

  const vel = useRef<THREE.Vector2 | null>(null);
  const pos = useRef(new THREE.Vector2(0, 0));
  const spinVel = useRef(new THREE.Vector3(0, 0, 0));
  const spinOffset = useRef(new THREE.Euler(0, 0, 0));
  const wasInside = useRef(false);
  /* 자리에 내려앉은 정도 0~1. 0=자유롭게 떠다님, 1=완전히 앉음. 튀지 않게 서서히 오간다. */
  const dockBlend = useRef(0);
  const dockTarget = useRef(new THREE.Vector2(0, 0));
  const dockScale = useRef(1);
  const _mouseVec = useMemo(() => new THREE.Vector3(), []);
  const _camPos = useMemo(() => new THREE.Vector3(), []);

  // ── 충돌 사운드 (yo.mp3) ──
  const audioCtx = useRef<AudioContext | null>(null);
  const audioBuffer = useRef<AudioBuffer | null>(null);

  const playBoing = () => {
    if (!cfg.profile.bunnyCollisionSound) return;
    if (useSoundStore.getState().isMuted) return;
    // AudioContext는 사용자 제스처(클릭/터치) 이후에만 생성 가능
    if (!navigator.userActivation?.hasBeenActive) return;

    if (!audioCtx.current) {
      audioCtx.current = new AudioContext();
      fetch("/sounds/yo.mp3")
        .then((res) => res.arrayBuffer())
        .then((data) => audioCtx.current!.decodeAudioData(data))
        .then((buf) => { audioBuffer.current = buf; });
    }
    const ctx = audioCtx.current;
    if (ctx.state === "suspended") ctx.resume();
    if (!audioBuffer.current) return;

    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = audioBuffer.current;
    gain.gain.value = 0.5;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(0);
  };

  /* 겹 하나가 부위를 통째로 다시 그린다. 화면이 작고 힘이 약한 기기에서는 줄인다. */
  const furShells = isMobile ? 3 : 6;
  /**
   * 털을 얼마나 더 뽑을지. 몽이가 작게 보일수록 커진다.
   *
   * 털 길이는 도형 좌표라 몽이가 작아지면 같이 줄어든다. 그러면 한 올이 화면에서 한 픽셀도
   * 안 돼 뭉개진다 — 보송한 게 아니라 그냥 매끈해진다.
   */
  const furBoostRef = useRef({ k: 1 });
  /** 털을 눕힐 눈자리(머리 지오메트리 좌표). 표정이 바뀌면 여기만 옮긴다. */
  const bareRef = useRef({
    x: EYE_LOCAL[0], y: EYE_LOCAL[1], z: EYE_LOCAL[2],
    rIn: BARE_RIN, rOut: BARE_ROUT, yw: BARE_YW,
  });

  const scale = isMobile
    ? size.width <= 480
      ? (size.width / 480) * 0.8
      : 0.8
    : 1.2;
  const mobileYBias = isMobile ? 1.8 : 0;
  const introProgress = useRef(0);
  const INTRO_DUR = 0.8;

  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return;
    const dt = Math.min(delta, 0.05);
    const t = clock.getElapsedTime();
    const z = BUNNY.z;

    /* ── Intro pop animation (center → elastic pop) ── */
    if (introProgress.current < 1) {
      introProgress.current = Math.min(1, introProgress.current + dt / INTRO_DUR);
      const ip = introProgress.current;
      // Elastic ease-out (0 → overshoot → 1)
      const c4 = (2 * Math.PI) / 3;
      const elastic =
        ip === 0
          ? 0
          : ip >= 1
            ? 1
            : Math.pow(2, -10 * ip) * Math.sin((ip * 10 - 0.75) * c4) + 1;
      groupRef.current.position.set(0, mobileYBias, z);
      groupRef.current.scale.setScalar(scale * elastic);
      groupRef.current.rotation.set(0, elastic * Math.PI * 2, 0);
      return;
    }

    /* ── MEET 패널의 자리로 내려앉기 ──
       패널이 가로로 계속 움직이므로 매 프레임 지금 자리를 다시 읽는다. 무한 스크롤에서는
       같은 패널이 여러 벌 그려지니 화면 가운데에 가장 가까운 것을 고른다. */
    const slots = useProfileSectionStore.getState().bunnyDockSlots;
    let dockRect: DOMRect | null = null;
    if (slots.size > 0) {
      const vw = window.innerWidth;
      const cx = vw / 2;
      let best = Infinity;
      for (const el of slots) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.right < 0 || r.left > vw) continue;
        const d = Math.abs(r.left + r.width / 2 - cx);
        if (d < best) {
          best = d;
          dockRect = r;
        }
      }
      /* 앉고 떠나는 기준을 다르게 둔다(히스테리시스).
         앉을 때는 자리가 화면 안에 온전히 들어와야 하고, 한 번 앉은 뒤에는 자리의 한가운데가
         화면을 벗어날 때까지 붙어 있는다. 기준이 하나면 그 선 위에서 붙었다 떨어졌다 한다.

         화면 가운데와의 거리로 판정하면 안 된다 — 자리는 패널 왼쪽에 치우쳐 있어서
         패널이 정중앙일 때도 이미 수백 px 떨어져 있다. 조금만 움직여도 곧바로 풀린다. */
      if (dockRect) {
        const center = dockRect.left + dockRect.width / 2;
        const settled = dockBlend.current > 0;
        const keep = settled
          ? center > 0 && center < vw
          : dockRect.left >= -8 && dockRect.right <= vw + 8;
        if (!keep) dockRect = null;
      }
    }
    /* 오갈 때 1초 남짓 걸리게 — 그래야 "날아가서 앉는다" 로 읽힌다. */
    dockBlend.current = THREE.MathUtils.clamp(
      dockBlend.current + (dockRect ? dt : -dt) / 0.9,
      0,
      1,
    );
    const docked = dockBlend.current > 0.001;

    if (!vel.current) {
      const angle = Math.random() * Math.PI * 2;
      vel.current = new THREE.Vector2(
        Math.cos(angle) * BUNNY.speed,
        Math.sin(angle) * BUNNY.speed,
      );
      pos.current.y = mobileYBias;
    }
    const v = vel.current;
    const p = pos.current;

    const cam = camera as THREE.PerspectiveCamera;
    const distFromCam = Math.abs(z - cam.position.z);
    const halfH = Math.tan((cam.fov * Math.PI) / 360) * distFromCam;
    const halfW = halfH * cam.aspect;
    const m = BUNNY.margin;

    // Scroll velocity → bunny에 힘 적용 (스크롤 방향 반대로 밀림)
    if (scrollVelRef?.current) {
      const scrollForce = scrollVelRef.current * 0.008;
      v.y -= scrollForce * dt;
    }

    // Friction — gradually slow down in zero-gravity
    v.x *= BUNNY.friction;
    v.y *= BUNNY.friction;

    p.x += v.x * dt;
    p.y += v.y * dt;

    const sv = spinVel.current;

    /* 좌우 벽은 말풍선 몫을 빼고 세운다.
       말풍선은 몽이 머리 위에 가운데 정렬로 뜨는데, 몽이가 화면 가장자리까지 가면 그 절반이
       화면 밖으로 잘린다 — 자리에 앉았다 풀린 직후가 특히 그랬다(앉는 자리가 패널 왼쪽에
       치우쳐 있어서 풀리자마자 왼쪽 끝이었다).
       앉아 있는 동안에도 이 좌표는 계속 굴러가므로, 여기서 막아 두면 풀렸을 때 안쪽에서 시작한다. */
    const worldPerPx = (halfH * 2) / window.innerHeight;
    const bubbleGuard = Math.min(250, window.innerWidth * 0.22) * worldPerPx;
    const wallX = Math.max(halfW - m - bubbleGuard, halfW * 0.15);

    if (p.x < -wallX) {
      p.x = -wallX;
      v.x = Math.abs(v.x) * BUNNY.wallRestitution;
      sv.set(sv.x, sv.y + v.x * 3, sv.z - v.y * 2);
    } else if (p.x > wallX) {
      p.x = wallX;
      v.x = -Math.abs(v.x) * BUNNY.wallRestitution;
      sv.set(sv.x, sv.y + v.x * 3, sv.z - v.y * 2);
    }

    const bottomWall = isMobile ? -halfH * 0.2 + m : -halfH + m;
    if (p.y < bottomWall) {
      p.y = bottomWall;
      v.y = Math.abs(v.y) * BUNNY.wallRestitution;
      sv.set(sv.x - v.y * 3, sv.y, sv.z + v.x * 2);
    } else if (p.y > halfH - m) {
      p.y = halfH - m;
      v.y = -Math.abs(v.y) * BUNNY.wallRestitution;
      sv.set(sv.x - v.y * 3, sv.y, sv.z + v.x * 2);
    }

    const isActive = isMobile ? pointerActive.current : true;

    _mouseVec
      .set(mouseNDC.current.x, mouseNDC.current.y, 0.5)
      .unproject(camera);
    _camPos.copy(camera.position);
    const dir = _mouseVec.sub(_camPos).normalize();
    const distToPlane = (z - camera.position.z) / dir.z;
    const mwx = camera.position.x + dir.x * distToPlane;
    const mwy = camera.position.y + dir.y * distToPlane;

    const dx = p.x - mwx;
    const dy = p.y - mwy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const inside = isActive && dist < BUNNY.hitRadius;

    if (inside && !wasInside.current && dist > 0.01) {
      const nx = dx / dist;
      const ny = dy / dist;
      v.x = nx * BUNNY.impulse;
      v.y = ny * BUNNY.impulse;
      sv.set(-ny * 6, nx * 6, (nx - ny) * 3);
      hitTime.current = t;
      playBoing();
    }
    wasInside.current = inside;

    const so = spinOffset.current;
    sv.multiplyScalar(0.993);
    so.x += sv.x * dt;
    so.y += sv.y * dt;
    so.z += sv.z * dt;

    const rx = t * BUNNY.baseRotation.x + so.x;
    const ry = t * BUNNY.baseRotation.y + so.y;
    const rz = t * BUNNY.baseRotation.z + so.z;

    // Zero-gravity bobbing
    const bobY = Math.sin(t * BUNNY.bob.freq * Math.PI * 2) * BUNNY.bob.amp;
    const bobX = Math.cos(t * BUNNY.bob.freq * 0.7 * Math.PI * 2) * BUNNY.bob.amp * 0.5;

    let outX = p.x + bobX;
    let outY = p.y + bobY;
    let outScale = scale;
    let outRx = rx;
    let outRy = ry;
    let outRz = rz;

    /* 끌어서 돌린 각도 — 손을 떼면 여세로 조금 더 돌다가 멈춘다. */
    const drag = useProfileSectionStore.getState().bunnyDrag;
    if (!drag.dragging) {
      drag.y += drag.vy;
      drag.x = THREE.MathUtils.clamp(drag.x + drag.vx, -1.2, 1.2);
      drag.vx *= 0.92;
      drag.vy *= 0.92;
      if (Math.abs(drag.vx) < 1e-4) drag.vx = 0;
      if (Math.abs(drag.vy) < 1e-4) drag.vy = 0;
    }

    if (docked) {
      const k = easeInOutCubic(dockBlend.current);

      if (dockRect) {
        /* 화면 좌표(px) → 몽이가 사는 평면(z)의 월드 좌표. 그 평면의 세로 길이를 알면
           px 와 월드 단위의 비율이 나오고, 자리 상자의 크기를 몽이 크기로 바꿀 수 있다. */
        const planeH = halfH * 2;
        const worldPerPx = planeH / window.innerHeight;
        const targetX = (dockRect.left + dockRect.width / 2 - window.innerWidth / 2) * worldPerPx;
        const targetY = -(dockRect.top + dockRect.height / 2 - window.innerHeight / 2) * worldPerPx;
        dockTarget.current.set(targetX, targetY);
        /* 모델은 대략 2 단위 높이다. 자리 상자 안에 여유를 두고 담기게 0.72 만 쓴다. */
        dockScale.current = (dockRect.height * worldPerPx * 0.72) / 2;
      }

      outX = THREE.MathUtils.lerp(outX, dockTarget.current.x, k);
      outY = THREE.MathUtils.lerp(outY, dockTarget.current.y + bobY * 0.35, k);
      outScale = THREE.MathUtils.lerp(scale, dockScale.current, k);
      /* 앉으면 정면을 본다 — 자기소개 옆에서 빙글빙글 돌면 읽기 힘들다.
         고개만 아주 조금 갸웃하고, 끌어서 돌린 만큼을 거기에 더한다.
         끄는 동안에는 갸웃거림을 죽인다 — 손으로 잡은 것이 스스로 움직이면 어긋나 보인다. */
      const idle = drag.dragging ? 0 : 1;
      outRx = lerpAngle(rx, Math.sin(t * 0.6) * 0.05 * idle + drag.x, k);
      outRy = lerpAngle(ry, Math.sin(t * 0.45) * 0.12 * idle + drag.y, k);
      outRz = lerpAngle(rz, Math.sin(t * 0.5) * 0.04 * idle, k);

      /* 앉아 있는 동안에는 속도를 죽여 둔다 — 안 그러면 떠날 때 튕겨 나간다.
         자리를 뜨면 그 지점에서 다시 떠다니게 위치도 맞춰 둔다. */
      v.x *= 1 - k;
      v.y *= 1 - k;
      p.x = THREE.MathUtils.lerp(p.x, dockTarget.current.x, k * 0.15);
      p.y = THREE.MathUtils.lerp(p.y, dockTarget.current.y, k * 0.15);
    } else if (drag.x !== 0 || drag.y !== 0) {
      /* 패널을 벗어나면 돌려 둔 각도를 놓아준다 — 다음에 다시 앉을 때 정면에서 시작한다. */
      drag.x *= 0.94;
      drag.y *= 0.94;
      if (Math.abs(drag.x) < 1e-3) drag.x = 0;
      if (Math.abs(drag.y) < 1e-3) drag.y = 0;
    }

    /* ── 어디를 만지고 있는가 ──────────────────────────────────
       커서에서 광선을 쏘아 몽이의 지금 자세로 되돌린 뒤 머리와 교차시킨다.
       입력 쪽에서 "상자 가운데가 몽이 가운데" 라고 어림잡으면 몽이를 돌리는 순간 어긋난다 —
       가만히 둬도 흔들림만으로 10px 넘게 밀리고, 반 바퀴 돌리면 좌우가 뒤집힌다. */
    const touch = useProfileSectionStore.getState().bunnyTouch;
    const sq = squish.current;
    const dn = dent.current;
    const grp = groupRef.current;
    /* 그룹의 역행렬은 이 프레임 내내 같다 — 광선마다 다시 뒤집지 않는다. */
    grp.updateMatrixWorld();
    _inv.copy(grp.matrixWorld).invert();

    /**
     * 화면 좌표(NDC)의 광선을 머리 **지오메트리 공간**의 점으로 옮긴다.
     *
     * 두 점을 각각 옮겨 빼는 방식이라 그룹의 회전·비균일 배율(찌를 때의 스쿼시)까지 정확하다.
     * 방향 벡터만 변환하면 배율이 균일할 때만 맞는다.
     * `grow` 는 머리보다 큰 구와 교차시키는 값이다 — 귀처럼 머리 밖을 가리켜도 받아 준다.
     */
    const pick = (nx: number, ny: number, out: THREE.Vector3, grow = 1): boolean => {
      _rayA.set(nx, ny, -1).unproject(camera);
      _rayB.set(nx, ny, 1).unproject(camera);
      _rayA.applyMatrix4(_inv);
      _rayB.applyMatrix4(_inv);
      const ax = (_rayA.x - HEAD_POS[0]) / HEAD_SCALE[0];
      const ay = (_rayA.y - HEAD_POS[1]) / HEAD_SCALE[1];
      const az = (_rayA.z - HEAD_POS[2]) / HEAD_SCALE[2];
      const dx = (_rayB.x - HEAD_POS[0]) / HEAD_SCALE[0] - ax;
      const dy = (_rayB.y - HEAD_POS[1]) / HEAD_SCALE[1] - ay;
      const dz = (_rayB.z - HEAD_POS[2]) / HEAD_SCALE[2] - az;
      const r = HEAD_R * grow;
      const qa = dx * dx + dy * dy + dz * dz;
      const qb = 2 * (ax * dx + ay * dy + az * dz);
      const qc = ax * ax + ay * ay + az * az - r * r;
      const disc = qb * qb - 4 * qa * qc;
      if (disc < 0) return false;
      /* 작은 뿌리가 카메라에 가까운 쪽 — 지금 보이는 면이다. 돌아가 있어도 늘 앞면을 짚는다. */
      const t = (-qb - Math.sqrt(disc)) / (2 * qa);
      if (t < 0) return false;
      out.set(ax + dx * t, ay + dy * t, az + dz * t);
      return true;
    };

    /**
     * 화면에서 끌린 양을 머리 지오메트리 공간의 밀림으로 옮긴다.
     *
     * 끌린 양은 화면 기준이라 그대로 쓰면 몽이가 돌아 있을 때 엉뚱한 쪽으로 늘어난다.
     * 머리 중심의 화면 깊이에서 두 점을 되짚어 빼면 자세가 반영된 밀림이 나온다.
     */
    const pullToHead = (
      nx: number, ny: number, dx: number, dy: number, out: THREE.Vector3,
    ): void => {
      _rayA.set(HEAD_POS[0], HEAD_POS[1], HEAD_POS[2]);
      grp.localToWorld(_rayA);
      _rayA.project(camera);
      const depth = _rayA.z;
      _rayA.set(nx, ny, depth).unproject(camera).applyMatrix4(_inv);
      _rayB.set(nx + dx, ny + dy, depth).unproject(camera).applyMatrix4(_inv);
      out.set(
        (_rayB.x - _rayA.x) / HEAD_SCALE[0],
        (_rayB.y - _rayA.y) / HEAD_SCALE[1],
        (_rayB.z - _rayA.z) / HEAD_SCALE[2],
      );
    };

    /**
     * 눌릴 자리를 눈에서 떼어 놓는다.
     *
     * 눈 옆의 살이 밀리면 눈이 살을 뚫고 나온 것처럼 보인다. 거절하지 않고 밀어내는 이유는,
     * 거절하면 만졌는데 아무 일도 안 일어나서 눌리는 자리를 손으로 더듬어 찾게 되기 때문이다.
     * 밀어내는 방향은 **지금 있는 쪽**이다 — 늘 아래로 밀면 머리 위를 쓰다듬어도 볼이 눌린다.
     */
    const keepOffEyes = (p: THREE.Vector3): void => {
      for (const side of [-1, 1]) {
        const ex = side * EYE_LOCAL[0];
        let dx = p.x - ex;
        let dy = p.y - EYE_LOCAL[1];
        let dz = p.z - EYE_LOCAL[2];
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 >= DENT_RADIUS * DENT_RADIUS) continue;
        let d = Math.sqrt(d2);
        /* 눈 한가운데를 짚었으면 방향이 없다 — 볼 쪽(아래)으로 보낸다. */
        if (d < 1e-3) { dx = 0; dy = -1; dz = 0; d = 1; }
        p.set(
          ex + (dx / d) * DENT_RADIUS,
          EYE_LOCAL[1] + (dy / d) * DENT_RADIUS,
          EYE_LOCAL[2] + (dz / d) * DENT_RADIUS,
        );
        /* 밀어낸 점을 다시 구 표면에 붙인다 — 살은 표면 위에서만 움직인다. */
        p.setLength(HEAD_R);
      }
    };

    /** 머리 위의 점을 무엇을 만지는 자리인지로 옮긴다. 기준은 몽이 로컬 좌표다. */
    const spotAt = (p: THREE.Vector3): "pinch" | "poke" | "pet" => {
      const by = p.y * HEAD_SCALE[1] + HEAD_POS[1];
      const bx = p.x * HEAD_SCALE[0] + HEAD_POS[0];
      if (by > FACE_SPLIT_Y) return "pet";
      return Math.abs(bx) >= NOSE_HALF_W ? "pinch" : "poke";
    };

    /* 지금 커서가 몽이의 어디에 있는지 풀어 적어 둔다. 입력 쪽이 이걸 읽어 커서를 고른다. */
    if (touch.over) {
      if (pick(touch.ndcX, touch.ndcY, _pickAt)) {
        touch.spot = spotAt(_pickAt);
      } else if (pick(touch.ndcX, touch.ndcY, _pickAt, EAR_REACH) && spotAt(_pickAt) === "pet") {
        /* 귀는 머리 구 밖이다. 큰 구로 받아 놓고 자리는 머리 표면으로 당긴다. */
        _pickAt.setLength(HEAD_R);
        touch.spot = "pet";
      } else {
        touch.spot = "grab";
      }
    } else {
      touch.spot = "";
    }

    /* 찌른 세기는 한 번만 쓰고 0 으로 되돌린다. 남겨 두면 매 프레임 다시 찌른 게 된다. */
    if (touch.poke > 0) {
      if (pick(touch.grabX, touch.grabY, dn.at)) {
        keepOffEyes(dn.at);
        /* 그 자리를 안쪽으로 눌러 준다 — 표면을 따라 들어가야 손가락 자국이 된다. */
        dn.vel.addScaledVector(_dentTmp.copy(dn.at).normalize(), -POKE_DEPTH * touch.poke);
        dn.live = true;
      }
      /* 얼굴이든 몸이든 몸통은 같이 출렁인다. */
      sq.v += POKE_IMPULSE * touch.poke * 0.8;
      sq.x = touch.grabX;
      sq.y = touch.grabY;
      touch.poke = 0;
      hitTime.current = t;
      playBoing();
    }

    /* 볼을 잡았으면 그 순간의 살을 기억한다. 잡고 있는 동안 몽이가 흔들려도 잡은 살은 그대로다. */
    if (touch.cheek !== 0 && !dn.holding) {
      dn.holding = pick(touch.grabX, touch.grabY, dn.at);
      if (dn.holding) keepOffEyes(dn.at);
    } else if (touch.cheek === 0) {
      dn.holding = false;
    }

    let dentTarget = _dentTmp.set(0, 0, 0);
    let held = false;
    if (touch.cheek !== 0 && dn.holding) {
      dn.live = true;
      held = true;
      /* 끌린 양은 화면 기준이라, 몽이 자세로 되돌려야 손을 따라가는 것으로 보인다. */
      pullToHead(touch.grabX, touch.grabY, touch.pullX, touch.pullY, dentTarget);
      dentTarget.multiplyScalar(PULL_GAIN);
    } else if (touch.petting) {
      /* 쓰다듬기 — 손이 있는 자리를 얕게 누른다. 자국이 손을 따라 지나간다.
         귀 쪽은 머리 구 밖이라 큰 구로 받아 표면으로 당긴다. */
      const onIt =
        pick(touch.ndcX, touch.ndcY, dn.at) ||
        (pick(touch.ndcX, touch.ndcY, dn.at, EAR_REACH) && (dn.at.setLength(HEAD_R), true));
      if (onIt) {
        keepOffEyes(dn.at);
        dn.live = true;
        held = true;
        dentTarget = _dentTmp.copy(dn.at).normalize().multiplyScalar(-PET_DEPTH);
      }
    }
    if (dn.live) {
      const K = held ? 260 : 190;
      const D = held ? 24 : 9;
      dn.vel.x += (K * (dentTarget.x - dn.now.x) - D * dn.vel.x) * dt;
      dn.vel.y += (K * (dentTarget.y - dn.now.y) - D * dn.vel.y) * dt;
      dn.vel.z += (K * (dentTarget.z - dn.now.z) - D * dn.vel.z) * dt;
      dn.now.addScaledVector(dn.vel, dt);
    }

    sq.v += (-SQUISH_K * sq.a - SQUISH_D * sq.v) * dt;
    sq.a += sq.v * dt;
    const squashed = THREE.MathUtils.clamp(sq.a, -0.45, 0.45);

    /* 작을수록 털을 길게 — 화면에서의 올 굵기를 지킨다. */
    furBoostRef.current.k = THREE.MathUtils.clamp(FUR_REF_SCALE / (outScale || 1), 1, FUR_MAX_BOOST);

    groupRef.current.position.set(outX, outY, z);
    /* 눌린 만큼 납작해지고 옆으로 퍼진다. 찌른 쪽으로 살짝 기울기까지 해야 밀린 게 보인다. */
    groupRef.current.rotation.set(outRx, outRy, outRz - squashed * sq.x * 0.5);
    groupRef.current.scale.set(
      outScale * (1 + squashed * 0.26),
      outScale * (1 - squashed * 0.34),
      outScale * (1 + squashed * 0.26),
    );

    /* 머리 꼭짓점 밀기. 원본을 한 번 떠 두고 매 프레임 거기서 다시 민다 —
       그리고 있는 것을 또 밀면 변형이 눈덩이처럼 쌓인다. */
    if (headRef.current && dn.live) {
      const attr = headRef.current.geometry.attributes.position;
      const arr = attr.array as Float32Array;
      if (!headRest.current) headRest.current = Float32Array.from(arr);
      const rest = headRest.current;
      const r2 = DENT_RADIUS * DENT_RADIUS;
      let moved = 0;
      for (let i = 0; i < arr.length; i += 3) {
        const dx = rest[i] - dn.at.x;
        const dy = rest[i + 1] - dn.at.y;
        const dz = rest[i + 2] - dn.at.z;
        const w = falloff((dx * dx + dy * dy + dz * dz) / r2);
        arr[i] = rest[i] + dn.now.x * w;
        arr[i + 1] = rest[i + 1] + dn.now.y * w;
        arr[i + 2] = rest[i + 2] + dn.now.z * w;
        moved += w;
      }
      attr.needsUpdate = true;
      headRef.current.geometry.computeVertexNormals();

      /* 다 돌아왔으면 손을 뗀다 — 안 그러면 가만히 있어도 매 프레임 법선을 다시 잡는다. */
      if (!held && dn.now.lengthSq() < 1e-6 && dn.vel.lengthSq() < 1e-5) {
        dn.now.set(0, 0, 0);
        dn.vel.set(0, 0, 0);
        dn.live = moved > 0 ? false : false;
      }
    }

    /* ── 손이 설 자리 ──────────────────────────────────────────
       손은 커서를 그대로 따라가지 않는다. 몽이의 만지는 자리에 붙어야 잡고 있는 것으로 보인다.
       살이 밀린 만큼(dn.now) 손도 같이 가서, 볼을 당기면 손이 늘어난 끝에 붙어 있는다.

       깊이는 화면 기준으로 잡는다. 몽이 로컬의 +z 를 "앞" 으로 삼으면 반 바퀴 돌렸을 때
       그 앞이 화면 뒤가 되어 손이 몸 뒤로 숨는다. 만지는 자리를 화면에 투영해 그 방향으로,
       몽이 전체보다 앞선 깊이에 세우면 어느 각도에서든 커서 위에 얹힌다. */
    const anchor = handAnchorRef.current;
    /* 쓰다듬는 동안만 참 — 하트를 띄우는 신호다. 살이 실제로 눌리고 있을 때만 켠다. */
    if (pettingRef) pettingRef.current = touch.petting && dn.live;
    const holdingHead = (touch.cheek !== 0 && dn.holding) || touch.petting;
    let aimX = touch.ndcX;
    let aimY = touch.ndcY;
    let onFlesh = false;
    if (touch.hand && touch.hand !== "grab") {
      onFlesh = holdingHead
        ? (_handAt.copy(dn.at), true)
        : pick(touch.ndcX, touch.ndcY, _handAt) ||
          (pick(touch.ndcX, touch.ndcY, _handAt, EAR_REACH) && (_handAt.setLength(HEAD_R), true));
      if (onFlesh) {
        /* 이 자리의 바깥 방향. 머리는 구를 축마다 다르게 늘린 타원면이라 법선이 곧 위치가
           아니다 — 축 배율로 **나눠야** 한다(타원면 기울기 ∝ x/a², 그 점은 a·x 라서).
           눌린 만큼 더하기 전에 잰다. 눌린 자리의 순간 기울기까지 따라가면 손이 떨린다. */
        _handNrm
          .set(_handAt.x / HEAD_SCALE[0], _handAt.y / HEAD_SCALE[1], _handAt.z / HEAD_SCALE[2])
          .normalize()
          .transformDirection(grp.matrixWorld);
        anchor.normal.copy(_handNrm);
        _handAt.add(dn.now);
        _handWorld.set(
          HEAD_POS[0] + _handAt.x * HEAD_SCALE[0],
          HEAD_POS[1] + _handAt.y * HEAD_SCALE[1],
          HEAD_POS[2] + _handAt.z * HEAD_SCALE[2],
        );
        grp.localToWorld(_handWorld);
        _handWorld.project(camera);
        aimX = _handWorld.x;
        aimY = _handWorld.y;
      }
    }

    if (!touch.hand || (touch.hand !== "grab" && !onFlesh)) {
      anchor.active = false;
    } else {
      /* 몽이 중심까지의 거리에서 반지름만큼 당긴 자리 — 몸 어느 부분보다도 앞이다. */
      _handWorld.set(0, 0, 0);
      grp.localToWorld(_handWorld);
      const centerNdcX = _pickAt.copy(_handWorld).project(camera).x;
      const dist = camera.position.distanceTo(_handWorld);
      _rayA.set(aimX, aimY, -1).unproject(camera);
      _rayB.set(aimX, aimY, 1).unproject(camera);
      _rayB.sub(_rayA).normalize();
      anchor.pos
        .copy(camera.position)
        .addScaledVector(_rayB, dist - HAND_CLEAR * outScale);
      anchor.scale = outScale;
      /* 손은 늘 화면에서 몽이 바깥쪽으로 물러난다. */
      anchor.side = aimX >= centerNdcX ? 1 : -1;
      anchor.active = true;
    }

    // ── Idle animations (breathing, ear wiggle, arm/leg sway, tail wag) ──
    // Breathing — subtle body scale pulse
    if (bodyRef.current) {
      const breath = 1 + Math.sin(t * 1.8) * 0.02;
      bodyRef.current.scale.set(0.75 * breath, 0.78 * breath, 0.7 * breath);
    }

    // Ear wiggle — independent sine waves per ear
    if (leftEarRef.current) {
      leftEarRef.current.rotation.set(
        0.12 + Math.sin(t * 2.3) * 0.08,
        Math.sin(t * 1.7) * 0.05,
        0.18 + Math.sin(t * 3.1) * 0.06,
      );
    }
    if (rightEarRef.current) {
      rightEarRef.current.rotation.set(
        0.12 + Math.sin(t * 2.3 + 0.5) * 0.08,
        Math.sin(t * 1.7 + 0.5) * -0.05,
        -0.18 + Math.sin(t * 3.1 + 1) * -0.06,
      );
    }

    // Arm sway — gentle pendulum
    if (leftArmRef.current) {
      leftArmRef.current.rotation.set(
        Math.sin(t * 1.5) * 0.12,
        0,
        2 + Math.sin(t * 1.2) * 0.15,
      );
    }
    if (rightArmRef.current) {
      rightArmRef.current.rotation.set(
        Math.sin(t * 1.5 + Math.PI) * 0.12,
        0,
        -2 + Math.sin(t * 1.2 + Math.PI) * -0.15,
      );
    }

    // Leg sway — slight kick
    if (leftLegRef.current) {
      leftLegRef.current.rotation.set(
        1.4 + Math.sin(t * 1.0) * 0.08,
        0,
        0.1 + Math.sin(t * 0.8) * 0.04,
      );
    }
    if (rightLegRef.current) {
      rightLegRef.current.rotation.set(
        1.4 + Math.sin(t * 1.0 + Math.PI) * 0.08,
        0,
        -0.1 + Math.sin(t * 0.8 + Math.PI) * -0.04,
      );
    }

    // Tail wag
    if (tailRef.current) {
      tailRef.current.position.set(
        Math.sin(t * 4) * 0.03,
        -0.25,
        -0.38,
      );
      tailRef.current.scale.set(
        1 + Math.sin(t * 3) * 0.1,
        1 + Math.cos(t * 3) * 0.1,
        1,
      );
    }

    // ── Expressions ──
    const storeExpr = useProfileSectionStore.getState().bunnyExpression;
    let showNormal: boolean;
    let showSquint: boolean;
    let showSmile: boolean;

    if (storeExpr) {
      showNormal = storeExpr === "normal";
      showSquint = storeExpr === "surprised";
      showSmile = storeExpr === "happy";
    } else {
      const HIT_EXPR_DUR = 0.8;
      const isHitExpr = hitTime.current > 0 && (t - hitTime.current) < HIT_EXPR_DUR;
      const isSmile = !isHitExpr && !!smileRef?.current;
      showNormal = !isHitExpr && !isSmile;
      showSquint = isHitExpr;
      showSmile = isSmile;
    }

    // normal eyes
    if (leftEyeRef.current) leftEyeRef.current.visible = showNormal;
    if (rightEyeRef.current) rightEyeRef.current.visible = showNormal;
    // hit >< eyes
    if (leftSquintRef.current) leftSquintRef.current.visible = showSquint;
    if (rightSquintRef.current) rightSquintRef.current.visible = showSquint;
    // smile ^^ eyes
    if (leftSmileRef.current) leftSmileRef.current.visible = showSmile;
    if (rightSmileRef.current) rightSmileRef.current.visible = showSmile;

    // ── Eye blink (특수 표정 중에는 스킵) ──
    if (showNormal) {
      const BLINK_DUR = 0.15;
      if (blinkPhase.current < 0) {
        if (t > nextBlink.current) {
          blinkPhase.current = 0;
        }
      }
      let eyeScaleY = 1.3;
      if (blinkPhase.current >= 0) {
        blinkPhase.current += dt / BLINK_DUR;
        if (blinkPhase.current >= 1) {
          blinkPhase.current = -1;
          nextBlink.current = t + 2 + Math.random() * 4;
        } else {
          const p2 = blinkPhase.current < 0.5
            ? blinkPhase.current / 0.5
            : 1 - (blinkPhase.current - 0.5) / 0.5;
          eyeScaleY = 1.3 * (1 - p2 * 0.92);
        }
      }
      if (leftEyeRef.current) leftEyeRef.current.scale.y = eyeScaleY;
      if (rightEyeRef.current) rightEyeRef.current.scale.y = eyeScaleY;
    }

    // 3D → screen projection for speech bubble
    if (screenPosRef?.current) {
      const projected = groupRef.current.position.clone().project(camera);
      screenPosRef.current.x = ((projected.x + 1) / 2) * size.width;
      screenPosRef.current.y = (-(projected.y - 1) / 2) * size.height;
    }
  });

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 4]} intensity={0.9} />
      <directionalLight position={[-2, -1, 3]} intensity={0.3} />
      <hemisphereLight args={["#ffeedd", "#b0a8c0", 0.4]} />

      {/* 몽이를 만질 때 커서 자리에 서는 손. 같은 조명 아래 있어야 재질이 맞는다. */}
      <TouchHand anchor={handAnchorRef} />

      <group ref={groupRef}>
        {/* ── Body (pear shape) ── */}
        <mesh ref={bodyRef} position={[0, -0.15, 0]} geometry={BODY_GEO} scale={[0.75, 0.78, 0.7]}>
          <BunnySkin />
          {/* 털은 밑살의 자식이라 같은 자리·같은 배율을 그대로 물려받는다. */}
          <BunnyFur geometry={BODY_GEO} length={0.07} repeat={2.2} shells={furShells} boost={furBoostRef} />
        </mesh>

        {/* ── Head ── */}
        {/* 분할을 늘린 건 살이 밀릴 때를 위한 것이다. 24×18 이면 밀린 자리가 뾰족한 모서리로
            보인다 — 꼭짓점 하나가 혼자 끌려 나오기 때문이다. */}
        <mesh ref={headRef} position={[0, 0.42, 0.06]} geometry={HEAD_GEO} scale={[1.15, 1, 0.95]}>
          <BunnySkin />
          <BunnyFur
            geometry={HEAD_GEO}
            length={HEAD_FUR_LEN}
            repeat={1.8}
            shells={furShells}
            boost={furBoostRef}
            bare={bareRef}
          />
        </mesh>

        {/* ── Left Ear ── */}
        <mesh
          ref={leftEarRef}
          position={[-0.2, 0.82, -0.04]}
          rotation={[0.12, 0, 0.18]}
          geometry={EAR_GEO}
          scale={[1.3, 1.3, 1]}
        >
          <BunnySkin />
          <BunnyFur geometry={EAR_GEO} length={0.042} repeat={1.2} shells={furShells} boost={furBoostRef} />
        </mesh>

        {/* ── Right Ear ── */}
        <mesh
          ref={rightEarRef}
          position={[0.2, 0.82, -0.04]}
          rotation={[0.12, 0, -0.18]}
          geometry={EAR_GEO}
          scale={[1.3, 1.3, 1]}
        >
          <BunnySkin />
          <BunnyFur geometry={EAR_GEO} length={0.042} repeat={1.2} shells={furShells} boost={furBoostRef} />
        </mesh>

        {/* ── Left Eye (normal) ── */}
        <mesh
          ref={leftEyeRef}
          position={[-0.2, 0.46, 0.48]}
          rotation={[-0.08, -0.31, 0]}
          scale={[1, 1.3, 0.15]}
        >
          <sphereGeometry args={[0.12, 16, 12]} />
          <meshBasicMaterial color={EYE_COLOR} />
        </mesh>

        {/* ── Right Eye (normal) ── */}
        <mesh
          ref={rightEyeRef}
          position={[0.2, 0.46, 0.48]}
          rotation={[-0.08, 0.31, 0]}
          scale={[1, 1.3, 0.15]}
        >
          <sphereGeometry args={[0.12, 16, 12]} />
          <meshBasicMaterial color={EYE_COLOR} />
        </mesh>

        {/* ── Left Squint Eye > (꼭짓점 오른쪽 만남) ── */}
        <group
          ref={leftSquintRef}
          position={[-0.14, 0.46, 0.49]}
          rotation={[-0.08, -0.2, 0]}
          visible={false}
        >
          <mesh position={[-0.088, 0.043, 0]} rotation={[0, 0, -0.45 + Math.PI / 2]}>
            <capsuleGeometry args={[0.018, 0.16, 4, 8]} />
            <meshBasicMaterial color={EYE_COLOR} />
          </mesh>
          <mesh position={[-0.088, -0.043, 0]} rotation={[0, 0, 0.45 + Math.PI / 2]}>
            <capsuleGeometry args={[0.018, 0.16, 4, 8]} />
            <meshBasicMaterial color={EYE_COLOR} />
          </mesh>
        </group>

        {/* ── Right Squint Eye < (꼭짓점 왼쪽 만남) ── */}
        <group
          ref={rightSquintRef}
          position={[0.14, 0.46, 0.49]}
          rotation={[-0.08, 0.2, 0]}
          visible={false}
        >
          <mesh position={[0.088, 0.043, 0]} rotation={[0, 0, 0.45 + Math.PI / 2]}>
            <capsuleGeometry args={[0.018, 0.16, 4, 8]} />
            <meshBasicMaterial color={EYE_COLOR} />
          </mesh>
          <mesh position={[0.088, -0.043, 0]} rotation={[0, 0, -0.45 + Math.PI / 2]}>
            <capsuleGeometry args={[0.018, 0.16, 4, 8]} />
            <meshBasicMaterial color={EYE_COLOR} />
          </mesh>
        </group>

        {/* ── Left Smile Eye ^ (말풍선 전환 시) ── */}
        <group
          ref={leftSmileRef}
          position={[-0.2, 0.46, 0.49]}
          rotation={[-0.08, -0.31, 0]}
          visible={false}
        >
          <mesh>
            <torusGeometry args={[0.08, 0.02, 8, 16, Math.PI]} />
            <meshBasicMaterial color={EYE_COLOR} />
          </mesh>
          <mesh position={[0.08, 0, 0]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshBasicMaterial color={EYE_COLOR} />
          </mesh>
          <mesh position={[-0.08, 0, 0]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshBasicMaterial color={EYE_COLOR} />
          </mesh>
        </group>

        {/* ── Right Smile Eye ^ (말풍선 전환 시) ── */}
        <group
          ref={rightSmileRef}
          position={[0.2, 0.46, 0.49]}
          rotation={[-0.08, 0.31, 0]}
          visible={false}
        >
          <mesh>
            <torusGeometry args={[0.08, 0.02, 8, 16, Math.PI]} />
            <meshBasicMaterial color={EYE_COLOR} />
          </mesh>
          <mesh position={[0.08, 0, 0]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshBasicMaterial color={EYE_COLOR} />
          </mesh>
          <mesh position={[-0.08, 0, 0]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshBasicMaterial color={EYE_COLOR} />
          </mesh>
        </group>

        {/* ── Tail ── */}
        <mesh ref={tailRef} position={[0, -0.25, -0.38]} geometry={TAIL_GEO}>
          <BunnySkin />
          <BunnyFur geometry={TAIL_GEO} length={0.04} repeat={0.8} shells={furShells} boost={furBoostRef} />
        </mesh>

        {/* ── Left Arm+Hand ── */}
        <mesh
          ref={leftArmRef}
          position={[-0.3, -0.1, 0]}
          rotation={[0, 0, 2]}
          geometry={ARM_GEO}
          scale={[1, 1.6, 1]}
        >
          <BunnySkin />
          <BunnyFur geometry={ARM_GEO} length={0.034} repeat={0.9} shells={furShells} boost={furBoostRef} />
        </mesh>

        {/* ── Right Arm+Hand ── */}
        <mesh
          ref={rightArmRef}
          position={[0.3, -0.1, 0]}
          rotation={[0, 0, -2]}
          geometry={ARM_GEO}
          scale={[1, 1.6, 1]}
        >
          <BunnySkin />
          <BunnyFur geometry={ARM_GEO} length={0.034} repeat={0.9} shells={furShells} boost={furBoostRef} />
        </mesh>

        {/* ── Left Leg ── */}
        <mesh
          ref={leftLegRef}
          position={[-0.15, -0.35, 0.25]}
          rotation={[1.4, 0, 0.1]}
          geometry={FOOT_GEO}
          scale={[0.7, 1.8, 0.7]}
        >
          <BunnySkin />
          <BunnyFur geometry={FOOT_GEO} length={0.036} repeat={0.9} shells={furShells} boost={furBoostRef} />
        </mesh>

        {/* ── Right Leg ── */}
        <mesh
          ref={rightLegRef}
          position={[0.15, -0.35, 0.25]}
          rotation={[1.4, 0, -0.1]}
          geometry={FOOT_GEO}
          scale={[0.7, 1.8, 0.7]}
        >
          <BunnySkin />
          <BunnyFur geometry={FOOT_GEO} length={0.036} repeat={0.9} shells={furShells} boost={furBoostRef} />
        </mesh>
      </group>
    </>
  );
}
