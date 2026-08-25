/**
 * 댓글 작성자 자동 식별 — 이모지 프로필 + 관련 닉네임 생성
 * localStorage 기반 commenterId를 게시물 ID와 조합하여
 * 같은 사용자는 같은 게시물 내에서 동일한 identity를 가짐
 */

/* 아바타는 이모지 하나로 사람을 구분하므로 CREATURES 의 길이가 곧 "한 글에서 구분 가능한
   인원수" 다. 이전에는 24개 고정쌍을 hash % 24 로 골라, 한 글에 6명만 댓글을 달아도 생일 문제로
   약 49% 확률로 서로 다른 사람이 같은 아바타를 받았다. 확률을 낮추는 대신
   resolveIdentities() 가 글 단위로 중복 없이 배정한다 — 아래 함수 주석 참고. */
const CREATURES = [
  { emoji: "🐱", noun: "Cat" },
  { emoji: "🐶", noun: "Puppy" },
  { emoji: "🐰", noun: "Bunny" },
  { emoji: "🦊", noun: "Fox" },
  { emoji: "🐸", noun: "Frog" },
  { emoji: "🐼", noun: "Panda" },
  { emoji: "🦁", noun: "Lion" },
  { emoji: "🐧", noun: "Penguin" },
  { emoji: "🦄", noun: "Unicorn" },
  { emoji: "🐙", noun: "Octopus" },
  { emoji: "🦋", noun: "Butterfly" },
  { emoji: "🐢", noun: "Turtle" },
  { emoji: "🐝", noun: "Bee" },
  { emoji: "🦉", noun: "Owl" },
  { emoji: "🐳", noun: "Whale" },
  { emoji: "🦜", noun: "Parrot" },
  { emoji: "🐨", noun: "Koala" },
  { emoji: "🦈", noun: "Shark" },
  { emoji: "🐿️", noun: "Squirrel" },
  { emoji: "🦩", noun: "Flamingo" },
  { emoji: "🐺", noun: "Wolf" },
  { emoji: "🦎", noun: "Gecko" },
  { emoji: "🐡", noun: "Pufferfish" },
  { emoji: "🦥", noun: "Sloth" },
  { emoji: "🐮", noun: "Cow" },
  { emoji: "🐷", noun: "Pig" },
  { emoji: "🐵", noun: "Monkey" },
  { emoji: "🐻", noun: "Bear" },
  { emoji: "🐭", noun: "Mouse" },
  { emoji: "🦔", noun: "Hedgehog" },
  { emoji: "🦇", noun: "Bat" },
  { emoji: "🦆", noun: "Duck" },
  { emoji: "🦢", noun: "Swan" },
  { emoji: "🐬", noun: "Dolphin" },
  { emoji: "🦭", noun: "Seal" },
  { emoji: "🦕", noun: "Dino" },
  { emoji: "🦀", noun: "Crab" },
  { emoji: "🐌", noun: "Snail" },
  { emoji: "🦌", noun: "Deer" },
  { emoji: "🐘", noun: "Elephant" },
] as const;

/* 형용사는 이모지와 독립적으로 고른다. 아바타(이모지)가 같아지는 상황은 resolveIdentities 가
   막지만, 이름까지 같아지면 스레드에서 두 사람을 글로도 구분할 수 없다. */
const ADJECTIVES = [
  "Curious", "Brave", "Gentle", "Clever", "Chill", "Lazy", "Bold", "Cool",
  "Dreamy", "Wise", "Free", "Patient", "Busy", "Night", "Deep", "Chatty",
  "Sleepy", "Swift", "Quick", "Elegant", "Lone", "Sneaky", "Puffy", "Mellow",
] as const;

export interface CommenterIdentity {
  emoji: string;
  name: string;
}

/** hash 숫자 → 선호 슬롯. 이모지와 형용사가 같은 나머지 연산을 공유하지 않도록 자리수를 나눈다. */
function slotsOf(hashNum: number): { creature: number; adjective: number } {
  return {
    creature: hashNum % CREATURES.length,
    adjective: Math.floor(hashNum / CREATURES.length) % ADJECTIVES.length,
  };
}

function identityAt(creature: number, adjective: number): CommenterIdentity {
  const c = CREATURES[creature];
  return { emoji: c.emoji, name: `${ADJECTIVES[adjective]} ${c.noun}` };
}

/* commenter_hash 가 없거나 해석 불가한 댓글의 아바타 — admin 댓글이 여기 해당한다
   (admin insert 는 commenter_hash 를 안 남긴다). CommentItem 의 렌더와 CommentForm 의
   거터가 이 값을 공유해야 한다: 폼 거터는 "등록하면 이렇게 보인다" 의 미리보기라
   실제로 그려질 아바타와 달라지면 안 된다. */
export const FALLBACK_AVATAR_EMOJI = "👤";

const STORAGE_KEY = "oval_commenter_id";

/** 브라우저에 저장된 commenterId를 가져오거나 새로 생성 */
export function getCommenterId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

/** 간단한 해시 — commenterId + targetId 조합 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash);
}

/** commenterId + targetId → deterministic identity.
 *  hash 계산은 절대 바꾸지 말 것 — 이미 저장된 댓글의 commenter_hash 와 대조된다. */
export function getIdentity(commenterId: string, targetId: string): CommenterIdentity & {
  hash: string;
} {
  const combined = `${commenterId}:${targetId}`;
  const hashNum = simpleHash(combined);
  const { creature, adjective } = slotsOf(hashNum);
  // hash for server-side verification
  return { ...identityAt(creature, adjective), hash: hashNum.toString(36) };
}

/** 랜덤 identity 반환 (현재 identity 제외) */
export function getRandomIdentity(exclude?: CommenterIdentity): CommenterIdentity {
  const pool = exclude
    ? CREATURES.filter((c) => c.emoji !== exclude.emoji)
    : [...CREATURES];
  const c = pool[Math.floor(Math.random() * pool.length)];
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  return { emoji: c.emoji, name: `${a} ${c.noun}` };
}

/** commenter_hash → identity. 단독 복원이라 중복 회피가 없다 —
 *  같은 글의 다른 댓글을 함께 볼 수 있는 자리에서는 resolveIdentities 를 쓴다. */
export function identityFromHash(commenterHash: string): CommenterIdentity {
  const hashNum = parseInt(commenterHash, 36);
  if (isNaN(hashNum)) return { emoji: FALLBACK_AVATAR_EMOJI, name: "Anonymous" };
  const { creature, adjective } = slotsOf(hashNum);
  return identityAt(creature, adjective);
}

/**
 * 한 글 안의 commenter_hash 들에 아바타를 중복 없이 배정한다.
 *
 * hash 를 그대로 `% CREATURES.length` 하면 서로 다른 사람이 같은 이모지를 받는 일이
 * 생일 문제만큼 자주 일어난다(24칸 기준 6명에 약 49%). 그래서 선호 슬롯이 이미 찼으면
 * 다음 빈 슬롯으로 밀어(선형 탐사) 배정한다. 인원이 CREATURES 보다 많아지면 그때부터만
 * 중복이 생긴다.
 *
 * `orderedHashes` 는 **작성 시각 오름차순**이어야 한다. 먼저 온 사람이 슬롯을 먼저 잡으므로,
 * 나중에 새 사람이 댓글을 달아도 기존 사람들의 아바타는 그대로 유지된다. 정렬 순서(최신순 등)로
 * 넘기면 새 댓글 하나에 기존 아바타가 전부 흔들린다.
 */
export function resolveIdentities(
  orderedHashes: readonly (string | null | undefined)[],
): Map<string, CommenterIdentity> {
  const out = new Map<string, CommenterIdentity>();
  const taken = new Set<number>();

  for (const hash of orderedHashes) {
    if (!hash || out.has(hash)) continue;
    const hashNum = parseInt(hash, 36);
    if (isNaN(hashNum)) continue;

    const { creature, adjective } = slotsOf(hashNum);
    let slot = creature;
    // 풀이 다 차면 그대로 선호 슬롯을 쓴다(중복 허용) — 무한 루프가 되지 않도록 횟수를 제한
    for (let step = 0; step < CREATURES.length && taken.has(slot); step++) {
      slot = (slot + 1) % CREATURES.length;
    }
    taken.add(slot);
    out.set(hash, identityAt(slot, adjective));
  }
  return out;
}
