"use client";

import { useMemo, useRef, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { CONSTELLATIONS } from "./constellations";

/* TIL 별자리 우주 — 열두 별자리가 깊이 방향으로 늘어선 3D 공간. 카메라는 바깥(TilSpace)이 넣는
   스크롤 진행도(progress.current, 0 … 1)를 따라 1월에서 12월로 날아간다. three 묶음이 커서 dynamic 으로만 싣는다 */

/** 별자리 사이 깊이 간격 */
const GAP = 42;
/** 별자리 판(100 × 60) → 3D 단위 */
const UNIT = 0.16;

/** 달마다 별자리 중심 — 깊이로 늘어서며 좌우 · 위아래로 굽이친다 */
export function centerOf(m: number): [number, number, number] {
  return [Math.sin(m * 1.3) * 7, Math.cos(m * 0.9) * 3.5, -m * GAP];
}

function Starfield({ count = 2600 }: { count?: number }) {
  const geo = useMemo(() => {
    // 고정 씨앗 — 렌더마다 같은 하늘
    let h = 2166136261;
    const r = () => {
      h = Math.imul(h ^ (h >>> 15), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return ((h ^= h >>> 16) >>> 0) / 4294967296;
    };
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (r() - 0.5) * 160;
      pos[i * 3 + 1] = (r() - 0.5) * 100;
      pos[i * 3 + 2] = 30 - r() * (GAP * 12 + 80);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, [count]);
  return (
    <points geometry={geo}>
      <pointsMaterial size={0.12} sizeAttenuation color="#cfc9e6" transparent opacity={0.8} depthWrite={false} />
    </points>
  );
}

function Constellation3D({
  m,
  lit,
  accent,
  active,
  onPick,
}: {
  m: number;
  lit: number;
  accent: string;
  active: boolean;
  onPick: (m: number) => void;
}) {
  const c = CONSTELLATIONS[m];
  const done = lit >= c.stars.length;
  const group = useRef<THREE.Group>(null);
  // 별 좌표 — 판 가운데를 원점으로, 위가 +y. 별마다 깊이를 조금씩 흩어 입체감을 준다
  const pts = useMemo(
    () => c.stars.map(([x, y], i) => new THREE.Vector3((x - 50) * UNIT, (30 - y) * UNIT, Math.sin(i * 2.1 + m) * 0.8)),
    [c, m],
  );
  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    // 완성한 별자리는 숨 쉬듯 커졌다 작아지고, 모든 별자리는 천천히 돈다
    const t = clock.getElapsedTime();
    g.rotation.y = Math.sin(t * 0.2 + m) * 0.25;
    const s = done ? 1 + Math.sin(t * 2) * 0.04 : 1;
    g.scale.setScalar(s * (active ? 1.08 : 1));
  });
  return (
    <group ref={group} position={centerOf(m)} onClick={(e) => { e.stopPropagation(); onPick(m); }}>
      {c.lines.map(([a, b], i) => {
        const on = a < lit && b < lit;
        return (
          <Line
            key={i}
            points={[pts[a], pts[b]]}
            color={on ? accent : "#8a86a3"}
            lineWidth={on ? 2.2 : 1}
            transparent
            opacity={on ? (done ? 1 : 0.85) : 0.35}
            dashed={!on}
            dashSize={0.25}
            gapSize={0.25}
          />
        );
      })}
      {pts.map((p, i) => {
        const on = i < lit;
        return (
          <mesh key={i} position={p}>
            <sphereGeometry args={[on ? 0.17 : 0.08, 16, 16]} />
            <meshBasicMaterial color={on ? accent : "#a7a3bf"} transparent opacity={on ? 1 : 0.55} />
          </mesh>
        );
      })}
      {/* 완성 — 별자리를 감싸는 옅은 빛무리 */}
      {done && (
        <mesh>
          <sphereGeometry args={[6, 32, 32]} />
          <meshBasicMaterial color={accent} transparent opacity={0.06} depthWrite={false} />
        </mesh>
      )}
      {/* 누를 자리 — 보이지 않는 판 */}
      <mesh visible={false}>
        <planeGeometry args={[17, 11]} />
        <meshBasicMaterial />
      </mesh>
    </group>
  );
}

/** 카메라 — 진행도 위치의 별자리 앞으로 부드럽게 따라간다 */
function Rig({ progress }: { progress: MutableRefObject<number> }) {
  const { camera, pointer } = useThree();
  const look = useRef(new THREE.Vector3(...centerOf(0)));
  useFrame(() => {
    const f = Math.min(11, Math.max(0, progress.current * 11));
    const i = Math.floor(f);
    const k = f - i;
    const a = new THREE.Vector3(...centerOf(i));
    const b = new THREE.Vector3(...centerOf(Math.min(11, i + 1)));
    const target = a.lerp(b, k * k * (3 - 2 * k));
    // 별자리 앞 22 만큼 떨어져 바라보고, 포인터 쪽으로 살짝 기운다
    const want = new THREE.Vector3(target.x + pointer.x * 1.5, target.y + pointer.y * 1, target.z + 22);
    camera.position.lerp(want, 0.08);
    look.current.lerp(target, 0.1);
    camera.lookAt(look.current);
  });
  return null;
}

export default function TilSpace3D({
  progress,
  lits,
  accent,
  active,
  onPick,
}: {
  progress: MutableRefObject<number>;
  lits: number[];
  accent: string;
  active: number;
  onPick: (m: number) => void;
}) {
  return (
    <Canvas camera={{ position: [0, 0, 22], fov: 55, near: 0.1, far: 800 }} dpr={[1, 2]} gl={{ antialias: true }}>
      <color attach="background" args={["#0b0a14"]} />
      <fog attach="fog" args={["#0b0a14", 30, 120]} />
      <Starfield />
      {CONSTELLATIONS.map((_, m) => (
        <Constellation3D key={m} m={m} lit={lits[m]} accent={accent} active={active === m} onPick={onPick} />
      ))}
      <Rig progress={progress} />
    </Canvas>
  );
}
