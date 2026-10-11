"use client";

/* GitHub 로그인과 초대 — OAuth 는 누구인지만 알려 주고, 들여보낼지는 서버의 /auth/callback 이 정한다.
   소유자인지, 이미 역할이 있는지, 초대 행이 있는지 차례로 보고, 하나도 아니면 로그아웃하고 그 계정을 지운다.
   대본: 모르는 사람 → 초대받은 사람 순서로 로그인해 본다 */
import { useEffect, useRef, useState } from "react";
import Pressable from "@/components/ui/Pressable";
import { GithubIcon } from "@/components/icons";
import { STAR_PATH, useL } from "../../features/shared";
import { GuideAnchor } from "../../guide/GuideStar";
import { invite as copy, INVITE_PASSES, type Who } from "./data";
import { DemoShell, useScript } from "./Script";
import styles from "./CmsDemos.module.css";

/** 관문 하나를 보는 데 걸리는 것처럼 보이는 시간 */
const GATE_MS = 550;

const lastGate = (who: Who) => {
  const stop = INVITE_PASSES[who].indexOf(true);
  return stop < 0 ? INVITE_PASSES[who].length : stop + 1;
};

export default function InviteDemo() {
  const t = useL();
  const [who, setWho] = useState<Who | null>(null);
  const [step, setStep] = useState(0);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const login = (key: Who) => {
    setWho(key);
    setStep(0);
    window.clearTimeout(timer.current);
    const last = lastGate(key);
    const next = (n: number) => {
      setStep(n);
      if (n < last) timer.current = window.setTimeout(() => next(n + 1), GATE_MS);
    };
    timer.current = window.setTimeout(() => next(1), GATE_MS / 2);
  };

  /* 대본 — 네 사람이 차례로 로그인한다. 다음 사람은 앞 사람의 관문이 다 켜지고 판정을 읽을 틈이 지난 뒤에 */
  const after = (who: Who) => GATE_MS * (lastGate(who) + 1) + 1700;
  const script = useScript(() => [
    [800, () => login("owner")],
    [after("owner"), () => login("member")],
    [after("member"), () => login("invited")],
    [after("invited"), () => login("stranger")],
  ]);

  const passes = who ? INVITE_PASSES[who] : [];
  const last = who ? lastGate(who) : 0;
  const done = who !== null && step >= last;
  const allowed = done && passes.includes(true);
  const person = copy.people.find((p) => p.key === who);

  return (
    <DemoShell {...script}>
      <p className={styles.label}>
        <GithubIcon className={styles.inlineIcon} /> {t(copy.heading)}
      </p>
      <div className={styles.people} role="group" aria-label={t(copy.heading)}>
        {copy.people.map((p) => (
          <Pressable key={p.key} className={styles.person} aria-pressed={who === p.key} onClick={() => login(p.key)}>
            <b>{t(p.label)}</b>
            <small>{p.email}</small>
          </Pressable>
        ))}
      </div>
      <ol className={styles.gates}>
        {copy.gates.map((gate, i) => {
          const shown = who !== null && i < step;
          return (
            <li
              key={gate.en}
              data-state={shown ? (passes[i] ? "pass" : "fail") : undefined}
              data-skip={(done && i >= last) || undefined}
            >
              {/* 관문 하나 = 별 하나 — 통과면 초록으로 켜지고, 막히면 붉은 빗금 */}
              <svg
                className={styles.gateStar}
                /* 지금 볼 곳 — 방금 판정한 관문 */
                data-guide={who !== null && !done && i === Math.max(0, step - 1) ? "" : undefined}
                data-guide-priority={who !== null && !done && i === Math.max(0, step - 1) ? 2 : undefined}
                viewBox="0 0 100 100"
                aria-hidden="true"
              >
                <path d={STAR_PATH} />
              </svg>
              <span className={styles.gateNo}>{i + 1}</span>
              <span>{t(gate)}</span>
              <b>{shown ? t(passes[i] ? copy.yes : copy.no) : "·"}</b>
            </li>
          );
        })}
      </ol>
      <p className={styles.verdict} data-kind={done ? (allowed ? "ok" : "error") : undefined} role="status">
        {(done || who === null) && <GuideAnchor size="1rem" priority={2} className={styles.pin} />}
        {!who || !person ? t(copy.idle) : !done ? `${person.email} ${t(copy.checking)}…` : t(copy[who])}
      </p>
      <p className={styles.note}>{t(copy.mail)}</p>
    </DemoShell>
  );
}
