import * as THREE from "three";
import type { BunnyTouch } from "@/stores/profileSectionStore";
import type { HandAnchor } from "./TouchHand";
import { EYE_LOCAL } from "./bunnyGeometry";

/* ── 몽이를 만지는 일 ──────────────────────────────────────────
   profile 의 떠다니는 몽이(FloatingScene)와 works 원통의 몽이(CylinderIntroBunny)가 같이 쓴다.
   입력 쪽은 화면 좌표(NDC)만 적어 두고(BunnyTouch), 무엇을 만지는지·살이 얼마나 밀리는지·손이
   어디에 서는지는 몽이의 지금 자세를 아는 장면이 매 프레임 이 장치로 푼다.

   한 프레임의 순서는 begin → sense → pose → deform → placeHand 다. begin 이 잡아 둔 그룹 행렬
   (직전 프레임의 자세)로 광선을 되돌리므로, pose 로 새 자세를 넣은 뒤에도 같은 프레임 안에서는
   그 행렬을 계속 쓴다. */

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

export type BunnySpot = "pinch" | "pet" | "poke" | "grab";

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

/**
 * 각도 사이의 보간 — **가까운 쪽으로 돈다**.
 *
 * 떠다니는 동안 회전각은 계속 커지기만 한다. 그걸 그냥 lerp 하면 섞이는 값이 `각 × (1-k)` 라서,
 * 멈춰 서기 시작하는 순간 그 큰 각이 빠르게 깎여 나간다 — 몽이가 늘 같은 쪽으로 고개를 처박는다.
 * 페이지를 오래 켜 둘수록 심해진다. 차이를 -π~π 로 접어 두면 어느 각도에서든 반 바퀴 안에서
 * 가까운 쪽으로 돌아선다.
 */
export function lerpAngle(from: number, to: number, k: number): number {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  else if (d < -Math.PI) d += Math.PI * 2;
  return from + d * k;
}

export class BunnyTouchRig {
  /** 손이 닿은 자리(머리 로컬)와 그 자리가 밀려난 양. 용수철로 제자리에 돌아간다. */
  private readonly dent = {
    at: new THREE.Vector3(),
    now: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    /** 지금 살이 밀려 있는지 — 다 돌아온 뒤에는 꼭짓점을 건드리지 않는다. */
    live: false,
    /** 볼을 잡은 자리를 이미 정했는지. 잡고 있는 동안 다시 안 고른다. */
    holding: false,
  };
  /** 찌른 자국(몸 전체) — a 가 눌린 깊이, v 가 그 속도, x·y 가 찌른 자리(NDC). */
  private readonly squish = { a: 0, v: 0, x: 0, y: 0 };
  /** 이번 프레임에 살을 붙잡고 있는지(볼을 잡았거나 쓰다듬는 중). 붙잡은 살은 더 단단히 따라온다. */
  private held = false;
  /** 손대기 전의 머리 꼭짓점. 매 프레임 여기서 다시 밀어야 변형이 쌓이지 않는다. */
  private headRest: Float32Array | null = null;
  private restOf: THREE.BufferGeometry | null = null;
  private camera: THREE.Camera | null = null;
  private group: THREE.Object3D | null = null;
  private readonly inv = new THREE.Matrix4();
  private readonly rayA = new THREE.Vector3();
  private readonly rayB = new THREE.Vector3();
  private readonly pickAt = new THREE.Vector3();
  private readonly dentTmp = new THREE.Vector3();
  private readonly handAt = new THREE.Vector3();
  private readonly handNrm = new THREE.Vector3();
  private readonly handWorld = new THREE.Vector3();

  /** 손이 설 자리와 크기. TouchHand 가 매 프레임 읽는다. */
  readonly hand: HandAnchor = {
    pos: new THREE.Vector3(),
    /** 만지는 자리의 바깥 방향(월드). 손바닥이 이 반대를 봐야 살에 얹힌 손이 된다. */
    normal: new THREE.Vector3(0, 1, 0),
    scale: 1,
    side: 1,
    shape: "",
    active: false,
  };

  /** 이번 프레임의 카메라와 몽이 그룹. 그룹의 역행렬은 이 프레임 내내 같다 — 광선마다 다시 뒤집지 않는다. */
  begin(camera: THREE.Camera, group: THREE.Object3D): void {
    this.camera = camera;
    this.group = group;
    group.updateMatrixWorld();
    this.inv.copy(group.matrixWorld).invert();
  }

  /**
   * 화면 좌표(NDC)의 광선을 머리 **지오메트리 공간**의 점으로 옮긴다.
   *
   * 두 점을 각각 옮겨 빼는 방식이라 그룹의 회전·비균일 배율(찌를 때의 스쿼시)까지 정확하다.
   * 방향 벡터만 변환하면 배율이 균일할 때만 맞는다.
   * `grow` 는 머리보다 큰 구와 교차시키는 값이다 — 귀처럼 머리 밖을 가리켜도 받아 준다.
   */
  private pick(nx: number, ny: number, out: THREE.Vector3, grow = 1): boolean {
    const camera = this.camera;
    if (!camera) return false;
    const a = this.rayA.set(nx, ny, -1).unproject(camera).applyMatrix4(this.inv);
    const b = this.rayB.set(nx, ny, 1).unproject(camera).applyMatrix4(this.inv);
    const ax = (a.x - HEAD_POS[0]) / HEAD_SCALE[0];
    const ay = (a.y - HEAD_POS[1]) / HEAD_SCALE[1];
    const az = (a.z - HEAD_POS[2]) / HEAD_SCALE[2];
    const dx = (b.x - HEAD_POS[0]) / HEAD_SCALE[0] - ax;
    const dy = (b.y - HEAD_POS[1]) / HEAD_SCALE[1] - ay;
    const dz = (b.z - HEAD_POS[2]) / HEAD_SCALE[2] - az;
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
  }

  /** 머리에 닿거나, 머리 구를 키워 귀 쪽에 닿으면 표면으로 당겨 받는다. */
  private pickHeadOrEar(nx: number, ny: number, out: THREE.Vector3): boolean {
    if (this.pick(nx, ny, out)) return true;
    if (this.pick(nx, ny, out, EAR_REACH)) {
      out.setLength(HEAD_R);
      return true;
    }
    return false;
  }

  /**
   * 화면에서 끌린 양을 머리 지오메트리 공간의 밀림으로 옮긴다.
   *
   * 끌린 양은 화면 기준이라 그대로 쓰면 몽이가 돌아 있을 때 엉뚱한 쪽으로 늘어난다.
   * 머리 중심의 화면 깊이에서 두 점을 되짚어 빼면 자세가 반영된 밀림이 나온다.
   */
  private pullToHead(nx: number, ny: number, dx: number, dy: number, out: THREE.Vector3): void {
    const camera = this.camera;
    const group = this.group;
    if (!camera || !group) return;
    this.rayA.set(HEAD_POS[0], HEAD_POS[1], HEAD_POS[2]);
    group.localToWorld(this.rayA);
    this.rayA.project(camera);
    const depth = this.rayA.z;
    this.rayA.set(nx, ny, depth).unproject(camera).applyMatrix4(this.inv);
    this.rayB.set(nx + dx, ny + dy, depth).unproject(camera).applyMatrix4(this.inv);
    out.set(
      (this.rayB.x - this.rayA.x) / HEAD_SCALE[0],
      (this.rayB.y - this.rayA.y) / HEAD_SCALE[1],
      (this.rayB.z - this.rayA.z) / HEAD_SCALE[2],
    );
  }

  /**
   * 눌릴 자리를 눈에서 떼어 놓는다.
   *
   * 눈 옆의 살이 밀리면 눈이 살을 뚫고 나온 것처럼 보인다. 거절하지 않고 밀어내는 이유는,
   * 거절하면 만졌는데 아무 일도 안 일어나서 눌리는 자리를 손으로 더듬어 찾게 되기 때문이다.
   * 밀어내는 방향은 **지금 있는 쪽**이다 — 늘 아래로 밀면 머리 위를 쓰다듬어도 볼이 눌린다.
   */
  private keepOffEyes(p: THREE.Vector3): void {
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
  }

  /** 머리 위의 점을 무엇을 만지는 자리인지로 옮긴다. 기준은 몽이 로컬 좌표다. */
  private spotOf(p: THREE.Vector3): "pinch" | "poke" | "pet" {
    const by = p.y * HEAD_SCALE[1] + HEAD_POS[1];
    const bx = p.x * HEAD_SCALE[0] + HEAD_POS[0];
    if (by > FACE_SPLIT_Y) return "pet";
    return Math.abs(bx) >= NOSE_HALF_W ? "pinch" : "poke";
  }

  /** 커서가 몽이의 어디에 있는지. 머리가 아니면 몸을 잡는 것이다. 귀는 머리 구 밖이라 큰 구로 받는다. */
  spotAt(nx: number, ny: number): BunnySpot {
    if (this.pick(nx, ny, this.pickAt)) return this.spotOf(this.pickAt);
    if (this.pick(nx, ny, this.pickAt, EAR_REACH) && this.spotOf(this.pickAt) === "pet") return "pet";
    return "grab";
  }

  /**
   * 입력을 살과 몸의 움직임으로 옮긴다 — 커서 자리 풀기, 찌르기, 볼 잡기, 쓰다듬기, 용수철.
   * 찔렀으면 onPoke 를 부른다(표정·소리는 장면마다 다르다).
   */
  sense(touch: BunnyTouch, dt: number, onPoke: () => void): void {
    const sq = this.squish;
    const dn = this.dent;

    /* 지금 커서가 몽이의 어디에 있는지 풀어 적어 둔다. 입력 쪽이 이걸 읽어 커서를 고른다. */
    touch.spot = touch.over ? this.spotAt(touch.ndcX, touch.ndcY) : "";

    /* 찌른 세기는 한 번만 쓰고 0 으로 되돌린다. 남겨 두면 매 프레임 다시 찌른 게 된다. */
    if (touch.poke > 0) {
      if (this.pick(touch.grabX, touch.grabY, dn.at)) {
        this.keepOffEyes(dn.at);
        /* 그 자리를 안쪽으로 눌러 준다 — 표면을 따라 들어가야 손가락 자국이 된다. */
        dn.vel.addScaledVector(this.dentTmp.copy(dn.at).normalize(), -POKE_DEPTH * touch.poke);
        dn.live = true;
      }
      /* 얼굴이든 몸이든 몸통은 같이 출렁인다. */
      sq.v += POKE_IMPULSE * touch.poke * 0.8;
      sq.x = touch.grabX;
      sq.y = touch.grabY;
      touch.poke = 0;
      onPoke();
    }

    /* 볼을 잡았으면 그 순간의 살을 기억한다. 잡고 있는 동안 몽이가 흔들려도 잡은 살은 그대로다. */
    if (touch.cheek !== 0 && !dn.holding) {
      dn.holding = this.pick(touch.grabX, touch.grabY, dn.at);
      if (dn.holding) this.keepOffEyes(dn.at);
    } else if (touch.cheek === 0) {
      dn.holding = false;
    }

    let dentTarget = this.dentTmp.set(0, 0, 0);
    this.held = false;
    if (touch.cheek !== 0 && dn.holding) {
      dn.live = true;
      this.held = true;
      /* 끌린 양은 화면 기준이라, 몽이 자세로 되돌려야 손을 따라가는 것으로 보인다. */
      this.pullToHead(touch.grabX, touch.grabY, touch.pullX, touch.pullY, dentTarget);
      dentTarget.multiplyScalar(PULL_GAIN);
    } else if (touch.petting) {
      /* 쓰다듬기 — 손이 있는 자리를 얕게 누른다. 자국이 손을 따라 지나간다. */
      if (this.pickHeadOrEar(touch.ndcX, touch.ndcY, dn.at)) {
        this.keepOffEyes(dn.at);
        dn.live = true;
        this.held = true;
        dentTarget = this.dentTmp.copy(dn.at).normalize().multiplyScalar(-PET_DEPTH);
      }
    }
    if (dn.live) {
      const K = this.held ? 260 : 190;
      const D = this.held ? 24 : 9;
      dn.vel.x += (K * (dentTarget.x - dn.now.x) - D * dn.vel.x) * dt;
      dn.vel.y += (K * (dentTarget.y - dn.now.y) - D * dn.vel.y) * dt;
      dn.vel.z += (K * (dentTarget.z - dn.now.z) - D * dn.vel.z) * dt;
      dn.now.addScaledVector(dn.vel, dt);
    }

    sq.v += (-SQUISH_K * sq.a - SQUISH_D * sq.v) * dt;
    sq.a += sq.v * dt;
  }

  /** 몽이를 이 자리·자세·크기에 세운다. 찔린 만큼 납작해지고 옆으로 퍼지며, 찌른 쪽으로 살짝 기운다. */
  pose(group: THREE.Object3D, x: number, y: number, z: number, rx: number, ry: number, rz: number, scale: number): void {
    const squashed = THREE.MathUtils.clamp(this.squish.a, -0.45, 0.45);
    group.position.set(x, y, z);
    group.rotation.set(rx, ry, rz - squashed * this.squish.x * 0.5);
    group.scale.set(
      scale * (1 + squashed * 0.26),
      scale * (1 - squashed * 0.34),
      scale * (1 + squashed * 0.26),
    );
  }

  /* 머리 꼭짓점 밀기. 원본을 한 번 떠 두고 매 프레임 거기서 다시 민다 —
     그리고 있는 것을 또 밀면 변형이 눈덩이처럼 쌓인다. */
  deform(head: THREE.BufferGeometry): void {
    const dn = this.dent;
    if (!dn.live) return;
    const attr = head.attributes.position;
    const arr = attr.array as Float32Array;
    if (!this.headRest || this.restOf !== head) {
      this.headRest = Float32Array.from(arr);
      this.restOf = head;
    }
    const rest = this.headRest;
    const r2 = DENT_RADIUS * DENT_RADIUS;
    for (let i = 0; i < arr.length; i += 3) {
      const dx = rest[i] - dn.at.x;
      const dy = rest[i + 1] - dn.at.y;
      const dz = rest[i + 2] - dn.at.z;
      const w = falloff((dx * dx + dy * dy + dz * dz) / r2);
      arr[i] = rest[i] + dn.now.x * w;
      arr[i + 1] = rest[i + 1] + dn.now.y * w;
      arr[i + 2] = rest[i + 2] + dn.now.z * w;
    }
    attr.needsUpdate = true;
    head.computeVertexNormals();

    /* 다 돌아왔으면 손을 뗀다 — 안 그러면 가만히 있어도 매 프레임 법선을 다시 잡는다. */
    if (!this.held && dn.now.lengthSq() < 1e-6 && dn.vel.lengthSq() < 1e-5) {
      dn.now.set(0, 0, 0);
      dn.vel.set(0, 0, 0);
      dn.live = false;
    }
  }

  /** 손을 거둔다 — 몽이가 화면에서 가려졌을 때. */
  hideHand(): void {
    this.hand.active = false;
  }

  /**
   * 손이 설 자리. 쓰다듬는 중이면(살이 실제로 눌리고 있을 때만) 참을 돌려준다 — 하트를 띄우는 신호다.
   *
   * 손은 커서를 그대로 따라가지 않는다. 몽이의 만지는 자리에 붙어야 잡고 있는 것으로 보인다.
   * 살이 밀린 만큼(dent.now) 손도 같이 가서, 볼을 당기면 손이 늘어난 끝에 붙어 있는다.
   *
   * 깊이는 화면 기준으로 잡는다. 몽이 로컬의 +z 를 "앞" 으로 삼으면 반 바퀴 돌렸을 때
   * 그 앞이 화면 뒤가 되어 손이 몸 뒤로 숨는다. 만지는 자리를 화면에 투영해 그 방향으로,
   * 몽이 전체보다 앞선 깊이에 세우면 어느 각도에서든 커서 위에 얹힌다.
   */
  placeHand(touch: BunnyTouch, scale: number): boolean {
    const camera = this.camera;
    const group = this.group;
    const anchor = this.hand;
    const dn = this.dent;
    anchor.shape = touch.hand;
    if (!camera || !group) {
      anchor.active = false;
      return false;
    }
    const holdingHead = (touch.cheek !== 0 && dn.holding) || touch.petting;
    let aimX = touch.ndcX;
    let aimY = touch.ndcY;
    let onFlesh = false;
    if (touch.hand && touch.hand !== "grab") {
      onFlesh = holdingHead
        ? (this.handAt.copy(dn.at), true)
        : this.pickHeadOrEar(touch.ndcX, touch.ndcY, this.handAt);
      if (onFlesh) {
        /* 이 자리의 바깥 방향. 머리는 구를 축마다 다르게 늘린 타원면이라 법선이 곧 위치가
           아니다 — 축 배율로 **나눠야** 한다(타원면 기울기 ∝ x/a², 그 점은 a·x 라서).
           눌린 만큼 더하기 전에 잰다. 눌린 자리의 순간 기울기까지 따라가면 손이 떨린다. */
        this.handNrm
          .set(this.handAt.x / HEAD_SCALE[0], this.handAt.y / HEAD_SCALE[1], this.handAt.z / HEAD_SCALE[2])
          .normalize()
          .transformDirection(group.matrixWorld);
        anchor.normal.copy(this.handNrm);
        this.handAt.add(dn.now);
        this.handWorld.set(
          HEAD_POS[0] + this.handAt.x * HEAD_SCALE[0],
          HEAD_POS[1] + this.handAt.y * HEAD_SCALE[1],
          HEAD_POS[2] + this.handAt.z * HEAD_SCALE[2],
        );
        group.localToWorld(this.handWorld);
        this.handWorld.project(camera);
        aimX = this.handWorld.x;
        aimY = this.handWorld.y;
      }
    }

    if (!touch.hand || (touch.hand !== "grab" && !onFlesh)) {
      anchor.active = false;
    } else {
      /* 몽이 중심까지의 거리에서 반지름만큼 당긴 자리 — 몸 어느 부분보다도 앞이다. */
      this.handWorld.set(0, 0, 0);
      group.localToWorld(this.handWorld);
      const centerNdcX = this.pickAt.copy(this.handWorld).project(camera).x;
      const dist = camera.position.distanceTo(this.handWorld);
      this.rayA.set(aimX, aimY, -1).unproject(camera);
      this.rayB.set(aimX, aimY, 1).unproject(camera);
      this.rayB.sub(this.rayA).normalize();
      anchor.pos
        .copy(camera.position)
        .addScaledVector(this.rayB, dist - HAND_CLEAR * scale);
      anchor.scale = scale;
      /* 손은 늘 화면에서 몽이 바깥쪽으로 물러난다. */
      anchor.side = aimX >= centerNdcX ? 1 : -1;
      anchor.active = true;
    }
    return touch.petting && dn.live;
  }
}
