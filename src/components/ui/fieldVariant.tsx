"use client";

/**
 * 입력칸 모양 범위 — 감싼 영역 안의 Input · Textarea 가 variant 를 따로 정하지 않으면 이 모양을 쓴다.
 *
 * 편집 화면은 "적는 칸은 밑줄, 고르는 것은 알약"(docs/editor-ui.md 2-1)이라, 칸마다 variant="underline" 을 적다 보면
 * 빠뜨려 상자 칸이 섞였다. 범위 하나로 묶으면 새로 넣는 칸도 따라온다(ControlSizeScope 와 같은 방식).
 */
import { createContext, useContext, type ReactNode } from "react";

export type FieldVariant = "capsule" | "underline";

const FieldVariantContext = createContext<FieldVariant | null>(null);

export function FieldVariantScope({ variant, children }: { variant: FieldVariant | null; children: ReactNode }) {
  return <FieldVariantContext.Provider value={variant}>{children}</FieldVariantContext.Provider>;
}

/** 넘긴 값이 있으면 그것, 없으면 범위, 범위도 없으면 capsule */
export function useFieldVariant(variant: FieldVariant | undefined): FieldVariant {
  const scoped = useContext(FieldVariantContext);
  return variant ?? scoped ?? "capsule";
}
