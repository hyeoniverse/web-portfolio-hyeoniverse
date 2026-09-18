import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, fireEvent, waitFor } from "@testing-library/react";
import ProfileGithubEditor from "@/app/admin/(dashboard)/settings/_components/ProfileGithubEditor";
import type { GithubRepoCard } from "@/lib/githubShowcase";

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

describe("ProfileGithubEditor", () => {
  it("조직 저장소는 조직 이름 아래 따로 묶인다", async () => {
    const { findByText, getByText } = render(
      <ProfileGithubEditor data={{}} setData={() => {}} styles={styles} />,
    );
    await findByText("alpha");
    expect(getByText("PurrFectDay.")).toBeTruthy();
    // 조직 묶음 머리글
    expect(getByText("PurrFectDay")).toBeTruthy();
  });

  it("조직 저장소를 고르면 owner/name 으로 적힌다", async () => {
    const setData = vi.fn();
    const { findByText } = render(
      <ProfileGithubEditor data={{}} setData={setData} styles={styles} />,
    );
    fireEvent.click(await findByText("PurrFectDay."));
    await waitFor(() => expect(setData).toHaveBeenCalled());
    const updater = setData.mock.calls.at(-1)![0] as (d: object) => { github?: { repos?: string[] } };
    expect(updater({}).github?.repos).toEqual(["PurrFectDay/PurrFectDay."]);
  });
});
