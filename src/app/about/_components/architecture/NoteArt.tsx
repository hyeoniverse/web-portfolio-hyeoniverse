"use client";

/* 설계 메모 도식 — 메모마다 그 결정을 한 장면으로 보여 주는 움직이는 그림(320×180 판, 6초 반복).
   선은 옅은 흰색, 통과는 분홍(accent), 막힘은 빨강, 노드 자리에는 별. 화면 밖에서는 멈추고, 움직임 줄이기에서는
   마지막 장면에 멈춘다. 그림의 내용은 설계 메모(_data/architecture 의 keyNotes) 그대로 */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { STAR_PATH, useL } from "../features/shared";
import type { KeyNote } from "../../_data/architecture";
import styles from "./NoteArt.module.css";

function Star({ x, y, s = 14, className }: { x: number; y: number; s?: number; className?: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path className={className ?? styles.star} d={STAR_PATH} transform={`translate(${-s / 2} ${-s / 2}) scale(${s / 100})`} />
    </g>
  );
}

function Node({ x, y, w, h = 36, label, sub, className }: { x: number; y: number; w: number; h?: number; label: string; sub?: string; className?: string }) {
  return (
    <g className={className}>
      <rect className={styles.node} x={x} y={y} width={w} height={h} rx={h / 2} />
      <text className={styles.label} x={x + w / 2} y={y + h / 2 + (sub ? -1 : 4)} textAnchor="middle">{label}</text>
      {sub && <text className={styles.sub} x={x + w / 2} y={y + h / 2 + 12} textAnchor="middle">{sub}</text>}
    </g>
  );
}

/** 선을 따라 가는 빛 — offset-path 로 경로를 그대로 탄다 */
function Packet({ d, className }: { d: string; className: string }) {
  return <circle className={`${styles.packet} ${className}`} r={5} style={{ offsetPath: `path("${d}")` } as CSSProperties} />;
}

function Badge({ x, y, text, className }: { x: number; y: number; text: string; className: string }) {
  return (
    <g className={className} transform={`translate(${x} ${y})`}>
      <g className={styles.pop}>
        <rect x={-22} y={-12} width={44} height={24} rx={12} />
        <text y={4} textAnchor="middle">{text}</text>
      </g>
    </g>
  );
}

/* 두 탭이 같은 v3 을 저장 — 먼저 간 쪽이 v4 로 올리고, 늦게 간 쪽은 409 에서 멈춘다 */
const C_A = "M100 40 C160 40 170 90 222 90";
const C_B = "M100 140 C160 140 170 90 222 90";
function Conflict() {
  const L = useL();
  return (
    <>
      <path className={styles.wire} d={C_A} />
      <path className={styles.wire} d={C_B} />
      <Node x={12} y={22} w={88} label={L({ ko: "탭 A", en: "Tab A" })} sub="v3" />
      <Node x={12} y={122} w={88} label={L({ ko: "탭 B", en: "Tab B" })} sub="v3" />
      <g className={styles.cDb}>
        <rect className={styles.node} x={222} y={66} width={86} height={48} rx={24} />
        <text className={styles.label} x={265} y={88} textAnchor="middle">post</text>
        <text className={`${styles.sub} ${styles.cV3}`} x={265} y={102} textAnchor="middle">v3</text>
        <text className={`${styles.subOn} ${styles.cV4}`} x={265} y={102} textAnchor="middle">v4</text>
      </g>
      <Packet d={C_A} className={styles.cPa} />
      <Packet d={C_B} className={styles.cPb} />
      <Badge x={176} y={136} text="409" className={styles.cNo} />
    </>
  );
}

/* 역할 — 브라우저 요청은 자물쇠에서 막히고, 서버(service_role)만 app_metadata 에 쓴다 */
const R_B = "M112 40 C156 40 172 82 214 86";
const R_S = "M112 140 C156 140 172 98 214 94";
function Roles() {
  const L = useL();
  return (
    <>
      <path className={styles.wireDash} d={R_B} />
      <path className={styles.wire} d={R_S} />
      <Node x={12} y={22} w={100} label={L({ ko: "브라우저", en: "Browser" })} />
      <Node x={12} y={122} w={100} label={L({ ko: "서버", en: "Server" })} sub="service_role" />
      <g className={styles.rMeta}>
        <rect className={styles.node} x={214} y={64} width={96} height={52} rx={26} />
        <text className={styles.label} x={262} y={87} textAnchor="middle">app_metadata</text>
        <text className={styles.subOn} x={262} y={102} textAnchor="middle">role</text>
      </g>
      {/* 자물쇠 — 브라우저 길 한가운데 */}
      <g className={styles.lock} transform="translate(164 58)">
        <path d="M-6 -2 V-7 a6 6 0 0 1 12 0 V-2" />
        <rect x={-9} y={-2} width={18} height={14} rx={4} />
      </g>
      <Packet d={R_B} className={styles.rPb} />
      <Packet d={R_S} className={styles.rPs} />
      <Badge x={164} y={30} text="✕" className={styles.rNo} />
    </>
  );
}

/* 조회수 — 같은 IP · 같은 KST 날짜 셋 중 첫 번째만 들어가고 나머지는 UNIQUE 에서 튕긴다 */
const D_PATHS = ["M106 34 C160 34 170 90 206 90", "M106 90 L206 90", "M106 146 C160 146 170 90 206 90"];
function Daily() {
  return (
    <>
      {D_PATHS.map((d) => <path key={d} className={styles.wire} d={d} />)}
      {[0, 1, 2].map((i) => (
        <g key={i} className={styles.dChip} style={{ "--i": i } as CSSProperties}>
          <Node x={12} y={18 + i * 56} w={94} h={32} label="1.2.3.4" sub="/about" />
        </g>
      ))}
      {/* 30분 중복 확인 — 표 바로 앞 */}
      <path className={styles.gate} d="M200 60 V120" />
      <Node x={214} y={66} w={96} h={48} label="page_views" className={styles.dDb} />
      {D_PATHS.map((d, i) => <Packet key={d} d={d} className={i === 0 ? styles.dP0 : `${styles.dPx} ${i === 1 ? styles.dP1 : styles.dP2}`} />)}
      <text className={styles.count} x={262} y={146} textAnchor="middle">+1</text>
      <text className={styles.gateLabel} x={200} y={50} textAnchor="middle">30 min</text>
    </>
  );
}

/* 좋아요 — 글 · 작업물 좋아요가 한 테이블로 모이고, 들어올 때마다 줄이 하나씩 쌓인다(빛 넷이 두 길을 번갈아) */
const L_LANES = [
  { kind: "post", y: 55 },
  { kind: "work", y: 125 },
];
const lPath = (lane: number) => `M96 ${L_LANES[lane].y} C160 ${L_LANES[lane].y} 176 90 214 90`;
function Likes() {
  return (
    <>
      {L_LANES.map((l, i) => (
        <g key={l.kind}>
          <path className={styles.wire} d={lPath(i)} />
          <Star x={22} y={l.y} s={16} className={styles.starOn} />
          <text className={styles.labelLeft} x={38} y={l.y + 4}>{l.kind}</text>
        </g>
      ))}
      <g>
        <rect className={styles.node} x={214} y={40} width={96} height={100} rx={18} />
        <text className={styles.label} x={262} y={60} textAnchor="middle">likes</text>
        <path className={styles.rule} d="M226 70 H298" />
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} className={styles.lRow} style={{ "--i": i } as CSSProperties} x={226} y={78 + i * 14} width={72} height={8} rx={4} />
        ))}
      </g>
      {[0, 1, 2, 3].map((i) => <Packet key={i} d={lPath(i % 2)} className={styles.lP} />)}
    </>
  );
}

/* 댓글의 두 해시 — 위 갈래(password_hash)는 수정 · 삭제 인증, 아래 갈래(commenter_hash)는 아바타 표시 */
const H_T = "M98 90 C140 90 146 40 188 40";
const H_B = "M98 90 C140 90 146 140 188 140";
function Hashes() {
  const L = useL();
  return (
    <>
      <path className={styles.wire} d={H_T} />
      <path className={styles.wire} d={H_B} />
      <Node x={12} y={70} w={86} h={40} label={L({ ko: "댓글", en: "Comment" })} sub={L({ ko: "비밀번호", en: "password" })} />
      <Node x={188} y={22} w={126} label="password_hash" sub={L({ ko: "수정 · 삭제", en: "edit · delete" })} className={styles.hAuth} />
      <Node x={188} y={122} w={126} label="commenter_hash" sub={L({ ko: "표시만", en: "display only" })} />
      <Packet d={H_T} className={styles.hPt} />
      <Packet d={H_B} className={styles.hPb} />
      {/* 위 갈래 끝 — 확인 표시, 아래 갈래 끝 — 별 아바타 */}
      <g className={styles.hOk} transform="translate(251 72)">
        <g className={styles.pop}>
          <circle r={11} />
          <path d="M-5 0 L-1 4 L5 -4" />
        </g>
      </g>
      <g className={styles.hAvatar} transform="translate(251 172)">
        <g className={styles.pop}>
          <Star x={0} y={0} s={16} className={styles.starOn} />
        </g>
      </g>
    </>
  );
}

/* 그림도 데이터 — SQL 이 한 줄씩 쓰이고, 파서를 지나 별자리 ERD 가 그려진다 */
const SQL = ["CREATE TABLE posts (", "  id uuid,", "  title text", ");"];
function Data() {
  return (
    <>
      <rect className={styles.node} x={8} y={34} width={164} height={112} rx={18} />
      {SQL.map((t, i) => (
        <text key={i} className={`${styles.code} ${styles.dLine}`} style={{ "--i": i } as CSSProperties} x={20} y={64 + i * 20} xmlSpace="preserve">{t}</text>
      ))}
      <path className={styles.wire} d="M172 90 L204 90" />
      <Packet d="M172 90 L204 90" className={styles.eP} />
      <g className={styles.erd}>
        <path className={styles.erdLine} pathLength={1} d="M228 52 L300 70 M228 52 L244 134 M244 134 L304 142" />
        <Star x={228} y={52} s={18} className={`${styles.starOn} ${styles.erdStar}`} />
        <Star x={300} y={70} s={14} className={`${styles.starOn} ${styles.erdStar}`} />
        <Star x={244} y={134} s={14} className={`${styles.starOn} ${styles.erdStar}`} />
        <Star x={304} y={142} s={12} className={`${styles.starOn} ${styles.erdStar}`} />
        <text className={styles.sub} x={228} y={36} textAnchor="middle">posts</text>
      </g>
    </>
  );
}

const ARTS: Record<KeyNote["art"], () => React.ReactElement> = {
  conflict: Conflict,
  roles: Roles,
  daily: Daily,
  likes: Likes,
  hashes: Hashes,
  data: Data,
};

export default function NoteArt({ art }: { art: KeyNote["art"] }) {
  const Art = ARTS[art];
  const ref = useRef<SVGSVGElement>(null);
  /* 화면 밖에서는 반복을 멈춘다 */
  const [play, setPlay] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setPlay(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <svg ref={ref} className={styles.art} viewBox="0 0 320 180" data-play={play || undefined} aria-hidden>
      <Art />
    </svg>
  );
}
