"use client";

/* 프레지 장면 — 한눈에 보기 */
import { Facts } from "../../AboutNext";
import { k, type SceneDef } from "../types";

export const factsScenes: SceneDef[] = [{ id: "facts", label: k("한눈에 보기", "At a glance"), render: () => <Facts /> }];
