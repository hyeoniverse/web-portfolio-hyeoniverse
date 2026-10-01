"use client";

/* ── AI 상태·사용량 (settings > 서비스) ──
   공급자마다 이어진 실패와 원인(키 만료·권한·한도…), 꺼졌는지, 이번 달 사용량과 무료 한도를 보인다(lib/ai/health).
   같은 원인으로 여러 번 이어 실패해 꺼진 공급자는 원인을 고친 뒤 여기서 다시 켠다. 키를 바꾸면 저절로 풀린다.
   탭의 "저장 / 되돌리기"와 상관없이 바로 반영된다. */
import { useState } from "react";
import { ChevronDown, Copy, ExternalLink, History, RotateCcw } from "@/components/icons";

import { useLanguage } from "@/providers/LanguageProvider";
import Button from "@/components/ui/Button";
import Pressable from "@/components/ui/Pressable";
import { showToast } from "@/stores/toastStore";
import { SkeletonLine } from "@/components/ui/Skeleton";
import { sendAction } from "@/lib/sendAction";
import { fillTemplate } from "@/utils/format";
import { highlightCode } from "@/utils/prismHighlight";
import { parseProviderMessage } from "@/lib/ai/providerMessage";
import {
  AI_PROVIDERS,
  AI_PROVIDER_INFO,
  FATAL_KINDS,
  FATAL_LIMIT,
  TRANSIENT_LIMIT,
  type AiProvider,
  type ProviderUsage,
} from "@/lib/ai/providers";
import type { useAiHealth } from "./useAiHealth";
import settings from "../Settings.module.css";
import styles from "./AiHealthPanel.module.css";

const DAY = 24 * 60 * 60 * 1000;

/** 최근 오류 — 시각·상태 코드·문장을 먼저 보이고, 원문(JSON)은 접어 둔다.
 *  원문은 Prism 으로 색을 입힌다(HTML 은 Prism 이 이스케이프한다) */
function ProviderMessage({ message, at, th }: { message: string; at: string; th: (k: string) => string }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const { status, summary, pretty } = parseProviderMessage(message);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pretty ? (status ? `${status}\n${pretty}` : pretty) : message);
      showToast(t("common.codeCopied"), "success");
    } catch {
      showToast(t("common.copyFailed"), "error");
    }
  };
  return (
    <div className={styles.message}>
      <p className={styles.messageHead}>
        <span className={styles.messageAt}>{at}</span>
        {status && <span className={styles.messageStatus}>{status}</span>}
      </p>
      <p className={styles.messageText}>{summary}</p>
      {pretty && (
        <>
          <div className={styles.rawBar}>
            <Pressable className={styles.rawToggle} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
              <ChevronDown size={14} className={`${styles.rawChev} ${open ? styles.rawChevOpen : ""}`} />
              {th(open ? "rawHide" : "rawShow")}
            </Pressable>
            {open && (
              <Pressable className={styles.rawToggle} onClick={copy}>
                <Copy size={13} />
                {t("common.codeCopy")}
              </Pressable>
            )}
          </div>
          {open && (
            <pre className={styles.raw}>
              <code dangerouslySetInnerHTML={{ __html: highlightCode(status ? `${status}\n${pretty}` : pretty, "json").html }} />
            </pre>
          )}
        </>
      )}
    </div>
  );
}

/* 비슷한 공급자끼리 — 글을 다루는 AI(Gemini·OpenAI·Claude)는 번역과 요약을 같은 키로 해서 한데 둔다 */
const GROUPS: { id: string; providers: AiProvider[] }[] = [
  { id: "translation", providers: ["deepl", "google_translate"] },
  { id: "text", providers: ["gemini", "openai", "claude"] },
  { id: "image", providers: ["nanobanana", "huggingface"] },
  { id: "tts", providers: ["fish", "google_tts", "edge"] },
  { id: "stock", providers: ["unsplash", "pexels"] },
];

/** 상태는 서비스 탭이 불러 넘긴다(useAiHealth) — fallback 섹션들도 같은 값으로 공급자 상태를 보인다 */
export default function AiHealthPanel({ health }: { health: ReturnType<typeof useAiHealth> }) {
  const { t, language } = useLanguage();
  const th = (key: string) => t(`admin.aiHealth.${key}`);
  const { data, failed, reload: load, stateOf } = health;
  const [resetting, setResetting] = useState<AiProvider | null>(null);
  /* 호출 기록은 따로 둔 페이지(/admin/service-log) — 공급자 줄에서 가면 그 공급자로 걸러 연다 */
  const logHref = (provider?: AiProvider) => `/admin/service-log${provider ? `?provider=${provider}` : ""}`;

  const reset = async (provider: AiProvider) => {
    setResetting(provider);
    const res = await sendAction("/api/admin/ai-health", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    }, t, th("resetFailed"));
    setResetting(null);
    if (res) await load();
  };

  const nf = (n: number) => n.toLocaleString(language === "ko" ? "ko-KR" : "en-US");
  const when = (iso?: string) => (iso ? new Date(iso).toLocaleString(language === "ko" ? "ko-KR" : "en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "");

  /* 키가 있거나, 기록이 남았거나, 이번 달 쓴 공급자만 — 키도 기록도 없는 것은 한 줄로 센다 */
  const shown = data ? AI_PROVIDERS.filter((p) => data.configured[p] || data.health[p] || data.usage.providers[p]) : [];
  const hidden = data ? AI_PROVIDERS.length - shown.length : 0;

  return (
    <section className={`${settings.section} ${settings.sectionWide}`}>
      <div className={styles.titleRow}>
        <h2 className={settings.sectionTitle}>{th("title")}</h2>
        <Button variant="outline" size="sm" shape="capsule" href={logHref()} soundDisabled icon={<History size={14} strokeWidth={2} />}>
          {th("logOpen")}
        </Button>
      </div>
      <p className={settings.sectionHint}>{fillTemplate(th("hint"), { fatal: FATAL_LIMIT, transient: TRANSIENT_LIMIT })}</p>

      {data === null ? (
        failed ? <p className={styles.empty}>{th("loadFailed")}</p> : (
          <div className={styles.list} aria-hidden>
            {[0, 1, 2].map((i) => (
              <div key={i} className={styles.row}>
                <SkeletonLine width="140px" />
                <SkeletonLine width="60%" />
              </div>
            ))}
          </div>
        )
      ) : (
        /* 그룹마다 한 덩어리 — 폭에 따라 1~3열. 같은 줄의 그룹은 제목과 공급자 줄이 같은 높이에서 시작하게
           한 격자의 행을 나눠 쓴다(subgrid). 한 그룹이 차지하는 행 수 = 제목 1 + 가장 많은 공급자 수 */
        <div
          className={styles.groups}
          style={{ "--group-rows": 1 + Math.max(...GROUPS.map((g) => g.providers.filter((p) => shown.includes(p)).length)) } as React.CSSProperties}
        >
          {GROUPS.map(({ id, providers }) => {
            const group = providers.filter((p) => shown.includes(p));
            if (group.length === 0) return null;
            return (
              <section key={id} className={styles.group}>
                <h3 className={styles.groupTitle}>{th(`group.${id}`)}</h3>
                <ul className={styles.list}>
                {group.map((p) => {
                  const info = AI_PROVIDER_INFO[p];
                  const h = data.health[p];
                  const u = data.usage.providers[p];
                  /* 시간이 지나 다시 시도할 차례가 된 차단은 꺼짐이 아니라 실패 중으로 보인다(lib/ai/status) */
                  const state = stateOf(p) ?? "ok";
                  const off = state === "off";
                  const failing = !off && (h?.fails ?? 0) > 0;
                  const kind = h?.disabled?.kind ?? h?.kind;
                  return (
                    <li key={p} className={styles.row} data-state={state}>
                      <div className={styles.head}>
                        <span className={styles.name}>{info.label}</span>
                        <span className={styles.features}>{info.features.map((f) => th(`feature.${f}`)).join(" · ")}</span>
                        <span className={styles.status} data-state={state}>
                          {state === "off" ? th("stateOff")
                            : state === "failing" ? fillTemplate(th("stateFailing"), { n: h!.fails, limit: FATAL_KINDS.has(h!.kind!) ? FATAL_LIMIT : TRANSIENT_LIMIT })
                            : state === "nokey" ? th("stateNoKey")
                            : th("stateOk")}
                        </span>
                        <span className={styles.actions}>
                          {(off || failing) && (
                            <Button variant={off ? "primary" : "outline"} size="sm" shape="capsule" onClick={() => void reset(p)} loading={resetting === p} soundDisabled icon={<RotateCcw size={14} strokeWidth={2} />}>
                              {th(off ? "reenable" : "clear")}
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" shape="circle" href={logHref(p)} aria-label={th("logOpenOne")} title={th("logOpenOne")} soundDisabled icon={<History size={14} strokeWidth={2} />} />
                    {info.console && (
                            <Button variant="ghost" size="sm" shape="circle" href={info.console} external aria-label={th("console")} title={th("console")} soundDisabled icon={<ExternalLink size={14} strokeWidth={2} />} />
                          )}
                        </span>
                      </div>

                      {/* 원인과 고칠 방법 — 실패가 남아 있을 때만 */}
                      {(off || failing) && kind && (
                        <div className={styles.problem}>
                          <p className={styles.fix}>
                            <strong>{th(`kind.${kind}`)}</strong> {th(`fix.${kind}`)}
                            {off && ` ${th(FATAL_KINDS.has(kind) ? "offManual" : kind === "quota" ? "offMonth" : "offHour")}`}
                          </p>
                          {h?.message && <ProviderMessage message={h.message} at={when(h.at)} th={th} />}
                        </div>
                      )}

                      <Usage provider={p} usage={u} deepl={p === "deepl" ? data.deepl : null} now={data.loadedAt} nf={nf} th={th} />
                    </li>
                  );
                })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
      {hidden > 0 && <p className={styles.empty}>{fillTemplate(th("hiddenCount"), { n: hidden })}</p>}
    </section>
  );
}

/** 이번 달 사용량 — 무료 한도를 아는 공급자는 막대로, 모르는 공급자는 횟수만 */
function Usage({ provider, usage, deepl, now, nf, th }: {
  provider: AiProvider;
  now: number;
  usage: ProviderUsage | undefined;
  deepl: { count: number; limit: number } | null;
  nf: (n: number) => string;
  th: (key: string) => string;
}) {
  const info = AI_PROVIDER_INFO[provider];
  const unit = th(`unit.${info.unit}`);
  /* DeepL 은 공급자가 알려 준 실제 값(결제 주기 기준). 나머지는 이 앱이 센 값 */
  const used = deepl ? deepl.count : info.unit === "requests" ? usage?.requests ?? 0 : usage?.units ?? 0;
  const limit = deepl ? deepl.limit : info.freeMonthly;
  const cap = info.appCap;

  const notes: string[] = [];
  if (deepl) notes.push(th("sourceProvider"));
  else if (limit) notes.push(th("sourceApp"));
  if (cap) notes.push(fillTemplate(th("appCap"), { n: nf(cap), unit }));
  if (info.freeUntil) {
    const days = Math.ceil((new Date(`${info.freeUntil}T23:59:59`).getTime() - now) / DAY);
    notes.push(fillTemplate(th(days >= 0 ? "freeUntil" : "freeEnded"), { date: info.freeUntil, days }));
  }
  if (info.note) notes.push(th(`note.${info.note}`));
  if (!limit && !info.freeUntil && info.key && !info.note) notes.push(th(provider === "openai" || provider === "claude" ? "paidOnly" : "limitElsewhere"));
  if (!info.key) notes.push(th("noLimit"));

  return (
    <div className={styles.usage}>
      {limit ? (
        <>
          <span className={styles.usageText}>
            {fillTemplate(th("usageOf"), { used: nf(used), limit: nf(limit), unit, pct: Math.min(999, Math.round((used / limit) * 100)) })}
          </span>
          <span className={styles.bar} aria-hidden>
            <span className={styles.barFill} data-high={used / (cap ?? limit) >= 0.8 ? "" : undefined} style={{ width: `${Math.min(100, (used / limit) * 100)}%` }} />
            {cap && <span className={styles.barCap} style={{ left: `${(cap / limit) * 100}%` }} />}
          </span>
        </>
      ) : (
        <span className={styles.usageText}>
          {fillTemplate(th("usageCount"), { n: nf(usage?.requests ?? 0) })}
          {info.unit !== "requests" && usage ? ` · ${nf(usage.units)} ${unit}` : ""}
        </span>
      )}
      {notes.length > 0 && <span className={styles.usageNote}>{notes.join(" · ")}</span>}
    </div>
  );
}
