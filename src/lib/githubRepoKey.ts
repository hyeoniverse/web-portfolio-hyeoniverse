/* GitHub 저장소 고르기에서 화면과 서버가 같이 쓰는 값 — 고를 수 있는 개수와 설정에 적히는 저장소 키.
   githubShowcase.ts 는 서버 전용(비밀값 · DB · 서비스 로그)이라, 화면이 거기서 상수를 가져가면 그 코드가 브라우저 번들에 실린다 */

/**
 * 프로필의 Pinned 영역에 실제로 그려지는 개수.
 *
 * 화면(ProfileGithub)과 고르는 화면(ProfileGithubEditor)이 같은 값을 봐야 한다 —
 * 예전엔 화면에서만 잘라내서, 관리자에서 일곱 개째를 골라도 아무 말 없이 사라졌다.
 */
export const PINNED_REPO_LIMIT = 6;

/**
 * 설정에 적히는 저장소 키 — 개인 저장소는 이름만, 조직 저장소는 `owner/name`.
 *
 * 조직에는 개인 계정과 같은 이름의 저장소가 있을 수 있어 이름만으로는 가리키지 못한다.
 * 공개 화면·설정 화면·API 가 모두 이 함수를 부른다. 각자 적으면 한 곳만 고쳐도 키가 갈린다.
 */
export function repoKey(repo: { owner: string; name: string; fullName: string }, login: string): string {
  return repo.owner && login && repo.owner.toLowerCase() !== login.toLowerCase() ? repo.fullName : repo.name;
}
