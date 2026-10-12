"use client";

/* 구조 장 — 프레지 프레임들. 값은 관리자 설정(useAboutConfig)이 먼저, 비어 있으면 기존 About 의 코드 기본값.
   휠 · 키 한 번이 프레임 안 단계(useFrameSteps)를 하나씩 넘기고, 마지막 단계에서 다음 프레임으로 간다.
   1 기술 그래프: 단계마다 묶음 하나 — 그 묶음의 별에 불이 들어오고 카메라가 그쪽으로 다가간다
   2 사용자 흐름: 단계마다 흐름 하나 — 노선이 그려지고 길잡이 별이 정류장을 걷는다
   3 API: SceneApi
   4 DB 설계: 관리자와 같은 ERD 탐색기 + 고른 테이블의 메모
   5 설계 메모: 단계마다 결정 하나 — 필름 띠처럼 옆으로 넘어간다 */
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Pressable from "@/components/ui/Pressable";
import { useLanguage } from "@/providers/LanguageProvider";
import { useAboutConfig } from "@/app/about/_panels/AboutConfig";
import {
  ARCH_VIEW,
  DEFAULT_ARCH_NODES,
  DEFAULT_ARCH_EDGES,
  type ArchNode,
} from "@/app/about/_panels/panels/archDiagramData";
import { userFlows as staticFlows } from "@/data/about/architecture";
import { erdTables as staticTables, erdRelations as staticRelations, erdDesignNotes } from "@/data/about/erd";
import { erdTour } from "../../_data/architecture";
import { RowNum, SceneHead, STAR_PATH, StarMark, useL } from "../features/shared";
import { useFrame, useFrameSteps } from "../prezi/context";
import NoteArt from "./NoteArt";
import fx from "../features/Features.module.css";
import styles from "./Architecture.module.css";
import { useAboutText } from "../../_panels/AboutConfig";

const ErdExplorer = dynamic(() => import("@/components/about/ErdExplorer"), { ssr: false });

const pad = (n: number) => String(n).padStart(2, "0");

/** 단계 수 표시 — 오른쪽 아래 작은 숫자 */
function StepCount({ i, n }: { i: number; n: number }) {
  return (
    <span className={styles.count} aria-hidden>
      {pad(i + 1)} / {pad(n)}
    </span>
  );
}

/* ── 1 · 기술 그래프 ── */

/** 길잡이 별이 묶음의 별 하나에 머무는 시간(ms) */
const VISIT_MS = 650;

export function SceneStack() {
  const { stackKey, stackScene } = useAboutText().architecture;
  const L = useL();
  const about = useAboutConfig();
  const nodes: ArchNode[] = about.archDiagram?.nodes?.length ? about.archDiagram.nodes : DEFAULT_ARCH_NODES;
  const edges = about.archDiagram?.nodes?.length ? about.archDiagram.edges : DEFAULT_ARCH_EDGES;
  const groups = stackScene.groups;
  const { step: index, setStep, current: live } = useFrameSteps(groups.length);
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const center = (n: ArchNode) => ({ x: n.x + n.w / 2, y: n.y + n.h / 2 });
  /* 보이는 범위 — 원래 좌표는 1000 폭 판의 한쪽에 몰려 있어, 별들이 있는 곳만 여백을 두고 잘라 보여 준다 */
  const view = useMemo(() => {
    if (!nodes.length) return { x: 0, y: 0, w: ARCH_VIEW.w, h: ARCH_VIEW.h };
    const xs = nodes.map((n) => n.x + n.w / 2);
    const ys = nodes.map((n) => n.y + n.h / 2);
    const padX = 70, padTop = 40, padBottom = 60;
    const x0 = Math.min(...xs) - padX, y0 = Math.min(...ys) - padTop;
    return { x: x0, y: y0, w: Math.max(...xs) + padX - x0, h: Math.max(...ys) + padBottom - y0 };
  }, [nodes]);
  /* 묶음 차례 — 묶음이 없는 노드(사용자 · 편집기)는 처음부터 켜져 있다 */
  const order = (n: ArchNode) => (n.group ? groups.findIndex((g) => g.key === n.group) : -1);
  const current = groups[index];
  const members = useMemo(() => nodes.filter((n) => n.group === current.key), [nodes, current.key]);
  /* 길잡이 별이 지금 묶음의 별을 하나씩 찾아간다 — 단계가 바뀌면 첫 별부터. 어느 단계의 걸음인지 함께 쥐어 둔다 */
  const [walk, setWalk] = useState({ at: index, n: 0 });
  const visit = walk.at === index ? walk.n : 0;
  useEffect(() => {
    if (!live || members.length < 2) return;
    let k = 0;
    const t = window.setInterval(() => {
      k += 1;
      setWalk({ at: index, n: k });
      if (k >= members.length - 1) window.clearInterval(t);
    }, VISIT_MS);
    return () => window.clearInterval(t);
  }, [live, index, members.length]);
  const lit = (n: ArchNode) => order(n) <= index;
  const guideNode = members[Math.min(visit, members.length - 1)]?.id;
  /* 카메라 — 지금 묶음의 가운데를 판 가운데 쪽으로 반쯤 끌어오며 조금 확대한다(프레지의 확대). 판은 넘쳐도 보인다 */
  const cam = useMemo(() => {
    if (!members.length) return "none";
    const cs = members.map(center);
    const mx = cs.reduce((s, c) => s + c.x, 0) / cs.length;
    const my = cs.reduce((s, c) => s + c.y, 0) / cs.length;
    const cx = view.x + view.w / 2, cy = view.y + view.h / 2;
    const k = 1.1;
    const tx = mx + (cx - mx) * 0.3 - k * mx;
    const ty = my + (cy - my) * 0.3 - k * my;
    return `translate(${Math.round(tx)}px, ${Math.round(ty)}px) scale(${k})`;
  }, [members, view]);

  return (
    <section className={styles.frameFill}>
      <div className={styles.stackGrid}>
        <div className={styles.stackText}>
          <SceneHead label={stackScene.label} title={stackScene.title} />
          <ol className={styles.groupList}>
            {groups.map((g, i) => (
              <li key={g.key}>
                <Pressable className={styles.groupRow} data-on={i === index || undefined} data-past={i < index || undefined} onClick={() => setStep(i)}>
                  <RowNum n={i + 1} />
                  <span className={styles.groupName}>{L(g.title)}</span>
                </Pressable>
              </li>
            ))}
          </ol>
          <p key={current.key} className={styles.groupBody}>{L(current.body)}</p>
        </div>
        {/* 별자리 — 기술 하나가 별 하나. 단계마다 묶음 하나씩 별이 켜지며 별자리가 자란다. 지금 묶음은 빛나며 돈다 */}
        <div className={styles.sky}>
          <ul className={styles.skyKey}>
            {stackKey.map((k, i) => (
              <li key={i} data-k={k.k}>{L(k.text)}</li>
            ))}
          </ul>
          <svg className={styles.graph} viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} role="img" aria-label={L(stackScene.title)}>
            <g className={styles.graphCam} style={{ transform: cam }}>
              {edges.map((e, i) => {
                const a = byId.get(e.from);
                const b = byId.get(e.to);
                if (!a || !b) return null;
                const ca = center(a);
                const cb = center(b);
                const on = lit(a) && lit(b);
                /* 이번 단계에 막 켜진 선만 그려 나간다 */
                const fresh = on && Math.max(order(a), order(b)) === index;
                return (
                  <line
                    key={`${i}-${fresh ? index : "x"}`}
                    className={styles.edge}
                    data-on={on || undefined}
                    data-fresh={fresh || undefined}
                    data-dashed={e.dashed || undefined}
                    x1={ca.x}
                    y1={ca.y}
                    x2={cb.x}
                    y2={cb.y}
                    pathLength={1}
                  />
                );
              })}
              {nodes.map((n) => {
                const c = center(n);
                const now = Boolean(n.group) && order(n) === index;
                /* 사용자 · 편집기처럼 묶음이 없는 별과 지금 묶음은 크게 */
                const size = now ? 30 : n.group ? 20 : 24;
                return (
                  <g
                    key={n.id}
                    className={styles.node}
                    data-on={lit(n) || undefined}
                    data-now={now || undefined}
                    style={{ "--i": now ? members.indexOf(n) : 0 } as React.CSSProperties}
                    transform={`translate(${c.x} ${c.y})`}
                  >
                    {/* 길잡이 별이 지금 찾아간 별에 겹쳐 앉는다 — 지나간 별은 켜진 채 남는다 */}
                    <g className={styles.nodeStar} data-guide={live && n.id === guideNode ? "" : undefined} data-guide-priority="1" data-guide-fill="var(--text-white)">
                      <path d={STAR_PATH} transform={`translate(${-size / 2} ${-size / 2}) scale(${size / 100})`} />
                    </g>
                    <text y={size / 2 + 16} textAnchor="middle">{n.label}</text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      </div>
      <StepCount i={index} n={groups.length} />
    </section>
  );
}

/* ── 2 · 사용자 흐름 — 별 노선도. 시작에서 끝까지 가장 긴 길을 주 경로로 별을 잇고(두 줄로 꺾어 흐른다),
   다른 갈래는 그 별 아래 작은 글씨로 붙인다. 흐름이 바뀌면 선이 그려 나가며 별이 차례로 켜진다 ── */

type Flow = (typeof staticFlows)[number];
type FlowNodeT = Flow["nodes"][number];

/** 시작 노드에서 끝까지 가장 긴 단순 경로 — 흐름도는 작아서 다 따라가 봐도 된다 */
function mainPath(flow: Flow): FlowNodeT[] {
  const byId = new Map(flow.nodes.map((n) => [n.id, n]));
  const outs = (id: string) => flow.edges.filter((e) => e.from === id);
  const start = flow.nodes.find((n) => n.type === "start") ?? flow.nodes[0];
  let best: string[] = [];
  const walk = (id: string, path: string[]) => {
    const next = outs(id).filter((e) => !path.includes(e.to));
    if (next.length === 0) {
      if (path.length > best.length) best = path;
      return;
    }
    next.forEach((e) => walk(e.to, [...path, e.to]));
  };
  if (start) walk(start.id, [start.id]);
  return best.map((id) => byId.get(id)!).filter(Boolean);
}

const ROW_MAX = 5;
/** 길잡이 별이 노선을 다 걷는 시간(ms) */
const FLOW_WALK_MS = 4200;
/** 빨리 걷기 — 남은 정류장을 이 시간 안에(ms) */
const FLOW_FAST_MS = 600;
/** 다 걸은 직후 이 시간 동안의 걸음은 삼킨다(ms) */
const FLOW_FAST_GRACE_MS = 700;
const ROW_H = 190;
const FLOW_W = 1000;

function FlowStars({ flow, language, maxRows, live }: { flow: Flow; language: "ko" | "en"; maxRows: number; live: boolean }) {
  const path = useMemo(() => mainPath(flow), [flow]);
  const onPath = new Set(path.map((n) => n.id));
  const label = (n: FlowNodeT) => n.label[language].replace(/\n/g, " ");
  const rows = Math.ceil(path.length / ROW_MAX);
  /* 뱀처럼 — 짝수 줄은 왼쪽에서, 홀수 줄은 오른쪽에서 */
  const pts = path.map((_, i) => {
    const r = Math.floor(i / ROW_MAX);
    const c = i % ROW_MAX;
    const perRow = Math.min(ROW_MAX, path.length - r * ROW_MAX);
    const span = FLOW_W - 200;
    const step = perRow > 1 ? span / (ROW_MAX - 1) : 0;
    const x = r % 2 === 0 ? 100 + c * step : FLOW_W - 100 - c * step;
    return { x, y: 70 + r * ROW_H, r };
  });
  let d = pts.length ? `M${pts[0].x} ${pts[0].y}` : "";
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    if (a.r === b.r) d += ` L${b.x} ${b.y}`;
    else {
      /* 줄을 바꿀 땐 가장자리로 둥글게 돌아 내려간다 */
      const out = a.x > FLOW_W / 2 ? 70 : -70;
      d += ` C${a.x + out} ${a.y} ${b.x + out} ${b.y} ${b.x} ${b.y}`;
    }
  }
  /* 길잡이 별이 노선을 따라 정류장을 하나씩 지나간다 — 사용자가 그 길을 걷는 것처럼 */
  const [at, setAt] = useState(0);
  const { setIntercept } = useFrame();
  /* 지금 프레임일 때만 출발한다 — 미리 걸어 버리면 들어왔을 때 이미 끝 정류장에 서 있다.
     별이 끝 정류장에 닿기 전의 휠 · 키 · 스와이프는 다음 흐름으로 넘기지 않고 남은 길을 빨리 걷는다 */
  useEffect(() => {
    if (!live || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const each = FLOW_WALK_MS / Math.max(1, path.length);
    /* 다시 들어오면 처음 정류장부터 — 첫 칸은 바로 다음 틱에 되돌린다 */
    let i = -1;
    let doneAt = 0;
    let t = 0;
    const step = () => {
      i = Math.min(path.length - 1, i + 1);
      setAt(i);
      if (i >= path.length - 1) {
        window.clearInterval(t);
        doneAt = performance.now();
      }
    };
    const first = window.setTimeout(step, 0);
    t = window.setInterval(step, each);
    setIntercept((dir) => {
      if (dir < 0) return false;
      /* 다 걸은 직후의 걸음은 삼킨다 — 빨리 감게 한 휠의 관성 꼬리가 다음 흐름까지 넘기지 않게 */
      if (doneAt) return performance.now() - doneAt < FLOW_FAST_GRACE_MS;
      window.clearInterval(t);
      t = window.setInterval(step, Math.max(40, FLOW_FAST_MS / Math.max(1, path.length - 1 - i)));
      return true;
    });
    return () => {
      window.clearTimeout(first);
      window.clearInterval(t);
      setIntercept(null);
    };
  }, [live, path.length, setIntercept]);
  /* 높이는 가장 긴 흐름에 맞춰 고정 — 흐름이 바뀔 때 판 크기가 들썩이지 않게 */
  const height = 70 + (Math.max(rows, maxRows) - 1) * ROW_H + 90;
  /* 갈래 글 — 넓은 화면(노선도)과 좁은 화면(세로 목록)이 같이 쓴다 */
  const info = path.map((n, i) => {
    const next = path[i + 1]?.id;
    const branches = flow.edges
      .filter((e) => e.from === n.id && e.to !== next)
      .map((e) => {
        const to = flow.nodes.find((m) => m.id === e.to);
        return `${e.label ? `${e.label} → ` : "→ "}${to ? label(to) : e.to}${to && onPath.has(to.id) ? " ↺" : ""}`;
      });
    const taken = flow.edges.find((e) => e.from === n.id && e.to === next)?.label;
    return { branches, taken };
  });
  return (
    <>
    {/* 좁은 화면 — 같은 노선을 세로 목록으로 */}
    <ol className={styles.flowList}>
      {path.map((n, i) => (
        <li key={n.id} data-kind={n.type} style={{ "--i": i } as React.CSSProperties}>
          <svg className={styles.flowListStar} viewBox="0 0 100 100" aria-hidden>
            <path d={STAR_PATH} />
          </svg>
          <span className={styles.flowListLabel}>{label(n)}</span>
          {info[i].taken && <span className={styles.flowListTaken}>{info[i].taken} ↓</span>}
          {info[i].branches.slice(0, 2).map((b, j) => (
            <span key={j} className={styles.flowListBranch}>{b}</span>
          ))}
        </li>
      ))}
    </ol>
    <svg className={styles.flowSvg} viewBox={`0 0 ${FLOW_W} ${height}`} role="img" aria-label={flow.title}>
      <path className={styles.flowLine} d={d} pathLength={1} />
      {path.map((n, i) => {
        const p = pts[i];
        const big = n.type === "start" || n.type === "end";
        const size = big ? 30 : n.type === "decision" ? 22 : 18;
        const { branches, taken } = info[i];
        return (
          <g key={n.id} className={styles.flowStop} data-kind={n.type} data-walked={i <= at || undefined} style={{ "--i": i } as React.CSSProperties} transform={`translate(${p.x} ${p.y})`}>
            <path className={styles.flowStar} d={STAR_PATH} transform={`translate(${-size / 2} ${-size / 2}) scale(${size / 100})`} />
            {/* 길잡이 별이 앉는 자리 — 지금 정류장 */}
            {live && i === at && <circle r={size * 0.7} fill="transparent" data-guide="" data-guide-priority="1" data-guide-fill="var(--text-white)" />}
            {taken && <text className={styles.flowTaken} x={0} y={-size / 2 - 8} textAnchor="middle">{taken}</text>}
            <text className={styles.flowLabel} x={0} y={size / 2 + 22} textAnchor="middle">{label(n)}</text>
            {branches.slice(0, 2).map((b, j) => (
              <text key={j} className={styles.flowBranch} x={0} y={size / 2 + 44 + j * 18} textAnchor="middle">{b}</text>
            ))}
          </g>
        );
      })}
    </svg>
    </>
  );
}

/* ── 2 · 사용자 흐름 — 단계마다 흐름 하나. 탭을 누르면 그 단계로 ── */

export function SceneFlows() {
  const { flowScene } = useAboutText().architecture;
  const L = useL();
  const { language } = useLanguage();
  const about = useAboutConfig();
  const flows = about.userFlows?.length ? about.userFlows : staticFlows;
  const { step: index, setStep, current: live } = useFrameSteps(flows.length);
  const flow = flows[index];
  /* 가장 긴 흐름 — 판 높이 · 세로 목록 높이를 여기에 맞춰 고정한다 */
  const longest = useMemo(() => Math.max(...flows.map((f) => mainPath(f).length)), [flows]);
  return (
    <section className={styles.frameFill}>
      <div className={styles.flowGrid}>
        <div className={styles.flowText}>
          <SceneHead label={flowScene.label} title={flowScene.title} />
          <div className={styles.flowTabs}>
            {flows.map((f, i) => (
              <Pressable key={f.title} className={fx.chip} data-on={i === index || undefined} onClick={() => setStep(i)}>
                {f.title}
              </Pressable>
            ))}
          </div>
          <div key={index} className={styles.flowDetail}>
            <span className={styles.flowPersona}>{L(flow.persona)}</span>
            <p className={styles.flowBody}>{L(flow.description)}</p>
          </div>
        </div>
        <div key={`s-${index}`} className={styles.flowStage} style={{ "--longest": longest, "--rows": Math.ceil(longest / 2) } as React.CSSProperties}>
          <FlowStars key={`d-${index}-${language}`} flow={flow} language={language} maxRows={Math.ceil(longest / ROW_MAX)} live={live} />
        </div>
      </div>
      <StepCount i={index} n={flows.length} />
    </section>
  );
}

/* ── 4 · DB 설계 — 테이블 목록(위) · 탐색기 · 고른 테이블의 메모(옆). 휠은 탐색기가 아니라 프레지로 넘긴다 ── */

export function SceneErd() {
  const { erdScene, erdGroups, erdOtherGroup } = useAboutText().architecture;
  const L = useL();
  const { language } = useLanguage();
  const about = useAboutConfig();
  const tables = about.erdTables?.length ? about.erdTables : staticTables;
  const relations = about.erdTables?.length ? about.erdRelations : staticRelations;
  /* 길잡이 별 자리는 지금 프레임일 때만 — 이웃 프레임의 자리로 끌려가지 않게 */
  const { current: live } = useFrame();
  /* 단계 — 0 전체 보기, 다음부터 중심 테이블(erdTour)을 하나씩 골라 그 테이블과 이웃만 크게. 다 훑은 뒤 넘기면 다음 패널.
     목록 · 그림에서 직접 고르면 그 단계 동안은 그것이 우선한다(단계가 바뀌면 다시 순서대로) */
  const tour = useMemo(() => erdTour.filter((n) => tables.some((t) => t.name === n)), [tables]);
  const { step } = useFrameSteps(1 + tour.length);
  const [picked, setPicked] = useState<{ at: number; name: string | null } | null>(null);
  const focus = picked?.at === step ? picked.name : step === 0 ? null : tour[step - 1] ?? null;
  const setFocus = (v: string | null | ((f: string | null) => string | null)) =>
    setPicked({ at: step, name: typeof v === "function" ? v(focus) : v });
  const groups = useMemo(() => {
    const names = new Set(tables.map((t) => t.name));
    const known = new Set(erdGroups.flatMap((g) => g.tables));
    const list = erdGroups
      .map((g) => ({ label: g.label, tables: g.tables.filter((n) => names.has(n)) }))
      .filter((g) => g.tables.length);
    const rest = tables.map((t) => t.name).filter((n) => !known.has(n));
    return rest.length ? [...list, { label: erdOtherGroup, tables: rest }] : list;
  }, [tables, erdGroups, erdOtherGroup]);
  const focusNotes = useMemo(() => erdDesignNotes.filter((n) => n.relatedTable === focus), [focus]);
  /* 메모가 여럿인 테이블(posts 셋 등) — 한 번에 하나만 펴고 번호로 넘긴다. 어느 테이블의 번호인지 함께 쥔다 */
  const [notePick, setNotePick] = useState<{ table: string | null; i: number }>({ table: null, i: 0 });
  const noteIdx = notePick.table === focus ? Math.min(notePick.i, Math.max(0, focusNotes.length - 1)) : 0;
  const shown = focusNotes[noteIdx];
  return (
    <section className={styles.erd}>
      <div className={styles.erdHead}>
        <SceneHead label={erdScene.label} title={erdScene.title} />
        <p className={styles.erdStats}>
          <span><b>{tables.length}</b> {L(erdScene.tables)}</span>
          <span><b>{relations.length}</b> {L(erdScene.relations)}</span>
        </p>
      </div>
      {/* 테이블 목록 — 묶음별로. 고르면 탐색기가 그 테이블과 이웃만 크게 보여 준다 */}
      <nav className={styles.erdIndex} aria-label={L(erdScene.index)}>
        <Pressable className={styles.erdAll} data-on={!focus || undefined} onClick={() => setFocus(null)}>
          {L(erdScene.showAll)} <span>{tables.length}</span>
        </Pressable>
        {groups.map((g) => (
          <div key={g.label.en} className={styles.erdGroup}>
            <span className={styles.erdGroupName}>{L(g.label)}</span>
            <ul className={styles.erdList}>
              {g.tables.map((n) => (
                <li key={n}>
                  <Pressable
                    className={styles.erdItem}
                    data-on={focus === n || undefined}
                    aria-pressed={focus === n}
                    onClick={() => setFocus((f) => (f === n ? null : n))}
                  >
                    {/* 고른 테이블 — 길잡이 별이 이 자리에 앉는다 */}
                    <span className={styles.erdItemMark} data-guide={live && focus === n ? "" : undefined} data-guide-priority="1">
                      <StarMark className={styles.erdItemStar} />
                    </span>
                    {n}
                  </Pressable>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className={styles.erdBody}>
        <div className={styles.erdFrame} data-erd-sky>
          <ErdExplorer
            tables={tables}
            relations={relations}
            notes={erdDesignNotes}
            lang={language}
            wheelZoom={false}
            initialZoom={0.55}
            focus={focus}
            onFocusChange={setFocus}
            focusFit="table"
            notesOutside
          />
        </div>
        {/* 설계 메모 — 지도 안에서는 확대 배율을 따라 글자가 작아져서, 고른 테이블의 메모를 바깥에 보통 글자로 */}
        <aside className={styles.erdNotes} aria-live="polite">
          <span className={styles.erdGroupName}>
            {L(erdScene.notesFor)}
            {focus && <code className={styles.erdNotesTable}>{focus}</code>}
          </span>
          {!focus ? (
            <p className={styles.erdNotesEmpty}>{L(erdScene.notesPick)}</p>
          ) : shown ? (
            <>
              <article key={`${focus}-${shown.tag}`} className={styles.erdNote}>
                <h5 className={styles.erdNoteTitle}>{shown.title[language]}</h5>
                <code className={styles.erdNoteTag}>{shown.tag}</code>
                <p className={styles.erdNoteDesc}>{shown.description[language]}</p>
              </article>
              {focusNotes.length > 1 && (
                <div className={styles.erdNotePager}>
                  {focusNotes.map((n, i) => (
                    <Pressable
                      key={n.tag}
                      className={styles.erdNotePage}
                      data-on={i === noteIdx || undefined}
                      aria-pressed={i === noteIdx}
                      aria-label={n.title[language]}
                      onClick={() => setNotePick({ table: focus, i })}
                    >
                      {pad(i + 1)}
                    </Pressable>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className={styles.erdNotesEmpty}>{L(erdScene.notesEmpty)}</p>
          )}
        </aside>
      </div>
      <p className={styles.erdHint}>{L(erdScene.hint)}</p>
    </section>
  );
}

/* ── 5 · 설계 메모 — 결정 여섯이 필름 띠처럼 옆으로 늘어서 있고, 단계마다 카메라가 다음 장으로 옮겨 간다.
   지금 장은 크게(도식 · 큰 제목 · 문제 → 해결 · 근거), 옆 장은 작고 흐리게. 아래 번호 줄로 바로 고른다 ── */

export function SceneErdNotes() {
  const { keyNotes, erdScene } = useAboutText().architecture;
  const L = useL();
  const { step: noteIdx, setStep, current: live } = useFrameSteps(keyNotes.length);
  return (
    <section className={styles.notes}>
      <div className={styles.notesHead}>
        <span className={fx.sceneLabel}>{L(erdScene.notes)}</span>
        <h4 className={styles.notesTitle}>{L(erdScene.notesTitle)}</h4>
      </div>
      <div className={styles.spotView}>
        <ol className={styles.spotTrack} style={{ "--step": noteIdx } as React.CSSProperties}>
          {keyNotes.map((note, i) => (
            <li key={note.art} className={styles.spotStage} data-on={i === noteIdx || undefined} aria-hidden={i !== noteIdx || undefined}>
              <div className={styles.spotArt}>
                <NoteArt art={note.art} />
              </div>
              <div className={styles.spotText}>
                <span className={styles.spotNo} aria-hidden>{pad(i + 1)}</span>
                <h5 className={styles.spotHeadline}>{L(note.headline)}</h5>
                <p className={styles.spotCaption}>{L(note.caption)}</p>
                <dl className={styles.spotDl}>
                  <dt>{L(erdScene.problem)}</dt>
                  <dd>{L(note.problem)}</dd>
                  <dt>{L(erdScene.fix)}</dt>
                  <dd>{L(note.fix)}</dd>
                </dl>
                <code className={styles.spotProof}>{note.proof}</code>
              </div>
            </li>
          ))}
        </ol>
      </div>
      {/* 번호 줄 — 누르면 그 메모로. 지금 메모 자리에 길잡이 별이 앉는다 */}
      <ol className={styles.spotThumbs}>
        {keyNotes.map((n, i) => (
          <li key={n.art}>
            <Pressable className={styles.spotThumb} data-on={i === noteIdx || undefined} data-past={i < noteIdx || undefined} aria-pressed={i === noteIdx} onClick={() => setStep(i)}>
              <span className={styles.spotThumbNo}>{pad(i + 1)}</span>
              <span className={styles.spotThumbLabel}>{L(n.short)}</span>
              {live && i === noteIdx && <span className={styles.spotGuide} data-guide="" data-guide-priority="1" />}
            </Pressable>
          </li>
        ))}
      </ol>
    </section>
  );
}
