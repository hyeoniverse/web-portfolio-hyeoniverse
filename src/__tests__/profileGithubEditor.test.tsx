import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, fireEvent, waitFor } from "@testing-library/react";
import ProfileGithubEditor from "@/app/admin/(dashboard)/settings/_components/ProfileGithubEditor";
import type { GithubRepoCard } from "@/lib/githubShowcase";
import type { ProfileData } from "@/types/profile";

/* 프로필 GitHub 설정의 저장소 고르기(#1057). 조직 저장소가 개인 저장소 사이에 파묻히지 않게
   소유 계정별로 나눠 보여주고, 고를 때 적히는 키가 조직은 owner/name 이어야 한다. */

const repo = (name: string, owner = "me"): GithubRepoCard => ({
  name, owner, fullName: `${owner}/${name}`,
  url: `https://github.com/${owner}/${name}`, description: "",
  language: "TypeScript", stars: 0, forks: 0, topics: [],
  pushedAt: "2026-01-01T00:00:00Z", defaultBranch: "main",
});

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => ({
    ok: true,
    json: async () => ({ login: "me", repos: [repo("alpha"), repo("PurrFectDay.", "PurrFectDay")] }),
  })));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const styles = { sectionSubTitle: "s", fieldHint: "h", fieldLabel: "l" };
/* 이 화면이 보는 건 github 뿐이라 나머지 칸은 비워 둔다 */
const emptyProfile = {} as ProfileData;

describe("ProfileGithubEditor", () => {
  it("조직 저장소도 같은 목록에 오고, 소속은 이름으로 밝힌다", async () => {
    const { findByText, getAllByText, getByText } = render(
      <ProfileGithubEditor data={emptyProfile} setData={() => {}} styles={styles} />,
    );
    await findByText("alpha");
    expect(getByText("PurrFectDay.")).toBeTruthy();
    // 조직 이름은 계정 칩과 줄의 소속 표시 두 곳에 나온다
    expect(getAllByText("PurrFectDay").length).toBeGreaterThan(1);
  });

  /* 홈 설정과 같은 목록 컴포넌트를 쓴다(#1061) — 전에는 두 화면의 묶음·검색창 자리가 달랐다 */
  it("계정 칩으로 내 저장소와 조직을 갈라 본다", async () => {
    const { findByText, getByText } = render(
      <ProfileGithubEditor data={emptyProfile} setData={() => {}} styles={styles} />,
    );
    await findByText("alpha");
    expect(getByText("전체")).toBeTruthy();
    expect(getByText("내 저장소")).toBeTruthy();
  });

  it("고른 저장소는 손잡이로 끌어 순서를 바꿀 수 있다", async () => {
    const withPicks = { github: { repos: ["alpha", "beta"] } } as ProfileData;
    const { findAllByLabelText } = render(
      <ProfileGithubEditor data={withPicks} setData={() => {}} styles={styles} />,
    );
    // 고른 줄마다 끌기 손잡이가 하나씩 — 전에는 아이콘만 있고 끌기가 붙어 있지 않았다
    expect(await findAllByLabelText("끌어서 순서 바꾸기")).toHaveLength(2);
  });

  it("조직 저장소를 고르면 owner/name 으로 적힌다", async () => {
    const setData = vi.fn();
    const { findByText } = render(
      <ProfileGithubEditor data={emptyProfile} setData={setData} styles={styles} />,
    );
    fireEvent.click(await findByText("PurrFectDay."));
    await waitFor(() => expect(setData).toHaveBeenCalled());
    const updater = setData.mock.calls.at(-1)![0] as (d: object) => { github?: { repos?: string[] } };
    expect(updater({}).github?.repos).toEqual(["PurrFectDay/PurrFectDay."]);
  });
});
