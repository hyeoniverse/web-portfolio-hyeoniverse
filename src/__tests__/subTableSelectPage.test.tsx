import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, fireEvent } from "@testing-library/react";
import { LanguageProvider } from "@/providers/LanguageProvider";
import SubTable from "@/components/admin/SubTable/SubTable";

/* 머리줄 전체 선택은 지금 보이는 쪽만 고른다. 예전에는 모든 쪽을 골라, 휴지통 첫 쪽만 지우려다
   휴지통 전체를 영구 삭제할 수 있었다. */

type Row = { id: string; title: string };
const rows: Row[] = Array.from({ length: 15 }, (_, i) => ({ id: `r${i + 1}`, title: `항목 ${i + 1}` }));

function Harness({ page, onChange }: { page: number; onChange: (s: Set<string>) => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  return (
    <LanguageProvider>
      <SubTable<Row>
        icon={null}
        title="휴지통"
        open
        onToggle={() => {}}
        allItems={rows}
        columns={[{ key: "title", label: "제목", render: (r) => r.title }]}
        gridTemplate="1fr"
        selected={selected}
        onSelectChange={(s) => { onChange(s); setSelected(s); }}
        page={page}
        perPage={10}
        onPageChange={() => {}}
        emptyMessage="없음"
      />
    </LanguageProvider>
  );
}

/** 머리줄의 전체 선택 체크박스 — 표에서 처음 나오는 체크박스다 */
const headerCheckbox = (c: HTMLElement) => c.querySelector('input[type="checkbox"]') as HTMLInputElement;

describe("SubTable 전체 선택", () => {
  it("첫 쪽에서 누르면 첫 쪽 10개만 고르고, 다시 누르면 푼다", () => {
    const onChange = vi.fn();
    const { container } = render(<Harness page={1} onChange={onChange} />);
    fireEvent.click(headerCheckbox(container));
    expect([...onChange.mock.lastCall![0]].sort()).toEqual(rows.slice(0, 10).map((r) => r.id).sort());
    fireEvent.click(headerCheckbox(container));
    expect(onChange.mock.lastCall![0].size).toBe(0);
  });

  it("마지막 쪽에서 누르면 그 쪽 5개만 고른다", () => {
    const onChange = vi.fn();
    const { container } = render(<Harness page={2} onChange={onChange} />);
    fireEvent.click(headerCheckbox(container));
    expect([...onChange.mock.lastCall![0]].sort()).toEqual(rows.slice(10).map((r) => r.id).sort());
  });
});
