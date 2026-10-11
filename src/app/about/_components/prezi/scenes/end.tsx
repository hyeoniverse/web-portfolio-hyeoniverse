"use client";

/* 프레지 장면 — 신뢰 · 자주 묻는 질문 · 엔딩 크레딧(끝에 마무리 CTA 가 함께 올라온다) */
import { Trust, Faq } from "../../landing/Landing";
import CreditsRoll from "../../landing/CreditsRoll";
import { k, type SceneDef } from "../types";

export const trustScenes: SceneDef[] = [{ id: "trust", label: k("신뢰", "Trust"), render: () => <Trust /> }];
export const faqScenes: SceneDef[] = [
  { id: "faq", label: k("자주 묻는 질문", "FAQ"), render: () => <Faq /> },
  { id: "credits", label: k("엔딩 크레딧", "Credits"), render: () => <CreditsRoll />, ownPad: true },
];
