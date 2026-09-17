import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, fireEvent, waitFor } from "@testing-library/react";
import HomeWorksEditor from "@/app/admin/(dashboard)/settings/_components/HomeWorksEditor";
import { toRepoItems } from "@/data/works";
import type { GithubRepoCard } from "@/lib/githubShowcase";

/* 홈 Selected Works 설정(#1047). 관리자 화면이라 브라우저로 열려면 로그인이 필요해서,
   고르기·순서·덮어쓰기가 설정값에 그대로 담기는지를 여기서 본다. */

const repo = (name: string, language = "TypeScript", owner = "me"): GithubRepoCard => ({
  name, owner, fullName: `${owner}/${name}`,
  url: `https://github.com/${owner}/${name}`, description: `${name} 소개`,
  language, stars: 0, forks: 0, topics: [], pushedAt: "2026-01-01T00:00:00Z", defaultBranch: "main",
});

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => ({
    ok: true,
    json: async () => ({ login: "me", repos: [repo("alpha"), repo("beta", "JavaScript")] }),
  })));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const styles = { sectionSubTitle: "s", fieldHint: "h" };

describe("HomeWorksEditor", () => {
  it("저장소를 고르면 고른 순서대로 설정값에 담긴다", async () => {
    const onReposChange = vi.fn();
    const { findByText } = render(
      <HomeWorksEditor source="github" repos={[]} orgs={[]} onOrgsChange={() => {}} onSourceChange={() => {}} onReposChange={onReposChange} styles={styles} />,
    );
    fireEvent.click(await findByText("alpha"));
    expect(onReposChange).toHaveBeenCalledWith([{ name: "alpha" }]);
  });

  it("조직 저장소는 owner/name 으로 적는다 — 개인 계정에 같은 이름이 있을 수 있다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ login: "me", repos: [repo("content"), repo("content", "TypeScript", "acme")] }),
    })));
    const onReposChange = vi.fn();
    const { findAllByText } = render(
      <HomeWorksEditor source="github" repos={[]} orgs={[]} onOrgsChange={() => {}} onSourceChange={() => {}} onReposChange={onReposChange} styles={styles} />,
    );
    const rows = await findAllByText("content");
    // 개인 것은 이름만, 조직 것은 owner/name
    fireEvent.click(rows[0]);
    expect(onReposChange).toHaveBeenLastCalledWith([{ name: "content" }]);
    fireEvent.click(rows[1]);
    expect(onReposChange).toHaveBeenLastCalledWith([{ name: "acme/content" }]);
  });

  it("작업물·게시물로 고정하면 저장소 영역을 부르지 않는다", async () => {
    render(<HomeWorksEditor source="works" repos={[]} orgs={[]} onOrgsChange={() => {}} onSourceChange={() => {}} onReposChange={() => {}} styles={styles} />);
    await waitFor(() => expect(fetch).not.toHaveBeenCalled());
  });

  it("고른 저장소는 순서를 바꾸고 뺄 수 있다", async () => {
    const onReposChange = vi.fn();
    const picked = [{ name: "alpha" }, { name: "beta" }];
    const { getAllByLabelText } = render(
      <HomeWorksEditor source="github" repos={picked} orgs={[]} onOrgsChange={() => {}} onSourceChange={() => {}} onReposChange={onReposChange} styles={styles} />,
    );
    fireEvent.click(getAllByLabelText("아래로")[0]);
    expect(onReposChange).toHaveBeenCalledWith([{ name: "beta" }, { name: "alpha" }]);

    onReposChange.mockReset();
    fireEvent.click(getAllByLabelText("빼기")[0]);
    expect(onReposChange).toHaveBeenCalledWith([{ name: "beta" }]);
    // 고른 저장소마다 표지 자리와 끌기 손잡이가 하나씩 붙는다
    expect(getAllByLabelText("표지 올리기")).toHaveLength(2);
    expect(getAllByLabelText("끌어서 순서 바꾸기")).toHaveLength(2);
  });
});

describe("toRepoItems", () => {
  it("비운 칸은 GitHub 값으로 돌아가고, 채운 칸은 그것을 쓴다", () => {
    const [first] = toRepoItems([repo("alpha")], [
      { name: "alpha", cover: "/c.jpg", title: "Alpha", title_ko: "알파", description: "desc" },
    ]);
    expect(first.title).toEqual({ ko: "알파", en: "Alpha" });
    expect(first.main).toBe("/c.jpg");
    expect(first.category.en).toBe("desc");
    // 한국어 설명을 안 적었으면 GitHub 의 저장소 소개로 돌아간다
    expect(first.category.ko).toBe("alpha 소개");
    expect(first.href).toBe("https://github.com/me/alpha");
    expect(first.kind).toBe("repo");
  });

  it("덮어쓴 값이 없으면 이름·주 언어·언어 색으로 채운다", () => {
    const [first] = toRepoItems([repo("beta", "JavaScript")]);
    expect(first.title.en).toBe("beta");
    expect(first.main).toBe("");
    expect(first.accent).toBe("#f1e05a");
    // 밝은 언어색 위에서는 어두운 글자로 간다
    expect(first.accentInk).toBe("#161b22");
  });
});

describe("자동으로 나가는 저장소 (#1057)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ login: "me", repos: [repo("alpha"), repo("beta")], due: ["alpha", "beta"] }),
    })));
  });

  it("고른 것이 없으면 노출 예정 저장소를 카드로 보여준다", async () => {
    const { findByText, getAllByLabelText, queryAllByLabelText } = render(
      <HomeWorksEditor source="github" repos={[]} orgs={[]} onOrgsChange={() => {}} onSourceChange={() => {}} onReposChange={() => {}} styles={styles} />,
    );
    await findByText("노출 예정 저장소");
    // 자동 칸에도 표지 자리가 있어야 미리 손볼 수 있다
    expect(getAllByLabelText("표지 올리기")).toHaveLength(2);
    // 순서는 규칙이 정하므로 손잡이·화살표는 없다
    expect(queryAllByLabelText("끌어서 순서 바꾸기")).toHaveLength(0);
    expect(queryAllByLabelText("위로")).toHaveLength(0);
  });

  it("자동 칸을 고쳐도 선택이 되지는 않는다", async () => {
    const onReposChange = vi.fn();
    const { findAllByPlaceholderText } = render(
      <HomeWorksEditor source="github" repos={[]} orgs={[]} onOrgsChange={() => {}} onSourceChange={() => {}} onReposChange={onReposChange} styles={styles} />,
    );
    // 제목 칸의 placeholder 는 저장소 이름이다 (EN/KO 두 칸)
    const titleInputs = await findAllByPlaceholderText("alpha");
    fireEvent.change(titleInputs[0], { target: { value: "새 제목" } });

    const next = onReposChange.mock.calls.at(-1)![0] as { name: string; picked?: boolean; title?: string }[];
    expect(next).toEqual([{ name: "alpha", picked: false, title: "새 제목" }]);
  });
});

describe("조직 묶음", () => {
  it("조직 저장소는 내 저장소와 따로, 조직 이름 아래 묶인다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({
        login: "me",
        repos: [repo("alpha"), repo("beta"), repo("shared", "TypeScript", "acme")],
        due: [],
      }),
    })));
    const { findByText, getByText } = render(
      <HomeWorksEditor source="github" repos={[]} orgs={[]} onOrgsChange={() => {}} onSourceChange={() => {}} onReposChange={() => {}} styles={styles} />,
    );
    await findByText("내 저장소");
    // 조직은 제 이름으로 된 묶음을 따로 갖는다 — 한 목록에 섞이면 파묻혀 안 보인다
    expect(getByText("acme")).toBeTruthy();
  });
});
