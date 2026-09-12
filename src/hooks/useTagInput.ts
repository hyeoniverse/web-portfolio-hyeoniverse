import { useState, useCallback, useMemo } from "react";

export function useTagInput(
  currentTags: string[],
  onUpdate: (tags: string[]) => void,
) {
  const [input, setInput] = useState("");

  const add = useCallback((override?: string) => {
    const tag = (override ?? input).trim().replace(/,/g, "");
    if (tag && !currentTags.includes(tag)) {
      onUpdate([...currentTags, tag]);
    }
    setInput("");
  }, [input, currentTags, onUpdate]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.nativeEvent.isComposing) return;
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        add();
      }
    },
    [add],
  );

  const remove = useCallback(
    (tag: string) => {
      onUpdate(currentTags.filter((t) => t !== tag));
    },
    [currentTags, onUpdate],
  );

  /* 값이 그대로면 같은 객체를 돌려준다 — 이 객체를 쓰는 편집 화면 섹션이 메모로 다시 그리기를 건너뛸 수 있게(#850) */
  return useMemo(() => ({ input, setInput, add, handleKeyDown, remove }), [input, add, handleKeyDown, remove]);
}
