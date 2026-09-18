import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, fireEvent, waitFor } from "@testing-library/react";
import HomeWorksEditor from "@/app/admin/(dashboard)/settings/_components/HomeWorksEditor";
import { toRepoItems, coverFitStyle } from "@/data/works";
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
    // 고른 저장소마다 한 줄씩, 끌기 손잡이가 하나씩 붙는다
    expect(getAllByLabelText("상세 보기")).toHaveLength(2);
    expect(getAllByLabelText("끌어서 순서 바꾸기")).toHaveLength(2);
    // 표지·제목 칸은 펼친 줄에만 — 열한 줄이 펼쳐져 있으면 화면이 목록으로 가득 찬다.
    // 표지는 기본과 "올렸을 때" 두 벌이다
    fireEvent.click(getAllByLabelText("상세 보기")[0]);
    expect(getAllByLabelText("표지 올리기")).toHaveLength(2);
  });
});

describe("toRepoItems", () => {
  it("비운 칸은 GitHub 값으로 돌아가고, 채운 칸은 그것을 쓴다", () => {
    const [first] = toRepoItems([repo("alpha")], [
      { name: "alpha", cover: "/c.jpg", title: "Alpha", title_ko: "알파", tech: "Next.js" },
    ]);
    expect(first.title).toEqual({ ko: "알파", en: "Alpha" });
    expect(first.main).toBe("/c.jpg");
    // 대표 기술은 낱말이라 번역하지 않고 두 언어에 같은 값이 간다
    expect(first.category).toEqual({ ko: "Next.js", en: "Next.js" });
    /* 원을 누르면 GitHub 이 아니라 사이트 안에서 README 를 읽는다(#1062) */
    expect(first.href).toBe("/works/repos/me/alpha");
    expect(first.kind).toBe("repo");
  });

  it("대표 기술을 비우면 주 언어가 온다", () => {
    const [first] = toRepoItems([repo("alpha")], [{ name: "alpha", cover: "/c.jpg" }]);
    expect(first.category).toEqual({ ko: "TypeScript", en: "TypeScript" });
  });

  it("예전 설정의 description 도 계속 읽는다", () => {
    const [first] = toRepoItems([repo("alpha")], [{ name: "alpha", description: "desc" }]);
    expect(first.category.en).toBe("desc");
  });

  it("표지 자리·배율이 슬롯까지 실려 간다 — 홈이 이 값으로 그린다", () => {
    const [first] = toRepoItems([repo("alpha")], [
      { name: "alpha", cover: "/c.jpg", coverX: 20, coverY: 80, coverZoom: 1.5 },
    ]);
    expect(first.mainFit).toEqual({ x: 20, y: 80, zoom: 1.5 });
    /* 올렸을 때의 표지를 따로 안 두면 기본 표지와 같은 그림·같은 자리가 쓰인다 */
    expect(first.hover).toBe("/c.jpg");
    expect(first.hoverFit).toEqual({ x: 20, y: 80, zoom: 1.5 });
  });

  it("올렸을 때의 표지는 제 자리·배율을 쓴다", () => {
    const [first] = toRepoItems([repo("alpha")], [
      { name: "alpha", cover: "/c.jpg", coverX: 20, coverHover: "/h.jpg", hoverX: 70, hoverZoom: 0.8 },
    ]);
    expect(first.hover).toBe("/h.jpg");
    expect(first.hoverFit).toEqual({ x: 70, y: 50, zoom: 0.8 });
  });

  it("꽉 채운 상태에서는 잘릴 자리를 고르고, 줄이면 빈자리 안에서 그림을 옮긴다", () => {
    // 1 이상 — object-position 으로 보일 자리를 고른다
    expect(coverFitStyle({ x: 20, y: 80, zoom: 1 })).toEqual({ objectPosition: "20% 80%", transform: undefined });
    expect(coverFitStyle({ x: 50, y: 50, zoom: 1.5 })).toEqual({ objectPosition: "50% 50%", transform: "scale(1.5)" });

    /* 1 아래 — 잘릴 것이 없으니 그림째로 움직인다. 0.5 배면 빈자리가 절반이라
       끝까지 밀었을 때 원의 한쪽 끝에 붙는다(요소 크기의 25%) */
    expect(coverFitStyle({ x: 100, y: 0, zoom: 0.5 })).toEqual({
      objectPosition: "50% 50%",
      transform: "translate(25%, -25%) scale(0.5)",
    });
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
    expect(getAllByLabelText("상세 보기")).toHaveLength(2);
    // 자동 칸도 펼쳐서 표지를 미리 손볼 수 있어야 한다(기본 + 올렸을 때)
    fireEvent.click(getAllByLabelText("상세 보기")[0]);
    expect(getAllByLabelText("표지 올리기")).toHaveLength(2);
    // 순서는 규칙이 정하므로 손잡이·화살표는 없다
    expect(queryAllByLabelText("끌어서 순서 바꾸기")).toHaveLength(0);
    expect(queryAllByLabelText("위로")).toHaveLength(0);
  });

  it("자동 칸을 고쳐도 선택이 되지는 않는다", async () => {
    const onReposChange = vi.fn();
    const { findAllByLabelText, getAllByDisplayValue } = render(
      <HomeWorksEditor source="github" repos={[]} orgs={[]} onOrgsChange={() => {}} onSourceChange={() => {}} onReposChange={onReposChange} styles={styles} />,
    );
    fireEvent.click((await findAllByLabelText("상세 보기"))[0]);
    // 제목 칸에는 자동으로 쓰일 값(저장소 이름)이 글자로 들어 있다. 앞이 KO, 뒤가 EN
    const titleInputs = getAllByDisplayValue("alpha");
    fireEvent.change(titleInputs[0], { target: { value: "새 제목" } });

    const next = onReposChange.mock.calls.at(-1)![0] as { name: string; picked?: boolean; title_ko?: string }[];
    expect(next).toEqual([{ name: "alpha", picked: false, title_ko: "새 제목" }]);
  });
});

describe("자동 배정 빼기 (#1061)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ login: "me", repos: [repo("alpha"), repo("beta")], due: ["alpha", "beta"] }),
    })));
  });

  it("자동으로 배정된 칸도 뺄 수 있다", async () => {
    const onReposChange = vi.fn();
    const { findByText, getAllByLabelText } = render(
      <HomeWorksEditor source="github" repos={[]} orgs={[]} onOrgsChange={() => {}} onSourceChange={() => {}} onReposChange={onReposChange} styles={styles} />,
    );
    await findByText("노출 예정 저장소");
    fireEvent.click(getAllByLabelText("빼기")[0]);
    // 지우는 게 아니라 표시만 남긴다 — 되돌릴 수 있어야 한다
    expect(onReposChange).toHaveBeenCalledWith([{ name: "alpha", picked: false, hidden: true }]);
  });

  it("빼 둔 것은 카드에서 사라지고, 되돌리면 자동 목록으로 돌아간다", async () => {
    const onReposChange = vi.fn();
    const { findByText, getAllByLabelText, getByText } = render(
      <HomeWorksEditor
        source="github" repos={[{ name: "alpha", picked: false, hidden: true }]}
        orgs={[]} onOrgsChange={() => {}} onSourceChange={() => {}} onReposChange={onReposChange} styles={styles}
      />,
    );
    await findByText("제외한 저장소");
    // 줄은 beta 하나만 남는다
    expect(getAllByLabelText("상세 보기")).toHaveLength(1);

    fireEvent.click(getByText("되돌리기"));
    // 손봐 둔 내용이 없으면 항목째로 지운다 — 빈 껍데기를 남길 이유가 없다
    expect(onReposChange).toHaveBeenCalledWith([]);
  });

  it("손봐 둔 내용이 있으면 되돌려도 그대로 남는다", async () => {
    const onReposChange = vi.fn();
    const { findByText, getByText } = render(
      <HomeWorksEditor
        source="github" repos={[{ name: "alpha", picked: false, hidden: true, tech: "Next.js" }]}
        orgs={[]} onOrgsChange={() => {}} onSourceChange={() => {}} onReposChange={onReposChange} styles={styles}
      />,
    );
    await findByText("제외한 저장소");
    fireEvent.click(getByText("되돌리기"));
    expect(onReposChange).toHaveBeenCalledWith([{ name: "alpha", picked: false, hidden: false, tech: "Next.js" }]);
  });

  it("빼 둔 저장소를 직접 고르면 빼 둔 표시가 풀린다", async () => {
    const onReposChange = vi.fn();
    const { findByPlaceholderText, getAllByText } = render(
      <HomeWorksEditor
        source="github" repos={[{ name: "alpha", picked: false, hidden: true }]}
        orgs={[]} onOrgsChange={() => {}} onSourceChange={() => {}} onReposChange={onReposChange} styles={styles}
      />,
    );
    /* 후보 목록이 그려진 뒤에 찾는다 — 제외 목록은 설정값만으로 먼저 그려지므로,
       바로 찾으면 그 한 줄만 잡힌다 */
    await findByPlaceholderText("저장소 검색");
    // 제외 목록 줄이 먼저, 후보 목록 줄이 그다음
    fireEvent.click(getAllByText("alpha").at(-1)!);
    expect(onReposChange).toHaveBeenCalledWith([{ name: "alpha", picked: true, hidden: false }]);
  });
});

describe("소유 계정 칩 (#1061)", () => {
  it("조직이 있으면 계정 칩으로 갈라 보고, 목록은 하나로 둔다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({
        login: "me",
        repos: [repo("alpha"), repo("beta"), repo("shared", "TypeScript", "acme")],
        due: [],
      }),
    })));
    const { findByText, getAllByText, getByText, queryAllByText } = render(
      <HomeWorksEditor source="github" repos={[]} orgs={[]} onOrgsChange={() => {}} onSourceChange={() => {}} onReposChange={() => {}} styles={styles} />,
    );
    // 전체 / 내 저장소 / 조직 칩
    await findByText("내 저장소");
    expect(getByText("전체")).toBeTruthy();
    /* 조직 이름은 칩에도, 줄의 소속 표시에도 나온다 — 목록을 하나로 합쳤으니 줄마다 밝혀야 한다 */
    expect(getAllByText("acme").length).toBeGreaterThan(1);

    // 조직 칩을 누르면 그 계정 것만 남는다
    fireEvent.click(getAllByText("acme")[0]);
    expect(getByText("shared")).toBeTruthy();
    expect(queryAllByText("alpha")).toHaveLength(0);
  });

  it("조직이 없으면 칩을 두지 않는다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ login: "me", repos: [repo("alpha"), repo("beta")], due: [] }),
    })));
    const { findByText, queryByText } = render(
      <HomeWorksEditor source="github" repos={[]} orgs={[]} onOrgsChange={() => {}} onSourceChange={() => {}} onReposChange={() => {}} styles={styles} />,
    );
    await findByText("alpha");
    // 고를 계정이 하나면 칩은 자리만 차지한다
    expect(queryByText("전체")).toBeNull();
  });
});

describe("저장소 검색", () => {
  it("이름으로 걸러낸다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ login: "me", repos: [repo("alpha"), repo("beta")], due: [] }),
    })));
    const { findByText, queryByText, getByPlaceholderText } = render(
      <HomeWorksEditor source="github" repos={[]} orgs={[]} onOrgsChange={() => {}} onSourceChange={() => {}} onReposChange={() => {}} styles={styles} />,
    );
    await findByText("alpha");
    fireEvent.change(getByPlaceholderText("저장소 검색"), { target: { value: "bet" } });
    expect(queryByText("alpha")).toBeNull();
    expect(queryByText("beta")).toBeTruthy();
  });
});

describe("자동값을 글자로 보여주기 (#1061)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ login: "me", repos: [repo("alpha")], due: ["alpha"] }),
    })));
  });

  it("자동값과 같아지면 비운 것으로 저장한다 — README 가 바뀌면 계속 따라가야 한다", async () => {
    const onReposChange = vi.fn();
    const { findAllByLabelText, getAllByDisplayValue } = render(
      <HomeWorksEditor
        source="github" repos={[{ name: "alpha", title: "손댄 제목" }]}
        orgs={[]} onOrgsChange={() => {}} onSourceChange={() => {}} onReposChange={onReposChange} styles={styles} />,
    );
    fireEvent.click((await findAllByLabelText("상세 보기"))[0]);
    const input = getAllByDisplayValue("손댄 제목")[0];
    fireEvent.change(input, { target: { value: "alpha" } });
    expect(onReposChange).toHaveBeenLastCalledWith([{ name: "alpha", title: "" }]);
  });
});

describe("표지 위치 (#1061)", () => {
  beforeEach(() => {
    /* jsdom 에는 포인터 캡처가 없다 — 끌기 자체를 보려는 것이라 자리만 채운다 */
    Element.prototype.setPointerCapture = () => {};
    Element.prototype.releasePointerCapture = () => {};
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ login: "me", repos: [repo("alpha")], due: ["alpha"] }),
    })));
  });

  it("위치를 켜고 끌면 가로·세로가 같이 적힌다", async () => {
    const onReposChange = vi.fn();
    const { findAllByLabelText, getAllByLabelText, getByLabelText } = render(
      <HomeWorksEditor
        source="github" repos={[{ name: "alpha", cover: "/c.jpg" }]}
        orgs={[]} onOrgsChange={() => {}} onSourceChange={() => {}} onReposChange={onReposChange} styles={styles} />,
    );
    fireEvent.click((await findAllByLabelText("상세 보기"))[0]);
    fireEvent.click(getAllByLabelText("위치 맞추기")[0]);

    const box = getByLabelText("표지 위치 옮기기");
    fireEvent.pointerDown(box, { pointerId: 1, clientX: 50, clientY: 50 });
    fireEvent.pointerMove(box, { pointerId: 1, clientX: 80, clientY: 20 });
    fireEvent.pointerUp(box, { pointerId: 1 });

    /* 오른쪽·위로 끌었으므로 드러나는 쪽은 왼쪽·아래 — 두 값이 같이 적힌다.
       jsdom 은 요소 크기를 0 으로 주므로 한 번만 움직여도 끝까지 간다 */
    const next = onReposChange.mock.calls.at(-1)![0] as { coverX?: number; coverY?: number }[];
    expect(next[0].coverX).toBe(0);
    expect(next[0].coverY).toBe(100);
  });

  it("배율은 1 아래로도 내려간다 — 줄인 만큼 원이 비어 보인다", async () => {
    const onReposChange = vi.fn();
    const { findAllByLabelText, getAllByLabelText, getByLabelText } = render(
      <HomeWorksEditor
        source="github" repos={[{ name: "alpha", cover: "/c.jpg" }]}
        orgs={[]} onOrgsChange={() => {}} onSourceChange={() => {}} onReposChange={onReposChange} styles={styles} />,
    );
    fireEvent.click((await findAllByLabelText("상세 보기"))[0]);
    fireEvent.click(getAllByLabelText("위치 맞추기")[0]);
    fireEvent.click(getByLabelText("축소"));
    const next = onReposChange.mock.calls.at(-1)![0] as { coverZoom?: number }[];
    expect(next[0].coverZoom).toBeLessThan(1);
  });

  it("줄인 상태에서는 끄는 방향으로 그림이 따라간다", async () => {
    const onReposChange = vi.fn();
    const { findAllByLabelText, getAllByLabelText, getByLabelText } = render(
      <HomeWorksEditor
        source="github" repos={[{ name: "alpha", cover: "/c.jpg", coverZoom: 0.6 }]}
        orgs={[]} onOrgsChange={() => {}} onSourceChange={() => {}} onReposChange={onReposChange} styles={styles} />,
    );
    fireEvent.click((await findAllByLabelText("상세 보기"))[0]);
    fireEvent.click(getAllByLabelText("위치 맞추기")[0]);

    const box = getByLabelText("표지 위치 옮기기");
    fireEvent.pointerDown(box, { pointerId: 1, clientX: 50, clientY: 50 });
    fireEvent.pointerMove(box, { pointerId: 1, clientX: 80, clientY: 80 });

    /* 오른쪽·아래로 끌었으니 그림도 오른쪽·아래로 — 값이 커진다.
       (꽉 채운 상태에서는 같은 끌기에 값이 줄어든다. 그때 값은 "보일 자리" 라서다) */
    const next = onReposChange.mock.calls.at(-1)![0] as { coverX?: number; coverY?: number }[];
    expect(next[0].coverX).toBe(100);
    expect(next[0].coverY).toBe(100);
  });

  it("올렸을 때의 표지는 따로 적힌다", async () => {
    const onReposChange = vi.fn();
    const { findAllByLabelText, getAllByLabelText } = render(
      <HomeWorksEditor
        source="github" repos={[{ name: "alpha", cover: "/c.jpg", coverHover: "/h.jpg" }]}
        orgs={[]} onOrgsChange={() => {}} onSourceChange={() => {}} onReposChange={onReposChange} styles={styles} />,
    );
    fireEvent.click((await findAllByLabelText("상세 보기"))[0]);
    // 표지가 둘이면 지우기도 둘 — 두 번째가 올렸을 때의 것이다
    fireEvent.click(getAllByLabelText("표지 지우기")[1]);
    expect(onReposChange).toHaveBeenCalledWith([{ name: "alpha", cover: "/c.jpg", coverHover: "" }]);
  });
});

describe("README 기본값 보여주기 (#1060)", () => {
  it("비워 둔 칸에는 README 에서 뽑은 값이 글자로 들어 있다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({
        login: "me",
        repos: [repo("alpha")],
        due: ["alpha"],
        readme: { alpha: { title: "README 제목", summary: "README 소개 문단", image: "https://raw.githubusercontent.com/me/alpha/main/a.png" } },
      }),
    })));
    const { findAllByLabelText, getAllByDisplayValue, getAllByAltText } = render(
      <HomeWorksEditor source="github" repos={[]} orgs={[]} onOrgsChange={() => {}} onSourceChange={() => {}} onReposChange={() => {}} styles={styles} />,
    );
    // 접힌 줄에도 README 표지가 미리 보인다
    const rows = await findAllByLabelText("상세 보기");
    expect(getAllByAltText("")[0].getAttribute("src")).toContain("/a.png");

    fireEvent.click(rows[0]);
    /* 자리글이 아니라 실제 글자로 들어 있어야 한다 — 자리글은 한 글자만 쳐도 사라져서
       README 제목을 조금 고치려면 처음부터 다시 쳐야 했다 */
    expect(getAllByDisplayValue("README 제목")).toHaveLength(2);
    // 아래 줄은 낱말 자리라 대표 기술 한 칸이고, 비우면 주 언어가 들어온다
    expect(getAllByDisplayValue("TypeScript")).toHaveLength(1);
  });
});
