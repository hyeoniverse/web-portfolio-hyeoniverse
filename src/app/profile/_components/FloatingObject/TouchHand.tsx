"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import type { BunnyTouch } from "@/stores/profileSectionStore";
import { BODY_COLOR, BODY_EMISSIVE } from "./bunnyGeometry";

/** 손이 설 자리 — 장면(BunnyTouchRig)이 몽이의 만지는 지점을 매 프레임 적어 준다. */
export interface HandAnchor {
  pos: THREE.Vector3;
  /** 만지는 자리의 바깥 방향(월드). 눕는 손은 이 반대로 손바닥을 돌린다. */
  normal: THREE.Vector3;
  scale: number;
  /** 만지는 자리가 몽이의 어느 쪽인지(-1 왼쪽 / 1 오른쪽). 손이 물러날 방향을 여기서 정한다. */
  side: number;
  /** 손 모양. 입력 쪽이 고른 것(BunnyTouch.hand)을 장면이 옮겨 적는다. */
  shape: BunnyTouch["hand"];
  active: boolean;
}

/** 몽이 크기에 대한 손 크기. 얼굴을 만지는 손이라 몽이와 함께 커지고 작아져야 한다. */
const HAND_REL = 0.38;
/** 자리를 따라잡는 빠르기(1/s). 손이 커서를 그대로 따라가면 만지는 게 아니라 떠다니는 게 된다 —
    조금 늦게 붙는 편이 살을 짚는 것처럼 보인다. */
const FOLLOW = 16;
const POSE_FOLLOW = 14;
/** 손이 사라지는 빠르기(1/s). 나타날 때보다 빨라야 트레일 커서와 안 겹친다. */
const POSE_HIDE = 34;

/**
 * 세워 든 손 — 손바닥이 몽이를 보고 손등이 화면을 본다(y 로 뒤집은 것).
 * 볼을 집거나 찌르는 손은 화면과 마주 보므로 이 하나로 충분하다.
 */
const UPRIGHT_Q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0));

/* 눕는 손(쓰다듬기)은 고정 각도를 못 쓴다 — 몽이가 돌면 손바닥이 허공을 본다.
   매 프레임 만지는 자리의 법선에서 다시 세운다. 아래는 그때 쓰는 자리표들. */
const AXIS_X = new THREE.Vector3(1, 0, 0);
const AXIS_Z = new THREE.Vector3(0, 0, 1);
const _palm = new THREE.Vector3();
const _fin = new THREE.Vector3();
const _sideV = new THREE.Vector3();
const _camX = new THREE.Vector3();
const _camY = new THREE.Vector3();
const _camZ = new THREE.Vector3();
const _basis = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _rock = new THREE.Quaternion();
const _undo = new THREE.Quaternion();

/**
 * 손가락 넷. 왼쪽부터 검지·중지·약지·새끼다(엄지가 왼쪽에 있으니 오른손을 손바닥 쪽에서 본 것).
 *
 * 손가락 길이가 손바닥 높이만큼은 돼야 손으로 읽힌다. 짧게 뭉툭하게만 두면 손바닥 덩어리에
 * 혹이 붙은 모양이 된다 — 처음에 그렇게 그렸다가 손이 아니라 발처럼 보였다.
 * 대신 굵기는 몽이의 다른 부위처럼 도톰하게 두고 마디는 나누지 않는다.
 *
 * 뿌리는 손바닥 위쪽 곡선 위에 얹는다. 그 높이에서 손바닥 반폭이 0.29 라 그 안에 들어와야
 * 손가락이 허공에서 시작하지 않는다.
 */
const FINGERS = [
  /* 검지만 조금 길다 — 찌르는 자세에서 혼자 서 있는 손가락이라, 나머지만큼 짧으면
     무엇을 가리키는지 안 읽힌다. */
  { x: -0.21, y: 0.2, len: 0.36, r: 0.075, tilt: 0.06 },
  { x: -0.07, y: 0.24, len: 0.42, r: 0.08, tilt: 0.02 },
  { x: 0.07, y: 0.235, len: 0.38, r: 0.078, tilt: -0.02 },
  { x: 0.21, y: 0.19, len: 0.3, r: 0.068, tilt: -0.06 },
] as const;
/** 다 굽혔을 때의 각도(rad). 2 를 넘으면 손끝이 손바닥 뒤로 넘어가 안 보인다. */
const BEND_MAX = 1.9;
/** 쓰다듬는 손이 한 번 쓸어내리는 빠르기(Hz). 빠르면 만지는 게 아니라 터는 손이 된다. */
const STROKE_HZ = 1.15;
/** 손가락 사이의 시차(rad). 넷이 동시에 접히면 갈퀴고, 어긋나야 쓸어내리는 손이 된다. */
const STROKE_LAG = 0.55;

/**
 * 굽힘 정도와 물러설 방향.
 *
 * `off` 는 닿는 자리에서 손이 얼마나 비켜설지다(손 크기 기준). 닿는 자리에 손 한가운데를
 * 두면 손이 얼굴을 덮어 표정이 안 보인다 — 쓰다듬는 손은 위로, 볼을 잡는 손은 그 볼 바깥으로,
 * 찌르는 손은 아래로 물러나서 손끝만 닿게 한다. x 는 만지는 쪽 부호를 곱해서 쓴다.
 */
type Pose = {
  fingers: [number, number, number, number];
  thumb: number;
  tiltZ: number;
  off: [number, number];
  /**
   * 쓰다듬는 동안 손가락이 오므렸다 펴지는 폭. 0 이면 자세가 고정이다.
   *
   * 머리에 손을 얹고 가만히 있으면 얹어 둔 것이지 쓰다듬는 게 아니다. 손가락이 차례로
   * 말렸다 풀리고 손목이 같이 눌려야 쓸어내리는 동작으로 읽힌다.
   */
  stroke?: number;
  /**
   * 손끝을 닿는 자리로 겨눌지.
   *
   * 잡거나 찌르는 손은 접점을 향해야 하지만, 쓰다듬는 손은 머리 위에 **눕는다** —
   * 겨누면 손끝이 정수리를 찍는 모양이 된다. 눕는 자세는 손바닥이 아래를 보고 손가락이
   * 옆으로 뻗어서, 화면에서의 각도가 접점 방향과 무관하다.
   */
  aim: boolean;
};

const POSES: Record<string, Pose> = {
  /* 펼친 손 — 쓰다듬기. 머리 위에서 내려 짚는다. */
  /* 눕는 손이라 높이 띄울 이유가 없다. 세워 두던 시절엔 손끝이 얼굴을 가려서 머리
     반지름만큼 올려 뒀는데, 그러니 정작 만지는 것으로 안 보였다. */
  pet: { fingers: [0.06, 0, 0.02, 0.1], thumb: 0.15, tiltZ: -0.1, off: [0.05, 0.62], aim: false, stroke: 0.34 },
  /* 쥐려는 손 — 볼을 잡기 직전 */
  pinch: { fingers: [0.6, 0.55, 0.57, 0.63], thumb: 0.55, tiltZ: -0.12, off: [0.6, 0.1], aim: true },
  /* 쥔 손 — 잡고 있는 동안 */
  pinching: { fingers: [1, 1, 1, 1], thumb: 0.85, tiltZ: -0.06, off: [0.55, 0.05], aim: true },
  /* 검지만 편 손 — 찌르기. 배열 0 번이 검지다(엄지 쪽부터 센다). */
  poke: { fingers: [0, 1, 1, 1], thumb: 0.7, tiltZ: -0.24, off: [0.35, -0.62], aim: true },
  /* 몸통을 감싸 쥐고 돌리는 손. 볼을 집는 것보다 덜 오므린다 — 집는 게 아니라 받치는 손이다. */
  grab: { fingers: [0.42, 0.38, 0.4, 0.46], thumb: 0.4, tiltZ: -0.1, off: [0.6, 0.08], aim: true },
};

/**
 * 몽이를 만질 때 손이 닿는 자리에 서는 손.
 *
 * 그림이 아니라 몽이와 같은 장면·같은 조명에 놓인 3D 다. 그래서 재질이 저절로 맞는다 —
 * 납작한 아이콘을 얹으면 옆에 있는 몽이만 3D 라 겉돈다.
 *
 * 커서를 그대로 따라가지 않는다. 몽이의 **만지는 자리**에 붙는다 — 그래야 잡고 있는 것으로
 * 보인다. 커서를 따라가면 얼굴 위를 떠다니는 물체가 된다. 살이 밀린 만큼 손도 같이 가므로,
 * 볼을 당기면 손이 늘어난 볼 끝을 쥐고 있다.
 *
 * 손 모양은 굽힘 하나로 만든다. 마디마다 각도를 따로 적어 두면 모양을 하나 더할 때마다
 * 스무 개씩 늘어난다 — 손가락별 굽힘 0~1 만 정하고 마디는 그 값에서 나눠 쓴다.
 */
export default function TouchHand({
  anchor,
}: {
  /** 장면이 매 프레임 제자리에서 고치는 객체라 ref 로 감싸지 않는다. */
  anchor: HandAnchor;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const fingerRefs = useRef<(THREE.Group | null)[]>([]);
  const thumbRef = useRef<THREE.Group>(null);
  const poseRef = useRef<THREE.Group>(null);

  /** 지금 굽힘 — 목표를 좇는다. 모양이 딱딱 끊기면 커서가 튄다. */
  const bend = useRef({ f: [0, 0, 0, 0], thumb: 0, tiltZ: 0, show: 0, offX: 0, offY: 0, spin: 0, ph: 0 });
  const _target = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    const root = rootRef.current;
    if (!root) return;
    const dt = Math.min(delta, 0.05);
    const at = anchor;
    const hand = at.active ? at.shape : "";
    const pose = POSES[hand];

    /* 없으면 오므리며 사라진다. 그냥 끄면 화면에서 툭 사라져 눈에 걸린다.
       나갈 때는 들어올 때보다 빨라야 한다 — 손이 남아 있는 동안 트레일 커서가 이미 떠서
       커서가 둘로 보인다. */
    const k = 1 - Math.exp(-dt * POSE_FOLLOW);
    bend.current.show += ((pose ? 1 : 0) - bend.current.show) * (pose ? k : 1 - Math.exp(-dt * POSE_HIDE));
    if (pose) {
      /* 쓰다듬는 동안만 위상이 흐른다. 손을 떼면 그 자리에 멈춰 있다가 다음에 이어서 도므로,
         다시 얹을 때 손가락이 튀지 않는다. */
      const stroke = pose.stroke ?? 0;
      if (stroke > 0) bend.current.ph += dt * STROKE_HZ * Math.PI * 2;
      const w = Math.sin(bend.current.ph);
      for (let i = 0; i < 4; i++) {
        /* 새끼손가락이 검지보다 늦게 접힌다 — 손끝이 물결처럼 지나간다. */
        const wave = 0.5 + 0.5 * Math.sin(bend.current.ph - i * STROKE_LAG);
        bend.current.f[i] += (pose.fingers[i] + stroke * wave - bend.current.f[i]) * k;
      }
      bend.current.thumb += (pose.thumb + stroke * 0.3 * (0.5 + 0.5 * w) - bend.current.thumb) * k;
      /* 손목이 같이 까딱인다. 손가락만 움직이면 손이 아니라 집게처럼 보인다. */
      bend.current.tiltZ += (pose.tiltZ + stroke * 0.24 * w - bend.current.tiltZ) * k;
      bend.current.offX += (pose.off[0] * (at.side || 1) - bend.current.offX) * k;
      /* 접히는 박자에 맞춰 살짝 눌러 준다 — 얹은 높이가 고정이면 손이 떠 있는 것으로 보인다. */
      bend.current.offY += (pose.off[1] - stroke * 0.3 * (0.5 + 0.5 * w) - bend.current.offY) * k;
    }
    root.visible = bend.current.show > 0.01;
    if (!root.visible) return;

    /* ── 눕는 손의 방향 ──────────────────────────────────────
       손바닥(모델 +z)이 살 **안쪽**을, 손가락(모델 +y)은 그 자리의 접선을 향하게 세운다.
       고정 각도를 쓰면 몽이를 반 바퀴 돌렸을 때 손바닥이 머리가 아니라 허공을 본다.
       접선은 화면 좌우 중 손이 다가온 반대쪽 — 손목이 커서 쪽에 남고 손끝이 안쪽을 짚는다. */
    const flat = !!pose && !pose.aim;
    if (flat) {
      _palm.copy(at.normal).multiplyScalar(-1);
      state.camera.matrixWorld.extractBasis(_camX, _camY, _camZ);
      _fin.copy(_camX).multiplyScalar(-(at.side || 1));
      _fin.addScaledVector(_palm, -_fin.dot(_palm));
      /* 손바닥이 화면 좌우와 나란해지는 순간에는 접선이 0 이 된다 — 위아래로 바꿔 잡는다. */
      if (_fin.lengthSq() < 1e-4) _fin.copy(_camY).addScaledVector(_palm, -_camY.dot(_palm));
      _fin.normalize();
      _sideV.crossVectors(_fin, _palm);
      _basis.makeBasis(_sideV, _fin, _palm);
      _q.setFromRotationMatrix(_basis);
      /* 손목 까딱임은 손가락 축과 직각으로 준다. 안 그러면 판때기가 얹힌 것처럼 보인다. */
      _q.multiply(_rock.setFromAxisAngle(AXIS_X, bend.current.tiltZ));
      /* 바깥 상자가 spin 만큼 돌아 있으니 그만큼 되돌려 넘긴다 — 자세가 바뀌는 동안에도 안 튄다. */
      _q.premultiply(_undo.setFromAxisAngle(AXIS_Z, -bend.current.spin));
    }
    if (poseRef.current) poseRef.current.quaternion.slerp(flat ? _q : UPRIGHT_Q, k);

    /* 손끝이 닿는 자리를 향하게 돌린다. 물러선 방향의 반대가 곧 얼굴 쪽이다.
       손가락은 로컬 +y 를 향하므로, 그 축이 얼굴 쪽으로 눕도록 z 를 돌린다.
       ±π 를 넘길 때 먼 쪽으로 도는 걸 막으려고 차이를 -π~π 로 접어서 좇는다.
       눕는 자세에서는 겨누지 않는다 — 머리 위에 얹힌 손이 접점을 향해 돌면 다시 곤두선다. */
    /* 눕는 손은 방향을 통째로 안쪽 상자가 잡으므로 바깥 상자는 안 돌린다. */
    const face = flat ? 0 : Math.atan2(bend.current.offX, -bend.current.offY) + bend.current.tiltZ;
    let turn = face - bend.current.spin;
    turn = ((turn + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    bend.current.spin += turn * k;

    const s = at.scale * HAND_REL;
    /* 닿는 자리에서 자세에 맞는 만큼 비켜선다. 손 크기를 곱해야 몽이가 커져도 비율이 유지된다.
       눕는 손은 화면 위가 아니라 **살에서 바깥으로** 물러난다 — 옆통수를 쓰다듬을 때도
       머리에 얹혀 있어야 하기 때문이다. */
    if (flat) {
      _target.current
        .copy(at.pos)
        .addScaledVector(at.normal, bend.current.offY * s)
        .addScaledVector(_sideV, bend.current.offX * s);
      /* 깊이는 닿는 자리 그대로 둔다. 법선에는 화면 안팎 성분이 섞여 있어서 그냥 더하면
         손이 카메라 쪽으로 딸려 나오고 — 원근이라 화면에서 옆으로 밀리고 커진다.
         앞뒤로 물러날 이유도 없다. 그 깊이는 이미 몽이 어느 부분보다 앞이도록 잡아 둔 값이다. */
      _target.current
        .sub(state.camera.position)
        .setLength(state.camera.position.distanceTo(at.pos))
        .add(state.camera.position);
    } else {
      _target.current.set(
        at.pos.x + bend.current.offX * s,
        at.pos.y + bend.current.offY * s,
        at.pos.z,
      );
    }
    /* 첫 프레임에는 화면 밖에서 날아오지 않게 그 자리에 바로 세운다. */
    if (root.scale.x < 0.001) root.position.copy(_target.current);
    root.position.lerp(_target.current, 1 - Math.exp(-dt * FOLLOW));
    root.scale.setScalar(s * (0.6 + 0.4 * bend.current.show));
    root.rotation.set(0, 0, bend.current.spin);

    for (let i = 0; i < 4; i++) {
      const b = bend.current.f[i];
      const base = fingerRefs.current[i];
      /* 짧은 손가락은 통째로 말린다 — 마디를 나눠도 이 크기에서는 안 보이고 이음매만 생긴다. */
      if (base) base.rotation.x = b * BEND_MAX;
    }
    /* 엄지는 손바닥 쪽으로 눕는다 — 옆으로 더 벌리는 게 아니라 안으로 접혀야 쥔 손이 된다. */
    if (thumbRef.current) {
      thumbRef.current.rotation.z = 0.95 - bend.current.thumb * 0.45;
      thumbRef.current.rotation.x = bend.current.thumb * 0.9;
    }
  });

  const skin = (
    <meshStandardMaterial
      color={BODY_COLOR}
      emissive={BODY_EMISSIVE}
      emissiveIntensity={0.05}
      metalness={0}
      roughness={0.92}
    />
  );

  return (
    <group ref={rootRef} visible={false}>
      {/*
        손을 뒤집어 손바닥이 몽이를 보게 한다. 만지는 손은 화면 쪽에 손등이 있어야 맞다 —
        몽이가 화면을 보고 있으니 그 얼굴을 짚는 손은 손바닥이 저쪽을 향한다.
        뒤집는 축이 y 라 손가락이 향하는 방향(+y)은 그대로다. 겨냥은 바깥 상자가 z 로 돌려서
        하므로 둘이 섞이지 않는다. 손가락이 말리는 쪽도 이걸로 같이 뒤집혀서, 쥐면 손가락이
        화면이 아니라 얼굴 쪽으로 감긴다.
      */}
      <group ref={poseRef}>
      {/* 손바닥 — 모서리만 둥근 네모다. 구로 만들면 알처럼 보이고, 그 곡면 위에 손가락을
          얹으면 부챗살처럼 벌어져 손이 아니라 발이 된다. 윗변이 평평해야 손가락이 나란히 선다. */}
      <RoundedBox args={[0.62, 0.58, 0.26]} radius={0.13} smoothness={4}>
        {skin}
      </RoundedBox>

      {/* 손목 — 짧은 토막. 이게 없으면 어느 쪽이 아래인지 안 보여서 덩어리로만 읽힌다. */}
      <RoundedBox args={[0.32, 0.22, 0.22]} radius={0.09} smoothness={4} position={[0, -0.31, -0.01]}>
        {skin}
      </RoundedBox>

      {FINGERS.map((f, i) => (
        /* 밑동에서 말리도록 마디를 겹겹이 매단다. 각 마디는 자기 길이의 절반만큼 위로
           옮겨 둔 원기둥이라, 부모를 돌리면 뿌리에서 꺾인다. */
        <group
          key={i}
          ref={(el) => { fingerRefs.current[i] = el; }}
          position={[f.x, f.y, 0.02]}
          rotation={[0, 0, f.tilt]}
        >
          {/* 뿌리가 손바닥에 묻히도록 아래로 조금 내려 앉힌다 — 굽힐 때 사이가 안 벌어진다. */}
          <mesh position={[0, f.len / 2 - 0.04, 0]}>
            <capsuleGeometry args={[f.r, f.len, 6, 16]} />
            {skin}
          </mesh>
        </group>
      ))}

      {/* 엄지 — 손바닥 옆구리에서 비스듬히 위로. 아래로 향하면 손가락이 아니라 혹처럼 보인다. */}
      <group ref={thumbRef} position={[-0.27, -0.06, 0.06]} rotation={[0, 0, 1.0]}>
        <mesh position={[0, 0.15, 0]}>
          <capsuleGeometry args={[0.078, 0.26, 6, 16]} />
          {skin}
        </mesh>
      </group>
      </group>
    </group>
  );
}
