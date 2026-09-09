"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BODY_COLOR } from "./bunnyGeometry";

/** 알파맵 한 변의 픽셀 수. */
const TEX = 512;
/** 털 한 올의 성김. 클수록 올이 가늘고 촘촘하다.
    너무 가늘면 몽이가 떠다닐 때(작을 때) 한 올이 한 픽셀도 안 돼서 뭉개진다. */
const STRANDS = 96;
/**
 * 껍질을 몇 겹 쌓을지. 적으면 층이 띠로 보이고, 많으면 그만큼 더 그린다.
 *
 * 이게 곧 그리는 양이다. 겹 하나가 부위 하나를 통째로 다시 그리므로, 12 겹으로 재 봤더니
 * 프레임이 4분의 1로 떨어졌다(74 → 17). 6 겹에 앞면만 그리게 하니 절반쯤 돌아왔다.
 */
const SHELLS = 6;

/**
 * 털 한 올의 단면을 찍어 둔 알파맵.
 *
 * 흰 점 하나가 털 한 올이다. 가운데가 진하고 가장자리로 갈수록 옅어지게 그려서,
 * 껍질마다 잘라내는 기준(alphaTest)을 올리면 점이 안쪽부터 좁아진다 — 그게 곧
 * 위로 갈수록 가늘어지는 털끝이 된다. 겹마다 다른 그림을 쓸 필요가 없다.
 */
let cached: THREE.Texture | null = null;

function furAlphaMap(): THREE.Texture | null {
  if (cached) return cached;
  if (typeof document === "undefined") return null;

  /* 씨앗 고정 난수 — 털 자리가 새로고침마다 달라지면 안 된다. */
  let seed = 0x1b873593;
  const rand = () => {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    return ((seed >>> 0) % 100000) / 100000;
  };

  const canvas = document.createElement("canvas");
  canvas.width = TEX;
  canvas.height = TEX;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, TEX, TEX);

  const cell = TEX / STRANDS;
  for (let gy = 0; gy < STRANDS; gy++) {
    for (let gx = 0; gx < STRANDS; gx++) {
      /* 격자마다 한 올. 자리를 흔들어 두지 않으면 털이 바둑판으로 줄을 선다. */
      const cx = (gx + 0.15 + rand() * 0.7) * cell;
      const cy = (gy + 0.15 + rand() * 0.7) * cell;
      const r = cell * (0.34 + rand() * 0.28);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, "#fff");
      g.addColorStop(1, "#000");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  cached = tex;
  return tex;
}

/** 안쪽 겹의 색. 털뿌리는 그늘져야 보송해 보인다 — 다 같은 밝기면 그냥 부푼 덩어리다. */
const ROOT_COLOR = new THREE.Color(BODY_COLOR).multiplyScalar(0.86);
const TIP_COLOR = new THREE.Color(BODY_COLOR);

/**
 * 털 — 같은 도형을 조금씩 부풀려 여러 겹 겹쳐 그린다.
 *
 * 노멀맵은 빛의 방향만 속이라 실루엣이 그대로다. 그래서 털이 아니라 쭈글쭈글한 껍질로
 * 보인다. 껍질을 실제로 띄워 쌓으면 가장자리가 올올이 삐져나와 윤곽 자체가 보송해진다.
 *
 * 겹마다 하는 일은 두 가지뿐이다 — 법선 방향으로 조금 더 밀어내고, 잘라내는 기준을 올려
 * 남는 털을 줄인다. 그래서 바깥 겹일수록 성글고 가늘다.
 *
 * 도형은 밑살과 **같은 것**을 쓴다. 머리는 매 프레임 꼭짓점이 밀리는데, 사본을 쓰면
 * 살은 눌리는데 털만 제자리에 남는다.
 */
export default function BunnyFur({
  geometry,
  length,
  repeat = 1,
  shells = SHELLS,
  boost,
  bare,
}: {
  geometry: THREE.BufferGeometry;
  /** 털 길이(도형 좌표). 부위 반지름의 1/10 언저리가 보송하다. */
  length: number;
  /** 알파맵을 표면에 몇 번 반복할지. 큰 부위일수록 크게 잡아야 올 굵기가 맞는다. */
  repeat?: number;
  /** 겹 수. 화면에서 작게 보이는 자리나 힘이 약한 기기에서는 줄인다. */
  shells?: number;
  /**
   * 털을 얼마나 더 뽑을지. 몽이가 작게 보일 때 1 보다 커진다.
   *
   * 여기서 재지 않고 밖에서 받는 이유는, 눈도 이 값만큼 같이 띄워야 하기 때문이다 —
   * 두 곳이 따로 계산하면 언젠가 어긋나서 털이 눈을 뚫고 나온다.
   */
  boost: React.RefObject<{ k: number }>;
  /**
   * 털을 짧게 눕힐 자리(도형 좌표) — 이목구비가 앉는 곳.
   *
   * 알파를 지워 민머리를 만들면 눈 둘레만 맨살이 되어 더 어색하다. 여기서는 **털을 없애는 게
   * 아니라 길이만 줄인다**. 털은 그대로 빼곡한데 눈가에서만 납작하게 누워서, 눈이 안 묻힌다.
   * 이목구비를 바깥으로 띄우는 방법도 있었지만 옆에서 보면 얼굴에서 떠 보인다.
   *
   * `rIn` 안쪽은 길이 0, `rOut` 밖은 제 길이. `yw` 는 세로 눌림 — 눈이 세로로 길어서
   * 원이 아니라 타원이어야 한다. x 는 절댓값으로 재므로 좌우 눈이 한 값으로 처리된다.
   */
  bare?: React.RefObject<{ x: number; y: number; z: number; rIn: number; rOut: number; yw: number }>;
}) {
  /* 겹마다의 uniform 손잡이. 셰이더가 컴파일될 때(렌더 루프 안) 채워 넣는다 —
     겹 번호로 자리를 잡아 두므로 컴파일 순서가 어떻든 겹치거나 밀리지 않는다. */
  const layers = useRef<
    ({ shell: { value: number }; base: number; bare: { value: THREE.Vector3 }; bareR: { value: THREE.Vector3 } } | undefined)[]
  >([]);

  const materials = useMemo(() => {
    const alphaMap = furAlphaMap();
    if (!alphaMap) return [];
    return Array.from({ length: shells }, (_, i) => {
      const t = (i + 1) / shells;
      const map = alphaMap.clone();
      map.needsUpdate = true;
      map.repeat.set(repeat, repeat);
      const m = new THREE.MeshStandardMaterial({
        color: ROOT_COLOR.clone().lerp(TIP_COLOR, t),
        roughness: 1,
        metalness: 0,
        alphaMap: map,
        /* 자르는 방식이라 반투명 정렬 문제가 없다. 바깥 겹일수록 기준이 높아 털이 줄어든다. */
        alphaTest: 0.05 + t * t * 0.58,
      });
      m.onBeforeCompile = (shader) => {
        shader.uniforms.uShell = { value: length * t };
        /* 자리를 안 준 부위는 아무 데도 안 닿게 멀리 놔둔다 — 분기 없이 배율이 늘 1 이 된다. */
        shader.uniforms.uBare = { value: new THREE.Vector3(0, 0, -99) };
        shader.uniforms.uBareR = { value: new THREE.Vector3(0.001, 0.002, 1) };
        layers.current[i] = {
          shell: shader.uniforms.uShell,
          base: length * t,
          bare: shader.uniforms.uBare,
          bareR: shader.uniforms.uBareR,
        };
        shader.vertexShader =
          "uniform float uShell;\nuniform vec3 uBare;\nuniform vec3 uBareR;\nvarying vec3 vFurPos;\n" +
          shader.vertexShader.replace(
            "#include <begin_vertex>",
            "#include <begin_vertex>\n\tvFurPos = transformed;\n" +
              "\tvec3 furD = vec3(abs(transformed.x), transformed.y, transformed.z) - uBare;\n" +
              "\tfurD.y *= uBareR.z;\n" +
              "\tfloat furK = smoothstep(uBareR.x, uBareR.y, length(furD));\n" +
              "\ttransformed += normal * (uShell * furK);",
          );
        shader.fragmentShader = "varying vec3 vFurPos;\n" + shader.fragmentShader;
      };
      return m;
    });
  }, [length, repeat, shells]);

  /* 밖에서 정한 배수와, 표정 따라 옮겨 다니는 눈자리를 겹마다 먹인다. */
  useFrame(() => {
    const k = boost.current.k;
    const b = bare?.current;
    for (const sh of layers.current) {
      if (!sh) continue;
      sh.shell.value = sh.base * k;
      if (b) {
        sh.bare.value.set(b.x, b.y, b.z);
        sh.bareR.value.set(b.rIn, b.rOut, b.yw);
      }
    }
  });

  return (
    <group>
      {materials.map((m, i) => (
        <mesh key={i} geometry={geometry} material={m} />
      ))}
    </group>
  );
}
