"use client";

/* ── 필요한 키 바로가기 (settings > 서비스) ──
   키가 있어야 동작하는 섹션(이메일 서비스·댓글 알림·reCAPTCHA·AI 공급자…)에 "필요한 키: …" 한 줄을 달고,
   키 이름을 누르면 아래 환경 변수 칸으로 옮겨 그 칸을 강조한다. 칸이 그려져 있지 않으면(공급자를 안 골랐거나
   조건부로 숨긴 칸) 환경 변수 섹션으로 옮긴다.
   페이지 스크롤은 Lenis 가 맡아 scrollIntoView 가 먹히지 않을 수 있어 Lenis 로 옮긴다. */
import { Fragment } from "react";
import { useLenis } from "@/providers/LenisProvider";
import Pressable from "@/components/ui/Pressable";
import shared from "../Settings.module.css";
import styles from "./ServicesTab.module.css";

export const ENV_SECTION_ID = "env-vars";

export function useEnvKeyJump() {
  const { scrollTo } = useLenis();
  return (key: string) => {
    const field = document.getElementById(`env-${key}`);
    const el = field ?? document.getElementById(ENV_SECTION_ID);
    if (!el) return;
    scrollTo(el, { offset: field ? -window.innerHeight / 3 : -120 });
    if (!field) return;
    field.classList.add(shared.envFieldHighlight);
    /* 다음 인터랙션(클릭/키 입력) 때 강조를 지운다 — 이 단추의 click 이 끝난 다음 tick 에 건다 */
    window.setTimeout(() => {
      const clear = () => {
        field.classList.remove(shared.envFieldHighlight);
        document.removeEventListener("click", clear, true);
        document.removeEventListener("keydown", clear, true);
      };
      document.addEventListener("click", clear, true);
      document.addEventListener("keydown", clear, true);
    }, 0);
  };
}

/** 키 이름 하나 — 누르면 그 칸으로 */
export function EnvKeyLink({ name, missing }: { name: string; missing?: boolean }) {
  const jump = useEnvKeyJump();
  return (
    <Pressable className={styles.envKeyLink} data-missing={missing ? "" : undefined} onClick={() => jump(name)}>
      {name}
    </Pressable>
  );
}

/**
 * 키 안내 한 문장 — "A · B 환경 변수가 필요합니다." 모든 섹션이 이 한 형식을 쓴다(키 이름은 바로가기 링크).
 * 감싸는 p·li 는 부르는 쪽 HintLines 가 정한다. keys 가 비면 null.
 * @param missing 키가 없는 것으로 알고 있는 이름(강조색). 모르면 비운다
 */
export function envKeyLine(keys: string[], t: (key: string) => string, { missing = [], optional = false, any = false }: {
  missing?: string[];
  /** 없어도 동작한다(넣어 두기를 권한다) */
  optional?: boolean;
  /** 여럿 가운데 하나만 있어도 된다 */
  any?: boolean;
} = {}): React.ReactNode {
  const list = [...new Set(keys)];
  if (list.length === 0) return null;
  const sentence = t(optional ? "admin.settings.envKeysOptional" : any ? "admin.settings.envKeysAny" : "admin.settings.envKeysNeeded");
  const [before, after = ""] = sentence.split("{{keys}}");
  return (
    <>
      {before}
      {list.map((k, i) => (
        <Fragment key={k}>
          {i > 0 && " · "}
          <EnvKeyLink name={k} missing={missing.includes(k)} />
        </Fragment>
      ))}
      {after}
    </>
  );
}

/**
 * 섹션 설명 — 줄 수와 상관없이 글머리 목록(한 줄이어도 글머리를 단다 — 관리자 화면의 설명은 모두 같은 모양). 빈 줄(null·"")은 뺀다.
 * 필요한 키 안내(envKeyLine)도 따로 줄을 만들지 않고 여기 한 줄로 들어간다.
 */
export function HintLines({ lines, className }: { lines: React.ReactNode[]; className?: string }) {
  const shown = lines.filter((l) => l !== null && l !== undefined && l !== false && l !== "");
  if (shown.length === 0) return null;
  return (
    <ul className={`${shared.sectionHintList} ${styles.envKeyHint} ${styles.hintList} ${className ?? ""}`}>
      {shown.map((l, i) => <li key={i}>{l}</li>)}
    </ul>
  );
}
