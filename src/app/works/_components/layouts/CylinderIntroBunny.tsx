"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import {
  BODY_GEO,
  EAR_GEO,
  ARM_GEO,
  FOOT_GEO,
  TAIL_GEO,
  EYE_COLOR,
  EYE_LOCAL,
  BARE_RIN,
  BARE_ROUT,
  BARE_YW,
} from "@/app/profile/_components/FloatingObject/bunnyGeometry";
import BunnyFur from "@/app/profile/_components/FloatingObject/BunnyFur";
import BunnySkin from "@/app/profile/_components/FloatingObject/BunnySkin";
import TouchHand from "@/app/profile/_components/FloatingObject/TouchHand";
import { BunnyTouchRig, lerpAngle, type BunnySpot } from "@/app/profile/_components/FloatingObject/bunnyTouchRig";
import { useBunnyBoing } from "@/app/profile/_components/FloatingObject/useBunnyBoing";
import { createBunnyTouch } from "@/stores/profileSectionStore";
import { slotOffset, RADIUS, PLANE_WIDTH } from "./cylinder/scene";

const BACK_THRESHOLD = Math.PI * 0.55;

/* 몽이가 서는 깊이 — 카메라에서 먼 쪽 판까지 거리의 이 비율만큼 앞. 카메라 거리가 화면 비율 따라 바뀌어도
   판에 비해 같은 크기로 보인다(처음 맞춘 값: 카메라 9, 몽이 3, 판 44 → 6/44) */
const BUNNY_DEPTH = 6 / 44;
/* 판 폭을 46 에 맞춰 잡은 크기라, 판이 좁아진 만큼 몽이와 그 움직임도 줄인다 */
const BUNNY_FIT = PLANE_WIDTH / 46;
const BUNNY_SCALE = 0.55 * BUNNY_FIT;
const BUNNY_SPEED = 1.8 * BUNNY_FIT;
/* 원통 인트로의 몽이는 프로필의 것보다 작게 보이고 헬멧에 반쯤 가린다.
   껍질 하나가 부위를 통째로 다시 그리므로 겹 수는 프로필(6)보다 적게 잡는다. */
const FUR_SHELLS = 4;
const BUNNY_WALL_BOUNCE = 0.9;
const BUNNY_FRICTION = 0.998;
const BUNNY_MARGIN = 0.8 * BUNNY_FIT;

/* ── 만지기 ──
   profile 의 MEET 패널처럼 머리 위를 쓰다듬고, 볼을 잡아당기고, 코·몸을 찌르고, 몸을 잡아 돌린다.
   떠다니는 채로는 손이 따라잡지 못하므로 커서가 올라오면 그 자리에 멈춰 서서 정면을 본다. */
/** 멈춰 서는 데·다시 떠나는 데 걸리는 시간(초). 서는 쪽이 빨라야 손을 대자마자 만질 수 있다. */
const HOLD_IN = 0.3;
const HOLD_OUT = 0.8;
/** 이만큼 안 움직이고 뗐으면 끈 게 아니라 찌른 것(px). */
const TAP_SLOP = 8;
/** 볼을 끌 수 있는 한계 — 몽이 키(화면)에 대한 비율. 위로는 좁다(더 끌면 밀린 살이 눈까지 올라온다).
    profile 의 자리 상자에 앉은 몽이에서 맞춘 값(NDC 0.22·0.05)을 그 몽이 키로 나눈 것이다. */
const PULL_OF_HEIGHT = 0.26;
const PULL_UP_OF_HEIGHT = 0.06;
/** 표정이 손을 뗀 뒤에도 남는 시간(초) — 바로 풀리면 무엇에 반응한 건지 안 읽힌다. */
const EXPR_LINGER = 0.8;

/* 꽃잎 다섯 장이 앉는 각도 — 위에서 시작해 한 바퀴 */
const PETAL_ANGLES = Array.from({ length: 5 }, (_, i) => (i / 5) * Math.PI * 2 + Math.PI / 2);

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * 트레일 커서를 전역으로 감춘다. 몽이를 만지는 동안에는 장면 안의 3D 손이 커서 노릇을 한다.
 * 볼을 잡고 끌면 포인터가 몽이 밖으로 나가도 계속 잡고 있으므로 캔버스가 아니라 body 에 단다.
 */
function setTrailHidden(on: boolean): void {
  if (on) document.body.dataset.cursor = "blank";
  else delete document.body.dataset.cursor;
}

interface Props {
  screenPosRef: React.MutableRefObject<{ x: number; y: number }[]>;
  arc: number;
  /** 판 띠의 길이(칸 수 × 한 칸 각) — 인트로 칸이 앞면에서 얼마나 떨어졌는지 셀 때 쓴다 */
  loop: number;
  actualRotRef: React.MutableRefObject<number>;
  /** 어두운 테마인가 — 밝은 쪽에서는 어항(헬멧) 대신 머리에 꽃을 얹는다(#1062).
      판도 화면도 봄날인데 우주복만 남으면 혼자 다른 이야기를 한다 */
  isDark?: boolean;
  /** 몽이의 화면 좌표(px) — 쓰다듬을 때 뜨는 하트(BunnyHearts)가 읽는다 */
  bunnyScreenRef: React.RefObject<{ x: number; y: number }>;
  /** 지금 쓰다듬고 있는지 — 하트가 읽는다 */
  pettingRef: React.RefObject<boolean>;
}

export default function CylinderIntroBunny({
  screenPosRef,
  arc,
  loop,
  actualRotRef,
  isDark = true,
  bunnyScreenRef,
  pettingRef,
}: Props) {
  const groupRef = useRef<THREE.Group>(null);
  /* 머리는 만지면 꼭짓점이 밀린다. profile 의 몽이와 같은 도형(HEAD_GEO)을 쓰면 둘이 한 살을 나눠 밀게
     되므로 따로 만든다. 분할은 그쪽과 같다 — 성기면 밀린 자리가 뾰족한 모서리로 보인다. */
  const headGeo = useMemo(() => new THREE.SphereGeometry(0.48, 40, 28), []);
  useEffect(() => () => headGeo.dispose(), [headGeo]);
  /* 프로필 쪽은 몽이가 작아질 때 털을 더 뽑지만, 여기서는 크기가 고정이라 배수도 고정이다. */
  const furBoost = useRef({ k: 1 });
  /* 눈가에서는 털을 눕힌다. 안 그러면 껍질이 눈 위로 덮여 눈이 얼룩덜룩해진다.
     자리는 프로필과 같은 것을 본다. */
  const furBare = useRef({
    x: EYE_LOCAL[0], y: EYE_LOCAL[1], z: EYE_LOCAL[2],
    rIn: BARE_RIN, rOut: BARE_ROUT, yw: BARE_YW,
  });

  /* ── 조명 ──
     빛은 몽이와 같이 **돌면 안 된다**. 예전에는 조명을 몽이 그룹 안에 두어, 빛의 자리는 몽이를 따라
     돌면서 겨누는 곳은 월드 원점(원통 한가운데, 한참 뒤)이었다. 그러면 빛이 몽이 뒤쪽 먼 곳을 향해
     정면이 어둡고 탁한 회색으로 가라앉는다. profile 처럼 화면 기준 오른쪽 위 앞에서 비추도록
     방향을 고정하고, 자리만 몽이를 따라다니게 한다. */
  const lightRigRef = useRef<THREE.Group>(null);
  const lightTarget = useMemo(() => new THREE.Object3D(), []);

  const bodyRef = useRef<THREE.Mesh>(null);
  const leftEarRef = useRef<THREE.Mesh>(null);
  const rightEarRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const leftEyeRef = useRef<THREE.Mesh>(null);
  const rightEyeRef = useRef<THREE.Mesh>(null);
  const leftSquintRef = useRef<THREE.Group>(null);
  const rightSquintRef = useRef<THREE.Group>(null);
  const leftSmileRef = useRef<THREE.Group>(null);
  const rightSmileRef = useRef<THREE.Group>(null);
  const hitRef = useRef<THREE.Mesh>(null);

  const pos = useRef(new THREE.Vector2(0.5, -0.3));
  const vel = useRef<THREE.Vector2 | null>(null);
  const spinVel = useRef(new THREE.Vector3(0, 0, 0));
  const spinOffset = useRef(new THREE.Euler(0, 0, 0));

  /* 만지는 일(광선 판정·살 밀림·출렁임·손 자리)은 profile 의 몽이와 같은 장치가 푼다.
     입력은 이 몽이만의 것을 따로 든다 — profile 의 스토어를 같이 쓰면 두 몽이가 한 손에 반응한다. */
  const [rig] = useState(() => new BunnyTouchRig());
  const touchRef = useRef(createBunnyTouch());
  /** 끌어서 돌린 각도와 그 여세(rad). */
  const drag = useRef({ x: 0, y: 0, vx: 0, vy: 0, dragging: false });
  /** 누른 자리와 그 뒤로 움직인 거리 — 뗄 때 찌른 건지 끈 건지 가른다. */
  const press = useRef<{ x: number; y: number; nx: number; ny: number; moved: number; spot: BunnySpot } | null>(null);
  /** 멈춰 선 정도 0~1. 0 = 떠다님, 1 = 서서 정면을 봄. */
  const hold = useRef(0);
  /** 표정이 풀리는 시각(초) — 놀람(><)·좋아함(^^). */
  const expr = useRef({ surprisedUntil: -1, happyUntil: -1 });
  /** 볼을 끌 수 있는 한계(NDC) — 몽이가 화면에서 차지하는 키로 매 프레임 다시 잡는다. */
  const pullLimit = useRef({ side: 0.15, up: 0.035 });
  /* 첫 깜빡임까지의 시간 — 마운트 때 한 번만 뽑는다(useRef 인자는 렌더마다 평가된다). */
  const [firstBlinkAt] = useState(() => 2 + Math.random() * 3);
  const nextBlink = useRef(firstBlinkAt);
  const blinkPhase = useRef(-1);
  const trailHidden = useRef(false);
  const playBoing = useBunnyBoing();
  const hitRay = useMemo(() => new THREE.Raycaster(), []);

  const canvasEl = useThree((s) => s.gl.domElement);
  /* 트레일 커서와 함께 시스템 커서도 끈다 — 커스텀 커서를 안 쓰는 환경에서 화살표와 손이 같이 뜨지 않게 */
  const hideTrail = (on: boolean) => {
    if (trailHidden.current === on) return;
    trailHidden.current = on;
    setTrailHidden(on);
    if (on) canvasEl.setAttribute("data-bunny-touch", "");
    else canvasEl.removeAttribute("data-bunny-touch");
  };
  /* 떠날 때 커서를 되돌려 둔다 — 감춘 채로 페이지를 넘기면 다음 화면에서 커서가 안 보인다. */
  useEffect(() => () => { if (trailHidden.current) setTrailHidden(false); }, []);

  /** 손을 뗀 상태로 되돌린다 — 몽이가 가려지거나 포인터가 떠났을 때. */
  const releaseTouch = () => {
    const touch = touchRef.current;
    touch.over = false;
    touch.hand = "";
    touch.spot = "";
    touch.cheek = 0;
    touch.petting = false;
    drag.current.dragging = false;
    press.current = null;
    hideTrail(false);
  };

  useFrame(({ clock, camera, size }, delta) => {
    const group = groupRef.current;
    if (!group) return;

    // Visibility: hide when slot 0 rotates behind
    const relAngle = slotOffset(0, 0, loop, actualRotRef.current);
    const isVisible = Math.abs(relAngle) < BACK_THRESHOLD;
    group.visible = isVisible;
    if (lightRigRef.current) lightRigRef.current.visible = isVisible;
    if (!isVisible) {
      if (touchRef.current.over || press.current) releaseTouch();
      rig.hideHand();
      pettingRef.current = false;
      return;
    }

    const dt = Math.min(delta, 0.05);
    const t = clock.getElapsedTime();
    const touch = touchRef.current;
    const dr = drag.current;

    // Slot 0 screen position → world offset at the bunny depth
    const slot0 = screenPosRef.current[0] || { x: 0, y: 0 };
    const cam = camera as THREE.PerspectiveCamera;
    const panelDist = cam.position.z + RADIUS;
    const bunnyDist = panelDist * BUNNY_DEPTH;
    const bunnyZ = cam.position.z - bunnyDist;
    const bHalfH = Math.tan((cam.fov * Math.PI) / 360) * bunnyDist;
    const bHalfW = bHalfH * cam.aspect;
    const centerX = (slot0.x / (size.width * 0.5)) * bHalfW;
    const centerY = -(slot0.y / (size.height * 0.5)) * bHalfH;
    /* 몽이 키(모델 약 2 단위)가 화면 세로(NDC 2)에서 차지하는 몫 */
    const bunnyNdcH = (2 * BUNNY_SCALE) / bHalfH;
    pullLimit.current.side = PULL_OF_HEIGHT * bunnyNdcH;
    pullLimit.current.up = PULL_UP_OF_HEIGHT * bunnyNdcH;

    // Slot projected bounds at the bunny depth
    const ratio = BUNNY_DEPTH;
    const slotHalfW = (PLANE_WIDTH / 2) * ratio - BUNNY_MARGIN;
    const slotHalfH = ((arc * RADIUS) / 2) * ratio - BUNNY_MARGIN;

    /* 커서가 올라와 있거나 붙잡고 있으면 멈춰 선다 */
    const wantHold = touch.over || press.current !== null;
    hold.current = THREE.MathUtils.clamp(hold.current + (wantHold ? dt / HOLD_IN : -dt / HOLD_OUT), 0, 1);
    const k = easeInOutCubic(hold.current);

    if (!vel.current) {
      const angle = Math.random() * Math.PI * 2;
      vel.current = new THREE.Vector2(
        Math.cos(angle) * BUNNY_SPEED,
        Math.sin(angle) * BUNNY_SPEED,
      );
    }
    const v = vel.current;
    const p = pos.current;
    const sv = spinVel.current;
    const so = spinOffset.current;

    v.x *= BUNNY_FRICTION;
    v.y *= BUNNY_FRICTION;
    /* 서 있는 동안에는 속도를 죽인다 — 다시 떠날 때는 아래의 걷어차기가 새 방향을 준다 */
    v.x *= 1 - k;
    v.y *= 1 - k;

    if (hold.current === 0 && v.length() < 0.4) {
      const kickAngle = Math.random() * Math.PI * 2;
      v.x += Math.cos(kickAngle) * 0.8;
      v.y += Math.sin(kickAngle) * 0.8;
    }

    p.x += v.x * dt;
    p.y += v.y * dt;

    // Wall bounce
    if (p.x < -slotHalfW) {
      p.x = -slotHalfW;
      v.x = Math.abs(v.x) * BUNNY_WALL_BOUNCE;
      sv.set(sv.x, sv.y + v.x * 4, sv.z - v.y * 3);
    } else if (p.x > slotHalfW) {
      p.x = slotHalfW;
      v.x = -Math.abs(v.x) * BUNNY_WALL_BOUNCE;
      sv.set(sv.x, sv.y + v.x * 4, sv.z - v.y * 3);
    }
    if (p.y < -slotHalfH) {
      p.y = -slotHalfH;
      v.y = Math.abs(v.y) * BUNNY_WALL_BOUNCE;
      sv.set(sv.x - v.y * 4, sv.y, sv.z + v.x * 3);
    } else if (p.y > slotHalfH) {
      p.y = slotHalfH;
      v.y = -Math.abs(v.y) * BUNNY_WALL_BOUNCE;
      sv.set(sv.x - v.y * 4, sv.y, sv.z + v.x * 3);
    }

    sv.multiplyScalar(0.99);
    so.x += sv.x * dt;
    so.y += sv.y * dt;
    so.z += sv.z * dt;

    /* 끌어서 돌린 각도 — 손을 떼면 여세로 조금 더 돌다가 멈춘다 */
    if (!dr.dragging) {
      dr.y += dr.vy;
      dr.x = THREE.MathUtils.clamp(dr.x + dr.vx, -1.2, 1.2);
      dr.vx *= 0.92;
      dr.vy *= 0.92;
      if (Math.abs(dr.vx) < 1e-4) dr.vx = 0;
      if (Math.abs(dr.vy) < 1e-4) dr.vy = 0;
    }

    const bobY = Math.sin(t * 1.2) * 0.1;
    const bobX = Math.cos(t * 0.9) * 0.06;
    const x = centerX + p.x + bobX;
    const y = centerY + p.y + bobY * (1 - k * 0.65);

    /* 떠다니는 자세와, 서서 정면을 보는 자세 사이를 가까운 쪽으로 섞는다.
       서 있을 때는 고개만 조금 갸웃하고, 끌어서 돌린 만큼을 거기에 더한다.
       끄는 동안에는 갸웃거림을 죽인다 — 손으로 잡은 것이 스스로 움직이면 어긋나 보인다. */
    const idle = dr.dragging ? 0 : 1;
    const freeRx = 0.08 * Math.sin(t * 0.5) + so.x;
    const freeRy = t * 0.25 + so.y;
    const freeRz = 0.06 * Math.sin(t * 0.4) + so.z;
    const rx = lerpAngle(freeRx, Math.sin(t * 0.6) * 0.05 * idle + dr.x, k);
    const ry = lerpAngle(freeRy, Math.sin(t * 0.45) * 0.12 * idle + dr.y, k);
    const rz = lerpAngle(freeRz, Math.sin(t * 0.5) * 0.04 * idle, k);
    if (hold.current === 1) {
      /* 완전히 서 있는 동안에는 떠다니는 자세를 지금 자세에 맞춰 둔다 — 떠날 때 돌려 놓은 그 자세에서
         이어서 돌고, 처음 자세로 휙 돌아가지 않는다 */
      so.set(rx - 0.08 * Math.sin(t * 0.5), ry - t * 0.25, rz - 0.06 * Math.sin(t * 0.4));
      sv.set(0, 0, 0);
    }

    /* ── 만지기 ── 직전 프레임 자세로 광선을 되돌려 머리 어디를 가리키는지 풀고, 살과 몸을 움직인다 */
    rig.begin(camera, group);
    rig.sense(touch, dt, () => {
      expr.current.surprisedUntil = t + EXPR_LINGER;
      playBoing();
    });
    /* 올려 둔 채 가만히 있어도 몽이가 갸웃거리며 커서 밑 자리가 바뀐다 — 손 모양을 그 자리에 맞춘다 */
    if (touch.over && !press.current) touch.hand = touch.spot || "grab";
    if (touch.cheek !== 0) expr.current.surprisedUntil = t + EXPR_LINGER * 0.75;
    if (touch.petting) expr.current.happyUntil = t + EXPR_LINGER;

    rig.pose(group, x, y, bunnyZ, rx, ry, rz, BUNNY_SCALE);
    rig.deform(headGeo);
    pettingRef.current = rig.placeHand(touch, BUNNY_SCALE);

    /* 빛은 자리만 몽이를 따라간다(방향은 월드에 고정) */
    lightRigRef.current?.position.set(x, y, bunnyZ);

    if (bodyRef.current) {
      const breath = 1 + Math.sin(t * 1.8) * 0.025;
      bodyRef.current.scale.set(0.75 * breath, 0.78 * breath, 0.7 * breath);
    }

    if (leftEarRef.current) {
      leftEarRef.current.rotation.set(
        0.12 + Math.sin(t * 3.0) * 0.12,
        Math.sin(t * 2.2) * 0.08,
        0.18 + Math.sin(t * 4.0) * 0.1,
      );
    }
    if (rightEarRef.current) {
      rightEarRef.current.rotation.set(
        0.12 + Math.sin(t * 3.0 + 0.5) * 0.12,
        Math.sin(t * 2.2 + 0.5) * -0.08,
        -0.18 + Math.sin(t * 4.0 + 1) * -0.1,
      );
    }

    if (leftArmRef.current) {
      leftArmRef.current.rotation.set(
        Math.sin(t * 2.5) * 0.2, 0, 2 + Math.sin(t * 2.0) * 0.25,
      );
    }
    if (rightArmRef.current) {
      rightArmRef.current.rotation.set(
        Math.sin(t * 2.5 + Math.PI) * 0.2, 0, -2 + Math.sin(t * 2.0 + Math.PI) * -0.25,
      );
    }

    if (leftLegRef.current) {
      leftLegRef.current.rotation.set(
        1.4 + Math.sin(t * 1.8) * 0.12, 0, 0.1 + Math.sin(t * 1.4) * 0.06,
      );
    }
    if (rightLegRef.current) {
      rightLegRef.current.rotation.set(
        1.4 + Math.sin(t * 1.8 + Math.PI) * 0.12, 0, -0.1 + Math.sin(t * 1.4 + Math.PI) * -0.06,
      );
    }

    /* ── 표정 ── 볼을 잡히거나 찔리면 놀라고(><), 쓰다듬으면 좋아한다(^^) */
    const showSquint = t < expr.current.surprisedUntil;
    const showSmile = !showSquint && t < expr.current.happyUntil;
    const showNormal = !showSquint && !showSmile;
    if (leftEyeRef.current) leftEyeRef.current.visible = showNormal;
    if (rightEyeRef.current) rightEyeRef.current.visible = showNormal;
    if (leftSquintRef.current) leftSquintRef.current.visible = showSquint;
    if (rightSquintRef.current) rightSquintRef.current.visible = showSquint;
    if (leftSmileRef.current) leftSmileRef.current.visible = showSmile;
    if (rightSmileRef.current) rightSmileRef.current.visible = showSmile;

    /* 눈 깜빡임 — 놀라거나 웃는 동안에는 쉰다 */
    if (showNormal) {
      const BLINK_DUR = 0.15;
      if (blinkPhase.current < 0 && t > nextBlink.current) blinkPhase.current = 0;
      let eyeScaleY = 1.3;
      if (blinkPhase.current >= 0) {
        blinkPhase.current += dt / BLINK_DUR;
        if (blinkPhase.current >= 1) {
          blinkPhase.current = -1;
          nextBlink.current = t + 2 + Math.random() * 4;
        } else {
          const b = blinkPhase.current < 0.5 ? blinkPhase.current / 0.5 : 1 - (blinkPhase.current - 0.5) / 0.5;
          eyeScaleY = 1.3 * (1 - b * 0.92);
        }
      }
      if (leftEyeRef.current) leftEyeRef.current.scale.y = eyeScaleY;
      if (rightEyeRef.current) rightEyeRef.current.scale.y = eyeScaleY;
    }

    /* 하트가 뜰 자리 — 몽이 중심의 화면 좌표 */
    const projected = group.position.clone().project(camera);
    bunnyScreenRef.current.x = ((projected.x + 1) / 2) * size.width;
    bunnyScreenRef.current.y = ((1 - projected.y) / 2) * size.height;
  });

  /* ── 입력 ──
     몽이 둘레의 보이지 않는 구가 포인터를 받는다. 어디를 만지는지는 여기서 정하지 않는다 —
     화면 좌표만 넘기면 몽이의 지금 자세를 아는 장면(rig)이 광선을 쏴 풀어 준다. */
  const ndcOf = (e: ThreeEvent<PointerEvent>) => ({ x: e.pointer.x, y: e.pointer.y });

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (!groupRef.current?.visible) return;
    e.stopPropagation();
    /* 손가락으로 원통을 돌리는 끌기(useCylinderStage)가 같은 손가락을 가져가지 않게 한다 */
    if (e.pointerType !== "mouse") e.nativeEvent.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    const touch = touchRef.current;
    const ndc = ndcOf(e);
    touch.ndcX = ndc.x;
    touch.ndcY = ndc.y;
    touch.over = true;
    /* 터치 화면은 올려 두는 단계가 없어서 직전 프레임에 풀어 둔 자리가 없다 — 지금 자리로 바로 푼다 */
    const spot = rig.spotAt(ndc.x, ndc.y);
    press.current = { x: e.clientX, y: e.clientY, nx: ndc.x, ny: ndc.y, moved: 0, spot };
    /* 자리마다 하는 일이 다르다. 잡아당기거나 쓰다듬는 동안에는 돌지 않는다 */
    touch.cheek = spot === "pinch" ? 1 : 0;
    touch.grabX = ndc.x;
    touch.grabY = ndc.y;
    touch.pullX = 0;
    touch.pullY = 0;
    touch.petting = spot === "pet";
    touch.hand = spot === "pinch" ? "pinching" : spot;
    const dr = drag.current;
    dr.dragging = spot === "grab" || spot === "poke";
    dr.vx = 0;
    dr.vy = 0;
    hideTrail(true);
  };

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!groupRef.current?.visible) return;
    e.stopPropagation();
    const touch = touchRef.current;
    const ndc = ndcOf(e);
    const pr = press.current;
    touch.ndcX = ndc.x;
    touch.ndcY = ndc.y;
    touch.over = true;
    if (pr) {
      const dx = e.clientX - pr.x;
      const dy = e.clientY - pr.y;
      pr.moved += Math.hypot(dx, dy);
      pr.x = e.clientX;
      pr.y = e.clientY;
      if (touch.petting || touch.cheek !== 0) {
        /* 볼·쓰다듬기는 커서 자리만 넘긴다 — 몽이 위의 점으로 옮기는 일은 장면이 한다.
           NDC 는 위가 + 라, 위로 끌면 양수다. 위로만 상한이 좁다. */
        const lim = pullLimit.current;
        touch.pullX = THREE.MathUtils.clamp(ndc.x - pr.nx, -lim.side, lim.side);
        touch.pullY = THREE.MathUtils.clamp(ndc.y - pr.ny, -lim.side, lim.up);
      } else {
        /* 몸을 잡고 끌면 돈다. 화면 폭의 절반쯤 끌면 한 바퀴, 위아래는 70도쯤에서 멈춘다 */
        const dr = drag.current;
        const perPx = (Math.PI * 2) / (window.innerWidth * 0.5);
        dr.y += dx * perPx;
        dr.x = THREE.MathUtils.clamp(dr.x + dy * perPx, -1.2, 1.2);
        dr.vx = dy * perPx;
        dr.vy = dx * perPx;
      }
    }
    /* 누르고 있는 동안에는 손 모양을 바꾸지 않는다 — 잡아당기다 손이 볼 밖으로 나갔다고 모양이 바뀌면
       뭘 하고 있는지 흔들린다 */
    const spot = pr ? pr.spot : rig.spotAt(ndc.x, ndc.y);
    touch.hand = pr && spot === "pinch" ? "pinching" : spot;
    hideTrail(true);
  };

  const onPointerUp = (e: ThreeEvent<PointerEvent>) => {
    const pr = press.current;
    if (!pr) return;
    e.stopPropagation();
    (e.target as Element).releasePointerCapture(e.pointerId);
    const touch = touchRef.current;
    drag.current.dragging = false;
    /* 거의 안 움직이고 뗐으면 찌른 것이다. 볼이든 몸이든 상관없다 */
    if (pr.moved < TAP_SLOP) {
      touch.grabX = pr.nx;
      touch.grabY = pr.ny;
      touch.poke = 1;
    }
    /* 놓으면 볼은 스스로 돌아간다 — 되돌리는 건 장면이 용수철로 한다 */
    touch.cheek = 0;
    touch.petting = false;
    press.current = null;
    /* 붙잡는 동안에는 몽이 밖에 있어도 이벤트가 왔다. 뗀 자리가 몽이 밖이면 손을 거둔다 —
       터치는 올려 둘 수 없으니 떼면 늘 거둔다 */
    hitRay.ray.copy(e.ray);
    const stillOver = e.pointerType === "mouse" && !!hitRef.current && hitRay.intersectObject(hitRef.current, false).length > 0;
    if (!stillOver) {
      touch.over = false;
      touch.hand = "";
      touch.spot = "";
      hideTrail(false);
    }
  };

  const onPointerLeave = () => {
    if (press.current) return;
    const touch = touchRef.current;
    touch.over = false;
    touch.hand = "";
    touch.spot = "";
    hideTrail(false);
  };

  return (
    <>
      {/* 프로필의 몽이와 같은 조명 구성 — 한 방향에서만 비추면 털이 눌려 보인다.
          위아래 빛(hemisphere)은 자리가 곧 방향이라 월드 원점 위에 둔다 */}
      <ambientLight intensity={0.6} />
      <hemisphereLight args={["#ffeedd", "#b0a8c0", 0.4]} />
      <group ref={lightRigRef}>
        <primitive object={lightTarget} />
        <directionalLight position={[3, 5, 4]} intensity={0.9} target={lightTarget} />
        <directionalLight position={[-2, -1, 3]} intensity={0.3} target={lightTarget} />
      </group>

      {/* 몽이를 만질 때 커서 자리에 서는 손. 같은 조명 아래 있어야 재질이 맞는다 */}
      <TouchHand anchor={rig.hand} />

      <group ref={groupRef}>
        {/* 포인터를 받는 구 — 귀 끝부터 발끝까지 감싼다. 그리지는 않는다 */}
        <mesh
          ref={hitRef}
          position={[0, 0.38, 0.02]}
          scale={[0.78, 1.02, 0.72]}
          visible={false}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={onPointerLeave}
        >
          <sphereGeometry args={[1, 16, 12]} />
        </mesh>

        {/* Body */}
        <mesh ref={bodyRef} position={[0, -0.15, 0]} geometry={BODY_GEO} scale={[0.75, 0.78, 0.7]}>
          <BunnySkin />
          <BunnyFur geometry={BODY_GEO} length={0.07} repeat={2.2} shells={FUR_SHELLS} boost={furBoost} />
        </mesh>

        {/* Head — 만지면 꼭짓점이 밀린다. 털도 같은 도형을 봐야 눌린 살을 따라간다 */}
        <mesh position={[0, 0.42, 0.06]} geometry={headGeo} scale={[1.15, 1, 0.95]}>
          <BunnySkin />
          <BunnyFur
            geometry={headGeo}
            length={0.055}
            repeat={1.8}
            shells={FUR_SHELLS}
            boost={furBoost}
            bare={furBare}
          />
        </mesh>

        {/* 어두운 테마 — 우주로 나가는 어항(헬멧). 밝은 테마에서는 씌우지 않는다 */}
        {isDark && (
          <mesh position={[0, 0.46, 0.02]} scale={[1.5, 1.35, 1.35]} renderOrder={999}>
            <sphereGeometry args={[0.48, 24, 18]} />
            <meshStandardMaterial
              color="#ddeeff"
              emissive="#aaccff"
              emissiveIntensity={0.08}
              metalness={0.0}
              roughness={0.02}
              transparent
              opacity={0.3}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}

        {/* 밝은 테마 — 오른쪽 귀 밑동에 꽃 한 송이. 꽃잎 다섯 장을 둘러 눕히고 가운데에 수술을 둔다.
            판·배경과 같은 분홍·살구색이라 셋이 한 이야기로 읽힌다.

            자리는 머리(중심 [0, 0.42, 0.06], 반지름 [0.552, 0.48, 0.456] 인 타원체)의 표면 위,
            오른쪽 귀(x 0.2, y 0.82) 밑동이다. 머리 옆면까지 밀면 떠다니며 도는 동안 뒤로 숨으므로
            앞쪽(z)으로 당겨 어느 쪽에서 봐도 보이게 둔다.
            기울기는 그 자리의 표면 법선(오른쪽 0.35, 위 0.72, 앞 0.6)에 맞춰 눕힌 각도다 */}
        {!isDark && (
          <group position={[0.21, 0.8, 0.36]} rotation={[-0.8, 0.53, 0.18]} scale={0.3}>
            {PETAL_ANGLES.map((angle, i) => (
              <mesh key={i} position={[Math.cos(angle) * 0.3, Math.sin(angle) * 0.3, 0]} rotation={[0, 0, angle]}>
                <sphereGeometry args={[0.26, 16, 12]} />
                <meshStandardMaterial color={i % 2 === 0 ? "#f7b3c6" : "#f9c7a6"} roughness={0.75} metalness={0} />
              </mesh>
            ))}
            <mesh>
              <sphereGeometry args={[0.16, 16, 12]} />
              <meshStandardMaterial color="#fadf96" emissive="#f6c95e" emissiveIntensity={0.25} roughness={0.6} />
            </mesh>
          </group>
        )}

        {/* Ears */}
        <mesh ref={leftEarRef} position={[-0.2, 0.82, -0.04]} rotation={[0.12, 0, 0.18]} geometry={EAR_GEO} scale={[1.3, 1.3, 1]}>
          <BunnySkin />
          <BunnyFur geometry={EAR_GEO} length={0.042} repeat={1.2} shells={FUR_SHELLS} boost={furBoost} />
        </mesh>
        <mesh ref={rightEarRef} position={[0.2, 0.82, -0.04]} rotation={[0.12, 0, -0.18]} geometry={EAR_GEO} scale={[1.3, 1.3, 1]}>
          <BunnySkin />
          <BunnyFur geometry={EAR_GEO} length={0.042} repeat={1.2} shells={FUR_SHELLS} boost={furBoost} />
        </mesh>

        {/* Eyes */}
        {/* 눈 크기·깊이는 profile 몽이와 같은 값을 쓴다(0.13, z 0.49) — bare 구역을 공유하므로
            한쪽만 바꾸면 눈가 털이 어긋난다. */}
        <mesh ref={leftEyeRef} position={[-0.2, 0.46, 0.49]} rotation={[-0.08, -0.31, 0]} scale={[1, 1.3, 0.15]}>
          <sphereGeometry args={[0.13, 16, 12]} />
          <meshBasicMaterial color={EYE_COLOR} />
        </mesh>
        <mesh ref={rightEyeRef} position={[0.2, 0.46, 0.49]} rotation={[-0.08, 0.31, 0]} scale={[1, 1.3, 0.15]}>
          <sphereGeometry args={[0.13, 16, 12]} />
          <meshBasicMaterial color={EYE_COLOR} />
        </mesh>

        {/* 놀란 눈 >< — 볼을 잡히거나 찔렸을 때(profile 몽이와 같은 모양) */}
        <group ref={leftSquintRef} position={[-0.14, 0.46, 0.49]} rotation={[-0.08, -0.2, 0]} visible={false}>
          <mesh position={[-0.088, 0.043, 0]} rotation={[0, 0, -0.45 + Math.PI / 2]}>
            <capsuleGeometry args={[0.018, 0.16, 4, 8]} />
            <meshBasicMaterial color={EYE_COLOR} />
          </mesh>
          <mesh position={[-0.088, -0.043, 0]} rotation={[0, 0, 0.45 + Math.PI / 2]}>
            <capsuleGeometry args={[0.018, 0.16, 4, 8]} />
            <meshBasicMaterial color={EYE_COLOR} />
          </mesh>
        </group>
        <group ref={rightSquintRef} position={[0.14, 0.46, 0.49]} rotation={[-0.08, 0.2, 0]} visible={false}>
          <mesh position={[0.088, 0.043, 0]} rotation={[0, 0, 0.45 + Math.PI / 2]}>
            <capsuleGeometry args={[0.018, 0.16, 4, 8]} />
            <meshBasicMaterial color={EYE_COLOR} />
          </mesh>
          <mesh position={[0.088, -0.043, 0]} rotation={[0, 0, -0.45 + Math.PI / 2]}>
            <capsuleGeometry args={[0.018, 0.16, 4, 8]} />
            <meshBasicMaterial color={EYE_COLOR} />
          </mesh>
        </group>

        {/* 웃는 눈 ^^ — 쓰다듬을 때 */}
        <group ref={leftSmileRef} position={[-0.2, 0.46, 0.49]} rotation={[-0.08, -0.31, 0]} visible={false}>
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
        <group ref={rightSmileRef} position={[0.2, 0.46, 0.49]} rotation={[-0.08, 0.31, 0]} visible={false}>
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

        {/* Arms */}
        <mesh ref={leftArmRef} position={[-0.3, -0.1, 0]} rotation={[0, 0, 2]} geometry={ARM_GEO} scale={[1, 1.6, 1]}>
          <BunnySkin />
        </mesh>
        <mesh ref={rightArmRef} position={[0.3, -0.1, 0]} rotation={[0, 0, -2]} geometry={ARM_GEO} scale={[1, 1.6, 1]}>
          <BunnySkin />
        </mesh>

        {/* Legs */}
        <mesh ref={leftLegRef} position={[-0.15, -0.35, 0.25]} rotation={[1.4, 0, 0.1]} geometry={FOOT_GEO} scale={[0.7, 1.8, 0.7]}>
          <BunnySkin />
        </mesh>
        <mesh ref={rightLegRef} position={[0.15, -0.35, 0.25]} rotation={[1.4, 0, -0.1]} geometry={FOOT_GEO} scale={[0.7, 1.8, 0.7]}>
          <BunnySkin />
        </mesh>

        {/* Tail */}
        <mesh position={[0, -0.25, -0.38]} geometry={TAIL_GEO}>
          <BunnySkin />
        </mesh>
      </group>
    </>
  );
}
