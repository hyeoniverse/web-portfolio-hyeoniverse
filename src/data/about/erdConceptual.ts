/* 개념 ERD (Chen 표기) — 엔티티 사각형 / 속성 타원 / 관계 마름모.
 *
 * 스키마 다이어그램(물리 모델)은 테이블 23개 · 컬럼 177개를 그대로 보여주는데,
 * 그걸 Chen 표기로 옮기면 도형이 216개가 되어 읽을 수 있는 그림이 아니다.
 * 개념 모델은 "무엇이 무엇과 어떤 관계인가"만 말하면 되므로,
 * 관계 차수가 높은 핵심 엔티티와 대표 속성만 추린다.
 *
 * 엔티티·관계는 실제 스키마(erd.ts)에서 끌어온다 — 손으로 복제하면 스키마가 바뀔 때 조용히 어긋난다.
 * 여기서 고르는 건 "무엇을 보여줄지"(부분집합과 대표 속성)뿐이다. */

import { erdTables, erdRelations } from "./erd";
import type { LocalizedText } from "@/types/common";
import type { ErdTable, ErdRelation } from "./types";

/* 개념 모델에 올릴 엔티티는 고르지 않고 관계에서 도출한다 —
   손으로 목록을 유지하면 새 테이블에 관계가 생겨도 개념 ERD 에는 안 나타난다.
   실제로 revisions·post_views·comment_reactions 가 그렇게 빠져 있었고,
   그 바람에 스키마 관계 16개 중 9개가 개념에서 사라졌다.
   조인 테이블은 엔티티가 아니라 M:N 마름모로 접히므로 제외한다. */
function coreEntities(tables: ErdTable[], relations: ErdRelation[]): string[] {
  const known = new Set(tables.map((t) => t.name));
  const linked = new Set<string>();
  relations.forEach((r) => {
    if (known.has(r.from)) linked.add(r.from);
    if (known.has(r.to)) linked.add(r.to);
  });
  return tables
    .map((t) => t.name)
    .filter((n) => linked.has(n) && !(n in JUNCTIONS));
}

/** 엔티티별 대표 속성 — 전부 올리면 posts 하나로 타원 27개가 된다.
 *  다중값(배열)·파생(카운트 캐시) 속성을 일부러 섞어 Chen 표기의 표현력을 보여준다. */
const SHOWN_ATTRS: Record<string, string[]> = {
  /* 컬럼명은 스키마 그대로 — posts/series 의 제목은 "title / title_en" 처럼 묶여 있다 */
  posts: ["id", "title / title_en", "slug", "tags", "like_count"],
  works: ["id", "title", "year", "tech"],
  series: ["id", "title / title_en"],
  comments: ["id", "nickname", "content", "like_count"],
  work_comments: ["id", "nickname", "content"],
  likes: ["id", "target_type"],
  revisions: ["id", "entity_type", "snapshot"],
  post_views: ["id", "ip", "date_kst"],
  comment_reactions: ["id", "emoji"],
};

/** 지정이 없는 엔티티의 기본 속성 — PK + FK 아닌 앞쪽 컬럼 2개 */
function fallbackAttrs(t: ErdTable): string[] {
  const pk = t.columns.filter((c) => c.pk).map((c) => c.name);
  const rest = t.columns
    .filter((c) => !c.pk && !c.fk && !/_at$/.test(c.name))
    .slice(0, 2)
    .map((c) => c.name);
  return [...pk, ...rest];
}

/** 조인 테이블 — 개념 모델에서는 엔티티가 아니라 M:N 관계다.
 *  물리 스키마에는 테이블로 존재하지만, "무엇과 무엇이 어떤 관계인가"만 보는 개념 모델에서는
 *  다이아몬드 하나로 접힌다. 스키마 뷰가 표현할 수 없는 정보다. */
const JUNCTIONS: Record<string, { a: string; b: string; ko: string; en: string }> = {
  post_work_relations: { a: "posts", b: "works", ko: "연관", en: "relates to" },
  series_work_relations: { a: "series", b: "works", ko: "묶음", en: "groups" },
};

/** 자기참조 관계 — 대댓글처럼 같은 엔티티끼리 맺는 재귀 관계 */
const RECURSIVE_VERB: Record<string, LocalizedText> = {
  comments: { ko: "답글", en: "replies to" },
  work_comments: { ko: "답글", en: "replies to" },
};

/* 타원에 넣을 짧은 이름 — "title / title_en" 은 타원을 넘친다 */
const ATTR_SHORT: Record<string, string> = {
  "title / title_en": "title",
  "content / content_en": "content",
};

/** 관계 이름 — FK 컬럼명만으로는 "무슨 관계인지"가 안 읽힌다 */
const REL_VERB: Record<string, LocalizedText> = {
  "posts→series": { ko: "속함", en: "belongs to" },
  "comments→posts": { ko: "달림", en: "on" },
  "work_comments→works": { ko: "달림", en: "on" },
  "likes→posts": { ko: "좋아요", en: "likes" },
  "likes→works": { ko: "좋아요", en: "likes" },
  "likes→comments": { ko: "좋아요", en: "likes" },
  "likes→work_comments": { ko: "좋아요", en: "likes" },
  "revisions→posts": { ko: "이력", en: "revision of" },
  "revisions→works": { ko: "이력", en: "revision of" },
  "post_views→posts": { ko: "조회", en: "viewed" },
  "comment_reactions→comments": { ko: "반응", en: "reacts to" },
  "comment_reactions→work_comments": { ko: "반응", en: "reacts to" },
};

interface ChenAttribute {
  name: string;
  /** 기본키 — Chen 표기에서 밑줄로 구분한다 */
  key: boolean;
  /** simple=타원 / multi=이중 타원(다중값) / derived=점선 타원(파생) */
  kind: "simple" | "multi" | "derived";
}
interface ChenEntity {
  name: string;
  attributes: ChenAttribute[];
}
interface ChenRelationship {
  id: string;
  from: string;
  to: string;
  label: LocalizedText;
  /** from 쪽 · to 쪽 다중도 */
  fromCard: string;
  toCard: string;
  /** 자기참조 — 한 엔티티에 두 다리가 모두 붙는다 */
  recursive?: boolean;
}

interface ChenModel {
  entities: ChenEntity[];
  relationships: ChenRelationship[];
}

/** 실제 스키마에서 개념 모델을 뽑는다 */
/** 좁혀 볼 때 펼치는 속성 상한 — 전부 펼치면(posts 27개) 부채꼴에 안 들어가고 서로 겹친다.
 *  PK → 다중값/파생(Chen 표기에서 의미가 있는 것) → 나머지 순으로 채운다. */
const FOCUS_ATTR_MAX = 12;

export function buildChenModel(
  tables: ErdTable[] = erdTables,
  relations = erdRelations,
  /** 좁혀 볼 엔티티 — 이것과 직접 연결된 것만 남기고, 이 엔티티의 속성을 더 펼친다 */
  focus?: string | null,
): ChenModel {
  const byName = new Map(tables.map((t) => [t.name, t]));
  const core = coreEntities(tables, relations);
  const coreSet = new Set<string>(core);

  const entities: ChenEntity[] = core.map((name) => {
    const t = byName.get(name)!;
    const wanted = SHOWN_ATTRS[name] ?? fallbackAttrs(t);
    /* 지정한 속성 중 실제 컬럼에 있는 것만 — 스키마에서 컬럼이 빠지면 조용히 사라진다 */
    const attributes = wanted
      .map((a) => t.columns.find((c) => c.name === a))
      .filter((c): c is NonNullable<typeof c> => c != null)
      .map((c) => ({
        name: ATTR_SHORT[c.name] ?? c.name,
        key: !!c.pk,
        /* 배열 타입 = 다중값, 카운트 캐시 = 파생 (원본에서 세면 나오는 값) */
        kind: /\[\]$/.test(c.type.trim()) ? "multi" as const
          : /_count$/.test(c.name) ? "derived" as const
          : "simple" as const,
      }));
    return { name, attributes };
  });

  const relationships: ChenRelationship[] = relations
    .filter((r) => coreSet.has(r.from) && coreSet.has(r.to) && r.from !== r.to)
    .map((r) => {
      const k = `${r.from}→${r.to}`;
      /* 스키마의 N:1 — FK 를 가진 쪽이 N */
      const [fromCard, toCard] = (r.label ?? "N:1").split(":");
      return {
        id: `${k}:${r.fromField}`,
        from: r.from,
        to: r.to,
        label: REL_VERB[k] ?? { ko: r.fromField, en: r.fromField },
        fromCard: fromCard ?? "N",
        toCard: toCard ?? "1",
      };
    });

  /* 조인 테이블 → M:N 관계 하나로 접는다 */
  Object.entries(JUNCTIONS).forEach(([junction, j]) => {
    if (!byName.has(junction) || !coreSet.has(j.a) || !coreSet.has(j.b)) return;
    relationships.push({
      id: `mn:${junction}`,
      from: j.a, to: j.b,
      label: { ko: j.ko, en: j.en },
      fromCard: "N", toCard: "M",
    });
  });

  /* 자기참조 — 같은 엔티티를 가리키는 FK */
  core.forEach((name) => {
    const t = byName.get(name)!;
    const self = t.columns.find((c) => c.fk?.startsWith(`${name}.`));
    if (!self) return;
    const verb = RECURSIVE_VERB[name];
    if (!verb) return;
    relationships.push({
      id: `self:${name}`,
      from: name, to: name,
      label: verb,
      fromCard: "N", toCard: "1",
      recursive: true,
    });
  });

  /* ── 좁혀 보기 ─────────────────────────────────────────
     클릭한 엔티티와 직접 연결된 것만 남기고 나머지는 그림에서 뺀다(흐리게가 아니라 제거).
     자리가 비는 만큼 그 엔티티의 속성을 더 펼쳐서 "간단 요약 → 상세" 로 이어지게 한다. */
  if (focus && entities.some((e) => e.name === focus)) {
    const keep = new Set<string>([focus]);
    relationships.forEach((r) => {
      if (r.from === focus) keep.add(r.to);
      if (r.to === focus) keep.add(r.from);
    });

    const t = byName.get(focus);
    const expanded = t
      ? (() => {
          const kindOf = (c: ErdTable["columns"][number]) =>
            /\[\]$/.test(c.type.trim()) ? "multi" as const
              : /_count$/.test(c.name) ? "derived" as const
              : "simple" as const;
          /* PK → 다중값·파생 → 나머지. 상한을 넘으면 뒤쪽(평범한 컬럼)부터 잘린다. */
          const score = (c: ErdTable["columns"][number]) =>
            c.pk ? 0 : kindOf(c) !== "simple" ? 1 : 2;
          return [...t.columns]
            .map((c, i) => ({ c, i }))
            .sort((a, b) => score(a.c) - score(b.c) || a.i - b.i)
            .slice(0, FOCUS_ATTR_MAX)
            .sort((a, b) => a.i - b.i)
            .map(({ c }) => ({ name: ATTR_SHORT[c.name] ?? c.name, key: !!c.pk, kind: kindOf(c) }));
        })()
      : null;

    return {
      entities: entities
        .filter((e) => keep.has(e.name))
        .map((e) => (e.name === focus && expanded ? { ...e, attributes: expanded } : e)),
      relationships: relationships.filter((r) => keep.has(r.from) && keep.has(r.to)),
    };
  }

  return { entities, relationships };
}

/* ── 배치 ──────────────────────────────────────────────
   관계가 전부 N:1 이라 "참조되는 쪽이 위" 로 놓으면 방향이 한쪽으로 흐르는 계층이 나온다.
   (likes → comments/work_comments → posts/works → series)

   처음엔 엔티티를 원형 궤도에 놓았는데, likes 하나가 네 엔티티를 참조하다 보니
   현(chord)이 전부 중앙을 가로질러 선이 엉켰다. 층으로 쌓으면 교차가 거의 사라진다. */

const CHEN_W = 1720;
const CHEN_H = 1420 + 2 * (150 + 23);   /* = 1420 + 2*(ATTR_RADIUS_V + ATTR_RY) */

export const ENTITY_W = 168;
export const ENTITY_H = 52;
export const ATTR_RX = 58;
export const ATTR_RY = 23;
export const DIAMOND_R = 58;

/* 속성 부채꼴 — 엔티티 바깥쪽으로 호를 그리며 퍼진다.
   세로로 쌓으면 위아래 행과 부딪히고 선도 평행하게 겹쳐 보인다. */
const ATTR_RADIUS = 208;
/* 세로로 펴는 행(맨 위/아래)은 반경을 줄인다 — 그대로 두면 캔버스가 세로로만 길어져
   전체 보기 배율이 뭉개진다. */
const ATTR_RADIUS_V = 150;
const ATTR_SPREAD = (70 * Math.PI) / 180;

/* 맨 위/아래 행은 속성이 세로로 펴지므로 그 반경만큼 여백이 더 필요하다 */
const MARGIN_Y = 170 + ATTR_RADIUS_V + ATTR_RY;

interface ChenPlacement {
  entities: Record<string, { x: number; y: number }>;
  attributes: Record<string, { x: number; y: number }[]>;
  relationships: Record<string, { x: number; y: number }>;
}

export function layoutChen(model: ChenModel): ChenPlacement {
  const names = model.entities.map((e) => e.name);

  /* 최장 경로 계층 — 참조되는 쪽(to)이 참조하는 쪽(from)보다 항상 위 */
  const layer = new Map<string, number>(names.map((n) => [n, 0]));
  for (let pass = 0; pass < names.length; pass++) {
    let moved = false;
    for (const r of model.relationships) {
      /* 층은 소유 방향(N:1)만으로 정한다 — M:N·자기참조는 위아래가 없다 */
      if (r.recursive || r.toCard === "M") continue;
      const want = (layer.get(r.from) ?? 0) + 1;
      if (want > (layer.get(r.to) ?? 0)) { layer.set(r.to, want); moved = true; }
    }
    if (!moved) break;   // 수렴 — 순환이 있어도 names.length 번에서 멈춘다
  }

  const maxLayer = Math.max(0, ...layer.values());
  const rows: string[][] = Array.from({ length: maxLayer + 1 }, () => []);
  names.forEach((n) => rows[layer.get(n) ?? 0].push(n));

  const layerGap = (CHEN_H - MARGIN_Y * 2) / Math.max(1, maxLayer);
  const entities: ChenPlacement["entities"] = {};
  rows.forEach((row, l) => {
    /* 위쪽이 참조되는 쪽 — maxLayer 가 맨 위로 */
    const y = MARGIN_Y + (maxLayer - l) * layerGap;
    row.forEach((name, i) => {
      const slot = (i + 1) / (row.length + 1);
      entities[name] = { x: CHEN_W * slot, y };
    });
  });

  /* 속성 부채꼴의 방향.
     보통은 캔버스 바깥쪽(좌/우)으로 펴지만, 행에 혼자 있는 엔티티는 좌우가 곧 관계선이 지나는
     길이라 마름모와 부딪힌다 — 맨 윗행은 위로, 맨 아랫행은 아래로 편다. */
  const baseAngle = new Map<string, number>();
  rows.forEach((row, l) => {
    row.forEach((name) => {
      if (row.length === 1 && l === maxLayer) { baseAngle.set(name, -Math.PI / 2); return; }
      if (row.length === 1 && l === 0) { baseAngle.set(name, Math.PI / 2); return; }
      baseAngle.set(name, entities[name].x < CHEN_W / 2 ? Math.PI : 0);
    });
  });

  const attributes: ChenPlacement["attributes"] = {};
  model.entities.forEach((e) => {
    const p = entities[e.name];
    const base = baseAngle.get(e.name) ?? (p.x < CHEN_W / 2 ? Math.PI : 0);
    const dir = base === Math.PI ? -1 : 1;
    const count = e.attributes.length;
    /* 속성 수에 맞춰 부채꼴을 넓힌다 — 좁혀 보기에서 속성이 펼쳐지면 기본 70° 에는 다 못 들어간다.
       그래도 모자라면 반경을 번갈아 두 겹으로 나눠 이웃끼리 겹치지 않게 한다. */
    const rings = count > 7 ? 2 : 1;
    const perRing = Math.ceil(count / rings);
    const spread = Math.min(ATTR_SPREAD * Math.max(1, perRing / 3), Math.PI * 1.05);
    const vertical = Math.abs(Math.cos(base)) < 0.5;
    const baseRad = vertical ? ATTR_RADIUS_V : ATTR_RADIUS;
    attributes[e.name] = e.attributes.map((_, j) => {
      const ring = j % rings;
      const idx = Math.floor(j / rings);
      const t = perRing === 1 ? 0 : idx / (perRing - 1) - 0.5;
      const a = base + t * spread * dir;
      const rad = baseRad + ring * (ATTR_RY * 2 + 30);
      return {
        x: p.x + Math.cos(a) * rad,
        y: p.y + Math.sin(a) * rad,
      };
    });
  });

  /* 관계 마름모 — 두 엔티티 사이 중점 */
  /* 엔티티 행의 y 목록 → 그 사이 빈 구간의 중심들 */
  const rowYs = [...new Set(Object.values(entities).map((p) => p.y))].sort((x, y) => x - y);
  const gaps = rowYs.slice(0, -1).map((y, i) => (y + rowYs[i + 1]) / 2);
  const snapToGap = (y: number) => {
    if (gaps.length === 0) return y;
    return gaps.reduce((best, g) => (Math.abs(g - y) < Math.abs(best - y) ? g : best), gaps[0]);
  };

  const relationships: ChenPlacement["relationships"] = {};
  const seenAt = new Map<string, number>();
  model.relationships.forEach((r) => {
    const a = entities[r.from];
    const b = entities[r.to];
    if (!a || !b) return;
    if (r.recursive) {
      /* 자기참조는 중점이 자기 자신이라 따로 자리를 잡아야 한다.
         속성이 바깥쪽 가로로 뻗으므로, 그 끝보다 더 바깥에 같은 높이로 둔다.
         (위쪽 대각으로 빼봤더니 위 행 엔티티의 속성과 부딪혔다) */
      const dir = a.x < CHEN_W / 2 ? -1 : 1;
      relationships[r.id] = { x: a.x + dir * (ATTR_RADIUS + ATTR_RX + DIAMOND_R + 30), y: a.y };
      return;
    }
    const mx = (a.x + b.x) / 2;
    /* 중점 y 가 엔티티 행 위에 그대로 떨어지면 그 행 엔티티·속성과 부딪힌다
       (likes→posts 의 중점이 comments 행이었다). 행 사이 빈 구간으로 스냅한다. */
    const my = snapToGap((a.y + b.y) / 2);
    /* 같은 지점에 겹치면 가로로 비껴 놓는다 */
    const k = `${Math.round(mx / 40)}|${Math.round(my / 40)}`;
    const n = seenAt.get(k) ?? 0;
    seenAt.set(k, n + 1);
    relationships[r.id] = { x: mx + n * 70, y: my };
  });

  /* 마름모 충돌 해소 —
     두 층 이상 건너뛰는 관계는 중점이 중간 층 엔티티 자리에 그대로 떨어진다
     (likes→posts 의 중점이 comments 위였다).
     엔티티·속성은 고정하고 마름모만 밀어낸다. 결정적으로 수렴한다. */
  const fixed: { x: number; y: number; rx: number; ry: number }[] = [
    ...Object.values(entities).map((p) => ({ ...p, rx: ENTITY_W / 2 + 14, ry: ENTITY_H / 2 + 14 })),
    ...Object.values(attributes).flat().map((p) => ({ ...p, rx: ATTR_RX + 10, ry: ATTR_RY + 10 })),
  ];
  const diamondIds = Object.keys(relationships);
  for (let pass = 0; pass < 300; pass++) {
    /* 한 패스의 밀어내기를 모아 한 번에 적용한다 —
       순차로 적용하면 A 를 피하다 B 로 들어가는 진동이 남는다. */
    const push: Record<string, { x: number; y: number }> = {};
    let hit = false;

    for (const id of diamondIds) {
      const d = relationships[id];
      let px = 0, py = 0;
      const others = [
        ...fixed,
        ...diamondIds.filter((o) => o !== id)
          .map((o) => ({ ...relationships[o], rx: DIAMOND_R + 10, ry: 47 })),
      ];
      for (const o of others) {
        const dx = d.x - o.x;
        const dy = d.y - o.y;
        const ox = DIAMOND_R + o.rx - Math.abs(dx);
        const oy = 37 + o.ry - Math.abs(dy);
        if (ox <= 0 || oy <= 0) continue;
        hit = true;
        /* 덜 밀어도 되는 축으로 */
        if (ox < oy) px += (dx >= 0 ? 1 : -1) * ox;
        else py += (dy >= 0 ? 1 : -1) * oy;
      }
      if (px || py) push[id] = { x: px, y: py };
    }

    if (!hit) break;
    for (const [id, p] of Object.entries(push)) {
      relationships[id].x += p.x * 0.45;
      relationships[id].y += p.y * 0.45;
    }
  }

  return { entities, attributes, relationships };
}

/* ── 스키마 위에 얹을 개념 정보 ──────────────────────────
   나란히 두면 두 그림이 그냥 붙어 있을 뿐이라 서로를 가리키지 못한다.
   개념을 실제 테이블 위에 주석처럼 얹으면 조인 테이블이 두 모양으로 중복되지도 않는다 —
   그 테이블 자체가 관계라는 걸 그 자리에서 말한다. */

export interface ErdConceptOverlay {
  /** 관계선 위에 올릴 동사 + 다중도. key = `${from}→${to}:${fromField}` */
  verbs: Record<string, { label: LocalizedText; card: string }>;
  /** 조인 테이블 = 개념상 M:N 관계 */
  junctions: Record<string, { a: string; b: string; label: LocalizedText }>;
  /** 컬럼 표기 — multi(배열) / derived(카운트 캐시) */
  columnKind: Record<string, "multi" | "derived">;
}

export function buildConceptOverlay(
  tables: ErdTable[],
  relations: ErdRelation[],
): ErdConceptOverlay {
  const verbs: ErdConceptOverlay["verbs"] = {};
  relations.forEach((r) => {
    const k = `${r.from}→${r.to}`;
    /* 동사가 정의된 관계만 — 없으면 FK 컬럼명이 라벨로 붙는데,
       그건 이미 관계선이 꽂힌 행에 그대로 쓰여 있어 같은 말을 두 번 하는 꼴이다. */
    const verb = REL_VERB[k];
    if (!verb) return;
    verbs[`${k}:${r.fromField}`] = { label: verb, card: r.label ?? "N:1" };
  });

  const junctions: ErdConceptOverlay["junctions"] = {};
  Object.entries(JUNCTIONS).forEach(([name, j]) => {
    if (tables.some((t) => t.name === name)) {
      junctions[name] = { a: j.a, b: j.b, label: { ko: j.ko, en: j.en } };
    }
  });

  const columnKind: ErdConceptOverlay["columnKind"] = {};
  tables.forEach((t) => {
    t.columns.forEach((c) => {
      if (/\[\]$/.test(c.type.trim())) columnKind[`${t.name}.${c.name}`] = "multi";
      else if (/_count$/.test(c.name)) columnKind[`${t.name}.${c.name}`] = "derived";
    });
  });

  return { verbs, junctions, columnKind };
}
