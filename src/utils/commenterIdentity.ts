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

/** commenter_hash → identity (서버에서 저장된 hash로 identity 복원) */
export function identityFromHash(commenterHash: string): {
  emoji: string;
  name: string;
} {
  const hashNum = parseInt(commenterHash, 36);
  if (isNaN(hashNum)) return { emoji: "👤", name: "Anonymous" };
  const identity = IDENTITIES[hashNum % IDENTITIES.length];
  return { emoji: identity.emoji, name: identity.name };
}
