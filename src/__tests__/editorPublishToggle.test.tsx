import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { LanguageProvider } from "@/providers/LanguageProvider";
import AdminEditorShell from "@/components/admin/AdminEditorShell";

/* 편집기 상단 상태 칩을 눌러 발행/미발행을 바꾼다(#1116). 예전에는 칩이 글자뿐이라, 발행한 글을
   미발행으로 돌리려면 목록으로 나가야 했다. 예약 대기 칩은 누르지 않는다 — 예약을 건너뛰고 바로 발행된다. */

const labels = { delete: "삭제", deleting: "삭제 중", saving: "저장 중", saveDraft: "저장", update: "업데이트", publish: "발행" };

function shell(props: { published: boolean; scheduledAt?: string | null; saving?: boolean; onToggle?: () => void }) {
  return render(
    <LanguageProvider>
      <AdminEditorShell
        backHref="/admin/posts"
        backLabel="글"
        editorLang="ko"
        onEditorLangChange={() => {}}
        isEdit
        saving={props.saving ?? false}
        deleting={false}
        published={props.published}
        onSaveDraft={() => {}}
        onPublish={() => {}}
        onTogglePublished={props.onToggle}
        scheduledAt={props.scheduledAt ?? null}
        onScheduledChange={() => {}}
        labels={labels}
      >
        <div />
      </AdminEditorShell>
    </LanguageProvider>,
  );
}

/* 상태 칩 — 상단 두 번째 줄의 첫 배지. 누를 수 있으면 button, 아니면 span */
const chip = (c: HTMLElement) => c.querySelector("[class*='badge']") as HTMLElement;

describe("편집기 상태 칩으로 발행 전환", () => {
  it("발행된 글의 칩을 누르면 전환을 요청한다", () => {
    const onToggle = vi.fn();
    const { container } = shell({ published: true, onToggle });
    const badge = chip(container);
    expect(badge.tagName).toBe("BUTTON");
    fireEvent.click(badge);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("미발행 글의 칩도 누를 수 있다", () => {
    const onToggle = vi.fn();
    const { container } = shell({ published: false, onToggle });
    fireEvent.click(chip(container));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("예약 대기 칩은 누를 수 없다", () => {
    const { container } = shell({ published: false, scheduledAt: "2099-01-01T00:00:00.000Z", onToggle: vi.fn() });
    expect(chip(container).tagName).toBe("SPAN");
  });

  it("저장 중에는 막아 두 번 저장되지 않게 한다", () => {
    const onToggle = vi.fn();
    const { container } = shell({ published: true, saving: true, onToggle });
    const badge = chip(container) as HTMLButtonElement;
    expect(badge.disabled).toBe(true);
    fireEvent.click(badge);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it("전환 함수를 넘기지 않으면(새 글) 칩은 글자뿐이다", () => {
    const { container } = shell({ published: false });
    expect(chip(container).tagName).toBe("SPAN");
  });
});
