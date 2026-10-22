"use client";

/* 공급자 고르기와 대체 차례, 사용량 — 기능마다 기본 공급자와 대체 차례를 정하고, 이번 달 사용량을 무료 한도와 함께 본다.
   요청을 보내면 공급자마다 미리 정한 확률로 성공하거나 실패하고, 성공하면 사용량이 오른다. 같은 원인으로 이어 실패하면
   꺼지고(src/lib/ai/providers.ts 의 FATAL_LIMIT · TRANSIENT_LIMIT), 다음 달로 넘기면 사용량과 한도·일시 오류로 꺼진
   공급자가 풀린다(키·결제 문제는 사람이 고쳐야 풀린다). 실제 요청은 보내지 않는 브라우저 안 흉내다 */
import { useEffect, useRef, useState } from "react";
import Pressable from "@/components/ui/Pressable";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { ChevronDown, ChevronUp } from "@/components/icons";
import {
  FATAL_LIMIT,
  features,
  kinds,
  MONTHS_EN,
  profiles,
  providers as copy,
  SEND_DELAY_MS,
  START_MONTH,
  TRANSIENT_LIMIT,
  units,
  type Feature,
  type Kind,
  type Unit,
} from "./data";
import { useT } from "./hooks";
import styles from "./Demos.module.css";

type Health = { fatal: number; transient: number; last?: Kind };
const HEALTHY: Health = { fatal: 0, transient: 0 };
type Step =
  | { name: string; type: "off" | "noKey" | "cap" }
  | { name: string; type: "fail"; kind: Kind }
  | { name: string; type: "ok"; amount: number; unit: Unit };

const isOff = (h: Health | undefined) => !!h && (h.fatal >= FATAL_LIMIT || h.transient >= TRANSIENT_LIMIT);
const costOf = (cost: Partial<Record<Unit, number>>, unit: Unit) => (unit === "requests" ? 1 : (cost[unit] ?? 1));

export default function ProvidersDemo() {
  const { t, language } = useT();
  const fmt = (n: number) => n.toLocaleString(language === "ko" ? "ko-KR" : "en-US");
  const amountOf = (n: number, unit: Unit) => `${fmt(n)}${t(units[unit])}`;

  const [feature, setFeature] = useState<Feature>("translation");
  const [orders, setOrders] = useState<Record<Feature, string[]>>(
    () => Object.fromEntries(features.map((f) => [f.key, f.providers])) as Record<Feature, string[]>,
  );
  const [fallback, setFallback] = useState(true);
  const [usage, setUsage] = useState<Record<string, number>>(() =>
    Object.fromEntries(Object.entries(profiles).map(([name, p]) => [name, p.used])),
  );
  const [health, setHealth] = useState<Record<string, Health>>({});
  const [month, setMonth] = useState(START_MONTH);
  const [busy, setBusy] = useState(false);
  const [trail, setTrail] = useState<Step[] | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const current = features.find((f) => f.key === feature) ?? features[0];
  const order = orders[feature];

  const move = (i: number, dir: number) => {
    const next = [...order];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    setOrders((now) => ({ ...now, [feature]: next }));
    setTrail(null);
  };

  /* 차례대로 시도한다: 꺼졌거나 키가 없거나 앱 상한에 닿으면 건너뛰고, 무료 한도를 넘을 요청은 한도 초과,
     나머지는 그 공급자의 확률로 성공하거나 실패한다. 성공하면 이어진 실패를 지우고 사용량을 더한다 */
  const send = () => {
    const steps: Step[] = [];
    const nextHealth = { ...health };
    const nextUsage = { ...usage };
    for (const name of fallback ? order : order.slice(0, 1)) {
      const profile = profiles[name];
      const state = nextHealth[name] ?? HEALTHY;
      const used = nextUsage[name];
      const cost = costOf(current.cost, profile.unit);
      if (isOff(state)) {
        steps.push({ name, type: "off" });
        continue;
      }
      if (profile.noKey) {
        steps.push({ name, type: "noKey" });
        continue;
      }
      if (profile.cap && used + cost > profile.cap) {
        steps.push({ name, type: "cap" });
        continue;
      }
      const kind: Kind | null =
        profile.limit && used + cost > profile.limit
          ? "quota"
          : Math.random() < profile.fail
            ? profile.kinds[Math.floor(Math.random() * profile.kinds.length)]
            : null;
      if (kind) {
        const fatal = kinds[kind].fatal;
        /* 원인이 바뀌면 그 갈래의 횟수는 새로 센다 */
        nextHealth[name] = {
          fatal: fatal ? (state.last === kind ? state.fatal : 0) + 1 : state.fatal,
          transient: fatal ? state.transient : state.transient + 1,
          last: kind,
        };
        steps.push({ name, type: "fail", kind });
        continue;
      }
      nextHealth[name] = HEALTHY;
      nextUsage[name] = used + cost;
      steps.push({ name, type: "ok", amount: cost, unit: profile.unit });
      break;
    }
    setBusy(true);
    setTrail(null);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setHealth(nextHealth);
      setUsage(nextUsage);
      setTrail(steps);
      setBusy(false);
    }, SEND_DELAY_MS);
  };

  /* 다음 달: 사용량은 0부터, 한도·일시 오류로 꺼진 공급자는 다시 시도한다. 키·결제·권한 문제는 그대로 */
  const nextMonth = () => {
    setMonth((now) => (now % 12) + 1);
    setUsage(Object.fromEntries(Object.keys(profiles).map((name) => [name, 0])));
    setHealth((now) =>
      Object.fromEntries(Object.entries(now).filter(([, s]) => s.last && kinds[s.last].fatal && s.last !== "quota")),
    );
    setTrail(null);
  };

  const outcome = (s: Step) => {
    switch (s.type) {
      case "off":
        return t(copy.outcomeOff);
      case "noKey":
        return t(copy.outcomeNoKey);
      case "cap":
        return t(copy.outcomeCap);
      case "fail":
        return t(kinds[s.kind].label);
      case "ok":
        return `+${amountOf(s.amount, s.unit)}`;
    }
  };
  const handled = trail?.find((s) => s.type === "ok");
  const upcoming = (month % 12) + 1;

  return (
    <div className={`${styles.demo} ${styles.providersDemo}`}>
      <div className={styles.row}>
        <div role="group" aria-label={t(copy.featureGroup)} className={styles.scrollX}>
          <SegmentedControl
            size="sm"
            items={features.map((f) => ({ value: f.key, label: t(f.label) }))}
            value={feature}
            onChange={(v) => {
              setFeature(v);
              setTrail(null);
            }}
          />
        </div>
        <label className={styles.check}>
          <input type="checkbox" checked={fallback} onChange={(e) => setFallback(e.target.checked)} />
          {t(copy.fallback)}
        </label>
      </div>

      <ol className={styles.providers}>
        {order.map((name, i) => {
          const profile = profiles[name];
          const used = usage[name];
          const ceiling = profile.cap ?? profile.limit;
          const ratio = ceiling ? Math.min(1, used / ceiling) : null;
          const state = health[name] ?? HEALTHY;
          const off = isOff(state);
          const step = trail?.find((s) => s.name === name);
          const note = profile.note ? t(profile.note) : "";
          const amount = t(copy.thisMonth, {
            amount: ceiling ? `${fmt(used)} / ${amountOf(ceiling, profile.unit)}` : amountOf(used, profile.unit),
          });
          const streak =
            state.fatal || state.transient
              ? ` · ${t(copy.streak, {
                  n: state.last && kinds[state.last].fatal ? `${state.fatal}/${FATAL_LIMIT}` : `${state.transient}/${TRANSIENT_LIMIT}`,
                })}`
              : "";
          const detail = off
            ? t(copy.off, {
                kind: state.last ? t(kinds[state.last].label) : "",
                n: state.fatal >= FATAL_LIMIT ? FATAL_LIMIT : TRANSIENT_LIMIT,
              })
            : profile.noKey
              ? t(copy.noKey, { note })
              : `${amount}${profile.cap ? t(copy.appCap) : ""}${note ? ` · ${note}` : ""}${streak}`;
          return (
            <li
              key={name}
              data-off={off || undefined}
              data-idle={(!fallback && i > 0) || undefined}
              data-hit={step ? (step.type === "ok" ? "ok" : step.type === "fail" ? "fail" : "skip") : undefined}
            >
              <span className={styles.rank}>{i === 0 ? t(copy.primary) : t(copy.backup, { n: i })}</span>
              <div className={styles.providerName}>
                <b>
                  {name} <em>{t(profile.trait)}</em>
                </b>
                <small>{detail}</small>
                {ratio !== null && (
                  <span className={styles.bar} data-high={ratio > 0.75 || undefined} aria-hidden="true">
                    <i style={{ inlineSize: `${ratio * 100}%` }} />
                  </span>
                )}
              </div>
              <div className={styles.providerTools}>
                <Pressable className={styles.iconButton} aria-label={t(copy.up, { name })} disabled={i === 0} onClick={() => move(i, -1)}>
                  <ChevronUp aria-hidden="true" />
                </Pressable>
                <Pressable
                  className={styles.iconButton}
                  aria-label={t(copy.down, { name })}
                  disabled={i === order.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <ChevronDown aria-hidden="true" />
                </Pressable>
                {/* 꺼진 공급자는 키를 바꾸거나 직접 다시 켠다. 자리는 늘 잡아 둬 칸 폭이 바뀌지 않는다 */}
                <Pressable
                  className={styles.revive}
                  aria-label={t(copy.reviveLabel, { name })}
                  disabled={!off}
                  onClick={() => setHealth((now) => ({ ...now, [name]: HEALTHY }))}
                >
                  {t(copy.revive)}
                </Pressable>
              </div>
            </li>
          );
        })}
      </ol>

      <div className={styles.row}>
        <Pressable className={styles.primary} onClick={send} disabled={busy}>
          {t(busy ? copy.sending : copy.send)}
        </Pressable>
        <Pressable className={styles.ghost} onClick={nextMonth}>
          {t(copy.nextMonth, { month: language === "ko" ? upcoming : MONTHS_EN[upcoming - 1] })}
        </Pressable>
      </div>
      <p className={styles.result} role="status" data-kind={trail ? (handled ? "ok" : "error") : undefined}>
        {trail
          ? `${trail.map((s) => `${s.name} ${outcome(s)}`).join(" → ")}${
              handled ? t(copy.handled, { name: handled.name }) : fallback ? t(copy.allFailed) : t(copy.noFallback)
            }`
          : t(copy.idle)}
      </p>
    </div>
  );
}
