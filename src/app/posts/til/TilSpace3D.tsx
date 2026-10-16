"use client";

import { useEffect, useMemo, useRef, useState, type ComponentRef, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { CONSTELLATIONS } from "./constellations";

/* TIL 플라네타리움 — 관객은 돔 한가운데 서 있고, 열두 별자리가 돔을 한 바퀴 둘러 떠 있다.
   드래그로 둘러보고, 가만히 두면 하늘이 천천히 돈다. three 묶음이 커서 dynamic 으로만 싣는다 */

/** 돔 반지름 — 별자리가 떠 있는 거리 */
const DOME = 40;
/** 별자리 판(100 × 60) → 3D 단위 */
const UNIT = 0.13;

/** 달마다 별자리 자리 — 방위는 한 바퀴를 12 등분, 고도는 번갈아 높고 낮게 */
function domePosition(m: number) {
  const az = (m / 12) * Math.PI * 2;
  const alt = THREE.MathUtils.degToRad(m % 2 ? 34 : 18);
  return new THREE.Vector3(Math.sin(az) * Math.cos(alt) * DOME, Math.sin(alt) * DOME, -Math.cos(az) * Math.cos(alt) * DOME);
}

/** 고정 씨앗 난수 — 렌더마다 같은 하늘 */
function seeded(seed: number) {
  let h = seed >>> 0;
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/** 돔 안쪽의 별 — 크기 둘로 나눠 깊이감 */
function Starfield() {
  const [small, big] = useMemo(() => {
    const r = seeded(7);
    const make = (n: number) => {
      const pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const v = new THREE.Vector3(r() * 2 - 1, r() * 1.1 - 0.15, r() * 2 - 1).normalize().multiplyScalar(90);
        pos.set([v.x, v.y, v.z], i * 3);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      return g;
    };
    return [make(3200), make(260)];
  }, []);
  return (
    <>
      <points geometry={small}>
        <pointsMaterial size={0.18} color="#cfc9e6" transparent opacity={0.7} depthWrite={false} />
      </points>
      <points geometry={big}>
        <pointsMaterial size={0.45} color="#fff6fb" transparent opacity={0.9} depthWrite={false} />
      </points>
    </>
  );
}

/** 돔의 고도 · 방위 눈금 — 플라네타리움의 옅은 격자 */
function DomeGrid() {
  const lines = useMemo(() => {
    const out: THREE.Vector3[][] = [];
    for (const altDeg of [0, 20, 40, 60]) {
      const alt = THREE.MathUtils.degToRad(altDeg);
      out.push(Array.from({ length: 97 }, (_, i) => {
        const az = (i / 96) * Math.PI * 2;
        return new THREE.Vector3(Math.sin(az) * Math.cos(alt) * 95, Math.sin(alt) * 95, -Math.cos(az) * Math.cos(alt) * 95);
      }));
    }
    for (let k = 0; k < 12; k++) {
      const az = (k / 12) * Math.PI * 2;
      out.push(Array.from({ length: 25 }, (_, i) => {
        const alt = THREE.MathUtils.degToRad((i / 24) * 80);
        return new THREE.Vector3(Math.sin(az) * Math.cos(alt) * 95, Math.sin(alt) * 95, -Math.cos(az) * Math.cos(alt) * 95);
      }));
    }
    return out;
  }, []);
  return (
    <>
      {lines.map((pts, i) => (
        <Line key={i} points={pts} color="#3a3656" lineWidth={1} transparent opacity={i === 0 ? 0.7 : 0.35} />
      ))}
    </>
  );
}

/** 지평선 아래 — 어두운 바닥으로 하늘만 남긴다 */
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
      <circleGeometry args={[120, 64]} />
      <meshBasicMaterial color="#07060d" />
    </mesh>
  );
}

/** 은하수 — 하늘을 비스듬히 가로지르는 옅은 별 띠 */
function MilkyWay() {
  const geo = useMemo(() => {
    const r = seeded(11);
    const n = 4200;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.55, 0.4, 0.25));
    const a = new THREE.Color("#9d8cff");
    const b = new THREE.Color("#ff9ccf");
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const t = r() * Math.PI * 2;
      // 띠 가운데로 몰리게 — 두 난수 곱으로 폭을 좁힌다
      const spread = (r() - 0.5) * (r() - 0.5) * 0.9;
      const v = new THREE.Vector3(Math.cos(t), spread, Math.sin(t)).normalize().applyQuaternion(tilt).multiplyScalar(88);
      if (v.y < -1) v.y = -v.y;
      pos.set([v.x, v.y, v.z], i * 3);
      c.copy(a).lerp(b, r());
      col.set([c.r, c.g, c.b], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, []);
  return (
    <points geometry={geo}>
      <pointsMaterial size={0.22} vertexColors transparent opacity={0.45} depthWrite={false} />
    </points>
  );
}

/** 별똥별 — 몇 초마다 하늘 어딘가에서 짧게 긋고 사라진다 */
function ShootingStars() {
  const [line] = useState(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
    const m = new THREE.LineBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0 });
    return new THREE.Line(g, m);
  });
  const lineRef = useRef(line);
  const state = useRef({ start: 0, from: new THREE.Vector3(), vel: new THREE.Vector3(), next: 2 });
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const s = state.current;
    if (t > s.next) {
      // 새 별똥별 — 높은 하늘 아무 방향에서 아래로 비스듬히
      const az = Math.random() * Math.PI * 2;
      const alt = THREE.MathUtils.degToRad(35 + Math.random() * 35);
      s.from.set(Math.sin(az) * Math.cos(alt) * 80, Math.sin(alt) * 80, -Math.cos(az) * Math.cos(alt) * 80);
      s.vel.set((Math.random() - 0.5) * 40, -18 - Math.random() * 10, (Math.random() - 0.5) * 40);
      s.start = t;
      s.next = t + 3 + Math.random() * 5;
    }
    const k = (t - s.start) / 0.9;
    const ln = lineRef.current;
    const mat = ln.material as THREE.LineBasicMaterial;
    if (k < 0 || k > 1) {
      mat.opacity = 0;
      return;
    }
    const head = s.from.clone().addScaledVector(s.vel, k);
    const tail = s.from.clone().addScaledVector(s.vel, Math.max(0, k - 0.18));
    const attr = ln.geometry.getAttribute("position") as THREE.BufferAttribute;
    attr.setXYZ(0, tail.x, tail.y, tail.z);
    attr.setXYZ(1, head.x, head.y, head.z);
    attr.needsUpdate = true;
    mat.opacity = Math.sin(k * Math.PI) * 0.9;
  });
  return <primitive object={line} />;
}

/** 초점 — 별자리를 고르면 그쪽을 바라보며 확대하고, 풀면 넓은 하늘로 돌아온다. 그동안 끌기 · 자동 회전은 멈춘다 */
function FocusRig({ focus, controlsRef }: { focus: number | null; controlsRef: MutableRefObject<OrbitControlsImpl | null> }) {
  const eye = useMemo(() => new THREE.Vector3(0, 1.6, 0), []);
  const want = useMemo(() => new THREE.Vector3(), []);
  useFrame((state) => {
    const cam = state.camera as THREE.PerspectiveCamera;
    const ctl = controlsRef.current;
    if (ctl) {
      ctl.enabled = focus === null;
      ctl.autoRotate = focus === null;
    }
    if (focus !== null) {
      const dir = domePosition(focus).sub(eye).normalize();
      want.copy(eye).addScaledVector(dir, -0.01);
      cam.position.lerp(want, 0.08);
      cam.lookAt(domePosition(focus));
    }
    const fov = focus === null ? 70 : 30;
    if (Math.abs(cam.fov - fov) > 0.05) {
      cam.fov += (fov - cam.fov) * 0.08;
      cam.updateProjectionMatrix();
    }
  });
  return null;
}

type OrbitControlsImpl = ComponentRef<typeof OrbitControls>;

/** 지금 가리킨 별 — 별자리가 자기 별의 세계 좌표를 여기 적고, 이름표 투영기가 말풍선을 옮긴다 */
export type StarRef = { m: number; i: number } | null;

function Constellation3D({
  m,
  lit,
  accent,
  labels,
  onPick,
  focus,
  hoverStar,
  tipPosRef,
  onStarHover,
  onStarPick,
}: {
  m: number;
  lit: number;
  accent: string;
  labels: MutableRefObject<(HTMLElement | null)[]>;
  onPick: (m: number) => void;
  focus: number | null;
  hoverStar: StarRef;
  tipPosRef: MutableRefObject<THREE.Vector3 | null>;
  onStarHover: (s: StarRef) => void;
  onStarPick: (s: { m: number; i: number }) => void;
}) {
  const focused = focus === m;
  const dimmed = focus !== null && !focused;
  const c = CONSTELLATIONS[m];
  const done = lit >= c.stars.length;
  const [hover, setHover] = useState(false);
  const group = useRef<THREE.Group>(null);
  const pos = useMemo(() => domePosition(m), [m]);
  const pts = useMemo(() => c.stars.map(([x, y]) => new THREE.Vector3((x - 50) * UNIT, (30 - y) * UNIT, 0)), [c]);
  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    // 돔 가운데(관객)를 바라보게 세우고, 완성한 별자리는 숨 쉬듯 커졌다 작아진다
    g.lookAt(0, pos.y * 0.6, 0);
    const t = clock.getElapsedTime();
    const s = (done ? 1 + Math.sin(t * 2) * 0.04 : 1) * (hover && !focused ? 1.08 : 1);
    g.scale.setScalar(s);
    // 켜진 별은 저마다 박자로 반짝인다
    stars.current.forEach((mesh, i) => {
      if (!mesh) return;
      const on = i < lit;
      const hov = hoverStar?.m === m && hoverStar.i === i;
      mesh.scale.setScalar(on ? 1 + Math.sin(t * 3 + i * 1.7) * 0.18 + (hov ? 0.8 : 0) : 1);
    });
    // 가리킨 별의 세계 좌표를 말풍선 자리로
    if (hoverStar?.m === m) {
      const mesh = stars.current[hoverStar.i];
      if (mesh) tipPosRef.current = mesh.getWorldPosition(tipPosRef.current ?? new THREE.Vector3());
    }
  });
  const stars = useRef<(THREE.Mesh | null)[]>([]);
  return (
    <group
      ref={group}
      position={pos}
      // 끌어서 둘러본 끝에 손을 뗀 것은 누름이 아니다(e.delta = 누른 뒤 움직인 거리 px)
      onClick={(e) => { e.stopPropagation(); if (!focused && e.delta < 6) onPick(m); }}
      onPointerOver={(e) => { e.stopPropagation(); if (focused) return; setHover(true); labels.current[m]?.classList.add("is-hover"); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { setHover(false); labels.current[m]?.classList.remove("is-hover"); document.body.style.cursor = ""; }}
    >
      {c.lines.map(([a, b], i) => {
        const on = a < lit && b < lit;
        return (
          <Line
            key={i}
            points={[pts[a], pts[b]]}
            color={on ? accent : "#8a86a3"}
            lineWidth={on ? 2.2 : 1}
            transparent
            opacity={(on ? 1 : hover || focused ? 0.6 : 0.3) * (dimmed ? 0.25 : 1)}
            dashed={!on}
            dashSize={0.2}
            gapSize={0.2}
          />
        );
      })}
      {pts.map((p, i) => {
        const on = i < lit;
        return (
          <group key={i} position={p}>
            <mesh ref={(el) => { stars.current[i] = el; }}>
              <sphereGeometry args={[on ? 0.16 : 0.08, 12, 12]} />
              <meshBasicMaterial color={on ? accent : "#a7a3bf"} transparent opacity={(on ? 1 : 0.6) * (dimmed ? 0.3 : 1)} />
            </mesh>
            {/* 초점 중에는 켜진 별마다 누를 자리 — 그날의 TIL */}
            {focused && on && (
              <mesh
                onPointerOver={(e) => { e.stopPropagation(); onStarHover({ m, i }); document.body.style.cursor = "pointer"; }}
                onPointerOut={() => { onStarHover(null); document.body.style.cursor = ""; }}
                onClick={(e) => { e.stopPropagation(); if (e.delta < 6) onStarPick({ m, i }); }}
              >
                <sphereGeometry args={[0.55, 10, 10]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
              </mesh>
            )}
          </group>
        );
      })}
      {done && (
        <mesh>
          <circleGeometry args={[6.5, 48]} />
          <meshBasicMaterial color={accent} transparent opacity={0.07} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      )}
      {/* 누를 자리 — 보이지 않는 판(초점 중엔 별을 눌러야 해서 뺀다) */}
      <mesh visible={false} raycast={focused ? () => null : undefined}>
        <planeGeometry args={[14, 9]} />
        <meshBasicMaterial />
      </mesh>
    </group>
  );
}

/** 이름표 — 별자리 아래 점을 화면 좌표로 옮겨 바깥(TilSpace)의 DOM 이름표를 매 틀 옮긴다. 뒤쪽은 숨긴다 */
function LabelProjector({
  labels,
  tipRef,
  tipPosRef,
}: {
  labels: MutableRefObject<(HTMLElement | null)[]>;
  tipRef: MutableRefObject<HTMLElement | null>;
  tipPosRef: MutableRefObject<THREE.Vector3 | null>;
}) {
  const { camera, size } = useThree();
  const anchors = useMemo(() => CONSTELLATIONS.map((_, m) => domePosition(m).add(new THREE.Vector3(0, -5.4, 0))), []);
  const v = useMemo(() => new THREE.Vector3(), []);
  const dir = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    camera.getWorldDirection(dir);
    anchors.forEach((a, m) => {
      const el = labels.current[m];
      if (!el) return;
      v.copy(a).sub(camera.position);
      const front = v.dot(dir) > 0;
      v.copy(a).project(camera);
      const x = (v.x * 0.5 + 0.5) * size.width;
      const y = (-v.y * 0.5 + 0.5) * size.height;
      el.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      el.style.visibility = front ? "visible" : "hidden";
    });
    // 별 말풍선
    const t = tipRef.current;
    if (t && tipPosRef.current) {
      v.copy(tipPosRef.current).project(camera);
      t.style.transform = `translate(-50%, -130%) translate(${((v.x * 0.5 + 0.5) * size.width).toFixed(1)}px, ${((-v.y * 0.5 + 0.5) * size.height).toFixed(1)}px)`;
    }
  });
  return null;
}

export default function TilSpace3D({
  lits,
  accent,
  labels,
  onPick,
  focus,
  hoverStar,
  onStarHover,
  onStarPick,
  tipRef,
}: {
  lits: number[];
  accent: string;
  labels: MutableRefObject<(HTMLElement | null)[]>;
  onPick: (m: number) => void;
  focus: number | null;
  hoverStar: StarRef;
  onStarHover: (s: StarRef) => void;
  onStarPick: (s: { m: number; i: number }) => void;
  tipRef: MutableRefObject<HTMLElement | null>;
}) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const tipPosRef = useRef<THREE.Vector3 | null>(null);
  useEffect(() => {
    if (!hoverStar) tipPosRef.current = null;
  }, [hoverStar]);
  return (
    // 관객 눈높이(1.6)에서 하늘을 비스듬히 올려다보며 시작한다 — 카메라를 목표점 바로 아래 · 뒤에 둔다
    <Canvas camera={{ position: [0, 1.6 - 0.0045, 0.0089], fov: 70, near: 0.05, far: 400 }} dpr={[1, 2]} gl={{ antialias: true }}>
      <color attach="background" args={["#0b0a14"]} />
      <Starfield />
      <MilkyWay />
      <ShootingStars />
      <DomeGrid />
      <Ground />
      {CONSTELLATIONS.map((_, m) => (
        <Constellation3D
          key={m}
          m={m}
          lit={lits[m]}
          accent={accent}
          labels={labels}
          onPick={onPick}
          focus={focus}
          hoverStar={hoverStar}
          tipPosRef={tipPosRef}
          onStarHover={onStarHover}
          onStarPick={onStarPick}
        />
      ))}
      <LabelProjector labels={labels} tipRef={tipRef} tipPosRef={tipPosRef} />
      <FocusRig focus={focus} controlsRef={controlsRef} />
      {/* 관객 자리에서 둘러보기 — 끌면 하늘이 돌고, 가만두면 천천히 돈다. 지평선(수평)부터 머리 위 가까이까지만 올려다본다 */}
      <OrbitControls
        ref={controlsRef}
        target={[0, 1.6, 0]}
        enablePan={false}
        enableZoom={false}
        rotateSpeed={-0.35}
        autoRotate
        autoRotateSpeed={0.25}
        minPolarAngle={Math.PI * 0.5}
        maxPolarAngle={Math.PI * 0.9}
        enableDamping
      />
    </Canvas>
  );
}
