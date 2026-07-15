/**
 * 댓글 작성자 자동 식별 — 이모지 프로필 + 관련 닉네임 생성
 * localStorage 기반 commenterId를 게시물 ID와 조합하여
 * 같은 사용자는 같은 게시물 내에서 동일한 identity를 가짐
 */

const IDENTITIES = [
  { emoji: "🐱", name: "Curious Cat" },
  { emoji: "🐶", name: "Brave Puppy" },
  { emoji: "🐰", name: "Gentle Bunny" },
  { emoji: "🦊", name: "Clever Fox" },
  { emoji: "🐸", name: "Chill Frog" },
  { emoji: "🐼", name: "Lazy Panda" },
  { emoji: "🦁", name: "Bold Lion" },
  { emoji: "🐧", name: "Cool Penguin" },
  { emoji: "🦄", name: "Dreamy Unicorn" },
  { emoji: "🐙", name: "Wise Octopus" },
  { emoji: "🦋", name: "Free Butterfly" },
  { emoji: "🐢", name: "Patient Turtle" },
  { emoji: "🐝", name: "Busy Bee" },
  { emoji: "🦉", name: "Night Owl" },
  { emoji: "🐳", name: "Deep Whale" },
  { emoji: "🦜", name: "Chatty Parrot" },
  { emoji: "🐨", name: "Sleepy Koala" },
  { emoji: "🦈", name: "Swift Shark" },
  { emoji: "🐿️", name: "Quick Squirrel" },
  { emoji: "🦩", name: "Elegant Flamingo" },
  { emoji: "🐺", name: "Lone Wolf" },
  { emoji: "🦎", name: "Sneaky Gecko" },
  { emoji: "🐡", name: "Puffy Fish" },
  { emoji: "🦥", name: "Mellow Sloth" },
] as const;

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

/** commenterId + targetId → deterministic identity */
export function getIdentity(commenterId: string, targetId: string): {
  emoji: string;
  name: string;
  hash: string;
} {
  const combined = `${commenterId}:${targetId}`;
  const hashNum = simpleHash(combined);
  const identity = IDENTITIES[hashNum % IDENTITIES.length];
  // hash for server-side verification
  const hashStr = hashNum.toString(36);
  return { emoji: identity.emoji, name: identity.name, hash: hashStr };
}

/** 랜덤 identity 반환 (현재 identity 제외) */
export function getRandomIdentity(exclude?: { emoji: string; name: string }): {
  emoji: string;
  name: string;
} {
  const candidates = exclude
    ? IDENTITIES.filter((i) => i.emoji !== exclude.emoji)
    : [...IDENTITIES];
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/** commenter_hash → identity (서버에서 저장된 hash로 identity 복원) */
export function identityFromHash(commenterHash: string): {
  emoji: string;
  name: string;
} {
  const hashNum = parseInt(commenterHash, 36);
  if (isNaN(hashNum)) return { emoji: FALLBACK_AVATAR_EMOJI, name: "Anonymous" };
  const identity = IDENTITIES[hashNum % IDENTITIES.length];
  return { emoji: identity.emoji, name: identity.name };
}
