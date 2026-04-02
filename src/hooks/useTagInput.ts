import { useState, useCallback } from "react";

export function useTagInput(
  currentTags: string[],
  onUpdate: (tags: string[]) => void,
) {
  const [input, setInput] = useState("");

  const add = useCallback(() => {
    const tag = input.trim().replace(/,/g, "");
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

  return { input, setInput, add, handleKeyDown, remove };
}
