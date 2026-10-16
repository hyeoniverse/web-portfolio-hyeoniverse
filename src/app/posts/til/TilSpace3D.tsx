"use client";

import { useMemo, useRef, useState, type MutableRefObject } from "react";
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

function Constellation3D({
  m,
  lit,
  accent,
  labels,
  onPick,
}: {
  m: number;
  lit: number;
  accent: string;
  labels: MutableRefObject<(HTMLElement | null)[]>;
  onPick: (m: number) => void;
}) {
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
    const s = (done ? 1 + Math.sin(clock.getElapsedTime() * 2) * 0.04 : 1) * (hover ? 1.08 : 1);
    g.scale.setScalar(s);
  });
  return (
    <group
      ref={group}
      position={pos}
      onClick={(e) => { e.stopPropagation(); onPick(m); }}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); labels.current[m]?.classList.add("is-hover"); document.body.style.cursor = "pointer"; }}
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
            opacity={on ? 1 : hover ? 0.6 : 0.3}
            dashed={!on}
            dashSize={0.2}
            gapSize={0.2}
          />
        );
      })}
      {pts.map((p, i) => {
        const on = i < lit;
        return (
          <mesh key={i} position={p}>
            <sphereGeometry args={[on ? 0.16 : 0.08, 12, 12]} />
            <meshBasicMaterial color={on ? accent : "#a7a3bf"} transparent opacity={on ? 1 : 0.6} />
          </mesh>
        );
      })}
      {done && (
        <mesh>
          <circleGeometry args={[6.5, 48]} />
          <meshBasicMaterial color={accent} transparent opacity={0.07} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      )}
      {/* 누를 자리 — 보이지 않는 판 */}
      <mesh visible={false}>
        <planeGeometry args={[14, 9]} />
        <meshBasicMaterial />
      </mesh>
    </group>
  );
}

/** 이름표 — 별자리 아래 점을 화면 좌표로 옮겨 바깥(TilSpace)의 DOM 이름표를 매 틀 옮긴다. 뒤쪽은 숨긴다 */
function LabelProjector({ labels }: { labels: MutableRefObject<(HTMLElement | null)[]> }) {
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
  });
  return null;
}

export default function TilSpace3D({
  lits,
  accent,
  labels,
  onPick,
}: {
  lits: number[];
  accent: string;
  labels: MutableRefObject<(HTMLElement | null)[]>;
  onPick: (m: number) => void;
}) {
  return (
    // 관객 눈높이(1.6)에서 하늘을 비스듬히 올려다보며 시작한다 — 카메라를 목표점 바로 아래 · 뒤에 둔다
    <Canvas camera={{ position: [0, 1.6 - 0.0045, 0.0089], fov: 70, near: 0.05, far: 400 }} dpr={[1, 2]} gl={{ antialias: true }}>
      <color attach="background" args={["#0b0a14"]} />
      <Starfield />
      <DomeGrid />
      <Ground />
      {CONSTELLATIONS.map((_, m) => (
        <Constellation3D key={m} m={m} lit={lits[m]} accent={accent} labels={labels} onPick={onPick} />
      ))}
      <LabelProjector labels={labels} />
      {/* 관객 자리에서 둘러보기 — 끌면 하늘이 돌고, 가만두면 천천히 돈다. 지평선(수평)부터 머리 위 가까이까지만 올려다본다 */}
      <OrbitControls
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
